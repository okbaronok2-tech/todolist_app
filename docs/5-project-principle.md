# TodoList 프로젝트 구조 설계 원칙 (초안)

## 문서 정보

| 항목 | 내용 |
|------|------|
| 현재 버전 | v0.6 |
| 상태 | 초안 |
| 최초 작성일 | 2026-11-04 |
| 최종 수정일 | 2026-11-04 |
| 참조 문서 | `docs/1-domain-definition.md` v0.8, `docs/2-PRD.md` v0.9, `docs/3-user-scenario.md` v0.6, `docs/4-wireframe.md` v0.5 |

ID 규칙: 이 문서에서 새로 부여하는 ID는 PR(설계 원칙)뿐이다. F, UC, BR, ST, D는 도메인 정의서, SC, NFR, R, A, PD는 PRD, US는 사용자 시나리오, WF, CP는 와이어프레임의 ID를 참조만 하며 재정의하지 않는다. 번호 공백은 허용하고, 삭제된 ID는 재사용하지 않는다.

## 변경 이력

| 버전 | 일자 | 작성자 | 변경 내용 | 영향 ID |
|------|------|--------|-----------|---------|
| v0.1 | 2026-11-04 | - | 초안 작성 | PR-01~08, 전체 |
| v0.2 | 2026-11-04 | - | PRD v0.7 인증 방식 변경 반영. `JWT_SECRET` 48자 이상(6.1), 두 쿠키·HS384 고정·리프레시 해시만 저장(6.2), `routes/auth.js`·`repositories/refresh-token-repo.js`·`middlewares/auth.js` 주석(7.2), `api/client.ts` 주석(7.3), 서비스 테스트 대상에 리프레시 회전·재사용 탐지·로그아웃 폐기(5장), 참조 버전 갱신 | 문서 정보, 5장, 6.1, 6.2, 7.2, 7.3 |
| v0.3 | 2026-11-04 | - | 8문서 교차 검토 반영. 3.3·부록 B의 스토어 초기화 조건을 로그아웃·리프레시 실패로 한정(`UNAUTHORIZED` 수신만으로는 아님), 5장 자동 테스트 범위에 서비스 테스트 명시·US-19 조건, 7.1 docs 목록 갱신(AD-C1), 7.2 tests에 `load.js`, 7.3 `todos.ts`에 `get`, 참조 버전 갱신 | 문서 정보, 3.3, 5장, 7.1, 7.2, 7.3, 부록 B |
| v0.4 | 2026-11-04 | - | 4장·7.1의 `docs/9-api-design.md` '작성 예정' 표기 제거(8-plan T-X02), 참조 버전 갱신 | 문서 정보, 4장, 7.1 |
| v0.5 | 2026-11-04 | - | 백엔드 리뷰 반영. 5장 단위 테스트에 입력 검증, 스모크에 T-B01·T-B03 HTTP 조건, 7.2 tests에 `validate.test.js`·`user-service.test.js` | 문서 정보, 5장, 7.2 |
| v0.6 | 2026-11-05 | - | 5장 백엔드 테스트 명령을 `--test-concurrency=1 "tests/*.test.js"`로(8-plan v0.5), 7.1에 GitHub 이슈 브랜치 규칙(`feature-<이슈번호>`) | 문서 정보, 5장, 7.1 |

---

## 1. 개요

### 1.1 목적

구현 중 "어디에 무엇을 두는가", "이 코드가 허용되는가"를 판단하는 기준을 정한다. 코드 리뷰와 구현 전 점검(부록 B)의 체크리스트로 쓴다.

### 1.2 적용 범위

- 대상: `backend/`, `frontend/`의 모든 소스, 테스트, 설정, 마이그레이션, 시드.
- 기술 스택과 계층은 PRD 6.1~6.2를 그대로 따른다. 이 문서는 그 안에서의 배치와 규칙만 정한다.
- 비범위: 배포 환경(PD-04), 접근성(PRD 2.2), 부하 테스트 절차(PRD 5.1).

### 1.3 우선순위

원칙이 충돌하면 앞 장이 뒤 장보다 우선한다 (2장 > 3장 > 4장 > 5장 > 6장 > 7장). 이 문서와 참조 문서가 충돌하면 참조 문서가 우선하며, 이 문서를 고친다.

---

## 2. 공통 최상위 원칙

