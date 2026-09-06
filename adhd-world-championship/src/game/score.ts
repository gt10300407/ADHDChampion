import type { GameMeta, GameResult, ScoreBreakdown } from '../types/game';

export const emptyScore = (): ScoreBreakdown => ({
  dodge: 0,
  color: 0,
  memory: 0,
  gauge: 0,
  distraction: 0,
  impulse: 0,
  combo: 0,
  penalties: 0,
});

export function calculateTotal(score: ScoreBreakdown): number {
  const positive =
    score.dodge +
    score.color +
    score.memory +
    score.gauge +
    score.distraction +
    score.impulse +
    score.combo;
  return Math.max(0, Math.round(positive - score.penalties));
}

export function getGrade(total: number): Pick<GameResult, 'grade' | 'title'> {
  if (total >= 13000) return { grade: 'S+', title: '세계관 최종 보스' };
  if (total >= 10000) return { grade: 'S', title: '산만력 국가대표' };
  if (total >= 7500) return { grade: 'A', title: '멀티태스킹 폭주기관차' };
  if (total >= 5000) return { grade: 'B', title: '혼란 적응형 인간' };
  if (total >= 3000) return { grade: 'C', title: '아직 뇌에 여유가 있음' };
  return { grade: 'D', title: '한 번에 하나씩 하는 타입' };
}

export function makeResult(score: ScoreBreakdown, previousBest: number, meta: GameMeta): GameResult {
  const total = calculateTotal(score);
  const best = Math.max(total, previousBest);
  return { total, best, breakdown: score, meta, ...getGrade(total) };
}
