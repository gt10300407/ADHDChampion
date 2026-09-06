export type DifficultyStage = 1 | 2 | 3 | 4;
export type ControlMode = 'normal' | 'warning' | 'reversed';

export type DifficultyProfile = {
  stage: DifficultyStage;
  label: string;
  memoryLength: number;
  shuffleColors: boolean;
  extraObstacleChance: number;
  spawnGapMs: number;
  obstacleSpeed: number;
  gaugeDrain: number;
  alertDelayMinMs: number;
  alertDelayMaxMs: number;
  alertLifetimeMs: number;
};

const PROFILES: Record<DifficultyStage, DifficultyProfile> = {
  1: {
    stage: 1,
    label: '동시 처리',
    memoryLength: 4,
    shuffleColors: false,
    extraObstacleChance: 0,
    spawnGapMs: 900,
    obstacleSpeed: 0.78,
    gaugeDrain: 1.15,
    alertDelayMinMs: 2600,
    alertDelayMaxMs: 4300,
    alertLifetimeMs: 2600,
  },
  2: {
    stage: 2,
    label: '위치 혼란',
    memoryLength: 4,
    shuffleColors: true,
    extraObstacleChance: 0.38,
    spawnGapMs: 760,
    obstacleSpeed: 0.92,
    gaugeDrain: 1.42,
    alertDelayMinMs: 2100,
    alertDelayMaxMs: 3400,
    alertLifetimeMs: 2200,
  },
  3: {
    stage: 3,
    label: '규칙 전환',
    memoryLength: 5,
    shuffleColors: true,
    extraObstacleChance: 0.68,
    spawnGapMs: 630,
    obstacleSpeed: 1.06,
    gaugeDrain: 1.72,
    alertDelayMinMs: 1600,
    alertDelayMaxMs: 2700,
    alertLifetimeMs: 1800,
  },
  4: {
    stage: 4,
    label: '최대 혼란',
    memoryLength: 6,
    shuffleColors: true,
    extraObstacleChance: 0.92,
    spawnGapMs: 520,
    obstacleSpeed: 1.2,
    gaugeDrain: 2.05,
    alertDelayMinMs: 1200,
    alertDelayMaxMs: 2100,
    alertLifetimeMs: 1500,
  },
};

export function getDifficultyStage(elapsedSeconds: number, playableSeconds: number): DifficultyStage {
  const duration = Math.max(4, playableSeconds);
  const progress = Math.max(0, Math.min(0.999, elapsedSeconds / duration));
  if (progress < 0.25) return 1;
  if (progress < 0.5) return 2;
  if (progress < 0.75) return 3;
  return 4;
}

export function getDifficultyProfile(stage: DifficultyStage): DifficultyProfile {
  return PROFILES[stage];
}

export function getControlMode(
  stage: DifficultyStage,
  elapsedSeconds: number,
  playableSeconds: number,
): ControlMode {
  if (stage < 3) return 'normal';

  const stageStart = playableSeconds * (stage === 3 ? 0.5 : 0.75);
  const stageElapsed = Math.max(0, elapsedSeconds - stageStart);
  const cycle = stage === 3 ? 10 : 7;
  const phase = stageElapsed % cycle;

  if (stage === 3) {
    if (phase >= 4 && phase < 5) return 'warning';
    if (phase >= 5 && phase < 8) return 'reversed';
    return 'normal';
  }

  if (phase >= 2 && phase < 3) return 'warning';
  if (phase >= 3 && phase < 6) return 'reversed';
  return 'normal';
}
