import {
  isMinVersionSupported,
  openGameCenterLeaderboard,
  submitGameCenterLeaderBoardScore,
} from '@apps-in-toss/web-framework';

export type TossActionResult = {
  ok: boolean;
  message: string;
};

export async function submitScoreToToss(score: number): Promise<TossActionResult> {
  try {
    const result = await submitGameCenterLeaderBoardScore({ score: String(score) });
    if (!result) {
      return { ok: false, message: '현재 환경에서는 토스 리더보드를 지원하지 않아.' };
    }
    if (result.statusCode === 'SUCCESS') {
      return { ok: true, message: '토스 리더보드에 점수를 등록했어.' };
    }
    return { ok: false, message: `점수 등록 실패: ${result.statusCode}` };
  } catch (error) {
    console.warn('[leaderboard] submit failed', error);
    return {
      ok: false,
      message: '로컬 브라우저이거나 게임 프로필·리더보드 승인이 아직 안 된 상태야.',
    };
  }
}

export async function openTossLeaderboard(): Promise<TossActionResult> {
  try {
    const supported = isMinVersionSupported({ android: '5.221.0', ios: '5.221.0' });
    if (!supported) {
      return { ok: false, message: '리더보드를 지원하지 않는 토스앱 버전이야.' };
    }
    await openGameCenterLeaderboard();
    return { ok: true, message: '리더보드를 열었어.' };
  } catch (error) {
    console.warn('[leaderboard] open failed', error);
    return { ok: false, message: '토스앱 또는 샌드박스 안에서 다시 실행해.' };
  }
}
