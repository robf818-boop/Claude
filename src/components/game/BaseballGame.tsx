import { useState, useEffect, useRef } from 'react';
import { GameRole, GameState, PitchType, PitchData, SwingResult, GameScore, GameStats } from '../../types/game';

interface BaseballGameProps {
  role: GameRole;
  roomCode: string;
  onGameOver?: (winner: GameRole, stats: GameStats) => void;
}

export function BaseballGame({ role, roomCode }: BaseballGameProps) {
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [pitchData, setPitchData] = useState<PitchData | null>(null);
  const [message, setMessage] = useState('Ready?');
  const [score, setScore] = useState<GameScore>({ pitcher: 0, batter: 0 });
  const [stats, setStats] = useState<GameStats>({
    homeRuns: 0,
    fastballsHit: 0,
    fooledCount: 0,
    totalSwings: 0,
    hits: 0
  });

  // Animation state
  const [ballPosition, setBallPosition] = useState({ y: 0, scale: 0.2 });
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();

  // Pitcher selects a pitch
  const handlePitch = (type: PitchType) => {
    const duration = type === 'fastball' ? 600 : 1200;
    const newPitch: PitchData = { 
      type, 
      timestamp: Date.now(),
      duration 
    };
    
    setPitchData(newPitch);
    setGameState('hitting');
    setMessage(`${type.toUpperCase()} incoming!`);
    
    // Start pitch animation
    startPitchAnimation(duration);
    
    // In a real app, emit to socket: socket.emit('throw_pitch', { roomID, type, duration, timestamp })
    
    // Auto-strike after animation completes
    setTimeout(() => {
      if (gameState === 'hitting') {
        setGameState('result');
        setMessage('STRIKE! No swing.');
        setScore(prev => ({ ...prev, pitcher: prev.pitcher + 1 }));
        setTimeout(() => resetRound(), 2000);
      }
    }, duration + 100);
  };

  // Batter reacts to incoming pitch
  const handleSwing = () => {
    if (!pitchData || gameState !== 'hitting') return;
    
    const swingTime = Date.now();
    const reactionTime = swingTime - pitchData.timestamp;
    
    setStats(prev => ({ ...prev, totalSwings: prev.totalSwings + 1 }));
    
    // Timing windows based on pitch type
    const perfectWindow = pitchData.type === 'fastball' 
      ? { min: 400, max: 600 } 
      : { min: 800, max: 1000 };
    
    const goodWindow = pitchData.type === 'fastball'
      ? { min: 350, max: 650 }
      : { min: 700, max: 1100 };
    
    let result: SwingResult;
    let timing: string;
    
    if (reactionTime >= perfectWindow.min && reactionTime <= perfectWindow.max) {
      result = 'HOME_RUN';
      timing = 'perfect';
      setMessage('🚀 HOME RUN!');
      setScore(prev => ({ ...prev, batter: prev.batter + 3 }));
      setStats(prev => ({
        ...prev,
        homeRuns: prev.homeRuns + 1,
        hits: prev.hits + 1,
        fastballsHit: pitchData.type === 'fastball' ? prev.fastballsHit + 1 : prev.fastballsHit
      }));
      triggerHomeRunEffects();
    } else if (reactionTime >= goodWindow.min && reactionTime <= goodWindow.max) {
      result = 'HIT';
      timing = 'good';
      setMessage('BASE HIT!');
      setScore(prev => ({ ...prev, batter: prev.batter + 1 }));
      setStats(prev => ({
        ...prev,
        hits: prev.hits + 1,
        fastballsHit: pitchData.type === 'fastball' ? prev.fastballsHit + 1 : prev.fastballsHit
      }));
    } else if (reactionTime < goodWindow.min) {
      result = 'WHIFF';
      timing = 'early';
      setMessage('TOO EARLY! Whiff!');
      setScore(prev => ({ ...prev, pitcher: prev.pitcher + 1 }));
      if (pitchData.type === 'changeup') {
        setStats(prev => ({ ...prev, fooledCount: prev.fooledCount + 1 }));
      }
    } else {
      result = 'STRIKE';
      timing = 'late';
      setMessage('TOO LATE! Strike!');
      setScore(prev => ({ ...prev, pitcher: prev.pitcher + 1 }));
    }
    
    setGameState('result');
    
    // In a real app: socket.emit('swing_result', { roomID, result, timing })
    console.log('Swing result:', result, 'Timing:', timing);
    
    setTimeout(() => resetRound(), 2000);
  };

  const startPitchAnimation = (duration: number) => {
    setIsAnimating(true);
    setBallPosition({ y: 0, scale: 0.2 });
    
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad
      const easeProgress = 1 - Math.pow(1 - progress, 2);
      
      setBallPosition({
        y: easeProgress * 60, // 60vh travel
        scale: 0.2 + (easeProgress * 2.8) // Scale from 0.2 to 3
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
    // Vibration if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
    
    // Could add audio here
    // const audio = new Audio('/sounds/crack.mp3');
    // audio.play();
  };

  const resetRound = () => {
    setGameState(role === 'pitcher' ? 'pitching' : 'waiting');
    setPitchData(null);
    setMessage(role === 'pitcher' ? 'Select your pitch' : 'Wait for pitch...');
    setBallPosition({ y: 0, scale: 0.2 });
    
    // Check for game over (first to 10 points)
    if (score.pitcher >= 10 || score.batter >= 10) {
      setGameState('gameOver');
      const winner = score.pitcher > score.batter ? 'pitcher' : 'batter';
      setMessage(`Game Over! ${winner.toUpperCase()} WINS!`);
    }
  };

  useEffect(() => {
    // Initialize game state based on role
    setGameState(role === 'pitcher' ? 'pitching' : 'waiting');
    setMessage(role === 'pitcher' ? 'Select your pitch' : 'Waiting for pitch...');
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [role]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-700 to-green-900 text-white p-4">
      {/* Scoreboard */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 rounded-xl p-6 border-4 border-yellow-500 shadow-2xl min-w-[300px]">
        <div className="flex justify-around items-center gap-8">
          <div className="text-center">
            <div className="text-xs text-gray-400 font-bold mb-1">PITCHER</div>
            <div className="text-4xl font-bold text-white">{score.pitcher}</div>
          </div>
          <div className="w-1 h-12 bg-gray-700"></div>
          <div className="text-center">
            <div className="text-xs text-gray-400 font-bold mb-1">BATTER</div>
            <div className="text-4xl font-bold text-white">{score.batter}</div>
          </div>
        </div>
      </div>

      {/* Role indicator */}
      <div className="absolute top-40 text-center">
        <div className="text-sm text-green-300 mb-2">YOUR ROLE</div>
        <div className="text-3xl font-bold uppercase">{role}</div>
        <div className="text-sm text-gray-300 mt-1">Room: {roomCode}</div>
      </div>

      {/* Status Message */}
      <div className="text-4xl font-bold text-center mb-8 mt-48 drop-shadow-lg">
        {message}
      </div>

      {/* Baseball */}
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

      {/* Controls */}
      <div className="mt-auto mb-12 flex flex-col items-center gap-4 w-full max-w-md">
        {role === 'pitcher' && gameState === 'pitching' && (
          <div className="flex gap-4 w-full">
            <button
              onClick={() => handlePitch('fastball')}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-6 px-8 rounded-xl text-xl shadow-lg transform hover:scale-105 transition-all"
            >
              🔥 FASTBALL
            </button>
            <button
              onClick={() => handlePitch('changeup')}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-6 px-8 rounded-xl text-xl shadow-lg transform hover:scale-105 transition-all"
            >
              🌙 CHANGEUP
            </button>
          </div>
        )}

        {role === 'batter' && gameState === 'hitting' && (
          <button
            onClick={handleSwing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-8 px-12 rounded-xl text-2xl shadow-lg transform hover:scale-105 transition-all animate-pulse"
          >
            ⚾ SWING!
          </button>
        )}

        {gameState === 'waiting' && role === 'batter' && (
          <div className="text-center text-gray-300">
            <div className="animate-pulse">Waiting for pitcher...</div>
          </div>
        )}
      </div>

      {/* Stats */}
      {gameState !== 'gameOver' && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 rounded-lg p-3 text-xs">
          <div className="font-bold mb-2">STATS</div>
          <div>Home Runs: {stats.homeRuns}</div>
          <div>Hits: {stats.hits}/{stats.totalSwings}</div>
          <div>Fastballs Hit: {stats.fastballsHit}</div>
          {role === 'pitcher' && <div>Fooled: {stats.fooledCount}</div>}
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameOver' && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
          <div className="bg-white text-gray-900 rounded-2xl p-8 max-w-md text-center shadow-2xl">
            <div className="text-6xl mb-4">🏆</div>
            <div className="text-3xl font-bold mb-4">
              {score.pitcher > score.batter ? 'PITCHER' : 'BATTER'} WINS!
            </div>
            <div className="border-t border-gray-300 pt-4 mb-4 text-left">
              <div className="font-bold mb-2">Final Stats:</div>
              <div>Home Runs: {stats.homeRuns}</div>
              <div>Total Hits: {stats.hits}</div>
              <div>Hit Rate: {stats.totalSwings > 0 ? Math.round((stats.hits / stats.totalSwings) * 100) : 0}%</div>
              <div>Fastballs Hit: {stats.fastballsHit}</div>
              <div>Times Fooled: {stats.fooledCount}</div>
            </div>
            <button
              onClick={() => window.location.reload()}
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
