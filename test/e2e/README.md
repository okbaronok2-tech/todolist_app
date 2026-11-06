# E2E 통합 테스트 (Playwright MCP)

`docs/3-user-scenario.md`의 US-01~US-19를 실제 브라우저(Chromium)로 재현한다. 결과는 `report.md`, 스크린샷은 `screenshots/`.

## 구조

| 경로 | 내용 |
|------|------|
| `lib.js` | 공통 함수 (로그인, 목록 읽기, API 직접 호출, 스크린샷, 결과 수집). `page`를 전역으로 쓴다 |
| `scenarios/*.js` | 시나리오 본문. 한 파일이 US 1~4개를 다룬다 |
| `build.mjs` | `lib.js` + 시나리오를 `async (page) => { ... }` 하나로 합쳐 `dist/`에 쓴다 (`dist/`는 git 제외) |
| `dist/*.js` | Playwright MCP `browser_run_code_unsafe`의 `filename`으로 실행하는 파일 |
| `results.json` | 마지막 실행의 항목별 결과 |
| `report.md` | 요약·항목 표·스크린샷 |

Playwright MCP의 `run_code`는 `import`·`require`가 막혀 있어 공통 함수를 인라인한다. 그래서 `build.mjs`가 필요하다.

## 실행

1. 백엔드 `cd backend && npm run dev`, 프론트 `cd frontend && npm run dev` 실행 (API :3000, SPA :5173).
2. `cd backend && npm run seed` (시드 상태에서 시작. 시드 외 계정은 TRUNCATE로 지워진다).
3. `cd test/e2e && node build.mjs`.
4. Playwright MCP에서 `browser_run_code_unsafe`에 `filename: C:/Users/student/todolist_app/test/e2e/dist/<파일>.js`를 넘겨 실행한다. 반환값 `{ rows, shots }`가 결과다.
5. 아래 순서로 실행한다. 데이터를 바꾸는 그룹 뒤에는 `npm run seed`로 되돌린다.

| 순서 | 파일 | 사용자 | 데이터 변경 | 실행 전 |
|------|------|--------|-------------|---------|
| 1 | `us-01.js` | 신규 가입 | `haneul.new@example.com` 생성 | 시드 |
| 2 | `us-02-03.js` | PS-02 | 없음 | |
| 3 | `us-12-15.js` | PS-02 | 없음 | |
| 4 | `us-07.js` | PS-02 | 할일 2건 추가 | |
| 5 | `us-04-06-05.js` | PS-01 | 카테고리 변경, 과제 삭제 | |
| 6 | `us-09-10-11.js` | PS-02 | 할일 수정·삭제 | `npm run seed` |
| 7 | `us-08-17.js` | PS-01→PS-02 | 할일 1건 추가 | `npm run seed` |
| 8 | `us-16.js` | PS-02 | 할일 3 제목 변경 | |
| 9 | `us-18.js` | PS-01 (375px) | 할일·카테고리 추가 | `npm run seed` |
| 10 | `us-19.js` | PS-02 | 이름·비밀번호 변경 (`seojun5678`) | |

끝나면 `npm run seed`로 원복한다.

## 기준일

시나리오 기준일 2026-11-03은 `page.clock.setFixedTime`으로 고정한다 (`lib.js` `setup`). 서버에는 `today=2026-11-03` 쿼리로 전달되므로 서버 시계는 바꾸지 않는다.

## 주의

- 한 브라우저 페이지를 계속 쓰므로 각 시나리오가 시작할 때 `clearCookies`로 세션을 비운다.
- 스크린샷은 `screenshots/<US>-<단계>-<설명>.png`로 덮어쓴다.
- `results.json`·`report.md`는 실행 결과를 보고 손으로 갱신한다 (MCP 실행은 파일을 쓰지 않는다. 스크린샷만 예외).
