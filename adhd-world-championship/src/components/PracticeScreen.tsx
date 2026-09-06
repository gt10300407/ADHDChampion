import { useCallback, useEffect, useRef, useState } from 'react';

type PracticeScreenProps = {
  onExit: () => void;
  onStart: () => void;
};

type PracticeStep = 'left' | 'right' | 'color' | 'gauge' | 'alert' | 'complete';

const stepCopy: Record<PracticeStep, { count: string; title: string; description: string }> = {
  left: { count: '1 / 5', title: '왼쪽으로 이동해봐', description: '왼쪽 화면 터치·스와이프 또는 ← / A' },
  right: { count: '2 / 5', title: '오른쪽으로 이동해봐', description: '오른쪽 화면 터치·스와이프 또는 → / D' },
  color: { count: '3 / 5', title: '빨강 버튼을 눌러', description: '글자 색이 아니라 적힌 색 이름을 따라가' },
  gauge: { count: '4 / 5', title: '생명선을 충전해', description: '게이지가 줄었을 때만 충전해야 해' },
  alert: { count: '5 / 5', title: '진짜 긴급 알림만 눌러', description: '무료 점수 알림은 함정이야' },
  complete: { count: '완료', title: '조작 준비 끝', description: '마지막 보스에서는 화면에서 손을 완전히 떼면 돼' },
};

export function PracticeScreen({ onExit, onStart }: PracticeScreenProps) {
  const [step, setStep] = useState<PracticeStep>('left');
  const [lane, setLane] = useState<0 | 1 | 2>(1);
  const [gauge, setGauge] = useState(58);
  const [feedback, setFeedback] = useState('');
  const pointerStart = useRef<{ x: number; pointerId: number } | null>(null);

  const completeStep = useCallback((next: PracticeStep, message: string) => {
    setFeedback(message);
    window.setTimeout(() => {
      setFeedback('');
      setStep(next);
    }, 380);
  }, []);

  const move = useCallback((direction: -1 | 1) => {
    setLane((current) => Math.max(0, Math.min(2, current + direction)) as 0 | 1 | 2);
    if (step === 'left' && direction === -1) completeStep('right', '왼쪽 이동 성공');
    if (step === 'right' && direction === 1) completeStep('color', '오른쪽 이동 성공');
  }, [completeStep, step]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        event.preventDefault();
        move(-1);
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        event.preventDefault();
        move(1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move]);

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    pointerStart.current = { x: event.clientX, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.pointerId !== event.pointerId) return;
    const delta = event.clientX - start.x;
    if (Math.abs(delta) >= 28) {
      move(delta < 0 ? -1 : 1);
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    move(event.clientX < bounds.left + bounds.width / 2 ? -1 : 1);
  };

  const copy = stepCopy[step];

  return (
    <main className="practice-screen screen-shell" data-testid="practice-screen">
      <header className="practice-header">
        <div><span>연습 모드</span><b>{copy.count}</b></div>
        <button type="button" onClick={onExit} aria-label="연습 종료">×</button>
      </header>

      <section className="practice-copy">
        <p>{copy.title}</p>
        <span>{copy.description}</span>
      </section>

      {step !== 'complete' ? (
        <section className="practice-console">
          <div
            className="practice-runner"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            data-testid="practice-runner"
          >
            <div className="lane-lines"><i /><i /></div>
            <span className="practice-obstacle">⚠</span>
            <div className="player" style={{ left: `${lane * 33.333 + 8}%` }}><span>⚡</span></div>
            <div className="practice-touch-copy"><b>왼쪽 터치</b><b>오른쪽 터치</b></div>
          </div>

          <div className={`practice-task ${step === 'color' ? 'active' : ''}`}>
            <div><span>지정된 색</span><strong>빨강</strong></div>
            <section className="practice-colors">
              {['빨강', '파랑', '초록', '노랑'].map((name) => (
                <button
                  type="button"
                  key={name}
                  aria-label={`${name} 버튼`}
                  onClick={() => {
                    if (step !== 'color') return;
                    if (name === '빨강') completeStep('gauge', '색상 임무 성공');
                    else setFeedback('적힌 색 이름을 눌러');
                  }}
                />
              ))}
            </section>
          </div>

          <div className={`practice-task practice-gauge ${step === 'gauge' ? 'active' : ''}`}>
            <div><span>생명선</span><strong>{gauge}%</strong></div>
            <i><b style={{ width: `${gauge}%` }} /></i>
            <button type="button" onClick={() => {
              if (step !== 'gauge') return;
              setGauge(90);
              completeStep('alert', '생명선 충전 성공');
            }}>충전</button>
          </div>

          <div className={`practice-alerts ${step === 'alert' ? 'active' : ''}`}>
            <button type="button" className="real" onClick={() => step === 'alert' && completeStep('complete', '진짜 알림 처리 성공')}>
              <b>긴급 알림</b><span>2초 안에 닫아!</span>
            </button>
            <button type="button" className="fake" onClick={() => step === 'alert' && setFeedback('이건 가짜 알림이야')}>
              <b>무료 500점</b><span>누르면 함정</span>
            </button>
          </div>
        </section>
      ) : (
        <section className="practice-complete">
          <span>⚡</span>
          <h1>이제 정신없이 시작해</h1>
          <p>회피 · 색상 · 충전 · 기억 · 알림을 동시에 처리하고, 마지막 8초에는 아무것도 누르지 마.</p>
          <button className="primary-button" type="button" onClick={onStart}>70초 경기 시작</button>
          <button className="secondary-button" type="button" onClick={onExit}>홈으로</button>
        </section>
      )}

      {feedback && <div className="practice-feedback">{feedback}</div>}
    </main>
  );
}