모든 스택(백엔드, 프론트엔드, DB, 테스트)에 공통이다.

| ID | 원칙 | 이유 | 적용 예 / 금지 예 | 근거 ID |
|----|------|------|-------------------|---------|
| PR-01 | 문서가 단일 출처다. 규칙을 구현하는 코드의 주석과 테스트 이름에 BR·ST·NFR ID를 인용한다. | 2일 뒤에도 코드와 문서를 대조할 수 있어야 한다. | 적용: `// BR-15: 이동과 삭제는 한 트랜잭션`, 테스트명 `ST-02 today > endDate → OVERDUE`. 금지: 문서에 없는 규칙을 코드에만 두기. | 도메인 정의서 5장, PRD 6.5 |
| PR-02 | 최소 구현. 지금 필요한 것만 만든다 (YAGNI). | 1인 2일 일정이다. 추상화는 쓰는 곳이 2개 이상 생길 때 만든다. | 금지: 범용 저장소 베이스 클래스, DI 컨테이너, 설정 가능한 플러그인 구조, 미사용 옵션. | PRD 8장, R-01 |
| PR-03 | 서버 검증이 최종이다. 클라이언트 검증은 안내일 뿐이고 요청을 막지 않는다. | 클라이언트는 우회된다. 수용 기준은 서버 응답으로 판정한다. | 적용: SC-04의 시작일 > 종료일 사전 안내 후에도 저장 요청을 보낸다. 금지: 프론트에서 막았다고 서버 검증을 생략하기. | PRD 4.2, NFR-09, BR-52 |
| PR-04 | 상태(TodoStatus)는 파생값이다. 저장하지 않고 요청마다 ST-01~04로 계산한다. | 날짜가 지나면 사용자 행위 없이 상태가 바뀐다. | 금지: `todos`에 `status` 컬럼, 프론트에서 상태 재계산. 적용: 서버 응답의 `status`만 표시한다 (CP-04). | 도메인 정의서 4.2, BR-26, PRD 6.5 |
| PR-05 | 날짜는 `YYYY-MM-DD` 문자열로 모든 경계(DB ↔ 서버 ↔ 클라이언트)를 지난다. | JS `Date`를 거치면 시간대 밀림이 생긴다. | 적용: `pg` type parser로 OID 1082를 문자열로 받는다. 금지: `toISOString().slice(0, 10)`으로 today 생성(UTC 날짜가 된다). | PRD 7장, D-05, R-04 |
| PR-06 | 거부 응답은 BR-51 코드로만 표현한다. 본문은 `{ code, message }`, status는 PRD 6.3 매핑 한 곳에서 정한다. | 코드가 늘면 화면 분기가 깨진다. | 적용: `AppError('NOT_FOUND')` 하나로 던지고 오류 미들웨어가 status를 붙인다. 금지: 라우트에서 `res.status(404).json(...)` 직접 작성. | BR-51, BR-52, PRD 6.3 |
| PR-07 | 소유권 격리. `todos`·`categories`에 닿는 모든 SQL은 `user_id` 조건을 가진다. 타인·미존재·형식 오류 ID는 같은 `NOT_FOUND`다. | 존재 여부도 노출하지 않는다. | 적용: `WHERE id = $1 AND user_id = $2`. 금지: id만으로 조회한 뒤 소유자 비교. | BR-02, BR-16, NFR-10, PRD 6.3 |
| PR-08 | 환경에 따라 달라지는 값은 환경변수에서만 읽는다. 코드에 상수로 두지 않는다. | 시크릿 유출과 환경별 분기 누락을 막는다. | 적용: `process.env.JWT_SECRET`, `import.meta.env` 미사용(프론트는 같은 origin이라 설정값 없음). 금지: 기본값으로 시크릿 넣기. | NFR-06, NFR-07, 6장 |

---

## 3. 의존성·레이어 원칙

### 3.1 백엔드 계층

```text
routes (인증 미들웨어, 입력 형식·날짜 범위 검증, HTTP 변환)
  → services (BR, ST-01~04, 트랜잭션 경계)
    → repositories (SQL만, pg 호출)
```

