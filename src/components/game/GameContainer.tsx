import { useState } from 'react';
import { LobbyScreen } from './LobbyScreen';
import { BaseballGame } from './BaseballGame';

type GameMode = 'local' | 'online';

export function GameContainer() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [mode, setMode] = useState<GameMode>('local');

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
      />
    );
  }

  return <BaseballGame roomCode={roomCode} mode={mode} onExit={handleBackToLobby} />;
}
