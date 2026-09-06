import { describe, expect, it } from 'vitest';
import { getControlMode, getDifficultyProfile, getDifficultyStage } from './difficulty';

describe('시간 기반 복합 난이도', () => {
  it('플레이 시간을 네 단계로 나눈다', () => {
    expect(getDifficultyStage(0, 60)).toBe(1);
    expect(getDifficultyStage(15, 60)).toBe(2);
    expect(getDifficultyStage(30, 60)).toBe(3);
    expect(getDifficultyStage(45, 60)).toBe(4);
  });

  it('단계가 오를수록 기억 길이와 복합 장애물 확률이 증가한다', () => {
    const first = getDifficultyProfile(1);
    const last = getDifficultyProfile(4);
    expect(last.memoryLength).toBeGreaterThan(first.memoryLength);
    expect(last.extraObstacleChance).toBeGreaterThan(first.extraObstacleChance);
    expect(last.alertLifetimeMs).toBeLessThan(first.alertLifetimeMs);
  });

  it('3단계부터 예고 후 좌우 반전 구간이 생긴다', () => {
    expect(getControlMode(2, 20, 60)).toBe('normal');
    expect(getControlMode(3, 34.2, 60)).toBe('warning');
    expect(getControlMode(3, 35.2, 60)).toBe('reversed');
    expect(getControlMode(4, 48.2, 60)).toBe('reversed');
  });
});
