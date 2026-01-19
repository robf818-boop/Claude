import { useState } from 'react';
import { GameRole } from '../../types/game';
import { LobbyScreen } from './LobbyScreen';
import { BaseballGame } from './BaseballGame';

export function GameContainer() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [role, setRole] = useState<GameRole>('pitcher');
  const [showRoleSelect, setShowRoleSelect] = useState(false);

  const handleJoinRoom = (code: string) => {
    setRoomCode(code);
    if (code === 'SOLO') {
      // In solo mode, show role selection
      setShowRoleSelect(true);
    } else {
      // In multiplayer, role would be assigned by server
      // For now, we'll ask the user to choose
      setShowRoleSelect(true);
    }
  };

  const handleSelectRole = (selectedRole: GameRole) => {
    setRole(selectedRole);
    setShowRoleSelect(false);
  };

  const handleBackToLobby = () => {
    setRoomCode(null);
    setShowRoleSelect(false);
  };

  // Lobby screen
  if (!roomCode) {
    return <LobbyScreen onJoinRoom={handleJoinRoom} />;
  }

  // Role selection
  if (showRoleSelect) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Choose Your Role
          </h2>
          <p className="text-gray-600 text-center mb-8">
            Room Code: <span className="font-bold text-purple-600">{roomCode}</span>
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => handleSelectRole('pitcher')}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-6 px-8 rounded-xl text-xl shadow-lg transform hover:scale-105 transition-all"
            >
              <div className="text-4xl mb-2">🔥</div>
              <div>PITCHER</div>
              <div className="text-sm opacity-90 mt-1">Choose pitch type and timing</div>
            </button>

            <button
              onClick={() => handleSelectRole('batter')}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-6 px-8 rounded-xl text-xl shadow-lg transform hover:scale-105 transition-all"
            >
              <div className="text-4xl mb-2">⚾</div>
              <div>BATTER</div>
              <div className="text-sm opacity-90 mt-1">Time your swing perfectly</div>
            </button>
          </div>

          <button
            onClick={handleBackToLobby}
            className="w-full mt-6 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Game screen
  return <BaseballGame role={role} roomCode={roomCode} />;
}
