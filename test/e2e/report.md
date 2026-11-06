# TodoList 통합 테스트 리포트 (Playwright MCP)

| 항목 | 내용 |
|------|------|
| 실행일 | 2026-11-06 |
| 기준 문서 | `docs/3-user-scenario.md` v0.6 (US-01~US-19) |
| 도구 | Playwright MCP `browser_run_code_unsafe` (Chromium), 스크립트 `test/e2e/scenarios/*.js` |
| 대상 | 백엔드 `npm run dev` (:3000), 프론트 `vite dev` (:5173), 개발 DB `todolist` 시드 상태 |
| 기준일 | 2026-11-03 (브라우저 시계 `page.clock.setFixedTime` 고정, 서버는 `today` 쿼리로 수신) |
| 뷰포트 | 데스크톱 1280×900, US-18은 375×740 |
| 결과 | **114항목 중 114 통과, 앱 결함 0건**, 스크린샷 43장 |

## 1. 요약

| 그룹 | 시나리오 | 항목 | 통과 | 스크린샷 |
|------|----------|------|------|----------|
| `us-01.js` | US-01 회원가입 후 자동 로그인 (+예외 4) | 8 | 8 | 5 |
| `us-02-03.js` | US-02 로그인 실패·성공, US-03 로그아웃 후 뒤로 가기 | 7 | 7 | 4 |
| `us-12-15.js` | US-12 필터 4조합·경계, US-13 월, US-14 주, US-15 일 | 20 | 20 | 6 |
| `us-07.js` | US-07 할일 등록 (미지정·지정) | 7 | 7 | 2 |
| `us-04-06-05.js` | US-04 카테고리 추가·변경, US-06 기본 보호, US-05 삭제 시 이동 | 18 | 18 | 7 |
| `us-09-10-11.js` | US-09 수정, US-10 완료·취소, US-11 삭제 | 17 | 17 | 5 |
| `us-08-17.js` | US-08 등록 오류·과거 날짜, US-17 타인 리소스 차단 | 12 | 12 | 4 |
| `us-16.js` | US-16 액세스 만료 자동 갱신 / 리프레시 만료 로그인 이동 | 4 | 4 | 2 |
| `us-18.js` | US-18 모바일 375px 핵심 흐름 | 11 | 11 | 6 |
| `us-19.js` | US-19 (P1) 내 정보 수정 (+예외 2) | 7 | 7 | 2 |
| 합계 | US-01~19 전부 | **114** | **114** | **43** |

항목별 결과는 `results.json`. 실행 방법은 `README.md`.

### 실행 중 고친 것 (앱이 아니라 테스트 스크립트)

처음 실행에서 4항목이 실패했는데 모두 스크립트 검증 방식의 문제였다. 고친 뒤 재실행해 전부 통과했다.

| 항목 | 원인 | 조치 |
|------|------|------|
| US-03-1 로그아웃 Set-Cookie | Playwright `headers()`가 `set-cookie`를 합쳐 주지 않음 | `headersArray()`로 확인 (쿠키 2개 삭제 응답 확인됨) |
| US-12 목록 요청 today | 필터가 Vite 모듈 URL `/src/api/todos.ts`까지 잡음 | `:3000/api/todos`로 한정 |
| US-04-ex 31자 이름 | 입력란 `maxlength=30`이라 UI로는 31자를 넣을 수 없음 | 화면 차단 확인 + API로 `VALIDATION_ERROR` 확인 |
| US-06-2 과제 유지 | 편집 중인 행은 `<input>`이라 textContent에 이름이 없음 | API로 유지 확인 |
| US-07-1 제목 | 경로 전환 직후 폼 렌더 전에 h1을 읽음 | `#title` 대기 후 확인 |

## 2. 관찰 사항 (결함 아님)

