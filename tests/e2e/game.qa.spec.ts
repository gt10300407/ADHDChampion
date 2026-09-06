import { expect, test, type Page } from '@playwright/test';

async function startGame(page: Page, query = '?qa=1&seed=9082') {
  await page.goto(`/${query}`);
  await page.getByRole('button', { name: /경기 시작/ }).click({ force: true });
  await expect(page.getByTestId('game-root')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__ADHD_QA__));
}

async function qaState(page: Page) {
  return page.evaluate(() => window.__ADHD_QA__!.getState());
}

test('아무 입력도 없으면 보스 전에 무입력 탈락한다', async ({ page }) => {
  await startGame(page);
  await expect(page.getByTestId('inactivity-warning')).toBeVisible();
  const result = page.getByTestId('result-screen');
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('data-end-reason', 'inactive');
  await expect(page.getByTestId('boss-layer')).toHaveCount(0);
});

test('한 종류 임무만 수행하면 보스 진입 자격이 없다', async ({ page }) => {
  await startGame(page, '?qa=1&seed=9082&noIdle=1');
  await page.getByTestId('move-left').click();
  await page.evaluate(() => window.__ADHD_QA__!.setTimeLeft(1));

  const result = page.getByTestId('result-screen');
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('data-end-reason', 'boss-ineligible');
  await expect(result).toHaveAttribute('data-valid-inputs', '1');
});

test('무작위 고속 연타는 패닉 입력으로 감지되고 완주할 수 없다', async ({ page }) => {
  await startGame(page, '?qa=1&seed=9082&noIdle=1');
  const buttons = ['color-빨강', 'color-파랑', 'color-초록', 'color-노랑'];
  for (let index = 0; index < 10; index += 1) {
    await page.getByTestId(buttons[index % buttons.length]!).click({ force: true });
  }

  const state = await qaState(page);
  expect(state.panicInputs).toBeGreaterThan(0);
  await page.evaluate(() => window.__ADHD_QA__!.setTimeLeft(1));

  const result = page.getByTestId('result-screen');
  await expect(result).toBeVisible();
  await expect(result).not.toHaveAttribute('data-end-reason', 'completed');
  expect(Number(await result.getAttribute('data-panic-inputs'))).toBeGreaterThan(0);
  expect(Number(await result.getAttribute('data-penalties'))).toBeGreaterThan(0);
});

test('재시작 뒤 타이머가 중복 실행되지 않는다', async ({ page }) => {
  await startGame(page, '?qa=1&seed=9082&noIdle=1');
  await page.evaluate(() => window.__ADHD_QA__!.finish('overload'));
  await expect(page.getByTestId('result-screen')).toBeVisible();
  await page.getByRole('button', { name: '다시 도전' }).click();
  await expect(page.getByTestId('game-root')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__ADHD_QA__));

  const before = (await qaState(page)).timeLeft;
  await page.waitForTimeout(1150);
  const after = (await qaState(page)).timeLeft;
  expect(before - after).toBeGreaterThanOrEqual(1);
  expect(before - after).toBeLessThanOrEqual(2);
});

test('보스에서 아무것도 누르지 않으면 충동 억제 보너스를 받는다', async ({ page }) => {
  await startGame(page, '?qa=1&seed=9082&noIdle=1');
  await page.evaluate(() => {
    window.__ADHD_QA__!.qualifyForBoss();
    window.__ADHD_QA__!.setTimeLeft(1);
  });
  await expect(page.getByTestId('boss-layer')).toBeVisible();
  await expect(page.getByTestId('result-screen')).toBeVisible();
  await expect(page.getByTestId('result-screen')).toHaveAttribute('data-end-reason', 'completed');
  await expect(page.getByTestId('result-screen')).toHaveAttribute('data-impulse-score', '1200');
});

test('보스의 함정 버튼을 누르면 보너스를 잃고 감점된다', async ({ page }) => {
  await startGame(page, '?qa=1&seed=9082&noIdle=1');
  await page.evaluate(() => {
    window.__ADHD_QA__!.qualifyForBoss();
    window.__ADHD_QA__!.setTimeLeft(1);
  });
  await page.getByTestId('forbidden-button').click({ force: true });
  const result = page.getByTestId('result-screen');
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('data-impulse-score', '0');
  expect(Number(await result.getAttribute('data-penalties'))).toBeGreaterThanOrEqual(700);
});

