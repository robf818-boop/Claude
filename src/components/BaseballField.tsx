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
    // Our data: y=15 is outfield, y=85 is home plate
    return {
      x: (x / 100) * viewBox,
      y: (y / 100) * viewBox, // Direct mapping: higher y = lower on screen
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
        {/* Definitions for gradients and patterns */}
        <defs>
          {/* Grass gradient */}
          <linearGradient id="grassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a4d0f" />
            <stop offset="50%" stopColor="#2d5016" />
            <stop offset="100%" stopColor="#1f5713" />
          </linearGradient>
          
          {/* Mowing stripe pattern */}
          <pattern id="mowingStripes" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(45)">
            <rect x="0" y="0" width="20" height="40" fill="#2d5016" />
            <rect x="20" y="0" width="20" height="40" fill="#1f5713" />
          </pattern>
          
          {/* Drop shadow for bases and players */}
          <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="1" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background - Outfield grass with pattern */}
        <rect x="0" y="0" width={viewBox} height={viewBox} fill="url(#grassGradient)" />
        <rect x="0" y="0" width={viewBox} height={viewBox} fill="url(#mowingStripes)" opacity="0.3" />

        {/* Outfield fence */}
        <path
          d={`
            M 20 50
            A ${baseDistance * 2.5} ${baseDistance * 2.5} 0 0 1 ${viewBox - 20} 50
          `}
          fill="none"
          stroke="#3d2817"
          strokeWidth="4"
        />

        {/* Warning track */}
        <path
          d={`
            M 35 70
            A ${baseDistance * 2.3} ${baseDistance * 2.3} 0 0 1 ${viewBox - 35} 70
          `}
          fill="none"
          stroke="#b8926a"
          strokeWidth="15"
          opacity="0.7"
        />

        {/* Outfield grass arc */}
        <path
          d={`
            M 0 ${viewBox}
            L ${home.x} ${home.y}
            A ${baseDistance * 2.2} ${baseDistance * 2.2} 0 0 1 ${viewBox} ${viewBox}
            Z
          `}
          fill="#3d6b1f"
          opacity="0.3"
        />

        {/* Infield dirt - perfect diamond with rounded edges */}
        <path
          d={`
            M ${home.x} ${home.y + 30}
            Q ${home.x - 25} ${home.y + 15} ${home.x - 40} ${home.y}
            Q ${home.x - 45} ${home.y - 10} ${third.x - 35} ${third.y - 25}
            Q ${third.x - 20} ${third.y - 35} ${third.x} ${third.y - 40}
            Q ${third.x + 15} ${third.y - 42} ${second.x - 40} ${second.y}
            L ${second.x} ${second.y - 40}
            L ${second.x + 40} ${second.y}
            Q ${first.x - 15} ${first.y - 42} ${first.x} ${first.y - 40}
            Q ${first.x + 20} ${first.y - 35} ${first.x + 35} ${first.y - 25}
            Q ${home.x + 45} ${home.y - 10} ${home.x + 40} ${home.y}
            Q ${home.x + 25} ${home.y + 15} ${home.x} ${home.y + 30}
            Z
          `}
          fill="#b8926a"
          stroke="#a68a5f"
          strokeWidth="1"
        />
        
        {/* Dirt texture overlay */}
        <path
          d={`
            M ${home.x} ${home.y + 30}
            Q ${home.x - 25} ${home.y + 15} ${home.x - 40} ${home.y}
            Q ${home.x - 45} ${home.y - 10} ${third.x - 35} ${third.y - 25}
            Q ${third.x - 20} ${third.y - 35} ${third.x} ${third.y - 40}
            Q ${third.x + 15} ${third.y - 42} ${second.x - 40} ${second.y}
            L ${second.x} ${second.y - 40}
            L ${second.x + 40} ${second.y}
            Q ${first.x - 15} ${first.y - 42} ${first.x} ${first.y - 40}
            Q ${first.x + 20} ${first.y - 35} ${first.x + 35} ${first.y - 25}
            Q ${home.x + 45} ${home.y - 10} ${home.x + 40} ${home.y}
            Q ${home.x + 25} ${home.y + 15} ${home.x} ${home.y + 30}
            Z
          `}
          fill="#c9a876"
          opacity="0.4"
        />

        {/* Pitcher's mound circle with enhanced styling */}
        <circle
          cx={pitcher.x}
          cy={pitcher.y}
          r="24"
          fill="#b8926a"
          stroke="#a68a5f"
          strokeWidth="2.5"
          filter="url(#dropShadow)"
        />
        <circle
          cx={pitcher.x}
          cy={pitcher.y}
          r="18"
          fill="#c9a876"
          opacity="0.5"
        />
        <circle
          cx={pitcher.x}
          cy={pitcher.y}
          r="12"
          fill="none"
          stroke="#8b7355"
          strokeWidth="2"
        />
        <circle
          cx={pitcher.x}
          cy={pitcher.y}
          r="3"
          fill="#8b7355"
        />

        {/* Foul lines - more prominent */}
        <line
          x1={home.x}
          y1={home.y}
          x2={first.x + 100}
          y2={first.y + 200}
          stroke="#ffffff"
          strokeWidth="3"
          opacity="0.9"
        />
        <line
          x1={home.x}
          y1={home.y}
          x2={third.x - 100}
          y2={third.y + 200}
          stroke="#ffffff"
          strokeWidth="3"
          opacity="0.9"
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

        {/* Batter's boxes */}
        {/* Left batter's box */}
        <rect
          x={home.x - 25}
          y={home.y - 5}
          width="12"
          height="20"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          opacity="0.7"
        />
        {/* Right batter's box */}
        <rect
          x={home.x + 13}
          y={home.y - 5}
          width="12"
          height="20"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          opacity="0.7"
        />
        {/* Catcher's box */}
        <rect
          x={home.x - 12}
          y={home.y + 8}
          width="24"
          height="14"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* Coaching boxes */}
        {/* First base coaching box */}
        <rect
          x={first.x + 15}
          y={first.y + 10}
          width="18"
          height="25"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeDasharray="4,2"
          opacity="0.5"
        />
        {/* Third base coaching box */}
        <rect
          x={third.x - 33}
          y={third.y + 10}
          width="18"
          height="25"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeDasharray="4,2"
          opacity="0.5"
        />

        {/* Home Plate - more accurate shape */}
        <path
          d={`
            M ${home.x} ${home.y + 10}
            L ${home.x - 9} ${home.y + 1}
            L ${home.x - 9} ${home.y - 9}
            L ${home.x} ${home.y - 14}
            L ${home.x + 9} ${home.y - 9}
            L ${home.x + 9} ${home.y + 1}
            Z
          `}
          fill="#ffffff"
          stroke="#333"
          strokeWidth="2"
          filter="url(#dropShadow)"
        />

        {/* First Base with shadow */}
        <rect
          x={first.x - 13}
          y={first.y - 13}
          width="26"
          height="26"
          fill={runners.first ? "#fbbf24" : "#ffffff"}
          stroke={runners.first ? "#f59e0b" : "#333"}
          strokeWidth="2.5"
          filter="url(#dropShadow)"
        />
        {runners.first && (
          <circle cx={first.x} cy={first.y} r="7" fill="#f59e0b" />
        )}

        {/* Second Base with shadow */}
        <rect
          x={second.x - 13}
          y={second.y - 13}
          width="26"
          height="26"
          fill={runners.second ? "#fbbf24" : "#ffffff"}
          stroke={runners.second ? "#f59e0b" : "#333"}
          strokeWidth="2.5"
          transform={`rotate(45 ${second.x} ${second.y})`}
          filter="url(#dropShadow)"
        />
        {runners.second && (
          <circle cx={second.x} cy={second.y} r="7" fill="#f59e0b" />
        )}

        {/* Third Base with shadow */}
        <rect
          x={third.x - 13}
          y={third.y - 13}
          width="26"
          height="26"
          fill={runners.third ? "#fbbf24" : "#ffffff"}
          stroke={runners.third ? "#f59e0b" : "#333"}
          strokeWidth="2.5"
          filter="url(#dropShadow)"
        />
        {runners.third && (
          <circle cx={third.x} cy={third.y} r="7" fill="#f59e0b" />
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
              {/* Player circle with shadow */}
              <circle
                cx={playerPos.x}
                cy={playerPos.y}
                r={isSelected ? "18" : "14"}
                fill={isSelected ? "#3b82f6" : "#ef4444"}
                stroke={isSelected ? "#1d4ed8" : "#991b1b"}
                strokeWidth={isSelected ? "3" : "2.5"}
                className="cursor-pointer transition-all"
                filter="url(#dropShadow)"
              />

              {/* Position label */}
              <text
                x={playerPos.x}
                y={playerPos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={isSelected ? "12" : "10"}
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
