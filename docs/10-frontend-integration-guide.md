# TodoList 프론트엔드 연동 가이드 (초안)

## 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | TodoList 프론트엔드 연동 가이드 |
| 현재 버전 | v0.6 |
| 상태 | 초안 |
| 작성일 | 2026-11-05 |
| 참조 문서 | `docs/2-PRD.md` v0.14, `docs/5-project-principle.md` v0.13, `docs/6-arch-diagram.md` v0.9, `docs/8-plan.md` v0.13, `docs/9-api-design.md` v0.6, `backend/swagger.yaml` v0.10 |
| 정본 | PRD 6.3·6.4·NFR-06, `docs/9-api-design.md`, `backend/swagger.yaml`. 이 문서는 프론트 개발자가 백엔드를 붙일 때 실제로 필요한 것만 모은 것이다. 엔드포인트 상세는 정본을 본다 |

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 | 영향 범위 |
|------|------|--------|-----------|-----------|
| v0.1 | 2026-11-05 | - | 초안 작성. 백엔드 실행, 개발 연결(Vite 프록시), 쿠키·리프레시 흐름(AD-16), 요청 규약, 오류 모델, 엔드포인트 요약, 보안 주의, 시드 계정, Swagger | 전체 |
| v0.2 | 2026-11-05 | - | `GET /api/health` 응답 `db` 필드 반영, 참조 버전 갱신 | 문서 정보, 1장, 7장 |
| v0.3 | 2026-11-05 | - | 연동 방식을 Vite 프록시에서 CORS로 변경(PRD v0.10). 1장 `CORS_ORIGIN`, 2장 전면 수정(`VITE_API_URL`, `credentials: 'include'`, 같은 site 조건), 4장 `client.ts` 예시에 절대 URL·credentials, 7장 Swagger 문장, 참조 버전 갱신 | 문서 정보, 1장, 2장, 4장, 7장 |
| v0.4 | 2026-11-05 | - | 구현(`frontend/src`)에 맞춤. 4장 `client.ts` 예시(요청 옵션, refresh 결과 3종, 재시도 401 코드 판별), 6장 토스트 → CP-02 `ErrorMessage`, 8장 `User`/`Me` 구분, 참조 버전 갱신 | 문서 정보, 4장, 6장, 8장 |
| v0.5 | 2026-11-05 | - | 11-security 조치 반영: 3장 비밀번호 변경 시 새 쿠키(다른 기기 로그아웃), 8장 비밀번호 72바이트·ID 15자리, 참조 버전 갱신 | 문서 정보, 3장, 7장, 8장 |
| v0.6 | 2026-11-06 | - | `today` 필수 엔드포인트 수 6→5로 정정(코드 `routes/todos.js` 기준), 참조 버전 갱신 | 문서 정보, 4장 |

---

## 1. 백엔드 실행

Node 22 이상, PostgreSQL 17, `todolist` DB가 있어야 한다.

```bash
cd backend
cp .env.example .env   # JWT_SECRET 채우기
npm install
npm run migrate
npm run seed
npm run dev            # http://localhost:3000, 파일 변경 시 자동 재시작
```

환경변수 5개 (`backend/.env.example`):

| 키 | 값 | 비고 |
|----|----|------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/todolist` | pg Pool 연결 문자열 |
| `JWT_SECRET` | 48자 이상 임의 문자열 | 기본값 없음. 없거나 짧으면 기동 실패 (NFR-06) |
| `PORT` | `3000` | 기본 3000 |
| `NODE_ENV` | `development` | `production`이면 쿠키에 `Secure` |
| `CORS_ORIGIN` | `http://localhost:5173` | 허용 SPA origin, 쉼표 구분. 없으면 기동 실패 |

기동 확인: `GET /api/health` → 200 `{ "ok": true, "db": "up" }`. DB 연결 실패면 503 `{ "ok": false, "db": "down" }`.

## 2. 개발 연결 방식

- CORS 방식. SPA(Vite `http://localhost:5173`)와 API(Express `http://localhost:3000`)는 다른 origin이고 프록시는 없다 (NFR-06 (6)).
- 백엔드는 `CORS_ORIGIN` 목록에 있는 Origin에만 `Access-Control-Allow-Origin: <그 origin>`, `Access-Control-Allow-Credentials: true`를 붙이고 `OPTIONS` 프리플라이트에 204를 준다 (`backend/src/middlewares/cors.js`). 목록에 없으면 헤더가 없어 브라우저가 차단한다.
- 운영: SPA는 정적 호스팅, Express는 API만. `CORS_ORIGIN`에 운영 SPA origin을 넣는다 (T-X03).

