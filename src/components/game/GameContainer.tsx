import { useEffect, useState } from 'react';
import { LobbyScreen } from './LobbyScreen';
import { BaseballGame } from './BaseballGame';

type GameMode = 'local' | 'online';

export function GameContainer() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [mode, setMode] = useState<GameMode>('local');
  const [serverHost, setServerHost] = useState(() => {
    const savedHost = window.localStorage.getItem('derby.serverHost');
    return savedHost || window.location.hostname;
  });

  useEffect(() => {
    if (serverHost) {
      window.localStorage.setItem('derby.serverHost', serverHost);
    }
  }, [serverHost]);

  const handleJoinRoom = (code: string) => {
    setMode('online');
    setRoomCode(code);
  };

  const handleCreateRoom = (code: string) => {
    setMode('online');
    setRoomCode(code);
  };

  const handleStartLocal = () => {
    setMode('local');
    setRoomCode('LOCAL');
  };

  const handleBackToLobby = () => {
    setRoomCode(null);
  };

  if (!roomCode) {
    return (
      <LobbyScreen
        onJoinRoom={handleJoinRoom}
        onCreateRoom={handleCreateRoom}
        onStartLocal={handleStartLocal}
        serverHost={serverHost}
        onServerHostChange={setServerHost}
      />
    );
  }

  return (
    <BaseballGame
      roomCode={roomCode}
      mode={mode}
      serverHost={serverHost}
      onExit={handleBackToLobby}
    />
  );
}