- 카테고리 이름 입력란은 `maxlength=30`이라 31자 오류(BR-46)는 화면에서 재현되지 않는다. API로는 `VALIDATION_ERROR`가 난다. 시나리오 예외 표는 API 수준 규칙으로 읽으면 된다.
- 서버 `message`는 영문(`invalid email or password` 등)이고 화면 문구는 `frontend/src/lib/error-text.ts`가 코드별 한국어로 만든다. `VALIDATION_ERROR`만 서버 문구를 괄호로 덧붙인다 (`docs/4-wireframe.md` v0.8 CP-02에 반영).
- 개발 모드 콘솔의 `GET /api/users/me 401` 2회는 비로그인 상태에서 React StrictMode가 세션 복구를 두 번 실행한 것이다. 운영 빌드에는 없다.
- US-18-9 모바일 월 뷰는 할일을 점(`.cal__dots`)으로 축약한다. 11-02~11-06 다섯 칸에 점 1개씩 확인.
- 시나리오 간 데이터 독립을 위해 그룹 사이에 `npm run seed`로 되돌렸다. 시드 외 계정(`test@test.com`)은 테스트 전 백업, 후 복원했다.

## 3. 시나리오별 상세와 스크린샷

### US-01 회원가입 후 자동 로그인

가입 화면·제약 안내 → 예외 4종(중복 이메일 대소문자, 비밀번호 7자, `@` 없는 이메일, 이름 공백) 모두 화면 유지 + 오류 표시 → 정상 가입 시 `/todos` 자동 진입, `token`·`refresh_token` HttpOnly, 빈 목록 안내, 카테고리 `기본` 1개.

![](screenshots/US-01-1-signup.png)
![](screenshots/US-01-ex-duplicate-email.png)
![](screenshots/US-01-ex-validation.png)
![](screenshots/US-01-3-empty-list.png)
![](screenshots/US-01-4-categories.png)

### US-02 로그인 실패와 성공 / US-03 로그아웃 후 뒤로 가기

틀린 비밀번호와 없는 이메일의 응답 본문이 동일(`INVALID_CREDENTIALS`, `invalid email or password`), 화면 이동 없음. 로그인 성공 시 7건. 로그아웃 응답 `Set-Cookie` 2개로 쿠키 삭제, 뒤로 가기·`/calendar` 직접 입력 모두 `/login`, 할일 제목 0건. 쿠키 없는 요청은 `UNAUTHORIZED`.

![](screenshots/US-02-1-login-fail.png)
![](screenshots/US-02-3-todos.png)
![](screenshots/US-03-1-after-logout.png)
![](screenshots/US-03-3-calendar-redirect.png)

### US-04 카테고리 추가·이름 변경 / US-06 기본 카테고리 보호 / US-05 삭제 시 할일 이동

동아리 추가 → `동아리 활동`으로 변경 → 등록 화면 선택지 반영. 예외: 앞뒤 공백 `과제`는 `DUPLICATE_CATEGORY_NAME`, 20개 상태 추가는 `CATEGORY_LIMIT_EXCEEDED`. 기본 행 버튼 비활성, `기본`으로 변경·추가는 중복 오류, API 삭제·변경은 `DEFAULT_CATEGORY_PROTECTED` 403. 과제 삭제 대화상자(이동 안내) → 취소 무변화 → 확인 후 할일 8이 `기본`으로, 필터 선택지에서 과제 제거.

![](screenshots/US-04-1-categories.png)
![](screenshots/US-04-3-renamed.png)
![](screenshots/US-04-ex-duplicate.png)
![](screenshots/US-04-ex-limit.png)
![](screenshots/US-06-2-rename-duplicate.png)
![](screenshots/US-05-1-delete-dialog.png)
![](screenshots/US-05-4-todos-after-delete.png)

### US-07 할일 등록

카테고리 미지정 → `기본`·시작 전, 지정 → `업무`·진행중. 목록 순서 6, 1, 2, 5, 4, 견적서 작성, 3, 고객 미팅 준비, 7.

![](screenshots/US-07-2-form.png)
![](screenshots/US-07-3-list-9.png)

### US-08 할일 등록 오류와 과거 날짜

제목 비움 → 제목 필드 오류. 시작일 > 종료일 → 클라이언트 사전 안내 + 서버 `INVALID_DATE_RANGE`. 과거 날짜는 저장되고 `기한 초과`. API: 제목 101자·제목 없음+역순은 `VALIDATION_ERROR`, 시작=종료는 201.

![](screenshots/US-08-1-title-required.png)
![](screenshots/US-08-2-date-range.png)
![](screenshots/US-08-3-past-overdue.png)

### US-09 할일 수정 / US-10 완료 처리·취소 / US-11 할일 삭제

