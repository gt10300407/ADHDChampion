export type Screen = 'tutorial' | 'practice' | 'home' | 'playing' | 'result';

export type ScoreBreakdown = {
  dodge: number;
  color: number;
  memory: number;
  gauge: number;
  distraction: number;
  impulse: number;
  combo: number;
  penalties: number;
};

export type GameEndReason = 'completed' | 'inactive' | 'overload' | 'boss-ineligible';

export type GameMeta = {
  endReason: GameEndReason;
  validInputs: number;
  invalidInputs: number;
  panicInputs: number;
  participatedTasks: string[];
  overloads: number;
};

export type GameResult = {
  total: number;
  best: number;
  grade: string;
  title: string;
  breakdown: ScoreBreakdown;
  meta: GameMeta;
};

export type Obstacle = {
  id: number;
  lane: 0 | 1 | 2;
  y: number;
  speed: number;
  hit: boolean;
};