```bash
# frontend/.env
VITE_API_URL=http://localhost:3000
```

`fetch`는 `${import.meta.env.VITE_API_URL}/api/...` 절대 URL에 반드시 `credentials: 'include'`를 붙인다. 빠지면 쿠키가 전송·저장되지 않아 보호 API가 전부 `UNAUTHORIZED`다. `Authorization` 헤더는 없다. 쿠키가 `SameSite=Lax`라 SPA와 API는 같은 site(등록 도메인 동일, 포트·서브도메인만 다름)여야 한다. 다른 site에 두려면 쿠키를 `SameSite=None; Secure`로 바꿔야 한다 (현재 미지원).

## 3. 인증·쿠키

가입·로그인·리프레시 성공 응답이 쿠키 2개를 `Set-Cookie`로 내려준다 (`backend/src/middlewares/auth.js`).

| 쿠키 | 내용 | 속성 |
|------|------|------|
| `token` | 액세스 JWT (HS384, 15분) | `HttpOnly; SameSite=Lax; Path=/; Max-Age=900` |
| `refresh_token` | 불투명 난수 (14일) | `HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=1209600` |

- `Secure`는 `NODE_ENV=production`에서만 붙는다. 로컬 HTTP에서 그대로 동작한다.
- 둘 다 `HttpOnly`라 JS에서 읽을 수 없고 읽을 필요도 없다. 브라우저가 자동으로 보낸다.
- 로그인 상태 판단: 토큰을 보지 말고 `GET /api/users/me`를 호출한다. 200이면 로그인, `UNAUTHORIZED`면 비로그인. 앱 시작 시 1회 호출해 스토어 `user`를 채운다.
- 로그아웃: `POST /api/auth/logout` → 204. 서버가 두 쿠키를 `Max-Age=0`으로 지운다. 클라이언트는 `queryClient.clear()`·스토어 `reset()` 후 `/login` 이동 (PRD 4.2).
- 액세스 토큰은 로그아웃 후 최대 15분 유효하다 (R-06). 프론트가 신경 쓸 일은 없다.
- 비밀번호 변경(`PATCH /api/users/me`) 응답은 새 쿠키 2개를 내려준다(브라우저가 자동 교체). 다른 기기·탭의 리프레시 토큰은 전부 폐기되어 액세스 만료 후 로그아웃된다 (PRD 6.4). 프론트는 별도 처리 없음.

## 4. 액세스 만료 처리 (AD-16)

보호 API가 401 `UNAUTHORIZED`를 주면 `api/client.ts`가 다음 순서로 처리한다.

1. 요청이 `/api/auth/*`가 아니면 `POST /api/auth/refresh`를 1회 호출한다.
2. 성공(200)이면 원 요청을 1회 재시도한다.
3. refresh 실패(401) 또는 재시도도 `UNAUTHORIZED`면 `queryClient.clear()`·스토어 `reset()` 후 `/login` 이동. refresh가 5xx·네트워크 오류면 만료로 보지 않고 원 오류를 그대로 throw한다.
4. 401이라도 `code`가 `INVALID_CREDENTIALS`면 refresh하지 않고 그대로 throw한다 (로그인·비밀번호 변경 화면이 오류를 표시).

중요: 동시에 401이 여러 건 나왔을 때 각각 refresh를 호출하면 안 된다. 첫 refresh가 토큰을 회전시키면 두 번째 refresh는 이미 폐기된 토큰으로 와서 재사용 탐지로 판정되고, 서버는 그 사용자의 리프레시 토큰 전부를 폐기한다 (PRD 6.4). 사용자는 즉시 로그아웃된다. 진행 중인 refresh Promise를 반드시 하나만 공유한다.

