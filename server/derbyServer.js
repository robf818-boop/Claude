import http from 'http';
import crypto from 'crypto';

const PORT = process.env.DERBY_PORT ? Number(process.env.DERBY_PORT) : 5174;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const server = http.createServer();

const rooms = new Map();

const makeInitialState = () => ({
  gameState: 'waiting',
  message: 'Player 1: Tap to throw your first pitch!',
  activePlayer: 'player1',
  swingsTaken: 0,
  scores: {
    player1: { score: 0, homeRuns: 0, hits: 0, totalSwings: 0, perfectSwings: 0 },
    player2: { score: 0, homeRuns: 0, hits: 0, totalSwings: 0, perfectSwings: 0 }
  }
});

const sendFrame = (socket, data) => {
  const payload = Buffer.from(data);
  const length = payload.length;
  let header = [];

  header.push(0x81);

  if (length < 126) {
    header.push(length);
  } else if (length < 65536) {
    header.push(126);
    header.push((length >> 8) & 0xff);
    header.push(length & 0xff);
  } else {
    header.push(127);
    for (let i = 7; i >= 0; i -= 1) {
      header.push((length >> (i * 8)) & 0xff);
    }
  }

  socket.write(Buffer.concat([Buffer.from(header), payload]));
};

const send = (client, payload) => {
  if (!client.socket.destroyed) {
    sendFrame(client.socket, JSON.stringify(payload));
  }
};

const broadcast = (room, payload) => {
  room.players.forEach(player => send(player, payload));
};

const resetRoom = room => {
  room.state = makeInitialState();
};

const scheduleStrikeIfNoSwing = (room, pitch) => {
  if (room.pendingStrikeTimer) {
    clearTimeout(room.pendingStrikeTimer);
  }

  room.pendingStrikeTimer = setTimeout(() => {
    if (!room.pitchInFlight || room.state.gameState !== 'hitting') {
      return;
    }

    room.pitchInFlight = null;
    room.state = {
      ...room.state,
      gameState: 'result',
      message: 'Strike! No swing.'
    };

    resolveSwing(room, { result: 'STRIKE', timing: 'late' });
  }, pitch.duration + 150);
};

const resolveSwing = (room, { result, timing }) => {
  const { activePlayer } = room.state;
  const current = room.state.scores[activePlayer];
  const next = {
    ...current,
    totalSwings: current.totalSwings + 1
  };

  if (result === 'HOME_RUN') {
    next.score += 3;
    next.homeRuns += 1;
    next.hits += 1;
    next.perfectSwings += 1;
  } else if (result === 'HIT') {
    next.score += 1;
    next.hits += 1;
  } else if (timing === 'perfect') {
    next.perfectSwings += 1;
  }

  const swingsTaken = room.state.swingsTaken + 1;

  room.state = {
    ...room.state,
    scores: {
      ...room.state.scores,
      [activePlayer]: next
    },
    swingsTaken
  };

  setTimeout(() => advanceRound(room), 1800);
};

const advanceRound = room => {
  if (room.state.swingsTaken >= 10) {
    if (room.state.activePlayer === 'player1') {
      room.state = {
        ...room.state,
        gameState: 'betweenPlayers',
        message: 'Player 2 up next! Tap to start.',
        activePlayer: 'player2',
        swingsTaken: 0
      };
    } else {
      const winner = room.state.scores.player1.score === room.state.scores.player2.score
        ? 'TIE GAME!'
        : room.state.scores.player1.score > room.state.scores.player2.score
          ? 'PLAYER 1 WINS!'
          : 'PLAYER 2 WINS!';
      room.state = {
        ...room.state,
        gameState: 'gameOver',
        message: winner
      };
    }
  } else {
    room.state = {
      ...room.state,
      gameState: 'waiting',
      message: 'Tap to throw the next pitch!'
    };
  }

  broadcast(room, { type: 'state', state: room.state });
};

