import { describe, expect, it } from 'vitest';
import { readRuntimeConfig } from './runtime';

describe('경기별 랜덤 시드', () => {
  it('일반 경기는 시작할 때마다 다른 시드를 만든다', () => {
    const first = readRuntimeConfig('');
    const second = readRuntimeConfig('');
    expect(first.qa).toBe(false);
    expect(second.qa).toBe(false);
    expect(first.seed).not.toBe(second.seed);
  });

  it('QA 모드는 지정 시드를 고정한다', () => {
    expect(readRuntimeConfig('?qa=1&seed=1234').seed).toBe(1234);
  });
});
