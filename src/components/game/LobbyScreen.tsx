import { useState } from 'react';

interface LobbyScreenProps {
  onJoinRoom: (roomCode: string) => void;
}

export function LobbyScreen({ onJoinRoom }: LobbyScreenProps) {
  const [code, setCode] = useState('');

  const pressNumber = (num: number) => {
    if (code.length < 4) {
      setCode(prev => prev + num);
    }
  };

  const handleClear = () => {
    setCode('');
  };

  const handleGo = () => {
    if (code.length === 4) {
      onJoinRoom(code);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          ⚾ Baseball Game
        </h1>
        
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Enter Room Code
          </h2>
          
          {/* Code Display Boxes */}
          <div className="flex justify-center gap-3 mb-8">
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i} 
                className="w-16 h-20 bg-gray-100 border-2 border-gray-300 rounded-xl flex items-center justify-center"
              >
                <span className="text-4xl font-bold text-gray-800">
                  {code[i] || ''}
                </span>
              </div>
            ))}
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => pressNumber(num)}
                className="w-full h-16 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-2xl rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-md"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Bottom Row: Clear, 0, Go */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleClear}
              className="w-full h-16 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-md"
            >
              Clear
            </button>
            <button
              onClick={() => pressNumber(0)}
              className="w-full h-16 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-2xl rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-md"
            >
              0
            </button>
            <button
              onClick={handleGo}
              disabled={code.length !== 4}
              className={`w-full h-16 font-bold rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-md ${
                code.length === 4
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Go
            </button>
          </div>

          {/* Quick Join Option */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center mb-3">
              Quick Play (Single Player)
            </p>
            <button
              onClick={() => onJoinRoom('SOLO')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all"
            >
              Play Solo Mode
            </button>
          </div>
        </div>

        <p className="text-center text-white text-sm mt-4 opacity-75">
          Enter a 4-digit room code to join a friend, or play solo to practice!
        </p>
      </div>
    </div>
  );
}
