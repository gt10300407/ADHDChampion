export type GameRuntimeConfig = {
  qa: boolean;
  durationSeconds: number;
  finalSeconds: number;
  introMs: number;
  inactivityWarningMs: number;
  inactivityFailMs: number;
  disableInactivity: boolean;
  seed: number;
};

function readNumber(params: URLSearchParams, key: string, fallback: number, min: number, max: number): number {
  const raw = Number(params.get(key));
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, raw));
}

function createRunSeed(): number {
  try {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return Math.max(1, buffer[0]! & 0x7fffffff);
  } catch {
    return Math.max(1, (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) & 0x7fffffff);
  }
}

export function readRuntimeConfig(search = window.__ADHD_TEST_SEARCH__ ?? window.location.search): GameRuntimeConfig {
  const params = new URLSearchParams(search);
  const qa = params.get('qa') === '1';

  return {
    qa,
    durationSeconds: qa ? readNumber(params, 'duration', 4, 3, 20) : 70,
    finalSeconds: qa ? readNumber(params, 'final', 1, 1, 5) : 8,
    introMs: qa ? readNumber(params, 'introMs', 80, 0, 1000) : 3200,
    inactivityWarningMs: qa ? 600 : 4000,
    inactivityFailMs: qa ? 1200 : 10000,
    disableInactivity: qa && params.get('noIdle') === '1',
    seed: qa ? readNumber(params, 'seed', 9082, 1, 2_147_483_647) : createRunSeed(),
  };
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
