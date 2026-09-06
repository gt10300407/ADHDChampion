export const MIN_BOSS_INPUTS = 8;
export const MIN_BOSS_TASKS = 3;

export function canEnterBoss(
  validInputs: number,
  participatedTaskCount: number,
  minimumInputs = MIN_BOSS_INPUTS,
  minimumTasks = MIN_BOSS_TASKS,
): boolean {
  return validInputs >= minimumInputs && participatedTaskCount >= minimumTasks;
}

export function isInactive(inactiveMs: number, failAfterMs: number): boolean {
  return inactiveMs >= failAfterMs;
}

export function isPanicBurst(
  recentInputTimes: readonly number[],
  now: number,
  windowMs = 1000,
  maximumInputs = 10,
): boolean {
  const activeCount = recentInputTimes.filter((time) => now - time <= windowMs).length;
  return activeCount > maximumInputs;
}