- 의존은 위에서 아래로 한 방향이다. 저장소가 서비스를, 서비스가 라우트를 가져오지 않는다.
- 서비스는 `req`, `res`, 쿠키, 헤더를 모른다. 인자는 평범한 값(`userId`, `today`, 입력 객체)이고 반환은 평범한 객체다. 거부는 `AppError`를 던진다.
- SQL 문자열은 저장소 파일에만 둔다. 서비스와 라우트에 SQL이 있으면 위반이다.
- 트랜잭션 경계는 서비스다. 저장소 함수는 첫 인자로 `db`(Pool 또는 Client)를 받아 둘 다에서 동작한다. 트랜잭션 대상: BR-11(가입 + 기본 카테고리), BR-15(이동 + 삭제), 리프레시 회전(기존 행 폐기 + 새 행 삽입, PRD 6.4).
- BR-52 검증 순서의 분담: 인증 → 형식·길이 → 날짜 범위는 라우트, 존재·소유 → 보호 대상 → 중복·개수 → 자격 증명은 서비스. 순서를 바꾸지 않는다.
- 상태 필터(BR-32)의 SQL 조건은 저장소에 두되 `todo-status.js`의 ST 판정과 결과가 같아야 한다 (PRD 6.5). 5장 테스트로 확인한다.

### 3.2 프론트엔드 계층

```text
pages (SC-01~07, 라우팅·화면 조립)
  → feature components (화면 전용 조각: 캘린더 뷰, 할일 폼)
    → common components (CP-01~06)
      → queries (TanStack Query hooks) → api (fetch 클라이언트)
```

- 페이지와 컴포넌트는 `fetch`를 직접 호출하지 않는다. 서버 데이터는 `queries/`의 hook으로만 읽고 쓴다.
- 공통 컴포넌트(CP)는 서버 데이터와 스토어를 모른다. props만 받는다. 예외: CP-01 상단 메뉴는 로그아웃 mutation을 쓴다 (UC-03).
- 상태 계산·날짜 범위 계산(BR-35)은 `lib/`의 순수 함수다. React와 스토어를 가져오지 않는다.

### 3.3 Zustand와 TanStack Query 역할 분담

| 데이터 | 위치 | 이유 |
|--------|------|------|
| 인증 사용자(id, name) | Zustand | 서버 응답을 한 번 받아 화면 전역에서 쓴다 (PRD 6.1) |
| 목록 필터(categoryId, status) | Zustand | 클라이언트 UI 상태. 화면 이동 후에도 유지한다 (CP-06 "필터 선택은 유지") |
| 캘린더 뷰, anchorDate | Zustand | 클라이언트 UI 상태 (PRD 4.2 캘린더 이동) |
| 할일 목록, 캘린더 할일, 카테고리 목록 | TanStack Query | 서버 데이터. 쿼리 키에 필터·from/to·today를 포함한다 |
| 등록·수정·삭제·완료·카테고리 변경 | TanStack Query mutation | 성공 시 관련 쿼리 invalidate. 낙관적 업데이트 없음 (PRD 4.2) |
| 폼 입력값, 대화상자 열림, 모바일 메뉴 열림 | 컴포넌트 `useState` | 화면을 벗어나면 버릴 값. 스토어에 올리지 않는다 |

- 로그아웃과 리프레시·재시도 실패 시 `queryClient.clear()`와 스토어 `reset()`을 함께 호출한다 (PRD 4.2, US-03). `UNAUTHORIZED` 수신만으로는 호출하지 않는다 (refresh 1회가 먼저, 7.3 `client.ts`). 스토어는 파일 1개로 두어 `reset()` 하나로 끝낸다.

### 3.4 순환 의존 금지

- 같은 계층 안에서도 서로 가져오지 않는다 (`todo-service` ↔ `category-service` 금지). 공통 로직은 아래 계층(저장소·lib)으로 내린다.
- 위반 발견 시 import 방향을 바꾸지 말고 공통 부분을 분리한다.

### 3.5 외부 의존성 추가 기준

설치 전 세 가지를 모두 통과해야 한다.

1. 직접 쓰면 50줄을 넘는가? 넘지 않으면 직접 쓴다.
2. 이미 설치된 패키지나 Node 22·브라우저 내장 기능으로 되는가? 되면 설치하지 않는다 (예: `node --test`, `node --env-file`, `fetch`, `input type="date"`).
3. PRD 6.1 제약과 R-01(UI 라이브러리 금지)에 어긋나지 않는가?

