import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getControlMode, getDifficultyProfile, getDifficultyStage } from '../game/difficulty';
import type { QaGameSnapshot } from '../game/qa';
import { canEnterBoss, isInactive, isPanicBurst, MIN_BOSS_INPUTS, MIN_BOSS_TASKS } from '../game/rules';
import { createSeededRandom, readRuntimeConfig } from '../game/runtime';
import { emptyScore } from '../game/score';
import type { GameEndReason, GameMeta, Obstacle, ScoreBreakdown } from '../types/game';

type GameScreenProps = {
  onFinish: (score: ScoreBreakdown, meta: GameMeta) => void;
};

type ColorName = '빨강' | '파랑' | '초록' | '노랑';
type TaskKind = 'lane' | 'color' | 'gauge' | 'alert' | 'memory' | 'impulse';
type InputResult = 'valid' | 'invalid' | 'panic';

type AlertTask = {
  id: number;
  real: boolean;
  expiresAt: number;
  position: 0 | 1 | 2 | 3;
};

const COLORS: Array<{ name: ColorName; hex: string }> = [
  { name: '빨강', hex: '#FF4D67' },
  { name: '파랑', hex: '#42A5FF' },
  { name: '초록', hex: '#42E695' },
  { name: '노랑', hex: '#FFD84A' },
];

const MEMORY_SYMBOLS = ['▲', '●', '■', '◆', '★', '✚'];

function randomItem<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [next[index], next[target]] = [next[target]!, next[index]!];
  }
  return next;
}

function newMemorySequence(random: () => number, length = 4): string[] {
  return shuffled(MEMORY_SYMBOLS, random).slice(0, Math.max(3, Math.min(MEMORY_SYMBOLS.length, length)));
}

