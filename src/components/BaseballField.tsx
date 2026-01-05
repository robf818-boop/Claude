import React from 'react';
import { PlayerPositions, BaseRunners } from '../types';

interface BaseballFieldProps {
  positions?: PlayerPositions;
  runners?: BaseRunners;
  showInstructions?: boolean;
  selectedPosition?: string | null;
}

export const BaseballField: React.FC<BaseballFieldProps> = ({
  positions,
  runners = { first: false, second: false, third: false },
  showInstructions = false,
  selectedPosition = null,
}) => {
  const fieldSize = 600;
  const scale = fieldSize / 100;

  // Convert percentage coordinates to SVG coordinates
  const toSVG = (x: number, y: number) => ({
    x: x * scale,
    y: (100 - y) * scale, // Flip y-axis
  });

  // Base positions
  const home = toSVG(50, 85);
  const first = toSVG(72, 72);
  const second = toSVG(50, 50);
  const third = toSVG(28, 72);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${fieldSize} ${fieldSize}`}
        className="w-full h-full bg-green-700"
        style={{ maxHeight: '90vh' }}
      >
        {/* Outfield grass */}
        <circle cx={home.x} cy={home.y} r={fieldSize * 0.75} fill="#2d5016" />

        {/* Infield dirt */}
        <path
          d={`
            M ${home.x} ${home.y}
            L ${first.x} ${first.y}
            L ${second.x} ${second.y}
            L ${third.x} ${third.y}
            Z
          `}
          fill="#c19a6b"
          stroke="#8b7355"
          strokeWidth="2"
        />

        {/* Pitcher's mound */}
        <circle cx={toSVG(50, 55).x} cy={toSVG(50, 55).y} r="18" fill="#c19a6b" stroke="#8b7355" strokeWidth="2" />
        <circle cx={toSVG(50, 55).x} cy={toSVG(50, 55).y} r="8" fill="#fff" fillOpacity="0.3" />

        {/* Foul lines */}
        <line
          x1={home.x}
          y1={home.y}
          x2={first.x}
          y2={first.y + 200}
          stroke="#fff"
          strokeWidth="3"
        />
        <line
          x1={home.x}
          y1={home.y}
          x2={third.x}
          y2={third.y + 200}
          stroke="#fff"
          strokeWidth="3"
        />

        {/* Base paths */}
        <line x1={home.x} y1={home.y} x2={first.x} y2={first.y} stroke="#fff" strokeWidth="2" strokeDasharray="5,5" />
        <line x1={first.x} y1={first.y} x2={second.x} y2={second.y} stroke="#fff" strokeWidth="2" strokeDasharray="5,5" />
        <line x1={second.x} y1={second.y} x2={third.x} y2={third.y} stroke="#fff" strokeWidth="2" strokeDasharray="5,5" />
        <line x1={third.x} y1={third.y} x2={home.x} y2={home.y} stroke="#fff" strokeWidth="2" strokeDasharray="5,5" />

        {/* Bases */}
        <rect x={home.x - 8} y={home.y - 2} width="16" height="16" fill="#fff" transform={`rotate(45 ${home.x} ${home.y})`} />
        <rect x={first.x - 10} y={first.y - 10} width="20" height="20" fill={runners.first ? "#fbbf24" : "#fff"} stroke={runners.first ? "#f59e0b" : "#666"} strokeWidth="2" />
        <rect x={second.x - 10} y={second.y - 10} width="20" height="20" fill={runners.second ? "#fbbf24" : "#fff"} stroke={runners.second ? "#f59e0b" : "#666"} strokeWidth="2" />
        <rect x={third.x - 10} y={third.y - 10} width="20" height="20" fill={runners.third ? "#fbbf24" : "#fff"} stroke={runners.third ? "#f59e0b" : "#666"} strokeWidth="2" />

        {/* Players */}
        {positions && Object.entries(positions).map(([pos, data]) => {
          const svgPos = toSVG(data.x, data.y);
          const isSelected = selectedPosition === pos;

          return (
            <g key={pos}>
              {/* Player circle */}
              <circle
                cx={svgPos.x}
                cy={svgPos.y}
                r={isSelected ? "20" : "16"}
                fill={isSelected ? "#3b82f6" : "#ef4444"}
                stroke={isSelected ? "#1d4ed8" : "#991b1b"}
                strokeWidth={isSelected ? "3" : "2"}
                className="cursor-pointer transition-all"
              />

              {/* Position label */}
              <text
                x={svgPos.x}
                y={svgPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="14"
                fontWeight="bold"
                className="pointer-events-none select-none"
              >
                {pos}
              </text>

              {/* Instruction popup */}
              {showInstructions && isSelected && (
                <g>
                  <rect
                    x={svgPos.x + 25}
                    y={svgPos.y - 30}
                    width="200"
                    height="auto"
                    rx="5"
                    fill="#1f2937"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                  <text
                    x={svgPos.x + 35}
                    y={svgPos.y - 10}
                    fill="#fff"
                    fontSize="11"
                    className="pointer-events-none"
                  >
                    {data.instruction.length > 30
                      ? data.instruction.substring(0, 30) + '...'
                      : data.instruction}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Field labels */}
        <text x={toSVG(50, 5).x} y={toSVG(50, 5).y} textAnchor="middle" fill="#fff" fontSize="16" fontWeight="bold">
          CENTER FIELD
        </text>
        <text x={toSVG(15, 15).x} y={toSVG(15, 15).y} textAnchor="middle" fill="#fff" fontSize="16" fontWeight="bold">
          LEFT FIELD
        </text>
        <text x={toSVG(85, 15).x} y={toSVG(85, 15).y} textAnchor="middle" fill="#fff" fontSize="16" fontWeight="bold">
          RIGHT FIELD
        </text>
      </svg>
    </div>
  );
};
