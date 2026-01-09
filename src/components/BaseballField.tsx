import React from 'react';
import { PlayerPositions, BaseRunners } from '../types';

interface BaseballFieldProps {
  positions?: PlayerPositions;
  runners?: BaseRunners;
  selectedPosition?: string | null;
  ballLocation?: string;
  playType?: string;
}

export const BaseballField: React.FC<BaseballFieldProps> = ({
  positions,
  runners = { first: false, second: false, third: false },
  selectedPosition = null,
  ballLocation,
  playType,
}) => {
  const viewBox = 600;
  const center = viewBox / 2;

  // Baseball field uses a proper diamond with 90-foot bases
  // Scale: diamond is about 50% of viewBox width
  const baseDistance = viewBox * 0.25; // Distance from home to each base

  // Base positions forming a perfect diamond
  const home = { x: center, y: viewBox * 0.85 };
  const first = { x: center + baseDistance, y: home.y - baseDistance };
  const second = { x: center, y: home.y - baseDistance * 2 };
  const third = { x: center - baseDistance, y: home.y - baseDistance };

  // Pitcher's mound (60% of the way from home to second)
  const pitcher = { x: center, y: home.y - baseDistance * 1.2 };

  // Convert position data (0-100 percentage) to SVG coordinates
  const toFieldCoords = (x: number, y: number) => {
    // x: 0 = left edge, 50 = center, 100 = right edge
    // y: 0 = top (outfield), 100 = bottom (home plate)
    return {
      x: (x / 100) * viewBox,
      y: ((100 - y) / 100) * viewBox, // Invert Y so higher numbers are at bottom
    };
  };

  // Determine ball position based on ballLocation
  const getBallPosition = () => {
    if (!ballLocation) return null;

    switch (ballLocation) {
      case 'deep-right':
        return toFieldCoords(84, 18);
      case 'deep-left':
        return toFieldCoords(16, 18);
      case 'center':
        return toFieldCoords(50, 15);
      case 'left-center-gap':
        return toFieldCoords(35, 18);
      case 'right-center-gap':
        return toFieldCoords(65, 18);
      case 'shortstop':
        return toFieldCoords(42, 48);
      case 'second-base':
        return toFieldCoords(58, 48);
      case 'third-base':
        return toFieldCoords(32, 60);
      case 'first-base':
        return toFieldCoords(68, 60);
      case 'infield':
        return toFieldCoords(50, 55);
      case 'outfield':
        return toFieldCoords(50, 20);
      default:
        return null;
    }
  };

  const ballPos = getBallPosition();

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        className="w-full h-auto"
        style={{ maxHeight: '85vh' }}
      >
        {/* Background - Outfield grass */}
        <rect x="0" y="0" width={viewBox} height={viewBox} fill="#2d5016" />

        {/* Outfield grass arc */}
        <path
          d={`
            M 0 ${viewBox}
            L ${home.x} ${home.y}
            A ${baseDistance * 2.2} ${baseDistance * 2.2} 0 0 1 ${viewBox} ${viewBox}
            Z
          `}
          fill="#3d6b1f"
        />

        {/* Infield dirt - perfect diamond plus extensions */}
        <path
          d={`
            M ${home.x} ${home.y + 30}
            L ${home.x - 40} ${home.y}
            L ${third.x - 35} ${third.y - 25}
            L ${third.x} ${third.y - 40}
            L ${second.x - 40} ${second.y}
            L ${second.x} ${second.y - 40}
            L ${second.x + 40} ${second.y}
            L ${first.x} ${first.y - 40}
            L ${first.x + 35} ${first.y - 25}
            L ${home.x + 40} ${home.y}
            Z
          `}
          fill="#c9a876"
          stroke="#a68a5f"
          strokeWidth="1"
        />

        {/* Pitcher's mound circle */}
        <circle
          cx={pitcher.x}
          cy={pitcher.y}
          r="24"
          fill="#c9a876"
          stroke="#a68a5f"
          strokeWidth="2"
        />
        <circle
          cx={pitcher.x}
          cy={pitcher.y}
          r="12"
          fill="none"
          stroke="#a68a5f"
          strokeWidth="1.5"
        />

        {/* Foul lines */}
        <line
          x1={home.x}
          y1={home.y}
          x2={first.x + 100}
          y2={first.y + 200}
          stroke="#fff"
          strokeWidth="2.5"
          opacity="0.8"
        />
        <line
          x1={home.x}
          y1={home.y}
          x2={third.x - 100}
          y2={third.y + 200}
          stroke="#fff"
          strokeWidth="2.5"
          opacity="0.8"
        />

        {/* Base paths */}
        <line
          x1={home.x}
          y1={home.y}
          x2={first.x}
          y2={first.y}
          stroke="#fff"
          strokeWidth="2"
          opacity="0.6"
          strokeDasharray="4,4"
        />
        <line
          x1={first.x}
          y1={first.y}
          x2={second.x}
          y2={second.y}
          stroke="#fff"
          strokeWidth="2"
          opacity="0.6"
          strokeDasharray="4,4"
        />
        <line
          x1={second.x}
          y1={second.y}
          x2={third.x}
          y2={third.y}
          stroke="#fff"
          strokeWidth="2"
          opacity="0.6"
          strokeDasharray="4,4"
        />
        <line
          x1={third.x}
          y1={third.y}
          x2={home.x}
          y2={home.y}
          stroke="#fff"
          strokeWidth="2"
          opacity="0.6"
          strokeDasharray="4,4"
        />

        {/* Grass cut line (arc separating infield/outfield grass) */}
        <path
          d={`
            M ${third.x - 35} ${third.y - 35}
            A ${baseDistance * 1.5} ${baseDistance * 1.5} 0 0 1 ${first.x + 35} ${first.y - 35}
          `}
          fill="none"
          stroke="#2d5016"
          strokeWidth="3"
        />

        {/* Home Plate */}
        <path
          d={`
            M ${home.x} ${home.y + 8}
            L ${home.x - 8} ${home.y}
            L ${home.x - 8} ${home.y - 8}
            L ${home.x} ${home.y - 12}
            L ${home.x + 8} ${home.y - 8}
            L ${home.x + 8} ${home.y}
            Z
          `}
          fill={runners.first || runners.second || runners.third ? "#fff" : "#fff"}
          stroke="#333"
          strokeWidth="1.5"
        />

        {/* First Base */}
        <rect
          x={first.x - 12}
          y={first.y - 12}
          width="24"
          height="24"
          fill={runners.first ? "#fbbf24" : "#fff"}
          stroke={runners.first ? "#f59e0b" : "#333"}
          strokeWidth="2"
        />
        {runners.first && (
          <circle cx={first.x} cy={first.y} r="6" fill="#f59e0b" />
        )}

        {/* Second Base */}
        <rect
          x={second.x - 12}
          y={second.y - 12}
          width="24"
          height="24"
          fill={runners.second ? "#fbbf24" : "#fff"}
          stroke={runners.second ? "#f59e0b" : "#333"}
          strokeWidth="2"
          transform={`rotate(45 ${second.x} ${second.y})`}
        />
        {runners.second && (
          <circle cx={second.x} cy={second.y} r="6" fill="#f59e0b" />
        )}

        {/* Third Base */}
        <rect
          x={third.x - 12}
          y={third.y - 12}
          width="24"
          height="24"
          fill={runners.third ? "#fbbf24" : "#fff"}
          stroke={runners.third ? "#f59e0b" : "#333"}
          strokeWidth="2"
        />
        {runners.third && (
          <circle cx={third.x} cy={third.y} r="6" fill="#f59e0b" />
        )}

        {/* Ball Path Indicator */}
        {ballPos && playType && (
          <g opacity="0.7">
            {/* Ball trajectory line */}
            {(playType === 'fly-ball' || playType === 'ground-ball' || playType === 'extra-base-hit') && (
              <line
                x1={home.x}
                y1={home.y - 10}
                x2={ballPos.x}
                y2={ballPos.y}
                stroke="#ffd700"
                strokeWidth="2"
                strokeDasharray="6,4"
                opacity="0.6"
              />
            )}

            {/* Ball marker */}
            <circle
              cx={ballPos.x}
              cy={ballPos.y}
              r="8"
              fill="#fff"
              stroke="#ffd700"
              strokeWidth="2"
            />
            <circle
              cx={ballPos.x}
              cy={ballPos.y}
              r="4"
              fill="#ffd700"
            />
          </g>
        )}

        {/* Players */}
        {positions && Object.entries(positions).map(([pos, data]) => {
          const playerPos = toFieldCoords(data.x, data.y);
          const isSelected = selectedPosition === pos;

          return (
            <g key={pos}>
              {/* Player circle */}
              <circle
                cx={playerPos.x}
                cy={playerPos.y}
                r={isSelected ? "16" : "12"}
                fill={isSelected ? "#3b82f6" : "#ef4444"}
                stroke={isSelected ? "#1d4ed8" : "#991b1b"}
                strokeWidth={isSelected ? "2.5" : "2"}
                className="cursor-pointer transition-all"
              />

              {/* Position label */}
              <text
                x={playerPos.x}
                y={playerPos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="10"
                fontWeight="bold"
                className="pointer-events-none select-none"
              >
                {pos}
              </text>
            </g>
          );
        })}

        {/* Field position labels */}
        <text
          x={center}
          y={viewBox * 0.08}
          textAnchor="middle"
          fill="#fff"
          fontSize="14"
          fontWeight="600"
          opacity="0.9"
        >
          CENTER FIELD
        </text>
        <text
          x={viewBox * 0.15}
          y={viewBox * 0.15}
          textAnchor="middle"
          fill="#fff"
          fontSize="13"
          fontWeight="600"
          opacity="0.85"
        >
          LEFT FIELD
        </text>
        <text
          x={viewBox * 0.85}
          y={viewBox * 0.15}
          textAnchor="middle"
          fill="#fff"
          fontSize="13"
          fontWeight="600"
          opacity="0.85"
        >
          RIGHT FIELD
        </text>
      </svg>
    </div>
  );
};
