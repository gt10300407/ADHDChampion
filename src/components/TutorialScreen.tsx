import { useState } from 'react';

type TutorialScreenProps = {
  onClose: () => void;
  onPractice: () => void;
  onStart: () => void;
};

const pages = [
  {
    step: '01',
    eyebrow: '장애물 회피',
    title: '좌우로 움직여 피해',
    description: '모바일은 회피 구역의 왼쪽·오른쪽을 터치하거나 스와이프해. PC에서는 방향키 또는 A·D를 사용해.',
    visual: (
      <div className="tutorial-runner" aria-hidden="true">
        <span className="tutorial-hazard">⚠</span>
        <span className="tutorial-player">⚡</span>
        <div><b>왼쪽 터치</b><b>오른쪽 터치</b></div>
        <small>← → / A D</small>
      </div>
    ),
  },
  {
    step: '02',
    eyebrow: '동시 임무',
    title: '색상과 생명선을 관리해',
    description: '화면에 적힌 색 이름과 같은 버튼을 누르고, 생명선이 82% 이하로 내려가면 충전해. 가득 찼을 때 충전하면 감점이야.',
    visual: (
      <div className="tutorial-task-demo" aria-hidden="true">
        <div className="tutorial-color-order"><span>지정된 색을 눌러</span><strong>빨강</strong></div>
        <div className="tutorial-gauge"><span>생명선 61%</span><i><b /></i><button type="button">충전</button></div>
        <div className="tutorial-colors"><i /><i /><i /><i /></div>
      </div>
    ),
  },
  {
    step: '03',
    eyebrow: '기억과 방해',
    title: '알림과 순서를 구분해',
    description: '긴급 알림만 빠르게 처리하고 가짜 보상은 무시해. 기호 순서는 경기마다 달라지고, 시간이 갈수록 더 길어져.',
    visual: (
      <div className="tutorial-alert-demo" aria-hidden="true">
        <div className="real"><b>긴급 알림</b><span>2초 안에 닫아!</span></div>
        <div className="fake"><b>무료 500점</b><span>누르면 함정</span></div>
        <p>▲　●　◆　★</p>
      </div>
    ),
  },
  {
    step: '04',
    eyebrow: '최종 보스',
    title: '마지막 8초는 손을 떼',
    description: '반짝이는 보상 버튼도 전부 함정이야. 손을 떼고 8초를 버티면 충동 억제 보너스를 받아.',
    visual: (
      <div className="tutorial-boss-demo" aria-hidden="true">
        <small>최종 보스 · 8초</small>
        <strong>아무것도 누르지 마</strong>
        <button type="button">+10,000점 받기</button>
        <span>절대 누르면 안 됨</span>
      </div>
    ),
  },
];

export function TutorialScreen({ onClose, onPractice, onStart }: TutorialScreenProps) {
  const [page, setPage] = useState(0);
  const current = pages[page]!;
  const last = page === pages.length - 1;

  return (
    <main className="tutorial-screen screen-shell" data-testid="tutorial-screen">
      <header className="tutorial-header">
        <div>
          <span>게임 방법</span>
          <b>{Number(current.step)} / 4</b>
        </div>
        <button type="button" onClick={onClose} aria-label="설명 닫기">×</button>
      </header>

      <section className="tutorial-card">
        <div className="tutorial-copy">
          <p>{current.eyebrow}</p>
          <h1>{current.title}</h1>
          <span>{current.description}</span>
        </div>
        {current.visual}
      </section>

      <div className="tutorial-dots" aria-label={`설명 ${page + 1}단계`}>
        {pages.map((item, index) => <i key={item.step} className={index === page ? 'active' : ''} />)}
      </div>

      <section className="tutorial-actions">
        {!last ? (
          <>
            <button className="secondary-button" type="button" onClick={onPractice}>15초 연습</button>
            <button className="primary-button" type="button" onClick={() => setPage((value) => value + 1)}>다음</button>
          </>
        ) : (
          <>
            <button className="secondary-button" type="button" onClick={onPractice}>연습해보기</button>
            <button className="primary-button" type="button" onClick={onStart}>바로 경기 시작</button>
          </>
        )}
      </section>

      {page > 0 && <button className="tutorial-back" type="button" onClick={() => setPage((value) => value - 1)}>← 이전 설명</button>}
    </main>
  );
}
