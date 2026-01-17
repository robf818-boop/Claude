import { useEffect, useRef, useState } from 'react';
import { DerbyPlayer, DerbyScoreLine, DerbyState, GameState, PitchData, PitchType, SwingResult } from '../../types/game';

interface BaseballGameProps {
  roomCode: string;
  mode: 'local' | 'online';
  serverHost: string;
  onExit: () => void;
}

const SWINGS_PER_PLAYER = 10;

const makeInitialState = (): DerbyState => ({
  gameState: 'waiting',
  message: 'Player 1: Tap to throw your first pitch!',
  activePlayer: 'player1',
  swingsTaken: 0,
  scores: {
    player1: { score: 0, homeRuns: 0, hits: 0, totalSwings: 0, perfectSwings: 0 },
    player2: { score: 0, homeRuns: 0, hits: 0, totalSwings: 0, perfectSwings: 0 }
  }
});

const playerLabels: Record<DerbyPlayer, string> = {
  player1: 'Player 1',
  player2: 'Player 2'
};

const getWsUrl = (host: string) => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${host}:5174`;
};

export function BaseballGame({ roomCode, mode, serverHost, onExit }: BaseballGameProps) {
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [pitchData, setPitchData] = useState<PitchData | null>(null);
  const [message, setMessage] = useState('Ready for the derby?');
  const [activePlayer, setActivePlayer] = useState<DerbyPlayer>('player1');
  const [swingsTaken, setSwingsTaken] = useState(0);
  const [scores, setScores] = useState<Record<DerbyPlayer, DerbyScoreLine>>(makeInitialState().scores);
  const [playerId, setPlayerId] = useState<DerbyPlayer | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'offline'>('offline');
  const [batSwinging, setBatSwinging] = useState(false);
  const [ballFlight, setBallFlight] = useState<{ id: number; variant: 'hit' | 'homer' } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const swingTimeoutRef = useRef<NodeJS.Timeout>();

  // Animation state
  const [ballPosition, setBallPosition] = useState({ y: 0, scale: 0.2 });
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const strikeTimeoutRef = useRef<NodeJS.Timeout>();
  const resultTimeoutRef = useRef<NodeJS.Timeout>();

  const isLocal = mode === 'local';
  const isActivePlayer = isLocal || playerId === activePlayer;

  const applyState = (state: DerbyState) => {
    setGameState(state.gameState);
    setMessage(state.message);
    setActivePlayer(state.activePlayer);
    setSwingsTaken(state.swingsTaken);
    setScores(state.scores);
  };

  const startPitchAnimation = (duration: number) => {
    setIsAnimating(true);
    setBallPosition({ y: 0, scale: 0.2 });

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 2);

      setBallPosition({
        y: easeProgress * 60,
        scale: 0.2 + (easeProgress * 2.8)
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const triggerHomeRunEffects = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
  };

  const resolveSwingLocal = (result: SwingResult, timing: string) => {
    setScores(prev => {
      const current = prev[activePlayer];
      const next = { ...current, totalSwings: current.totalSwings + 1 };

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

      return {
        ...prev,
        [activePlayer]: next
      };
    });

    setSwingsTaken(prev => prev + 1);

    resultTimeoutRef.current = setTimeout(() => {
      advanceRoundLocal();
    }, 1800);
  };

  const triggerSwingAnimation = () => {
    if (swingTimeoutRef.current) {
      clearTimeout(swingTimeoutRef.current);
    }
    setBatSwinging(true);
    swingTimeoutRef.current = setTimeout(() => {
      setBatSwinging(false);
    }, 320);
  };

  const triggerBallFlight = (result: SwingResult) => {
    if (result === 'HIT' || result === 'HOME_RUN') {
      setBallFlight({
        id: Date.now(),
        variant: result === 'HOME_RUN' ? 'homer' : 'hit'
      });
    }
  };

  const advanceRoundLocal = () => {
    setBallPosition({ y: 0, scale: 0.2 });
    setPitchData(null);
    setBallFlight(null);

    if (swingsTaken + 1 >= SWINGS_PER_PLAYER) {
      if (activePlayer === 'player1') {
        setGameState('betweenPlayers');
        setMessage('Player 2 up next!');
        setActivePlayer('player2');
        setSwingsTaken(0);
      } else {
        setGameState('gameOver');
        const winner = scores.player1.score === scores.player2.score
          ? 'TIE GAME!'
          : scores.player1.score > scores.player2.score
            ? 'PLAYER 1 WINS!'
            : 'PLAYER 2 WINS!';
        setMessage(winner);
      }
    } else {
      setGameState('waiting');
      setMessage('Tap to throw the next pitch!');
    }
  };

  const startPitchLocal = () => {
    if (gameState !== 'waiting') return;

    if (strikeTimeoutRef.current) {
      clearTimeout(strikeTimeoutRef.current);
    }
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }

    const type: PitchType = Math.random() > 0.6 ? 'changeup' : 'fastball';
    const duration = type === 'fastball' ? 650 : 1150;
    const newPitch: PitchData = {
      type,
      timestamp: Date.now(),
      duration
    };

    setPitchData(newPitch);
    setGameState('hitting');
    setMessage(type === 'fastball' ? '🔥 FASTBALL!' : '🌙 CHANGEUP!');

    startPitchAnimation(duration);

    strikeTimeoutRef.current = setTimeout(() => {
      setGameState('result');
      setMessage('Strike! No swing.');
      resolveSwingLocal('STRIKE', 'late');
    }, duration + 150);
  };

  const handleSwingLocal = () => {
    if (!pitchData || gameState !== 'hitting') return;

    triggerSwingAnimation();

    if (strikeTimeoutRef.current) {
      clearTimeout(strikeTimeoutRef.current);
    }
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }

    const swingTime = Date.now();
    const reactionTime = swingTime - pitchData.timestamp;

    const perfectWindow = pitchData.type === 'fastball'
      ? { min: 420, max: 620 }
      : { min: 820, max: 1040 };

    const goodWindow = pitchData.type === 'fastball'
      ? { min: 360, max: 680 }
      : { min: 740, max: 1120 };

    let result: SwingResult = 'STRIKE';
    let timing = 'late';

    if (reactionTime >= perfectWindow.min && reactionTime <= perfectWindow.max) {
      result = 'HOME_RUN';
      timing = 'perfect';
      setMessage('🚀 HOME RUN!!!');
      triggerHomeRunEffects();
    } else if (reactionTime >= goodWindow.min && reactionTime <= goodWindow.max) {
      result = 'HIT';
      timing = 'good';
      setMessage('BASE HIT!');
    } else if (reactionTime < goodWindow.min) {
      result = 'WHIFF';
      timing = 'early';
      setMessage('Too early!');
    } else {
      result = 'STRIKE';
      timing = 'late';
      setMessage('Too late!');
    }

    setGameState('result');
    triggerBallFlight(result);
    resolveSwingLocal(result, timing);
  };

  const handleSwingOnline = () => {
    if (!pitchData || gameState !== 'hitting' || !socketRef.current) return;

    triggerSwingAnimation();

    const swingTime = Date.now();
    const reactionTime = swingTime - pitchData.timestamp;

    const perfectWindow = pitchData.type === 'fastball'
      ? { min: 420, max: 620 }
      : { min: 820, max: 1040 };

    const goodWindow = pitchData.type === 'fastball'
      ? { min: 360, max: 680 }
      : { min: 740, max: 1120 };

    let result: SwingResult = 'STRIKE';
    let timing = 'late';
    let swingMessage = 'Too late!';

    if (reactionTime >= perfectWindow.min && reactionTime <= perfectWindow.max) {
      result = 'HOME_RUN';
      timing = 'perfect';
      swingMessage = '🚀 HOME RUN!!!';
      triggerHomeRunEffects();
    } else if (reactionTime >= goodWindow.min && reactionTime <= goodWindow.max) {
      result = 'HIT';
      timing = 'good';
      swingMessage = 'BASE HIT!';
    } else if (reactionTime < goodWindow.min) {
      result = 'WHIFF';
      timing = 'early';
      swingMessage = 'Too early!';
    }

    socketRef.current.send(JSON.stringify({
      type: 'swing',
      roomCode,
      result,
      timing,
      message: swingMessage
    }));

    triggerBallFlight(result);
  };

  const startPitch = () => {
    if (isLocal) {
      startPitchLocal();
      return;
    }

    if (!socketRef.current || gameState !== 'waiting') return;
    socketRef.current.send(JSON.stringify({ type: 'startPitch', roomCode }));
  };

  const handleSwing = () => {
    if (isLocal) {
      handleSwingLocal();
      return;
    }

    handleSwingOnline();
  };

  const handleReset = () => {
    if (isLocal) {
      applyState(makeInitialState());
      setBallPosition({ y: 0, scale: 0.2 });
      setPitchData(null);
      setIsAnimating(false);
      setBallFlight(null);
      return;
    }

    socketRef.current?.send(JSON.stringify({ type: 'reset', roomCode }));
  };

  const handleReadyNextPlayer = () => {
    if (isLocal) {
      setGameState('waiting');
      setMessage(`${playerLabels[activePlayer]}: Tap to throw your first pitch!`);
      return;
    }

    socketRef.current?.send(JSON.stringify({ type: 'ready', roomCode }));
  };

  const activeScore = scores[activePlayer];

  useEffect(() => {
    if (!isLocal) {
      setConnectionStatus('connecting');
      const socket = new WebSocket(getWsUrl(serverHost));
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        setConnectionStatus('connected');
        socket.send(JSON.stringify({ type: 'join', roomCode }));
      });

      socket.addEventListener('message', event => {
        const payload = JSON.parse(event.data);

        if (payload.type === 'joined') {
          setPlayerId(payload.playerId as DerbyPlayer);
          applyState(payload.state as DerbyState);
        }

        if (payload.type === 'state') {
          applyState(payload.state as DerbyState);
          if (payload.state.gameState !== 'hitting') {
            setPitchData(null);
            setBallPosition({ y: 0, scale: 0.2 });
            setIsAnimating(false);
          }
          if (payload.state.gameState !== 'result') {
            setBallFlight(null);
          } else if (payload.state.message?.includes('HOME RUN')) {
            triggerBallFlight('HOME_RUN');
          } else if (payload.state.message?.includes('HIT')) {
            triggerBallFlight('HIT');
          }
        }

        if (payload.type === 'pitch') {
          const pitch = payload.pitch as PitchData;
          setPitchData(pitch);
          startPitchAnimation(pitch.duration);
        }

        if (payload.type === 'error') {
          setConnectionStatus('error');
          setMessage(payload.message || 'Unable to join room.');
        }
      });

      socket.addEventListener('close', () => {
        setConnectionStatus('offline');
      });

      socket.addEventListener('error', () => {
        setConnectionStatus('error');
      });

      return () => {
        socket.close();
      };
    }

    applyState(makeInitialState());

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (strikeTimeoutRef.current) {
        clearTimeout(strikeTimeoutRef.current);
      }
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }
      if (swingTimeoutRef.current) {
        clearTimeout(swingTimeoutRef.current);
      }
    };
  }, [isLocal, roomCode, serverHost]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (strikeTimeoutRef.current) {
        clearTimeout(strikeTimeoutRef.current);
      }
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }
      if (swingTimeoutRef.current) {
        clearTimeout(swingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-orange-500 to-red-600 text-white p-4">
      <style>{`
        @keyframes bat-swing {
          0% { transform: translateX(-50%) rotate(-35deg); }
          55% { transform: translateX(-50%) rotate(25deg); }
          100% { transform: translateX(-50%) rotate(-5deg); }
        }
        @keyframes ball-fly-hit {
          0% { transform: translate(-50%, 0) scale(0.9); opacity: 1; }
          100% { transform: translate(-220px, -140px) scale(0.7); opacity: 0; }
        }
        @keyframes ball-fly-homer {
          0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          100% { transform: translate(260px, -320px) scale(0.6); opacity: 0; }
        }
      `}</style>
      <div className="absolute top-6 left-6">
        <button
          onClick={onExit}
          className="bg-white text-orange-600 font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-orange-100"
        >
          ← Back
        </button>
      </div>

      <div className="text-center mb-4">
        <div className="text-sm uppercase tracking-widest text-orange-100">Home Run Derby</div>
        <div className="text-xs text-orange-200 mt-1">Room: {roomCode}</div>
        {mode === 'online' && (
          <div className="text-xs text-orange-200 mt-1">
            Status: {connectionStatus}
          </div>
        )}
      </div>

      <div className="bg-black bg-opacity-50 rounded-2xl px-6 py-4 mb-6 min-w-[320px]">
        <div className="flex justify-between items-center gap-6">
          <div className="text-center">
            <div className="text-xs text-orange-200 font-bold">PLAYER 1</div>
            <div className="text-4xl font-bold">{scores.player1.score}</div>
            <div className="text-xs text-orange-200">HR: {scores.player1.homeRuns}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-orange-200 font-bold">PLAYER 2</div>
            <div className="text-4xl font-bold">{scores.player2.score}</div>
            <div className="text-xs text-orange-200">HR: {scores.player2.homeRuns}</div>
          </div>
        </div>
      </div>

      <div className="text-3xl font-bold text-center mb-4 drop-shadow-lg">{message}</div>

      <div className="text-sm text-orange-100 mb-8">
        {gameState !== 'gameOver' && (
          <span>
            {playerLabels[activePlayer]} • Swing {swingsTaken + 1} of {SWINGS_PER_PLAYER}
          </span>
        )}
      </div>

      {(isAnimating || gameState === 'hitting') && (
        <div
          className="absolute w-10 h-10 bg-white rounded-full border-2 border-gray-300 transition-all duration-75"
          style={{
            top: `${20 + ballPosition.y}vh`,
            left: '50%',
            transform: `translateX(-50%) scale(${ballPosition.scale})`,
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
          }}
        />
      )}

      {ballFlight && (
        <div
          key={ballFlight.id}
          className="absolute w-5 h-5 bg-white rounded-full border-2 border-gray-300"
          style={{
            left: '50%',
            top: '60%',
            transform: 'translate(-50%, 0)',
            animation: `${ballFlight.variant === 'homer' ? 'ball-fly-homer' : 'ball-fly-hit'} 900ms ease-out forwards`,
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
          }}
        />
      )}

      <div
        className="absolute"
        style={{
          left: '50%',
          top: '62%',
          width: '12px',
          height: '110px',
          background: 'linear-gradient(180deg, #f97316 0%, #92400e 100%)',
          borderRadius: '6px',
          transformOrigin: 'bottom center',
          transform: 'translateX(-50%) rotate(-35deg)',
          boxShadow: '0 6px 12px rgba(0,0,0,0.35)',
          animation: batSwinging ? 'bat-swing 320ms ease-out' : undefined
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '10px',
            height: '28px',
            borderRadius: '6px',
            background: '#1f2937'
          }}
        />
      </div>

      <div className="mt-auto mb-12 flex flex-col items-center gap-4 w-full max-w-md">
        {gameState === 'waiting' && (
          <button
            onClick={startPitch}
            disabled={!isActivePlayer}
            className={`w-full font-bold py-6 px-12 rounded-xl text-2xl shadow-lg transform transition-all ${
              isActivePlayer
                ? 'bg-white text-orange-600 hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            🎯 Throw Pitch
          </button>
        )}

        {gameState === 'hitting' && (
          <button
            onClick={handleSwing}
            disabled={!isActivePlayer}
            className={`w-full font-bold py-8 px-12 rounded-xl text-3xl shadow-lg transform transition-all ${
              isActivePlayer
                ? 'bg-yellow-300 hover:bg-yellow-400 text-gray-900 hover:scale-105 animate-pulse'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            ⚾ SWING!
          </button>
        )}

        {gameState === 'betweenPlayers' && (
          <button
            onClick={handleReadyNextPlayer}
            disabled={!isActivePlayer}
            className={`w-full font-bold py-6 px-12 rounded-xl text-2xl shadow-lg transform transition-all ${
              isActivePlayer
                ? 'bg-white text-purple-700 hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            🙌 {playerLabels[activePlayer]} Start
          </button>
        )}
      </div>

      {gameState !== 'gameOver' && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 rounded-lg p-3 text-xs">
          <div className="font-bold mb-2">DERBY STATS</div>
          <div>Hits: {activeScore.hits}/{activeScore.totalSwings}</div>
          <div>Perfect Swings: {activeScore.perfectSwings}</div>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
          <div className="bg-white text-gray-900 rounded-2xl p-8 max-w-md text-center shadow-2xl">
            <div className="text-6xl mb-4">🏆</div>
            <div className="text-3xl font-bold mb-4">{message}</div>
            <div className="border-t border-gray-300 pt-4 mb-4 text-left">
              <div className="font-bold mb-2">Final Derby Stats</div>
              <div>Player 1 HRs: {scores.player1.homeRuns}</div>
              <div>Player 1 Score: {scores.player1.score}</div>
              <div className="mt-2">Player 2 HRs: {scores.player2.homeRuns}</div>
              <div>Player 2 Score: {scores.player2.score}</div>
            </div>
            <button
              onClick={handleReset}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