export function GameScreen({ onFinish }: GameScreenProps) {
  const runtime = useMemo(() => readRuntimeConfig(), []);
  const randomRef = useRef(createSeededRandom(runtime.seed));
  const random = useCallback(() => randomRef.current(), []);

  const [timeLeft, setTimeLeft] = useState(runtime.durationSeconds);
  const timeLeftRef = useRef(runtime.durationSeconds);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [playerLane, setPlayerLane] = useState<0 | 1 | 2>(1);
  const playerLaneRef = useRef<0 | 1 | 2>(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState<ScoreBreakdown>(() => emptyScore());
  const scoreRef = useRef(score);
  const [combo, setCombo] = useState(0);
  const comboRef = useRef(0);
  const [gauge, setGauge] = useState(100);
  const gaugeRef = useRef(100);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const [colorTarget, setColorTarget] = useState(() => randomItem(COLORS, random));
  const [colorWord, setColorWord] = useState(() => randomItem(COLORS, random));
  const [colorButtonOrder, setColorButtonOrder] = useState(() => [...COLORS]);
  const colorStartedAt = useRef(performance.now());
  const [alertTask, setAlertTask] = useState<AlertTask | null>(null);
  const [memorySequence, setMemorySequence] = useState<string[]>(() => newMemorySequence(random, 4));
  const [showMemory, setShowMemory] = useState(true);
  const [memoryOptions, setMemoryOptions] = useState<string[][]>([]);
  const [memoryRound, setMemoryRound] = useState(0);
  const [started, setStarted] = useState(false);
  const [inactiveMs, setInactiveMs] = useState(0);
  const inactiveMsRef = useRef(0);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [bossEntered, setBossEntered] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const lastFrameRef = useRef(performance.now());
  const lastSpawnRef = useRef(0);
  const obstacleIdRef = useRef(1);
  const alertIdRef = useRef(1);
  const alertTimerRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const forbiddenTapCountRef = useRef(0);
  const validInputCountRef = useRef(0);
  const invalidInputCountRef = useRef(0);
  const panicInputCountRef = useRef(0);
  const participatedTasksRef = useRef(new Set<TaskKind>());
  const recentInputTimesRef = useRef<number[]>([]);
  const lastValidInputRef = useRef(performance.now());
  const overloadsRef = useRef(0);
  const bossCheckedRef = useRef(false);
  const bossEnteredRef = useRef(false);
  const helpOpenRef = useRef(false);
  const memoryQuizOpenRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; pointerId: number } | null>(null);
  const previousDifficultyStageRef = useRef<1 | 2 | 3 | 4>(1);
  const memoryQuizStagesRef = useRef(new Set<number>());
  const memoryHideTimerRef = useRef<number | null>(null);

  const elapsed = runtime.durationSeconds - timeLeft;
  const finalImpulse = timeLeft <= runtime.finalSeconds;
  const playableSeconds = Math.max(4, runtime.durationSeconds - runtime.finalSeconds);
  const difficultyStage = getDifficultyStage(elapsed, playableSeconds);
  const difficultyProfile = getDifficultyProfile(difficultyStage);
  const controlMode = getControlMode(difficultyStage, elapsed, playableSeconds);

  const changeScore = useCallback((key: keyof ScoreBreakdown, amount: number) => {
    const next = {
      ...scoreRef.current,
      [key]: scoreRef.current[key] + amount,
    };
    scoreRef.current = next;
    setScore(next);
  }, []);

  const buildMeta = useCallback((endReason: GameEndReason): GameMeta => ({
    endReason,
    validInputs: validInputCountRef.current,
    invalidInputs: invalidInputCountRef.current,
    panicInputs: panicInputCountRef.current,
    participatedTasks: [...participatedTasksRef.current],
    overloads: overloadsRef.current,
  }), []);

  const finishGame = useCallback((reason: GameEndReason = 'completed') => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const finalScore = { ...scoreRef.current };
    if (reason === 'completed') {
      if (gaugeRef.current >= 20) finalScore.gauge += Math.round(gaugeRef.current * 6);
      if (forbiddenTapCountRef.current === 0) finalScore.impulse += 1200;
    }
    scoreRef.current = finalScore;
    onFinish(finalScore, buildMeta(reason));
  }, [buildMeta, onFinish]);

  const addScore = useCallback((key: keyof ScoreBreakdown, amount: number, isGood = true) => {
    changeScore(key, amount);
    if (isGood) {
      const nextCombo = comboRef.current + 1;
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      if (nextCombo > 0 && nextCombo % 5 === 0) {
        changeScore('combo', nextCombo * 25);
      }
    } else {
      comboRef.current = 0;
      setCombo(0);
    }
    setFlash(isGood ? 'good' : 'bad');
    window.setTimeout(() => setFlash(null), 170);
  }, [changeScore]);

  const triggerOverload = useCallback(() => {
    overloadsRef.current += 1;
    if (overloadsRef.current >= 3) {
      finishGame('overload');
      return;
    }
    gaugeRef.current = 24;
    setGauge(24);
  }, [finishGame]);

  const penalize = useCallback((amount: number) => {
    addScore('penalties', amount, false);
    const damage = Math.max(6, Math.min(28, Math.round(amount / 25)));
    const nextGauge = Math.max(0, gaugeRef.current - damage);
    gaugeRef.current = nextGauge;
    setGauge(nextGauge);
    if (nextGauge === 0) triggerOverload();
    if ('vibrate' in navigator) navigator.vibrate?.(35);
  }, [addScore, triggerOverload]);

  const recordInput = useCallback((kind: TaskKind, valid: boolean): InputResult => {
    const now = performance.now();
    const recent = recentInputTimesRef.current.filter((time) => now - time <= 1000);
    recent.push(now);
    recentInputTimesRef.current = recent;

    const panicLimit = runtime.qa ? 6 : 10;
    if (isPanicBurst(recent, now, 1000, panicLimit)) {
      panicInputCountRef.current += 1;
      invalidInputCountRef.current += 1;
      return 'panic';
    }

    if (!valid) {
      invalidInputCountRef.current += 1;
      return 'invalid';
    }

    validInputCountRef.current += 1;
    participatedTasksRef.current.add(kind);
    lastValidInputRef.current = now;
    inactiveMsRef.current = 0;
    setInactiveMs(0);
    setInactivityWarning(false);
    return 'valid';
  }, [runtime.qa]);

  const moveLane = useCallback((direction: -1 | 1) => {
    const current = playerLaneRef.current;
    const effectiveDirection = controlMode === 'reversed' ? ((direction * -1) as -1 | 1) : direction;
    const next = Math.max(0, Math.min(2, current + effectiveDirection)) as 0 | 1 | 2;
    const input = recordInput('lane', next !== current);
    if (input === 'panic') {
      penalize(220);
      return;
    }
    if (input === 'invalid') {
      penalize(45);
      return;
    }
    playerLaneRef.current = next;
    setPlayerLane(next);
  }, [controlMode, penalize, recordInput]);


  const openHelp = useCallback(() => {
    helpOpenRef.current = true;
    pausedRef.current = true;
    setHelpOpen(true);
    setPaused(true);
  }, []);

  const closeHelp = useCallback(() => {
    helpOpenRef.current = false;
    const stillPaused = document.hidden || memoryQuizOpenRef.current;
    pausedRef.current = stillPaused;
    setHelpOpen(false);
    setPaused(stillPaused);
    lastFrameRef.current = performance.now();
    lastValidInputRef.current = performance.now();
  }, []);

  const handleRunnerPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (pausedRef.current || finalImpulse) return;
    pointerStartRef.current = { x: event.clientX, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [finalImpulse]);

  const handleRunnerPointerUp = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.pointerId !== event.pointerId || pausedRef.current || finalImpulse) return;

    const delta = event.clientX - start.x;
    if (Math.abs(delta) >= 28) {
      moveLane(delta < 0 ? -1 : 1);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    moveLane(event.clientX < bounds.left + bounds.width / 2 ? -1 : 1);
  }, [finalImpulse, moveLane]);

  const nextColorTask = useCallback(() => {
    setColorTarget(randomItem(COLORS, random));
    setColorWord(randomItem(COLORS, random));
    if (difficultyProfile.shuffleColors) setColorButtonOrder(shuffled(COLORS, random));
    colorStartedAt.current = performance.now();
  }, [difficultyProfile.shuffleColors, random]);

  const handleColor = (name: ColorName) => {
    const correct = name === colorTarget.name;
    const input = recordInput('color', correct);
    if (input === 'panic') {
      penalize(220);
      return;
    }
    if (correct) {
      const reaction = performance.now() - colorStartedAt.current;
      addScore('color', Math.max(80, Math.round(280 - reaction / 8)));
    } else {
      penalize(180);
    }
    nextColorTask();
  };

  const pumpGauge = () => {
    const valid = gaugeRef.current <= 82;
    const input = recordInput('gauge', valid);
    if (input === 'panic') {
      penalize(220);
      return;
    }
    if (!valid) {
      penalize(90);
      return;
    }
    gaugeRef.current = Math.min(100, gaugeRef.current + 26);
    setGauge(gaugeRef.current);
    addScore('gauge', 55);
  };

  const handleAlert = () => {
    if (!alertTask) return;
    const input = recordInput('alert', alertTask.real);
    if (input === 'panic') {
      penalize(220);
      return;
    }
    if (alertTask.real) {
      const remaining = Math.max(0, alertTask.expiresAt - Date.now());
      addScore('distraction', 160 + Math.round(remaining / 15));
    } else {
      penalize(320);
    }
    setAlertTask(null);
  };

  const answerMemory = (option: string[]) => {
    const correct = option.join('') === memorySequence.join('');
    const input = recordInput('memory', correct);
    if (input === 'panic') {
      penalize(220);
      return;
    }
    if (correct) addScore('memory', 900 + memoryRound * 150);
    else penalize(550);

    memoryQuizOpenRef.current = false;
    const stillPaused = document.hidden || helpOpenRef.current;
    pausedRef.current = stillPaused;
    setPaused(stillPaused);
    setMemoryOptions([]);
    setMemoryRound((current) => current + 1);
    lastFrameRef.current = performance.now();
    lastValidInputRef.current = performance.now();
  };

  const generateMemoryQuiz = useCallback(() => {
    memoryQuizOpenRef.current = true;
    pausedRef.current = true;
    setPaused(true);
    setAlertTask(null);
    setShowMemory(false);

    const correct = [...memorySequence];
    const unique = new Set<string>([correct.join('')]);
    const wrong: string[][] = [];
    while (wrong.length < 3) {
      const candidate = shuffled(correct, random);
      const key = candidate.join('');
      if (!unique.has(key)) {
        unique.add(key);
        wrong.push(candidate);
      }
    }
    setMemoryOptions(shuffled([correct, ...wrong], random));
  }, [memorySequence, random]);

  useEffect(() => {
    const handleVisibility = () => {
      const nextPaused = document.hidden || helpOpenRef.current || memoryQuizOpenRef.current;
      pausedRef.current = nextPaused;
      setPaused(nextPaused);
      if (document.hidden) {
        setAlertTask(null);
      } else {
        lastValidInputRef.current = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (!started || finalImpulse) return;
    const handleKey = (event: KeyboardEvent) => {
      if (pausedRef.current || memoryOptions.length > 0) return;
      const key = event.key.toLowerCase();
      if (event.key === 'ArrowLeft' || key === 'a') {
        event.preventDefault();
        moveLane(-1);
      }
      if (event.key === 'ArrowRight' || key === 'd') {
        event.preventDefault();
        moveLane(1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [finalImpulse, memoryOptions.length, moveLane, started]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
    if (timeLeft <= runtime.finalSeconds) {
      memoryQuizOpenRef.current = false;
      const shouldRemainPaused = document.hidden || helpOpenRef.current;
      pausedRef.current = shouldRemainPaused;
      setPaused(shouldRemainPaused);
      setAlertTask(null);
      setMemoryOptions([]);
      setShowMemory(false);
    }
  }, [runtime.finalSeconds, timeLeft]);

  useEffect(() => {
    const intro = window.setTimeout(() => {
      setShowMemory(false);
      setStarted(true);
      lastFrameRef.current = performance.now();
      lastValidInputRef.current = performance.now();
    }, runtime.introMs);
    return () => window.clearTimeout(intro);
  }, [runtime.introMs]);

  useEffect(() => {
    if (!started || finishedRef.current) return;
    const timer = window.setInterval(() => {
      if (pausedRef.current) return;
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (!started || runtime.disableInactivity || finishedRef.current) return;
    const interval = window.setInterval(() => {
      if (pausedRef.current || timeLeftRef.current <= runtime.finalSeconds) return;
      const nextInactiveMs = performance.now() - lastValidInputRef.current;
      inactiveMsRef.current = nextInactiveMs;
      setInactiveMs(nextInactiveMs);
      setInactivityWarning(nextInactiveMs >= runtime.inactivityWarningMs);
      if (isInactive(nextInactiveMs, runtime.inactivityFailMs)) {
        finishGame('inactive');
      }
    }, runtime.qa ? 50 : 250);
    return () => window.clearInterval(interval);
  }, [finishGame, runtime.disableInactivity, runtime.finalSeconds, runtime.inactivityFailMs, runtime.inactivityWarningMs, runtime.qa, started]);

  useEffect(() => {
    if (!started || runtime.qa || finalImpulse) return;

    if (difficultyStage !== previousDifficultyStageRef.current) {
      previousDifficultyStageRef.current = difficultyStage;
      const sequence = newMemorySequence(random, difficultyProfile.memoryLength);
      setMemorySequence(sequence);
      setShowMemory(true);
      if (difficultyProfile.shuffleColors) setColorButtonOrder(shuffled(COLORS, random));
      if (memoryHideTimerRef.current) window.clearTimeout(memoryHideTimerRef.current);
      memoryHideTimerRef.current = window.setTimeout(
        () => setShowMemory(false),
        difficultyStage >= 4 ? 1500 : 2100,
      );
    }

    const stageStart = playableSeconds * ((difficultyStage - 1) / 4);
    const stageLength = playableSeconds / 4;
    const stageElapsed = elapsed - stageStart;
    const quizAt = difficultyStage === 1 ? Math.min(7, stageLength * 0.55) : stageLength * 0.58;
    if (stageElapsed >= quizAt && !memoryQuizStagesRef.current.has(difficultyStage)) {
      memoryQuizStagesRef.current.add(difficultyStage);
      generateMemoryQuiz();
    }
  }, [difficultyProfile.memoryLength, difficultyProfile.shuffleColors, difficultyStage, elapsed, finalImpulse, generateMemoryQuiz, playableSeconds, random, runtime.qa, started]);

  useEffect(() => () => {
    if (memoryHideTimerRef.current) window.clearTimeout(memoryHideTimerRef.current);
  }, []);

  useEffect(() => {
    if (!started || finishedRef.current) return;
    const drain = window.setInterval(() => {
      if (pausedRef.current || timeLeftRef.current <= runtime.finalSeconds) return;
      const rate = difficultyProfile.gaugeDrain;
      const nextGauge = Math.max(0, gaugeRef.current - rate);
      gaugeRef.current = nextGauge;
      setGauge(nextGauge);
      if (nextGauge === 0) {
        changeScore('penalties', 55);
        comboRef.current = 0;
        setCombo(0);
        triggerOverload();
      }
    }, 250);
    return () => window.clearInterval(drain);
  }, [changeScore, difficultyProfile.gaugeDrain, runtime.finalSeconds, started, triggerOverload]);

  useEffect(() => {
    if (!started || runtime.qa) return;
    let disposed = false;
    const schedule = () => {
      const range = difficultyProfile.alertDelayMaxMs - difficultyProfile.alertDelayMinMs;
      const delay = difficultyProfile.alertDelayMinMs + random() * range;
      alertTimerRef.current = window.setTimeout(() => {
        if (disposed) return;
        if (pausedRef.current || timeLeftRef.current <= runtime.finalSeconds) {
          schedule();
          return;
        }
        const task: AlertTask = {
          id: alertIdRef.current++,
          real: random() > 0.48,
          expiresAt: Date.now() + difficultyProfile.alertLifetimeMs,
          position: Math.floor(random() * 4) as 0 | 1 | 2 | 3,
        };
        setAlertTask(task);
        window.setTimeout(() => {
          if (disposed) return;
          setAlertTask((current) => {
            if (!current || current.id !== task.id) return current;
            if (current.real) penalize(240 + difficultyStage * 20);
            else addScore('distraction', 170 + difficultyStage * 20);
            return null;
          });
        }, difficultyProfile.alertLifetimeMs);
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      disposed = true;
      if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current);
    };
  }, [addScore, difficultyProfile.alertDelayMaxMs, difficultyProfile.alertDelayMinMs, difficultyProfile.alertLifetimeMs, difficultyStage, penalize, random, runtime.finalSeconds, runtime.qa, started]);

  useEffect(() => {
    if (!started || finishedRef.current) return;
    let raf = 0;
    const frame = (now: number) => {
      const delta = Math.min(34, now - lastFrameRef.current) / 16.67;
      lastFrameRef.current = now;

      if (pausedRef.current) {
        raf = requestAnimationFrame(frame);
        return;
      }
      if (timeLeftRef.current <= runtime.finalSeconds) {
        setObstacles([]);
        raf = requestAnimationFrame(frame);
        return;
      }
      if (now - lastSpawnRef.current > difficultyProfile.spawnGapMs) {
        lastSpawnRef.current = now;
        const firstLane = Math.floor(random() * 3) as 0 | 1 | 2;
        const lanes: Array<0 | 1 | 2> = [firstLane];
        if (random() < difficultyProfile.extraObstacleChance) {
          const remaining = ([0, 1, 2] as Array<0 | 1 | 2>).filter((lane) => lane !== firstLane);
          lanes.push(randomItem(remaining, random));
        }
        const wave = lanes.map((lane) => ({
          id: obstacleIdRef.current++,
          lane,
          y: -12,
          speed: difficultyProfile.obstacleSpeed + random() * 0.2,
          hit: false,
        }));
        setObstacles((current) => [...current, ...wave]);
      }

      setObstacles((current) => {
        const next: Obstacle[] = [];
        for (const obstacle of current) {
          const moved = { ...obstacle, y: obstacle.y + obstacle.speed * delta };
          if (!moved.hit && moved.y >= 77 && moved.y <= 92 && moved.lane === playerLaneRef.current) {
            moved.hit = true;
            penalize(280);
          }
          if (moved.y > 103) {
            if (!moved.hit) addScore('dodge', 95);
          } else {
            next.push(moved);
          }
        }
        return next;
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [addScore, difficultyProfile.extraObstacleChance, difficultyProfile.obstacleSpeed, difficultyProfile.spawnGapMs, penalize, random, runtime.finalSeconds, started]);

  useEffect(() => {
    if (!started || finishedRef.current || timeLeft <= 0 || timeLeft > runtime.finalSeconds || bossCheckedRef.current) return;
    bossCheckedRef.current = true;
    const eligible = canEnterBoss(validInputCountRef.current, participatedTasksRef.current.size);
    if (!eligible) {
      finishGame('boss-ineligible');
      return;
    }
    bossEnteredRef.current = true;
    setBossEntered(true);
  }, [finishGame, runtime.finalSeconds, started, timeLeft]);

  useEffect(() => {
    if (timeLeft !== 0 || finishedRef.current) return;
    if (!bossEnteredRef.current) {
      finishGame('boss-ineligible');
      return;
    }
    finishGame('completed');
  }, [finishGame, timeLeft]);

  useEffect(() => {
    if (!runtime.qa || !started || finishedRef.current) return;

    const getState = (): QaGameSnapshot => ({
      paused: pausedRef.current,
      phase: finishedRef.current
        ? 'finished'
        : timeLeftRef.current <= runtime.finalSeconds
          ? 'boss'
          : 'playing',
      timeLeft: timeLeftRef.current,
      gauge: gaugeRef.current,
      score: { ...scoreRef.current },
      validInputs: validInputCountRef.current,
      invalidInputs: invalidInputCountRef.current,
      panicInputs: panicInputCountRef.current,
      participatedTasks: [...participatedTasksRef.current],
      overloads: overloadsRef.current,
      inactiveMs: inactiveMsRef.current,
      difficultyStage,
      controlMode,
      memoryLength: memorySequence.length,
      colorOrder: colorButtonOrder.map((color) => color.name),
    });

    window.__ADHD_QA__ = {
      getState,
      qualifyForBoss: () => {
        validInputCountRef.current = Math.max(validInputCountRef.current, MIN_BOSS_INPUTS);
        participatedTasksRef.current.add('lane');
        participatedTasksRef.current.add('color');
        participatedTasksRef.current.add('gauge');
        lastValidInputRef.current = performance.now();
      },
      setTimeLeft: (seconds: number) => {
        const next = Math.max(0, Math.min(runtime.durationSeconds, Math.round(seconds)));
        if (next > runtime.finalSeconds) {
          bossCheckedRef.current = false;
          bossEnteredRef.current = false;
          setBossEntered(false);
        }
        timeLeftRef.current = next;
        setTimeLeft(next);
      },
      openMemoryQuiz: () => generateMemoryQuiz(),
      finish: (reason: GameEndReason = 'completed') => finishGame(reason),
    };

    return () => {
      delete window.__ADHD_QA__;
    };
  }, [colorButtonOrder, controlMode, difficultyStage, finishGame, generateMemoryQuiz, memorySequence.length, runtime.durationSeconds, runtime.finalSeconds, runtime.qa, started]);

  const tapForbidden = () => {
    const input = recordInput('impulse', false);
    forbiddenTapCountRef.current += 1;
    penalize(input === 'panic' ? 900 : 700);
  };

  const scoreNow = useMemo(() => {
    const positive = Object.entries(score)
      .filter(([key]) => key !== 'penalties')
      .reduce((sum, [, value]) => sum + value, 0);
    return Math.max(0, Math.round(positive - score.penalties));
  }, [score]);

  if (!started) {
    return (
      <main className="memory-intro screen-shell" data-testid="memory-intro">
        <p>첫 번째 기억 임무</p>
        <h2>이 순서를 외워</h2>
        <div className="memory-sequence huge">
          {memorySequence.map((symbol, index) => <span key={`${symbol}-${index}`}>{symbol}</span>)}
        </div>
        <div className="intro-countdown">곧 다른 임무가 한꺼번에 시작돼</div>
      </main>
    );
  }

  return (
    <main
      className={`game-screen ${flash ? `flash-${flash}` : ''}`}
      data-testid="game-root"
      data-time-left={timeLeft}
      data-phase={finalImpulse ? 'boss' : 'playing'}
      data-color-target={colorTarget.name}
      data-paused={paused ? 'true' : 'false'}
    >
      <button className="game-help-button" type="button" onClick={openHelp} aria-label="게임 방법 열기" data-testid="help-button">?</button>

      <header className="game-hud" data-testid="game-hud">
        <div className={`difficulty-badge stage-${difficultyStage}`} data-testid="difficulty-badge"><span>혼란 단계</span><strong>{difficultyStage} · {difficultyProfile.label}</strong></div>
        <div><span>남은 시간</span><strong>{timeLeft}</strong></div>
        <div><span>점수</span><strong>{scoreNow.toLocaleString()}</strong></div>
        <div><span>콤보</span><strong>x{combo}</strong></div>
      </header>

      {(controlMode === 'warning' || controlMode === 'reversed') && (
        <div className={`rule-banner ${controlMode}`} data-testid="control-rule">
          {controlMode === 'warning' ? '잠시 후 좌우 반전' : '좌우 반전 중'}
        </div>
      )}

      <section className="task-strip" data-testid="task-strip">
        <div className="color-order">
          <span>지정된 색을 눌러</span>
          <strong style={{ color: colorWord.hex }}>{colorTarget.name}</strong>
        </div>
        <div className="gauge-task">
          <div className="gauge-copy"><span>생명선</span><b>{Math.round(gauge)}%</b></div>
          <div className="gauge-track"><i style={{ width: `${gauge}%` }} /></div>
          <button onClick={pumpGauge} data-testid="gauge-button">충전</button>
        </div>
      </section>

      {inactivityWarning && !finalImpulse && (
        <div className="inactivity-warning" data-testid="inactivity-warning">
          움직여! {Math.max(0, Math.ceil((runtime.inactivityFailMs - inactiveMs) / 1000))}초 뒤 탈락
        </div>
      )}

      <section
        className="runner-zone"
        aria-label="장애물 회피 구역"
        data-testid="runner-zone"
        onPointerDown={handleRunnerPointerDown}
        onPointerUp={handleRunnerPointerUp}
        onPointerCancel={() => { pointerStartRef.current = null; }}
      >
        <div className="lane-lines"><i /><i /></div>
        {obstacles.map((obstacle) => (
          <div
            key={obstacle.id}
            className={`obstacle ${obstacle.hit ? 'hit' : ''}`}
            style={{ left: `${obstacle.lane * 33.333 + 4}%`, top: `${obstacle.y}%` }}
          >
            {obstacle.hit ? '💥' : '⚠'}
          </div>
        ))}
        <div className="player" style={{ left: `${playerLane * 33.333 + 8}%` }} data-testid="player" data-lane={playerLane}>
          <span>⚡</span>
        </div>
        <div className="runner-touch-labels" aria-hidden="true"><span>왼쪽 터치</span><span>오른쪽 터치</span></div>
        <div className="move-controls">
          <button
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={() => moveLane(-1)}
            aria-label="왼쪽 이동"
            data-testid="move-left"
          >←</button>
          <button
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={() => moveLane(1)}
            aria-label="오른쪽 이동"
            data-testid="move-right"
          >→</button>
        </div>
        <div className="keyboard-hint" aria-hidden="true">← → · A D · 터치/스와이프</div>
      </section>

      <section className="color-buttons" aria-label="색상 반응 버튼" data-testid="color-buttons">
        {colorButtonOrder.map((color) => (
          <button
            key={color.name}
            style={{ background: color.hex }}
            onClick={() => handleColor(color.name)}
            aria-label={`${color.name} 버튼`}
            data-testid={`color-${color.name}`}
          />
        ))}
      </section>

      {showMemory && (
        <div className="memory-float">
          <span>새 순서 기억</span>
          <div className="memory-sequence">
            {memorySequence.map((symbol, index) => <b key={`${symbol}-${index}`}>{symbol}</b>)}
          </div>
        </div>
      )}

      {memoryOptions.length > 0 && (
        <div className="modal-layer memory-quiz" data-testid="memory-quiz">
          <section>
            <p>아까 본 순서는?</p>
            <small className="memory-quiz-note">정답을 고르면 경기가 다시 시작돼</small>
            <div className="memory-options">
              {memoryOptions.map((option, index) => (
                <button key={`${option.join('')}-${index}`} onClick={() => answerMemory(option)}>
                  {option.join(' ')}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {alertTask && (
        <button
          className={`chaos-alert ${alertTask.real ? 'real' : 'fake'} position-${alertTask.position}`}
          onClick={handleAlert}
          data-testid="chaos-alert"
        >
          <b>{alertTask.real ? '긴급 알림' : '무료 500점'}</b>
          <span>{alertTask.real ? '2초 안에 닫아!' : '지금 누르면 획득!'}</span>
          <small>{alertTask.real ? '진짜' : '가짜일 수도?'}</small>
        </button>
      )}

      {helpOpen && (
        <div className="help-layer" data-testid="help-layer">
          <section>
            <header><span>게임 방법</span><button type="button" onClick={closeHelp} aria-label="게임 방법 닫기">×</button></header>
            <ol>
              <li><b>피하기</b><span>회피 구역 좌우 터치·스와이프 또는 ← → / A D</span></li>
              <li><b>색상</b><span>화면에 적힌 색 이름과 같은 아래 버튼 누르기</span></li>
              <li><b>충전</b><span>생명선이 82% 이하일 때 충전하기</span></li>
              <li><b>알림</b><span>긴급 알림만 누르고 무료 점수는 무시하기</span></li>
              <li><b>기억</b><span>처음 본 기호 순서를 나중에 다시 맞히기</span></li>
              <li><b>난이도</b><span>시간이 갈수록 장애물이 겹치고 버튼 위치·기억 길이·좌우 규칙이 바뀜</span></li>
              <li><b>보스</b><span>마지막 8초에는 아무것도 누르지 않기</span></li>
            </ol>
            <button className="primary-button" type="button" onClick={closeHelp}>경기 계속</button>
          </section>
        </div>
      )}

      {paused && !helpOpen && memoryOptions.length === 0 && (
        <div className="pause-layer">
          <p>경기 일시정지</p>
          <span>앱으로 돌아오면 자동으로 계속돼</span>
        </div>
      )}

      {finalImpulse && !paused && bossEntered && (
        <div className="impulse-layer" data-testid="boss-layer">
          <p>최종 보스 · {timeLeft}초</p>
          <h2>아무것도 누르지 마</h2>
          <button onClick={tapForbidden} data-testid="forbidden-button">+10,000점 받기</button>
          <span>절대 누르면 안 됨</span>
        </div>
      )}
    </main>
  );
}