```ts
// frontend/src/api/client.ts 핵심. parse(응답 → JSON 또는 ApiError throw)·send(credentials: 'include', JSON 본문)는 생략
type RefreshResult = 'ok' | 'expired' | 'error';
let refreshing: Promise<RefreshResult> | null = null;

function refreshOnce(): Promise<RefreshResult> {
  refreshing ??= fetch(`${API}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((r): RefreshResult => (r.ok ? 'ok' : r.status === 401 ? 'expired' : 'error'))
    .catch((): RefreshResult => 'error')
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function request<T>(path: string, options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {}): Promise<T> {
  const res = await send(path, options);
  if (res.status !== 401 || path.startsWith('/api/auth/')) return parse<T>(res);
  if ((await codeOf(res)) !== 'UNAUTHORIZED') return parse<T>(res); // INVALID_CREDENTIALS 등
  const refreshed = await refreshOnce();
  if (refreshed === 'error') return parse<T>(res); // 일시 장애: 만료 처리 없음
  if (refreshed === 'ok') {
    const retry = await send(path, options);
    if (retry.status !== 401 || (await codeOf(retry)) !== 'UNAUTHORIZED') return parse<T>(retry);
  }
  onSessionExpired(); // App이 등록: queryClient.clear() + store.reset() + /login
  return parse<T>(res);
}
```

`onSessionExpired`는 `setSessionExpiredHandler(fn)`으로 `App.tsx`가 등록한다. 앱 시작 시 세션 복구(`GET /api/users/me`)가 끝난 뒤에만 등록하므로, 비로그인 상태로 `/signup`에 직접 들어가도 `/login`으로 튕기지 않는다.

## 5. 요청 규약

- JSON 본문은 `content-type: application/json` 헤더 필수. 없으면 본문이 비어 `VALIDATION_ERROR`.
- 할일을 반환하는 엔드포인트 5개(`GET /api/todos`, `POST /api/todos`, `GET /api/todos/:id`, `PATCH /api/todos/:id`, `PATCH /api/todos/:id/completed`)는 쿼리 `today`(`YYYY-MM-DD`) 필수. 값은 클라이언트 로컬 날짜(`lib/date.ts`). 서버는 이 값으로 `status`를 계산한다 (API-01).
- 날짜(`startDate`, `endDate`, `today`, `from`, `to`)는 `YYYY-MM-DD` 문자열. 일시(`completedAt`, `createdAt`, `updatedAt`)는 ISO 8601 문자열. `Date` 객체를 스토어·쿼리 키에 넣지 않는다 (PR-05).
- id는 JSON 숫자. 경로·쿼리·본문 모두 양의 정수(15자리 이하, 그 밖은 `NOT_FOUND`).
- `description`은 null 가능. 생략·null이면 null로 저장된다. 수정 시 생략하면 비워진다 (API-02).
- 생성 시 `isCompleted`·`status`는 무시된다 (BR-24). 완료 처리는 `PATCH /api/todos/:id/completed`만 쓴다.
- `categoryId` 생략·null → 기본 카테고리 (BR-12). 수정도 같다.
- `PATCH /api/todos/:id`는 부분 수정이 아니다. `title`·`startDate`·`endDate`를 항상 보낸다.
- `title`·`name`은 서버가 trim한다. 응답에는 trim된 값이 온다.
- 캘린더는 `GET /api/todos?today=&from=&to=`. `from`/`to`는 둘 다 보내거나 둘 다 생략. 캘린더 요청에 `categoryId`·`status`를 보내지 않는다 (BR-36).
- 목록 정렬은 서버가 한다 (`endDate`, `startDate`, `createdAt` 오름차순). 프론트에서 재정렬하지 않는다. 페이지네이션 없음.

## 6. 오류 모델

거부 응답 본문은 항상 `{ "code": string, "message": string }` (BR-51). `message`는 영어 디버그용이며 화면에는 코드별 한국어 문구를 쓴다.

| 코드 | HTTP | 발생 상황 |
|------|------|-----------|
| `UNAUTHORIZED` | 401 | 액세스 토큰 없음·무효·만료, refresh 실패 |
| `INVALID_CREDENTIALS` | 401 | 로그인 실패, 비밀번호 변경 시 현재 비밀번호 불일치 |
| `NOT_FOUND` | 404 | 리소스 미존재, 타인 소유, ID 형식 위반, 없는 경로 |
| `VALIDATION_ERROR` | 400 | 입력 형식·길이, `today` 누락, 잘못된 JSON |
| `INVALID_DATE_RANGE` | 400 | `startDate > endDate` |
| `DUPLICATE_EMAIL` | 409 | 가입 이메일 중복 |
| `DUPLICATE_CATEGORY_NAME` | 409 | 같은 이름 카테고리 존재 (`기본` 포함) |
| `CATEGORY_LIMIT_EXCEEDED` | 409 | 카테고리 20개 초과 |
| `DEFAULT_CATEGORY_PROTECTED` | 403 | 기본 카테고리 수정·삭제 |

- 타인 리소스와 미존재 리소스는 같은 `NOT_FOUND`다. 프론트는 구분할 수 없고 구분하지 않는다 (BR-02).
- 검증 순서(BR-52): 인증 → 입력 형식·길이 → 날짜 범위 → ID 형식 → 존재·소유 → 보호 대상 → 중복·개수 제한 → 자격 증명. 첫 위반 1개만 온다. 폼 오류 여러 개를 한 번에 받을 수 없다.
- 그 밖의 오류는 500 `{ "code": "INTERNAL_ERROR", ... }`, DB 다운은 헬스 503.

프론트 처리 지침:

| 코드 | 처리 |
|------|------|
| `VALIDATION_ERROR`, `INVALID_DATE_RANGE`, `DUPLICATE_*`, `CATEGORY_LIMIT_EXCEEDED`, `INVALID_CREDENTIALS` | 현재 화면 유지, 폼 아래 `ErrorMessage`(CP-02) |
| `UNAUTHORIZED` | 4장 refresh 흐름. 최종 실패만 `/login` |
| `NOT_FOUND` | 편집 진입(`GET /api/todos/:id`)은 안내 후 목록으로 이동. 나머지는 `ErrorMessage`(CP-02)에 표시 후 관련 목록 refetch(`queries/`의 `onError`) |
| `DEFAULT_CATEGORY_PROTECTED`, `INTERNAL_ERROR` | `ErrorMessage`(CP-02). 토스트 컴포넌트는 없다 |

`ApiError`는 `types/api.ts`의 `{ code, message }`이며 `code`는 위 9개 유니온 + `INTERNAL_ERROR`.

## 7. 엔드포인트 요약

17개. 인증 "필요"는 `token` 쿠키 검증. 상세 요청·응답·오류 순서는 `docs/9-api-design.md` 2장, 스키마는 `backend/swagger.yaml`.

| 메서드 | 경로 | 인증 | 핵심 파라미터 | 성공 응답 |
|--------|------|------|---------------|-----------|
| GET | `/api/health` | 없음 | - | 200 `{ ok: true, db: "up" }` / 503 `{ ok: false, db: "down" }` |
| POST | `/api/auth/signup` | 없음 | 본문 `email`, `password`, `name` | 201 `{ user: { id, name } }` + 쿠키 2개 |
| POST | `/api/auth/login` | 없음 | 본문 `email`, `password` | 200 `{ user: { id, name } }` + 쿠키 2개 |
| POST | `/api/auth/logout` | 없음 | 쿠키 `refresh_token`(선택) | 204 + 쿠키 2개 삭제 |
| POST | `/api/auth/refresh` | 없음 | 쿠키 `refresh_token` | 200 `{ user: { id, name } }` + 새 쿠키 2개 |
| GET | `/api/users/me` | 필요 | - | 200 `{ id, email, name }` |
| PATCH | `/api/users/me` | 필요 | 본문 `name` 또는 `currentPassword` + `newPassword` | 200 `{ id, email, name }` (비밀번호 변경 시 + 새 쿠키 2개) |
| GET | `/api/categories` | 필요 | - | 200 `[{ id, name, isDefault }]` |
| POST | `/api/categories` | 필요 | 본문 `name` | 201 `{ id, name, isDefault: false }` |
| PATCH | `/api/categories/:id` | 필요 | 본문 `name` | 200 `{ id, name, isDefault }` |
| DELETE | `/api/categories/:id` | 필요 | - | 204 (소속 할일은 기본 카테고리로 이동) |
| GET | `/api/todos` | 필요 | 쿼리 `today`(필수), `categoryId`, `status`, `from` + `to` | 200 `[Todo]` |
| POST | `/api/todos` | 필요 | 쿼리 `today`. 본문 `title`, `description`, `startDate`, `endDate`, `categoryId` | 201 `Todo` |
| GET | `/api/todos/:id` | 필요 | 쿼리 `today` | 200 `Todo` |
| PATCH | `/api/todos/:id` | 필요 | 쿼리 `today`. 본문은 POST와 같음 | 200 `Todo` |
| DELETE | `/api/todos/:id` | 필요 | - | 204 |
| PATCH | `/api/todos/:id/completed` | 필요 | 쿼리 `today`. 본문 `isCompleted`(boolean) | 200 `Todo` |

`Todo` 필드: `id`, `categoryId`, `title`, `description`(null 가능), `startDate`, `endDate`, `isCompleted`, `completedAt`(null 가능), `status`, `createdAt`, `updatedAt`. `status`는 `NOT_STARTED` / `IN_PROGRESS` / `COMPLETED` / `OVERDUE`.

## 8. 보안 주의

- 토큰을 `localStorage`·`sessionStorage`·Zustand에 저장하지 않는다. 저장할 토큰 자체가 없다 (`HttpOnly`).
- CSRF: 쿠키 `SameSite=Lax` + JSON 본문(`application/json`)으로 완화한다. CSRF 토큰 없음. 폼 `application/x-www-form-urlencoded` 전송을 쓰지 않는다.
- 입력 길이 제한은 서버가 검증한다 (`backend/src/routes/validate.js`). 프론트는 같은 값으로 `maxLength`·안내를 둔다. 서버 검증을 생략하지 않는다 (NFR-09).

| 필드 | 제한 |
|------|------|
| `email` | 254자 이하, `local@domain` 형식 |
| `password`, `newPassword` | 8~64자, UTF-8 72바이트 이하 |
| `name` (사용자) | trim 후 1~50자 |
| `name` (카테고리) | trim 후 1~30자 |
| `title` | trim 후 1~100자 |
| `description` | 1000자 이하 |
| 날짜 | `YYYY-MM-DD`, 실제 존재하는 날짜 |

- 응답에 `password`·해시·토큰 값은 없다. 인증 응답의 `user`는 `{ id, name }`(`types/api.ts`의 `User`), `/api/users/me`는 `{ id, email, name }`(`Me`)뿐이다.
- 요청 본문 100kb 초과는 `VALIDATION_ERROR`.

## 9. 시드 계정과 스모크

`npm run seed`가 `backend/src/db/seed.sql`을 적용한다 (시나리오 3장 샘플 데이터). 다시 실행하면 전부 초기화된다.

| 계정 | 이메일 | 비밀번호 | 이름 | 데이터 |
|------|--------|----------|------|--------|
| PS-01 | `haneul@example.com` | `haneul1234` | 김하늘 | 카테고리 `기본`, `과제`. 할일 1건 (`알고리즘 과제`, 11/02~11/06) |
| PS-02 | `seojun@example.com` | `seojun1234` | 이서준 | 카테고리 `기본`, `업무`, `개인`. 할일 7건 (10/26~11/10, 완료 1건) |

시나리오 기준일은 `2026-11-03`이다. `today=2026-11-03`으로 조회하면 PS-02 데이터에 4가지 `status`가 모두 나온다.

`npm run smoke` (`backend/tests/smoke.js`): 서버 실행 + 시드 적용 상태에서 로그인·필터·타인 리소스·쿠키 속성·만료·회전·재사용·로그아웃을 HTTP로 검사한다. 백엔드를 바꾼 뒤 프론트 연동 전에 한 번 돌린다. 가입 검사가 `smoke-<시각>@example.com` 사용자를 남기므로 깨끗한 데이터가 필요하면 `npm run seed`를 다시 한다.

## 10. Swagger

- 원본: `backend/swagger.yaml` (OpenAPI 3.0.3). 수동 작성, `docs/9-api-design.md`와 같은 내용.
- JSON: 저장소 루트 `swagger/swagger.json`. `cd backend && npm run swagger:json`으로 `swagger.yaml`에서 생성한다. `swagger.yaml`을 고치면 다시 생성한다. 타입 생성 도구 입력용.
- 개발 모드(`npm run dev`) 서버가 Swagger UI를 띄운다.
  - UI: `http://localhost:3000/api/docs`
  - JSON: `http://localhost:3000/api/docs.json`
- 운영 모드에서는 제공하지 않는다.

Swagger UI는 API와 같은 origin(`:3000`)에서 제공되므로 "Try it out"에 쿠키가 그대로 붙는다. 로그인을 먼저 실행하면 이후 보호 API도 호출된다.
