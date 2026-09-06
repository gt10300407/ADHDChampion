import { useCallback, useMemo, useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { HomeScreen } from './components/HomeScreen';
import { PracticeScreen } from './components/PracticeScreen';
import { ResultScreen } from './components/ResultScreen';
import { TutorialScreen } from './components/TutorialScreen';
import { makeResult } from './game/score';
import type { GameMeta, GameResult, ScoreBreakdown, Screen } from './types/game';

const BEST_KEY = 'adhd-world-championship-best-v1';
const TUTORIAL_KEY = 'adhd-world-championship-tutorial-v1';

function readBest(): number {
  try {
    const value = Number(localStorage.getItem(BEST_KEY) ?? 0);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function saveBest(value: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // 저장소를 사용할 수 없는 환경에서도 게임은 계속 진행한다.
  }
}

function tutorialSeen(): boolean {
  const search = window.__ADHD_TEST_SEARCH__ ?? window.location.search;
  if (new URLSearchParams(search).get('qa') === '1') return true;
  try {
    return localStorage.getItem(TUTORIAL_KEY) === 'seen';
  } catch {
    return false;
  }
}

function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, 'seen');
  } catch {
    // 저장소가 막혀도 현재 세션은 정상 진행한다.
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => tutorialSeen() ? 'home' : 'tutorial');
  const [runId, setRunId] = useState(0);
  const [best, setBest] = useState(readBest);
  const [result, setResult] = useState<GameResult | null>(null);

  const start = useCallback(() => {
    markTutorialSeen();
    setRunId((current) => current + 1);
    setResult(null);
    setScreen('playing');
  }, []);

  const openHome = useCallback(() => {
    markTutorialSeen();
    setScreen('home');
  }, []);

  const openPractice = useCallback(() => {
    markTutorialSeen();
    setScreen('practice');
  }, []);

  const finish = useCallback((score: ScoreBreakdown, meta: GameMeta) => {
    const nextResult = makeResult(score, readBest(), meta);
    saveBest(nextResult.best);
    setBest(nextResult.best);
    setResult(nextResult);
    setScreen('result');
  }, []);

  const content = useMemo(() => {
    if (screen === 'tutorial') {
      return <TutorialScreen onClose={openHome} onPractice={openPractice} onStart={start} />;
    }
    if (screen === 'practice') {
      return <PracticeScreen onExit={openHome} onStart={start} />;
    }
    if (screen === 'playing') return <GameScreen key={runId} onFinish={finish} />;
    if (screen === 'result' && result) {
      return <ResultScreen result={result} onRetry={start} onHome={openHome} />;
    }
    return (
      <HomeScreen
        best={best}
        onStart={start}
        onTutorial={() => setScreen('tutorial')}
        onPractice={openPractice}
      />
    );
  }, [best, finish, openHome, openPractice, result, runId, screen, start]);

  return <div className="app-root">{content}</div>;
}
