// Game types for the baseball pitching/batting game

export type DerbyPlayer = 'player1' | 'player2';

export type GameState = 'waiting' | 'lobby' | 'pitching' | 'hitting' | 'result' | 'betweenPlayers' | 'gameOver';

export type PitchType = 'fastball' | 'changeup';

export type SwingResult = 'HOME_RUN' | 'HIT' | 'STRIKE' | 'WHIFF';

export interface PitchData {
  type: PitchType;
  zone?: string;
  timestamp: number;
  duration: number;
}

export interface SwingData {
  zone?: string;
  timestamp: number;
}

export interface GameScore {
  player1: number;
  player2: number;
}

export interface GameStats {
  homeRuns: number;
  hits: number;
  totalSwings: number;
  perfectSwings: number;
}

export interface DerbyScoreLine extends GameStats {
  score: number;
}

export interface DerbyState {
  gameState: GameState;
  message: string;
  activePlayer: DerbyPlayer;
  swingsTaken: number;
  scores: Record<DerbyPlayer, DerbyScoreLine>;
}

export interface RoomData {
  roomCode: string;
  players: string[];
  score: GameScore;
  currentRound: number;
  maxRounds: number;
}

export interface SocketEvents {
  // Client to Server
  join_game: (roomCode: string) => void;
  throw_pitch: (data: { roomID: string; type: PitchType; duration: number; timestamp: number }) => void;
  swing_result: (data: { roomID: string; result: SwingResult; timing: string }) => void;
  update_score: (data: { roomID: string; player: DerbyPlayer }) => void;
  
  // Server to Client
  assign_role: (role: DerbyPlayer) => void;
  game_start: () => void;
  incoming_pitch: (data: PitchData & { roomID: string }) => void;
  game_update: (data: { result: SwingResult; timing: string; score: GameScore }) => void;
  score_updated: (score: GameScore) => void;
  game_over: (winner: DerbyPlayer) => void;
}
