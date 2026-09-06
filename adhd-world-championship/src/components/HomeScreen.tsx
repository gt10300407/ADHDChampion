type HomeScreenProps = {
  best: number;
  onStart: () => void;
  onTutorial: () => void;
  onPractice: () => void;
};

const missions = [
  ['회피', '화면 터치·스와이프 또는 방향키'],
  ['색상', '글자가 아니라 지정된 색 누르기'],
  ['생명선', '꺼지기 전에 게이지 충전하기'],
  ['기억', '처음 본 기호 순서 다시 맞히기'],
  ['방해', '진짜 알림만 처리하고 가짜는 무시하기'],
  ['충동', '마지막 8초 동안 절대 버튼 누르지 않기'],
];

export function HomeScreen({ best, onStart, onTutorial, onPractice }: HomeScreenProps) {
  return (
    <main className="home-screen screen-shell">
      <div className="hero-badge">MULTITASKING BATTLE</div>
      <h1>
        ADHD
        <span>세계선수권</span>
      </h1>
      <p className="tagline">
        <span>처음부터 모든 임무가 동시에 시작돼</span>
        <span>하나에만 집중하면 진다</span>
      </p>

      <section className="best-card">
        <span>내 최고 기록</span>
        <strong>{best.toLocaleString()}</strong>
      </section>

      <section className="mission-preview" aria-label="동시 미션 목록">
        {missions.map(([name, description], index) => (
          <article key={name} style={{ '--delay': `${index * 45}ms` } as React.CSSProperties}>
            <b>{index + 1}</b>
            <div>
              <strong>{name}</strong>
              <span>{description}</span>
            </div>
          </article>
        ))}
      </section>

      <button className="primary-button pulse" onClick={onStart}>
        70초 경기 시작
      </button>
      <div className="home-help-actions">
        <button className="secondary-button" type="button" onClick={onTutorial}>게임 방법</button>
        <button className="secondary-button" type="button" onClick={onPractice}>15초 연습</button>
      </div>
      <p className="medical-note">의학적 진단·검사가 아닌 순수 멀티태스킹 캐주얼 게임이야.</p>
    </main>
  );
}