const parseFrames = (buffer, onMessage) => {
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const firstByte = buffer[offset];
    const secondByte = buffer[offset + 1];
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    let headerLength = 2;

    if (payloadLength === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLength = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (payloadLength === 127) {
      if (offset + 10 > buffer.length) break;
      const high = buffer.readUInt32BE(offset + 2);
      const low = buffer.readUInt32BE(offset + 6);
      payloadLength = high * 2 ** 32 + low;
      headerLength = 10;
    }

    const maskOffset = headerLength;
    const payloadOffset = headerLength + (masked ? 4 : 0);

    if (offset + payloadOffset + payloadLength > buffer.length) break;

    let payload = buffer.slice(offset + payloadOffset, offset + payloadOffset + payloadLength);

    if (masked) {
      const mask = buffer.slice(offset + maskOffset, offset + maskOffset + 4);
      payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
    }

    if (opcode === 0x1) {
      onMessage(payload.toString('utf8'));
    } else if (opcode === 0x8) {
      return { buffer: Buffer.alloc(0), closed: true };
    }

    offset += payloadOffset + payloadLength;
  }

  return { buffer: buffer.slice(offset), closed: false };
};

server.on('upgrade', (req, socket) => {
  if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request');
    return;
  }

  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.end('HTTP/1.1 400 Bad Request');
    return;
  }

  const accept = crypto
    .createHash('sha1')
    .update(`${key}${GUID}`)
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      '\r\n'
  );

  const client = {
    socket,
    roomCode: null,
    playerId: null,
    buffer: Buffer.alloc(0)
  };

  socket.on('data', chunk => {
    client.buffer = Buffer.concat([client.buffer, chunk]);
    const parsed = parseFrames(client.buffer, message => {
      handleMessage(client, message);
    });
    client.buffer = parsed.buffer;
    if (parsed.closed) {
      socket.end();
    }
  });

  socket.on('close', () => {
    handleClose(client);
  });

  socket.on('error', () => {
    handleClose(client);
  });
});

const handleMessage = (client, rawMessage) => {
  let message;
  try {
    message = JSON.parse(rawMessage);
  } catch {
    return;
  }

  if (message.type === 'join') {
    const roomCode = String(message.roomCode || '').toUpperCase();
    if (!roomCode) return;

    let room = rooms.get(roomCode);
    if (!room) {
      room = { roomCode, players: [], state: makeInitialState(), pitchInFlight: null, pendingStrikeTimer: null };
      rooms.set(roomCode, room);
    }

    if (room.players.length >= 2) {
      send(client, { type: 'error', message: 'Room is full.' });
      return;
    }

    const playerId = room.players.length === 0 ? 'player1' : 'player2';
    room.players.push({ id: playerId, socket: client.socket });
    client.roomCode = roomCode;
    client.playerId = playerId;

    send(client, { type: 'joined', playerId, roomCode, state: room.state });
    broadcast(room, { type: 'state', state: room.state });
    return;
  }

  const roomCode = client.roomCode;
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room) return;

  if (message.type === 'ready') {
    room.state = {
      ...room.state,
      gameState: 'waiting',
      message: `${room.state.activePlayer === 'player1' ? 'Player 1' : 'Player 2'}: Tap to throw your first pitch!`
    };
    broadcast(room, { type: 'state', state: room.state });
    return;
  }

  if (message.type === 'startPitch') {
    if (room.state.gameState !== 'waiting') return;

    const pitchType = Math.random() > 0.6 ? 'changeup' : 'fastball';
    const duration = pitchType === 'fastball' ? 650 : 1150;
    const pitch = { type: pitchType, duration, timestamp: Date.now() };
    room.pitchInFlight = pitch;

    room.state = {
      ...room.state,
      gameState: 'hitting',
      message: pitchType === 'fastball' ? '🔥 FASTBALL!' : '🌙 CHANGEUP!'
    };

    broadcast(room, { type: 'pitch', pitch });
    broadcast(room, { type: 'state', state: room.state });
    scheduleStrikeIfNoSwing(room, pitch);
    return;
  }

  if (message.type === 'swing') {
    if (room.state.gameState !== 'hitting') return;

    room.pitchInFlight = null;
    if (room.pendingStrikeTimer) {
      clearTimeout(room.pendingStrikeTimer);
    }

    room.state = {
      ...room.state,
      gameState: 'result',
      message: message.message || room.state.message
    };

    broadcast(room, { type: 'state', state: room.state });
    resolveSwing(room, { result: message.result, timing: message.timing });
    return;
  }

  if (message.type === 'reset') {
    resetRoom(room);
    broadcast(room, { type: 'state', state: room.state });
  }
};

const handleClose = client => {
  const roomCode = client.roomCode;
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room) return;

  room.players = room.players.filter(player => player.socket !== client.socket);
  if (room.players.length === 0) {
    rooms.delete(roomCode);
  }
};

server.listen(PORT, () => {
  console.log(`Derby server running on ws://localhost:${PORT}`);
});
