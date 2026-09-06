import { useState } from 'react';
import type { GameEndReason, GameResult } from '../types/game';
import { openTossLeaderboard, submitScoreToToss } from '../services/appsInToss';

type ResultScreenProps = {
  result: GameResult;
  onRetry: () => void;
  onHome: () => void;
};

const LABELS: Record<keyof GameResult['breakdown'], string> = {
  dodge: '주변 시야',
  color: '반응 전환',
  memory: '단기 기억',
  gauge: '동시 관리',
  distraction: '방해 판별',
  impulse: '충동 억제',
  combo: '콤보 보너스',
  penalties: '실수 감점',
};

const END_REASON_LABELS: Record<GameEndReason, string> = {
  completed: '경기 완주',
  inactive: '무입력 탈락',
  overload: '과부하 탈락',
  'boss-ineligible': '보스 진입 자격 미달',
};

export function ResultScreen({ result, onRetry, onHome }: ResultScreenProps) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const response = await submitScoreToToss(result.total);
    setMessage(response.message);
    setBusy(false);
  };

  const openRanking = async () => {
    setBusy(true);
    const response = await openTossLeaderboard();
    setMessage(response.message);
    setBusy(false);
  };

  const share = async () => {
    const text = `ADHD 세계선수권 ${result.grade}등급 · ${result.total.toLocaleString()}점\n${result.title}\n하나에 집중하면 진다.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ADHD 세계선수권 결과', text });
        setMessage('결과 공유 창을 열었어.');
      } else {
        await navigator.clipboard.writeText(text);
        setMessage('결과 문구를 복사했어.');
      }
    } catch {
      setMessage('공유가 취소됐어.');
    }
  };

  return (
    <main
      className="result-screen screen-shell"
      data-testid="result-screen"
      data-end-reason={result.meta.endReason}
      data-valid-inputs={result.meta.validInputs}
      data-invalid-inputs={result.meta.invalidInputs}
      data-panic-inputs={result.meta.panicInputs}
      data-overloads={result.meta.overloads}
      data-impulse-score={result.breakdown.impulse}
      data-penalties={result.breakdown.penalties}
    >
      <div className="grade-orbit">
        <span>{result.grade}</span>
      </div>
      <p className="result-kicker">ADHD 전투력</p>
      <h1>{result.total.toLocaleString()}</h1>
      <h2>{result.title}</h2>
      <p className={`end-reason ${result.meta.endReason === 'completed' ? 'completed' : 'eliminated'}`} data-testid="end-reason">
        {END_REASON_LABELS[result.meta.endReason]}
      </p>
      <p className="best-line">최고 기록 {result.best.toLocaleString()}점</p>

      <section className="score-grid">
        {(Object.keys(result.breakdown) as Array<keyof typeof result.breakdown>).map((key) => (
          <div key={key} className={key === 'penalties' ? 'negative' : ''} data-score-key={key}>
            <span>{LABELS[key]}</span>
            <strong>{key === 'penalties' ? '-' : '+'}{result.breakdown[key].toLocaleString()}</strong>
          </div>
        ))}
      </section>

      <div className="result-actions">
        <button className="primary-button" onClick={onRetry}>다시 도전</button>
        <button className="secondary-button" onClick={submit} disabled={busy}>토스 랭킹 등록</button>
        <button className="secondary-button" onClick={openRanking} disabled={busy}>전체 랭킹 보기</button>
        <button className="ghost-button" onClick={share}>결과 공유</button>
        <button className="text-button" onClick={onHome}>처음 화면</button>
      </div>
      {message && <div className="toast-message" role="status">{message}</div>}
    </main>
  );
}