test('주요 게임 영역이 작은 모바일 화면 밖으로 잘리지 않는다', async ({ page }) => {
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await startGame(page, `?qa=1&seed=${viewport.height}&noIdle=1`);

    for (const testId of ['game-hud', 'task-strip', 'runner-zone', 'color-buttons']) {
      const box = await page.getByTestId(testId).boundingBox();
      expect(box, `${testId} bounding box`).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
    }

    const runner = await page.getByTestId('runner-zone').boundingBox();
    expect(runner!.height).toBeGreaterThan(180);
    await page.evaluate(() => window.__ADHD_QA__!.finish('overload'));
  }
});

test('방향키·A/D·회피 구역 터치로 플레이어가 이동한다', async ({ page }) => {
  await startGame(page, '?qa=1&seed=9082&noIdle=1&duration=15&final=2');
  const player = page.getByTestId('player');
  await expect(player).toHaveAttribute('data-lane', '1');

  await page.keyboard.press('ArrowLeft');
  await expect(player).toHaveAttribute('data-lane', '0');
  await page.keyboard.press('d');
  await expect(player).toHaveAttribute('data-lane', '1');

  const runner = await page.getByTestId('runner-zone').boundingBox();
  expect(runner).not.toBeNull();
  await page.mouse.click(runner!.x + runner!.width * 0.85, runner!.y + runner!.height * 0.45);
  await expect(player).toHaveAttribute('data-lane', '2');
});

test('경기 중 도움말을 열면 타이머가 멈추고 닫으면 재개된다', async ({ page }) => {
  await startGame(page, '?qa=1&seed=9082&noIdle=1&duration=15&final=2');
  const before = (await qaState(page)).timeLeft;
  await page.getByTestId('help-button').click();
  await expect(page.getByTestId('help-layer')).toBeVisible();
  await page.waitForTimeout(1150);
  expect((await qaState(page)).timeLeft).toBe(before);

  await page.getByRole('button', { name: '경기 계속' }).click();
  await page.waitForTimeout(1150);
  expect((await qaState(page)).timeLeft).toBeLessThan(before);
});

test('첫 실행에는 게임 설명과 연습 모드를 제공한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('tutorial-screen')).toBeVisible();
  await expect(page.getByText('좌우로 움직여 피해')).toBeVisible();
  await page.getByRole('button', { name: '15초 연습' }).click();
  await expect(page.getByTestId('practice-screen')).toBeVisible();
  await expect(page.getByText('왼쪽으로 이동해봐')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText('오른쪽으로 이동해봐')).toBeVisible();
});


test('한국어 튜토리얼 제목은 모바일에서 한 줄로 표시된다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const title = page.getByRole('heading', { name: '좌우로 움직여 피해' });
  await expect(title).toBeVisible();
  const metrics = await title.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(style.lineHeight),
    };
  });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.height).toBeLessThanOrEqual(metrics.lineHeight * 1.35);
});

test('후반에는 혼란 4단계와 좌우 반전 규칙이 적용된다', async ({ page }) => {
  await startGame(page, '?qa=1&seed=9082&noIdle=1&duration=20&final=2');
  await page.evaluate(() => window.__ADHD_QA__!.setTimeLeft(3));
  await expect(page.getByTestId('difficulty-badge')).toContainText('4 · 최대 혼란');
  await expect(page.getByTestId('control-rule')).toHaveText('좌우 반전 중');

  const state = await qaState(page);
  expect(state.difficultyStage).toBe(4);
  expect(state.controlMode).toBe('reversed');

  const player = page.getByTestId('player');
  await expect(player).toHaveAttribute('data-lane', '1');
  await page.keyboard.press('ArrowLeft');
  await expect(player).toHaveAttribute('data-lane', '2');
});


test('기억 임무가 열리면 경기 전체가 멈추고 답변 후 재개된다', async ({ page }) => {
  await startGame(page, '?qa=1&seed=9082&noIdle=1&duration=15&final=2');
  const before = await qaState(page);

  await page.evaluate(() => window.__ADHD_QA__!.openMemoryQuiz());
  await expect(page.getByTestId('memory-quiz')).toBeVisible();
  await page.waitForTimeout(1150);

  const paused = await qaState(page);
  expect(paused.paused).toBe(true);
  expect(paused.timeLeft).toBe(before.timeLeft);
  expect(paused.gauge).toBe(before.gauge);
  expect(paused.score).toEqual(before.score);

  await page.getByTestId('memory-quiz').getByRole('button').first().click();
  await expect(page.getByTestId('memory-quiz')).toHaveCount(0);
  await page.waitForTimeout(1150);

  const resumed = await qaState(page);
  expect(resumed.paused).toBe(false);
  expect(resumed.timeLeft).toBeLessThan(before.timeLeft);
});