초기 허용 목록. 백엔드: `express`, `pg`, `bcrypt`, `jsonwebtoken`, `cookie-parser`. 프론트: `react`, `react-dom`, `react-router`, `zustand`, `@tanstack/react-query`, 개발용 `vite`, `typescript`, `vitest`. 이 밖은 위 기준으로 심사한다.

---

## 4. 코드·네이밍 원칙

| 항목 | 규칙 |
|------|------|
| 파일·디렉토리 | kebab-case (`todo-service.js`, `calendar-range.ts`). React 컴포넌트 파일만 PascalCase (`StatusBadge.tsx`) |
| 식별자 | 변수·함수 camelCase, 상수 UPPER_SNAKE, 컴포넌트·타입 PascalCase |
| DB 컬럼 ↔ API 필드 | DB는 snake_case, API·TS는 camelCase. 변환은 저장소의 SELECT 별칭 한 곳에서 한다 (`start_date AS "startDate"`). 서비스 위로는 camelCase만 흐른다 |
| 오류 클래스 | `errors/app-error.js`에 `AppError(code, message)` 1개. 코드 상수와 status 매핑은 `errors/codes.js` 1개 (PRD 6.3). 새 코드 추가 금지 (BR-51) |
| 상태 상수 | 백엔드 `services/todo-status.js`, 프론트 `types/todo.ts`에 `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `OVERDUE` 문자열을 각각 둔다. 언어가 다르므로(JS/TS) 공유 패키지 없이 중복을 허용하고, 양쪽 주석에 도메인 정의서 4.1을 인용한다 |
| 함수 크기 | 한 함수는 한 BR 묶음 또는 한 화면 조각을 담당한다. 화면을 넘기지 않는 길이(약 40줄)를 넘으면 나눈다 |
| 주석 | "왜"만 적는다. BR·ST ID 인용이 곧 주석이다. 무엇을 하는지는 코드가 보여준다 |
| TypeScript | `strict: true`. `any` 금지. API 응답 타입은 `types/`에 두고 쿼리 hook이 반환 타입으로 쓴다 |
| 백엔드 JSDoc | 서비스·저장소의 export 함수에만 `@param`, `@returns` 한 줄씩. 내부 함수는 생략 |
| ESLint·Prettier | 프론트는 Vite 템플릿 기본 ESLint, 백엔드는 `js.configs.recommended`만. Prettier는 기본 설정(빈 `.prettierrc`). 규칙 추가·예외 금지 |
| API 경로 | `/api/` 접두어 아래 PRD 6.3 리소스(`auth`, `users/me`, `categories`, `todos`). 상세는 `docs/9-api-design.md`에서 정한다 |

---

## 5. 테스트·품질 원칙

2일 일정에 맞춰 자동 테스트는 R-05의 세 가지와 아래 표의 서비스 테스트로 제한한다. 나머지는 US로 수동 검증한다.

| 종류 | 대상 | 위치 | 도구 |
|------|------|------|------|
| 단위 | ST-01~04 판정 함수. 도메인 정의서 4.3 검증 예 4건을 그대로 옮긴다 | `backend/tests/todo-status.test.js` | `node --test` |
| 단위 | 입력 검증 함수(BR-21, BR-22, BR-32, BR-41~46, ID 형식). 8-plan T-B02 완료 조건 | `backend/tests/validate.test.js` | `node --test` |
| 단위 | BR-35 조회 기간 계산. 수용 기준 예(anchorDate 11-03 → 주 11-02~11-08, 월 10-26~12-06) | `frontend/src/lib/calendar-range.test.ts` | `vitest` |
| 서비스 | 서비스 단위로 검증 가능한 BR 수용 기준: BR-04, BR-06, BR-11, BR-13, BR-14, BR-15(롤백 포함), BR-17, BR-22, BR-46 개수 제한. 인증은 리프레시 회전, 재사용 탐지, 로그아웃 폐기(NFR-06, PRD 6.4). 실제 테스트 DB에 대고 실행하며 `pg`를 mock하지 않는다 | `backend/tests/*-service.test.js` | `node --test` |
| API 스모크 | 실행 중인 서버에 `fetch`로 US-02, US-12, US-17의 응답 코드·건수와 T-B01·T-B03의 HTTP 조건(쿠키 속성, 알고리즘, 회전·재사용, 로그아웃)을 확인하는 스크립트 1벌 | `backend/tests/smoke.js` | Node 내장 `fetch` |
| 수동 | 화면 흐름 전부. PRD 9.1 체크리스트를 US-01~19 순서로 수행 (US-19는 F-03 구현 시) | `docs/3-user-scenario.md` | 브라우저 |

- 테스트 이름은 ID로 시작한다. 예: `ST-01 완료는 날짜와 무관`, `BR-15 이동 실패 시 카테고리 유지`.
- 실행 명령은 각 패키지에서 `npm test` 하나다. 백엔드는 `node --env-file=.env.test --test --test-concurrency=1 "tests/*.test.js"`, 프론트는 `vitest run`. 스모크는 `npm run smoke`로 분리한다 (서버가 떠 있어야 한다).
- 테스트 DB는 개발 DB와 분리한다. `.env.test`의 `DATABASE_URL`은 `todolist_test`를 가리키고, 테스트 시작 시 마이그레이션과 시드를 다시 적용한다.
- 시드는 시나리오 3장의 샘플 데이터(사용자 2, 카테고리 5, 할일 8)를 그대로 넣는 SQL 1개다. id가 시드 순서대로 1부터 붙도록 테이블을 `TRUNCATE ... RESTART IDENTITY` 후 넣는다. 비밀번호 해시는 cost 10으로 미리 계산해 SQL에 넣는다.
- E2E 자동화는 하지 않는다 (PRD 2.2).

---

## 6. 설정·보안·운영 원칙

### 6.1 환경변수

| 키 | 용도 | 비고 |
|----|------|------|
| `DATABASE_URL` | `pg` Pool 연결 문자열 | 테스트는 `.env.test`에서 별도 DB |
| `JWT_SECRET` | 액세스 토큰 HS384 서명 키 (NFR-06) | 48자 이상(384비트 권장). 기본값 없음, 없거나 짧으면 기동 실패 |
| `PORT` | Express 포트 | 기본 3000 |
| `NODE_ENV` | `production`이면 쿠키 `Secure` 설정 (NFR-06) | 그 외는 로컬 HTTP 허용 |

- `.env.example`은 키 이름과 설명만 적어 커밋한다. `.env`, `.env.test`는 `.gitignore`에 넣고 커밋하지 않는다.
- 로드는 `node --env-file=.env`로 한다. `dotenv`는 설치하지 않는다.
- 프론트엔드는 환경변수가 없다. API는 같은 origin의 `/api/`다 (NFR-06). 개발은 Vite 프록시, 운영은 Express가 `frontend/dist`를 정적으로 제공한다.

### 6.2 보안

- SQL은 `pg` 파라미터 바인딩(`$1`)만 쓴다. 문자열 연결·템플릿 리터럴로 SQL을 만들지 않는다 (NFR-09).
- 비밀번호는 `bcrypt` cost 10으로 해시한다 (NFR-07). 응답·로그에 `password`, 해시, `token`·`refresh_token` 쿠키 값, `Cookie` 헤더를 출력하지 않는다.
- 인증 쿠키는 둘이다 (NFR-06). 액세스 토큰 쿠키는 이름 `token`, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=900`. 리프레시 토큰 쿠키는 이름 `refresh_token`, `HttpOnly`, `SameSite=Lax`, `Path=/api/auth`, `Max-Age=1209600`. 둘 다 운영만 `Secure`다. 설정 코드는 `middlewares/auth.js` 한 곳에 둔다.
- 액세스 토큰은 `jsonwebtoken` 검증 시 `algorithms: ['HS384']`로 고정한다 (NFR-06).
- 리프레시 토큰 원문은 저장·로그 금지다. `refresh_tokens.token_hash`에 SHA-256 hex 해시만 저장한다 (NFR-06, PRD 7장).
- 경로·쿼리·본문의 모든 ID는 양의 정수 정규식으로 먼저 검사하고, 아니면 DB 조회 없이 `NOT_FOUND`다 (PRD 6.3).
- 모든 `todos`·`categories` 쿼리는 `user_id` 조건을 가진다 (NFR-10, PR-07).

### 6.3 운영

- 오류 로깅은 오류 미들웨어에서 1줄 JSON으로 한다: `{ ts, method, path, status, code, message }`. 5xx만 stack을 덧붙인다. 4xx는 stack 없음.
- 헬스체크는 `GET /api/health` 1개. `SELECT 1` 성공 시 `{ "ok": true }`, 실패 시 503.
- 마이그레이션은 `src/db/migrations/NNN_name.sql` 번호순 파일과 `src/db/migrate.js`(적용된 파일명을 `schema_migrations` 테이블에 기록, 미적용분만 순서대로 실행)로 한다. 별도 도구를 쓰지 않는다. 되돌리기는 다음 번호의 SQL로 한다.
- `pg` Pool은 `max: 20`으로 `src/db/pool.js` 1개 인스턴스만 만든다 (NFR-04).
- graceful shutdown: `SIGTERM`·`SIGINT`에서 `server.close()` 후 `pool.end()`를 호출한다.

---

## 7. 디렉토리 구조

### 7.1 저장소 최상위

루트 `package.json`은 두지 않는다. `backend/`와 `frontend/`가 각자 `package.json`을 가지며 명령은 각 디렉토리에서 실행한다. workspaces·Turborepo는 2일 일정에 이득이 없다 (PR-02).

```text
todolist_app/
├── backend/        # Express API, 마이그레이션, 시드, 테스트
├── frontend/       # Vite + React SPA
├── docs/           # 설계 문서 (1~9, schema.sql, assets/; 작성 예정 perf-result.md)
├── prompts/        # 문서 생성 프롬프트
├── .gitignore      # node_modules, dist, .env, .env.test
└── README.md       # 실행 순서 3줄 (DB 생성 → migrate·seed → dev)
```

GitHub 이슈 작업 브랜치는 `feature-<이슈번호>`, `main`에서 분기, PR로 병합.

### 7.2 백엔드 트리

```text
backend/
├── package.json            # scripts: dev, start, migrate, seed, test, smoke
├── .env.example
├── eslint.config.js
├── src/
│   ├── server.js           # 환경변수 검사, app.listen, graceful shutdown
│   ├── app.js              # express(), 미들웨어·라우트 등록, 정적 파일(dist), 오류 미들웨어
│   ├── routes/
│   │   ├── auth.js         # POST signup/login/logout/refresh. 쿠키 설정·삭제, refresh·logout은 인증 미들웨어 없음 (UC-01~03, NFR-06)
│   │   ├── users.js        # GET/PATCH users/me (UC-04, P1)
│   │   ├── categories.js   # CRUD (UC-11)
│   │   ├── todos.js        # CRUD, 완료 지정, 목록·캘린더 조회 (UC-05~10)
│   │   └── validate.js     # 형식·길이·날짜 범위·ID 정수·today 검사 (BR-21, BR-22, BR-32, BR-41~46)
│   ├── services/
│   │   ├── auth-service.js      # BR-04~06, BR-11 (트랜잭션)
│   │   ├── user-service.js      # BR-03, BR-05
│   │   ├── category-service.js  # BR-13~17, BR-46 (BR-15 트랜잭션)
│   │   ├── todo-service.js      # BR-12, BR-16, BR-24~28, 상태 부여
│   │   └── todo-status.js       # ST-01~04 순수 함수, 상태 상수
│   ├── repositories/
│   │   ├── user-repo.js
│   │   ├── refresh-token-repo.js # 삽입·해시 조회·폐기·사용자 전체 폐기·정리(만료·폐기 행 삭제) (NFR-06, PRD 6.4)
│   │   ├── category-repo.js
│   │   └── todo-repo.js         # 목록 필터(BR-31, BR-32 SQL), 기간 겹침(BR-33), 기본 정렬
│   ├── middlewares/
│   │   ├── auth.js         # 액세스 토큰 검증(HS384 고정), req.userId 주입, 두 쿠키 옵션 (NFR-06, BR-01)
│   │   └── error-handler.js # AppError → status·본문, 1줄 로그 (PRD 6.3)
│   ├── errors/
│   │   ├── app-error.js    # class AppError
│   │   └── codes.js        # BR-51 코드 상수 + HTTP status 매핑
│   └── db/
│       ├── pool.js         # Pool(max 20), DATE type parser (OID 1082 → 문자열)
│       ├── migrate.js      # migrations/ 번호순 적용
│       ├── migrations/
│       │   └── 001_init.sql # users, refresh_tokens, categories, todos, CHECK·UNIQUE·인덱스 (PRD 7장)
│       └── seed.sql        # 시나리오 3장 샘플 데이터
└── tests/
    ├── setup.js            # 테스트 DB migrate + seed 재적용
    ├── todo-status.test.js # ST-01~04
    ├── validate.test.js    # BR-21·22·32·41~46, ID 형식 (T-B02)
    ├── auth-service.test.js
    ├── category-service.test.js
    ├── todo-service.test.js
    ├── user-service.test.js # BR-03, BR-05 (P1)
    ├── load.js             # k6 부하 시나리오 (PRD 5.1, NFR-01~03)
    └── smoke.js            # 실행 중 서버에 US-02, US-12, US-17 + T-B01·T-B03 HTTP 조건 확인
```

금지 사항:

- `routes/`에 SQL, `services/`에 `req`/`res`, `repositories/`에 BR 분기(소유권 `user_id` 조건은 예외이며 필수).
- `db/pool.js` 외에서 `new Pool()`.
- `errors/codes.js` 밖에서 HTTP status 숫자 작성.

### 7.3 프론트엔드 트리

```text
frontend/
├── package.json            # scripts: dev, build, test
├── vite.config.ts          # /api → http://localhost:3000 프록시
├── tsconfig.json           # strict
├── eslint.config.js
└── src/
    ├── main.tsx            # QueryClientProvider, Router
    ├── App.tsx             # 라우트 정의, RequireAuth 적용
    ├── pages/              # SC-01~07 1:1. 화면 조립과 이동만
    ├── components/
    │   ├── common/         # CP-01~06. props만 받는다
    │   └── calendar/       # MonthView, WeekView, DayView (WF-05, 월 → 주 → 일 순 구현)
    ├── api/
    │   ├── client.ts       # fetch 래퍼: credentials 포함, {code,message} 파싱, UNAUTHORIZED → refresh 1회(동시 요청은 1개 공유) → 재시도 → 실패 시 reset·/login
    │   ├── auth.ts         # signup, login, logout, refresh, me
    │   ├── categories.ts
    │   └── todos.ts        # list(filter, today), range(from, to, today), get(id, today), create, update, setCompleted, remove
    ├── queries/            # TanStack Query hooks. 쿼리 키·invalidate 규칙은 여기만
    │   ├── use-categories.ts
    │   └── use-todos.ts
    ├── stores/
    │   └── app-store.ts    # Zustand 1개: user, filter, calendar(view, anchorDate), reset()
    ├── lib/
    │   ├── date.ts         # 로컬 today → YYYY-MM-DD, 날짜 더하기·비교 (문자열 기반)
    │   └── calendar-range.ts # BR-35 from/to 계산, PRD 4.2 이전·다음 이동
    ├── types/
    │   ├── todo.ts         # Todo, TodoStatus 상수, 필터 타입
    │   ├── category.ts
    │   └── api.ts          # ApiError { code, message }, 코드 유니온 (BR-51)
    └── styles.css          # 전역 CSS 1개, 768px 미디어 쿼리 (PRD 4.3)
```

페이지 대응표:

| SC | 파일 | WF |
|----|------|----|
| SC-01 | `pages/LoginPage.tsx` | WF-01 |
| SC-02 | `pages/SignupPage.tsx` | WF-02 |
| SC-03 | `pages/TodoListPage.tsx` | WF-03 |
| SC-04 | `pages/TodoFormPage.tsx` (new·edit 공용, `:id` 유무로 분기) | WF-04 |
| SC-05 | `pages/CalendarPage.tsx` | WF-05 |
| SC-06 | `pages/MePage.tsx` (P1, F-03 미구현 시 라우트·메뉴 숨김) | WF-06 |
| SC-07 | `pages/CategoriesPage.tsx` | WF-07 |

공통 컴포넌트 대응표:

| CP | 파일 | 비고 |
|----|------|------|
| CP-01 | `components/common/TopNav.tsx` | 모바일 `[메뉴]` 토글은 `useState` |
| CP-02 | `components/common/ErrorMessage.tsx` | `message` prop만. 코드 분기는 `api/client.ts`와 페이지가 담당 |
| CP-03 | `components/common/ConfirmDialog.tsx` | 제목·문구·onConfirm·onCancel props |
| CP-04 | `components/common/StatusBadge.tsx` | `status` prop, `compact` prop으로 캘린더 축약형 |
| CP-05 | `components/common/TodoRow.tsx` | 완료·편집·삭제 콜백 props |
| CP-06 | `components/common/EmptyList.tsx` | `filtered` prop으로 문구 2종 |

금지 사항:

- `pages/`, `components/`에서 `fetch` 직접 호출. `api/` 함수도 직접 호출하지 않고 `queries/` hook을 거친다.
- `components/common/`에서 스토어·쿼리 hook 사용 (CP-01의 로그아웃 mutation만 예외).
- `lib/`에서 React, 스토어, `api/` import.
- `Date` 객체를 props·스토어·쿼리 키에 넣기. 문자열 `YYYY-MM-DD`만 쓴다 (PR-05).

---

## 부록 A. 원칙 → 근거 문서 추적표

| 원칙·장 | 도메인 정의서 | PRD | 시나리오 | 와이어프레임 |
|---------|---------------|-----|----------|--------------|
| PR-01 | 5장, 부록 A | 6.5 | - | - |
| PR-02 | - | 8장, R-01 | - | 1.2 |
| PR-03 | BR-52 | 4.2, NFR-09 | US-08 | CP-02 |
| PR-04 | 4.2, BR-26 | 6.5, 7장 | US-10 | CP-04 |
| PR-05 | D-05 | 7장, R-04 | 3.1 | - |
| PR-06 | BR-51, BR-52 | 6.3 | 1.3 | CP-02 |
| PR-07 | BR-02, BR-16 | 6.3, NFR-10 | US-17 | - |
| PR-08 | - | NFR-06, NFR-07 | - | - |
| 3장 계층 | BR-11, BR-15, BR-52 | 6.1, 6.2, 6.5 | US-03 | CP-01, CP-06 |
| 4장 네이밍 | 4.1, BR-51 | 6.3, 7장 | - | - |
| 5장 테스트 | 4.3, BR-35 | 2.2, 6.5, 9.1, R-05 | 3장, US-02, US-12, US-17 | - |
| 6장 설정·보안 | BR-05 | NFR-04, NFR-06~10, 6.3, 6.4 | - | - |
| 7장 디렉토리 | - | 4.1, 4.3, 6.2 | - | WF-01~07, CP-01~06 |

---

## 부록 B. 구현 전 체크리스트

- [ ] PR-01 규칙 구현부 주석과 테스트 이름에 BR·ST ID를 적었다
- [ ] PR-02 쓰는 곳이 1개뿐인 추상화를 만들지 않았다
- [ ] PR-03 클라이언트 검증이 저장 요청을 막지 않고, 서버가 같은 검증을 한다
- [ ] PR-04 `status` 컬럼이 없고 프론트는 서버의 `status`만 표시한다
- [ ] PR-05 `pg` type parser가 설정되고 today는 로컬 날짜 문자열로 만든다
- [ ] PR-06 모든 거부가 `AppError` + `codes.js` 매핑을 거친다
- [ ] PR-07 `todos`·`categories` SQL 전부에 `user_id` 조건이 있다
- [ ] PR-08 `JWT_SECRET`, `DATABASE_URL`이 코드에 없고 `.env.example`에 키만 있다
- [ ] 3.1 서비스에 `req`/`res`가 없고 SQL은 저장소에만 있다
- [ ] 3.1 BR-11, BR-15가 서비스 트랜잭션으로 묶였다
- [ ] 3.3 서버 데이터는 TanStack Query, UI 상태는 Zustand 1개 파일에만 있다
- [ ] 3.3 로그아웃·리프레시 실패에서 `queryClient.clear()`와 `reset()`을 호출한다
- [ ] 3.5 허용 목록 밖 패키지를 설치하지 않았거나 세 기준을 기록했다
- [ ] 4장 snake_case → camelCase 변환이 저장소 SELECT 별칭에만 있다
- [ ] 5장 `npm test`로 ST-01~04 4건과 BR-35 예시가 통과한다
- [ ] 5장 테스트 DB가 분리되고 시드가 id 1부터 재현된다
- [ ] 6.2 쿠키 옵션이 NFR-06과 같고 운영에서만 `Secure`다
- [ ] 6.3 `GET /api/health`, 1줄 오류 로그, graceful shutdown이 있다
- [ ] 7장 트리에 없는 디렉토리를 만들지 않았고 금지 사항을 어기지 않았다
