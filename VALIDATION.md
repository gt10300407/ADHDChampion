# v0.4.2 검증 결과

## 완료된 검사

- TypeScript 검사: PASS
- 단위 테스트: 13/13 PASS
  - 점수 4
  - 게임 규칙 4
  - 복합 난이도 3
  - 랜덤 시드 2
- Vite 프로덕션 웹 빌드: PASS
- 정적 미리보기 빌드 생성: PASS
- package-lock 내부 OpenAI 레지스트리 주소 없음: PASS

## Playwright 자동 QA

총 13개 항목이 포함되어 있다.

1. 무입력 탈락
2. 단일 임무 보스 자격 미달
3. 패닉 연타 감지
4. 재시작 타이머 중복 방지
5. 보스 무입력 보너스
6. 보스 함정 감점
7. 모바일 레이아웃 경계
8. 방향키·A/D·터치 이동
9. 도움말 일시정지
10. 튜토리얼·연습 진입
11. 한국어 제목 한 줄 표시
12. 혼란 4단계 좌우 반전
13. 기억 임무 중 경기 전체 일시정지 및 답변 후 재개

현재 제작 컨테이너의 Chromium 정책이 localhost 접속을 차단해 E2E 실행 자체는 완료하지 못했다. 코드 컴파일과 단위 테스트는 통과했으며, 사용자 맥에서 아래 명령으로 최종 판정해야 한다.

```bash
npm run qa
```

## 앱인토스 업로드 전 남은 검증

- 사용자 맥에서 Playwright 13/13 PASS
- 실제 Chrome 미리보기 직접 플레이
- iPhone/Android 샌드박스 터치 감도
- 앱인토스 실제 appName·아이콘 입력 후 `.ait` 빌드
- 리더보드 실제 점수 제출

## v0.4.1 추가 확인

- 변경된 TS/TSX 파일 구문 검사: PASS
- 정적 미리보기용 기억 임무 일시정지 패치 구문 검사: PASS
- 전체 E2E는 사용자 환경에서 `npm run qa`로 최종 확인 필요


## v0.4.2 추가 검증

- `node --check preview-web/assets/index-DIVTGsDt.js`: PASS
- `npm run verify:release`: PASS
- 임시 `memory-pause-patch.js` 제거: PASS
- 기억 문제 열기 시 정지 코드 번들 포함: PASS
- 답변 후 재개 코드 번들 포함: PASS
