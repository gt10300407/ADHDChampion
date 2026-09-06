import { describe, expect, it } from 'vitest';
import { calculateTotal, getGrade, makeResult } from './score';

const score = {
  dodge: 1000,
  color: 2000,
  memory: 3000,
  gauge: 400,
  distraction: 500,
  impulse: 600,
  combo: 700,
  penalties: 1200,
};

describe('score', () => {
  it('감점을 제외한 총점을 계산한다', () => {
    expect(calculateTotal(score)).toBe(7000);
  });

  it('총점은 0 미만으로 내려가지 않는다', () => {
    expect(calculateTotal({ ...score, penalties: 99999 })).toBe(0);
  });

  it('최고 기록을 유지한다', () => {
    expect(makeResult(score, 9000, {
      endReason: 'completed',
      validInputs: 12,
      invalidInputs: 2,
      panicInputs: 0,
      participatedTasks: ['lane', 'color', 'gauge'],
      overloads: 0,
    }).best).toBe(9000);
  });

  it('점수 구간에 따라 등급을 부여한다', () => {
    expect(getGrade(13000).grade).toBe('S+');
    expect(getGrade(7500).grade).toBe('A');
  });
});
