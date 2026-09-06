# 자동 QA 사용법

## 한 번에 실행

```bash
npm install
npm run qa
```

`npm run qa`는 다음을 자동으로 처리한다.

1. Playwright Chromium 설치 여부 확인
2. 없으면 최초 1회 Chromium 다운로드
3. Vite 개발 서버 자동 실행
4. 모바일 브라우저 QA 10개 실행
5. PASS/FAIL 결과 출력
6. 실패 시 스크린샷과 trace 저장

브라우저 화면을 보면서 실행하려면:

```bash
npm run qa:headed
```

## 현재 자동 검증 항목

- 무입력 상태에서 보스 전 탈락
- 한 종류 임무만 수행하면 보스 진입 차단
- 고속 무작위 연타 감지 및 감점
- 재시작 후 타이머 중복 방지
- 보스에서 무입력 시 충동 억제 보너스
- 보스 함정 버튼 클릭 시 보너스 취소 및 감점
- 375×667, 390×844 화면 잘림 검사
- 방향키·A/D·회피 구역 터치 이동
- 도움말 일시정지·재개
- 첫 실행 튜토리얼과 연습 모드

## 일반 개발 검증

```bash
npm run typecheck
npm test
npm run build:web
```

## 실패 결과 위치

```text
test-results/
```

실패한 테스트에는 다음 자료가 생성된다.

- 실패 화면 PNG
- Playwright trace ZIP
- 오류 컨텍스트

trace 확인:

```bash
npx playwright show-trace test-results/<실패폴더>/trace.zip
```

## QA 전용 실행 모드

자동 테스트에서만 URL 쿼리로 짧은 경기와 고정 랜덤 시드를 사용한다.

```text
?qa=1&seed=9082
```

일반 게임 실행에는 영향을 주지 않는다.
