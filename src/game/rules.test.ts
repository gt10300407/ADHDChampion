import { describe, expect, it } from 'vitest';
import { canEnterBoss, isInactive, isPanicBurst } from './rules';

describe('game rules', () => {
  it('무입력 또는 단일 임무 사용자는 보스에 진입할 수 없다', () => {
    expect(canEnterBoss(0, 0)).toBe(false);
    expect(canEnterBoss(20, 1)).toBe(false);
  });

  it('충분히 참여한 사용자만 보스에 진입한다', () => {
    expect(canEnterBoss(8, 3)).toBe(true);
  });

  it('무입력 제한 시간을 넘으면 탈락한다', () => {
    expect(isInactive(9_999, 10_000)).toBe(false);
    expect(isInactive(10_000, 10_000)).toBe(true);
  });

  it('짧은 시간의 과도한 입력을 패닉 연타로 판정한다', () => {
    const times = Array.from({ length: 11 }, (_, index) => 1000 + index * 50);
    expect(isPanicBurst(times, 1500)).toBe(true);
  });
});