편집 화면 기존 값 채움, 기간·카테고리 변경, 미선택 저장 시 `기본`, 완료 할일 제목 수정 후 완료 유지. 예외: 역순 날짜 `INVALID_DATE_RANGE`, 공백 제목 `VALIDATION_ERROR`, 취소 시 변경 없음. 완료 토글 8회 모두 응답 후 배지 변경, 본문 `isCompleted` 명시, `completedAt` null/비null. 삭제 대화상자 취소·확인, 삭제된 id 편집 진입 시 `NOT_FOUND` 표시 후 목록 이동.

![](screenshots/US-09-1-edit-form.png)
![](screenshots/US-09-ex-date-range.png)
![](screenshots/US-10-1-completed.png)
![](screenshots/US-11-1-delete-dialog.png)
![](screenshots/US-11-4-not-found.png)

### US-12 목록 필터 4조합과 기한 초과 경계

| 카테고리 | 상태 | 기대 | 결과 |
|----------|------|------|------|
| 미선택 | 미선택 | 6, 1, 2, 5, 4, 3, 7 | 일치 |
| 업무 | 미선택 | 1, 2, 5, 3 | 일치 |
| 미선택 | 기한 초과 | 6, 2 | 일치 (4·5 제외, BR-32) |
| 업무 | 진행중 | 5 | 일치 |
| 개인 | 완료 | 없음 | 빈 목록 안내 |

모든 목록 요청에 `today=2026-11-03`. `today` 누락·`2026/11/03`은 `VALIDATION_ERROR`.

![](screenshots/US-12-overdue-filter.png)
![](screenshots/US-12-empty-filter.png)

### US-13 월 뷰 / US-14 주 뷰 / US-15 일 뷰

월: 42칸, 요청 `from=2026-10-26&to=2026-12-06`, 7건 전부 막대 표시(목록의 업무 필터 미적용), [다음]은 빈 캘린더(11-30~01-03), [오늘] 복귀, 막대 클릭 → `/todos/5/edit`. 주: 11-02~11-08 칸별 표와 일치, 할일 6 미표시, [다음] 11-09·11-10 칸에 할일 7. 일: 11-03에 5·4, 11-02에 1·2·5, 11-04에 3. 요청 `from`=`to`.

![](screenshots/US-13-month.png)
![](screenshots/US-13-5-next-month-empty.png)
![](screenshots/US-14-week.png)
![](screenshots/US-15-day.png)

### US-16 액세스 만료 자동 갱신 / 리프레시 만료 시 로그인 이동

(a) `token` 쿠키만 삭제 후 저장: `PATCH /api/todos/3` 401 → `POST /api/auth/refresh` → `PATCH /api/todos/3` 재시도 성공, 화면 이동 없음, 새 쿠키 2개. (b) 쿠키 모두 삭제 후 저장: PATCH 401 → refresh 401 → `/login`. 재로그인 후 제목은 `(a)` 그대로.

![](screenshots/US-16-a-after-refresh.png)
![](screenshots/US-16-b-login-redirect.png)

### US-17 타인 리소스 접근 차단

`/todos/1/edit`, `/todos/9999/edit`, `/todos/abc/edit` 모두 같은 `NOT_FOUND` 본문, 오류 표시 후 목록 이동, 5xx 없음. API 수정·완료·삭제, 타인 `categoryId` 등록·필터 모두 404. 양쪽 데이터 불변.

![](screenshots/US-17-1-not-found.png)

### US-18 모바일 375px 핵심 흐름

가입 폼 단일 열, 간이 메뉴 `[메뉴]`, 등록·완료·필터·편집·삭제·카테고리 추가·월 뷰(점 축약)·로그아웃 10단계 전부 수행.

![](screenshots/US-18-1-signup-mobile.png)
![](screenshots/US-18-2-todos-mobile.png)
![](screenshots/US-18-3-form-mobile.png)
![](screenshots/US-18-7-delete-dialog-mobile.png)
![](screenshots/US-18-8-categories-mobile.png)
![](screenshots/US-18-9-calendar-mobile.png)

### US-19 (P1) 내 정보 수정

이름 변경 반영, 현재 비밀번호 오류는 `INVALID_CREDENTIALS` 401이고 `/me` 유지, 변경 성공 시 200 + 새 쿠키 2개(S-01). 예외 2종 `VALIDATION_ERROR`. 로그아웃 후 옛 비밀번호 401, 새 비밀번호 로그인 성공.

![](screenshots/US-19-1-me.png)
![](screenshots/US-19-3-wrong-password.png)
