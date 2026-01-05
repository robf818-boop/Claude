import React from 'react';
import { PlayerPositions } from '../types';
import { Users } from 'lucide-react';

interface PlayerInstructionsProps {
  positions: PlayerPositions;
  selectedPosition: string | null;
  onSelectPosition: (position: string) => void;
}

export const PlayerInstructions: React.FC<PlayerInstructionsProps> = ({
  positions,
  selectedPosition,
  onSelectPosition,
}) => {
  const positionOrder: (keyof PlayerPositions)[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
        <Users size={20} />
        Player Instructions
      </div>

      <div className="space-y-2">
        {positionOrder.map((pos) => {
          const data = positions[pos];
          const isSelected = selectedPosition === pos;

          return (
            <button
              key={pos}
              onClick={() => onSelectPosition(pos)}
              className={`w-full text-left p-3 border rounded-lg transition-all ${
                isSelected
                  ? 'bg-blue-50 border-blue-500 shadow-md'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {pos}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {getPositionName(pos)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {data.instruction}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
        <p className="font-semibold text-yellow-800">Coach's Tip:</p>
        <p className="text-yellow-700 mt-1">
          Click on any position to highlight it on the field. Review each player's
          responsibility before running the simulation.
        </p>
      </div>
    </div>
  );
};

function getPositionName(pos: string): string {
  const names: Record<string, string> = {
    P: 'Pitcher',
    C: 'Catcher',
    '1B': 'First Base',
    '2B': 'Second Base',
    '3B': 'Third Base',
    SS: 'Shortstop',
    LF: 'Left Field',
    CF: 'Center Field',
    RF: 'Right Field',
  };
  return names[pos] || pos;
}
