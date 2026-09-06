import type { GameEndReason, ScoreBreakdown } from '../types/game';

export type QaGameSnapshot = {
  phase: 'intro' | 'playing' | 'boss' | 'finished';
  paused: boolean;
  timeLeft: number;
  gauge: number;
  score: ScoreBreakdown;
  validInputs: number;
  invalidInputs: number;
  panicInputs: number;
  participatedTasks: string[];
  overloads: number;
  inactiveMs: number;
  difficultyStage: number;
  controlMode: 'normal' | 'warning' | 'reversed';
  memoryLength: number;
  colorOrder: string[];
};

export type QaController = {
  getState: () => QaGameSnapshot;
  qualifyForBoss: () => void;
  setTimeLeft: (seconds: number) => void;
  openMemoryQuiz: () => void;
  finish: (reason?: GameEndReason) => void;
};

declare global {
  interface Window {
    __ADHD_QA__?: QaController;
    __ADHD_TEST_SEARCH__?: string;
  }
}

export {};
