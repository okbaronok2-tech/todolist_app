# TodoList API 설계 (초안)

## 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | TodoList API 설계 |
| 현재 버전 | v0.6 |
| 상태 | 초안 |
| 작성일 | 2026-11-04 |
| 참조 문서 | `docs/1-domain-definition.md` v0.9, `docs/2-PRD.md` v0.13, `docs/3-user-scenario.md` v0.6, `docs/5-project-principle.md` v0.11, `docs/6-arch-diagram.md` v0.8, `docs/8-plan.md` v0.12, `backend/swagger.yaml` v0.9 |
| 정본 | PRD 6.3·6.4·NFR-06. 이 문서는 그 내용을 엔드포인트 표로 고정한다. 기계 판독용 명세는 `backend/swagger.yaml`이며 둘은 같은 내용이어야 한다 |

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 | 영향 범위 |
|------|------|--------|-----------|-----------|
| v0.1 | 2026-11-04 | - | 초안 작성 (8-plan T-X02). AD-C3·C4·C5 결정 기록 | 전체 |
| v0.2 | 2026-11-05 | - | `GET /api/health` 503 본문 확정(`{ "ok": false }`, `backend/src/app.js` 기준), 참조 버전 갱신 | 문서 정보, 3장 |
| v0.3 | 2026-11-05 | - | `GET /api/health` 응답에 `db`(`up`/`down`) 추가 | 문서 정보, 3장 |
| v0.4 | 2026-11-05 | - | 공통 규칙에 본문 파싱 오류 400, 5xx 본문 `INTERNAL_ERROR`, 개발 모드 `/api/docs` 추가 (swagger v0.7과 동일) | 문서 정보, 2장 |
| v0.5 | 2026-11-05 | - | 공통 규칙에 CORS(`CORS_ORIGIN` 허용 목록, `Allow-Credentials`, 프리플라이트 204, 클라이언트 `credentials: 'include'`) 추가 (swagger v0.8, `backend/src/middlewares/cors.js`와 동일), 참조 버전 갱신 | 문서 정보, 1장 |
| v0.6 | 2026-11-05 | - | 11-security 조치 반영: ID 15자리 이하, 비밀번호 72바이트, `PATCH /api/users/me` 비밀번호 변경 시 리프레시 전부 폐기 + 새 쿠키 2개 (swagger v0.9와 동일), 참조 버전 갱신 | 문서 정보, 1장, 2장 |

---

## 1. 공통 규칙

- 모든 경로는 `/api` 접두어 (PRD 6.3). REST + JSON, 필드명 camelCase (원칙 4장).
- id는 DB `BIGINT`를 JSON 숫자로 보낸다. 날짜(`startDate`, `endDate`, `today`, `from`, `to`)는 `YYYY-MM-DD` 문자열, 일시(`completedAt`, `createdAt`, `updatedAt`)는 ISO 8601 문자열 (PRD 7장, PR-05).
- 인증: 쿠키 `token`(액세스 JWT HS384, `HttpOnly; SameSite=Lax; Path=/; Max-Age=900`)과 `refresh_token`(불투명 난수, `HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=1209600`). 운영만 `Secure` (NFR-06). 인증 미들웨어는 `token`만 검증한다.
- 비보호 경로: `GET /api/health`, `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` (PRD 6.4, AD-06). 나머지는 `token` 없음·무효·만료 시 401 `UNAUTHORIZED` (BR-01, BR-53).
- CORS (NFR-06 (6), `middlewares/cors.js`): SPA와 API는 다른 origin이다. 요청 `Origin`이 환경변수 `CORS_ORIGIN`(쉼표 구분) 목록에 있을 때만 `Access-Control-Allow-Origin: <그 Origin>`, `Access-Control-Allow-Credentials: true`, `Vary: Origin`을 붙인다. `OPTIONS` 프리플라이트는 204(`Allow-Methods: GET,POST,PATCH,DELETE`, `Allow-Headers: Content-Type`, `Max-Age: 600`). 목록 밖 Origin에는 헤더가 없다. 클라이언트는 `fetch`에 `credentials: 'include'`가 필요하다. `CORS_ORIGIN`이 없으면 서버가 기동하지 않는다.
- 거부 응답 본문은 `{ "code", "message" }` (BR-51). HTTP 매핑(PRD 6.3): `UNAUTHORIZED`·`INVALID_CREDENTIALS` 401, `NOT_FOUND` 404, `VALIDATION_ERROR`·`INVALID_DATE_RANGE` 400, `DUPLICATE_EMAIL`·`DUPLICATE_CATEGORY_NAME`·`CATEGORY_LIMIT_EXCEEDED` 409, `DEFAULT_CATEGORY_PROTECTED` 403.
- 검증 순서(BR-52): 인증 → 입력 형식·길이 → 날짜 범위 → ID 형식(양의 정수 15자리 이하가 아니면 DB 조회 없이 `NOT_FOUND`) → 리소스 존재·소유 → 보호 대상 → 중복·개수 제한 → 자격 증명. 첫 위반 코드로 거부하고 부분 저장하지 않는다.
- 경로·쿼리·본문의 ID가 형식 위반·타인 소유·미존재면 모두 같은 본문의 `NOT_FOUND` (BR-02, BR-16).
- 할일을 반환하는 요청은 쿼리 `today`(`YYYY-MM-DD`, 필수)를 받고, 응답의 `status`를 ST-01~04로 계산한다 (BR-32, BR-36, AD-A7). `today` 누락·형식 오류는 `VALIDATION_ERROR`.
- 페이지네이션·요청 횟수 제한 없음 (NFR-05, PD-02, PD-03). 동시 수정은 last-write-wins (BR-54). BR-51 밖의 오류는 500 `{ "code": "INTERNAL_ERROR", "message": "internal server error" }` (AD-A8). 본문이 JSON이 아니거나 100kb 초과·미지원 charset이면 400 `VALIDATION_ERROR`. 개발 모드에서만 `GET /api/docs`(Swagger UI)·`/api/docs.json` 제공, 운영 404.

## 2. 엔드포인트

"오류"는 그 엔드포인트에서 나올 수 있는 코드를 BR-52 검증 순서대로 적은 것이다. 보호 경로의 `UNAUTHORIZED`는 항상 첫 번째다.

| 메서드 | 경로 | 인증 | 요청 | 성공 | 오류 (BR-52 순서) | 관련 ID |
|--------|------|------|------|------|-------------------|---------|
| POST | `/api/auth/signup` | 없음 | 본문 `email`(≤254, `local@domain`), `password`(8~64), `name`(trim 1~50) | 201 `{ user: { id, name } }` + 두 쿠키 | `VALIDATION_ERROR` → `DUPLICATE_EMAIL` | UC-01, BR-04, BR-05, BR-11, BR-43~45, AD-07 |
| POST | `/api/auth/login` | 없음 | 본문 `email`, `password` | 200 `{ user: { id, name } }` + 두 쿠키. 만료·폐기 리프레시 행 삭제 | `VALIDATION_ERROR`(AD-C5) → `INVALID_CREDENTIALS` | UC-02, BR-06, AD-08 |
| POST | `/api/auth/logout` | 없음 (미들웨어 없음) | 쿠키 `refresh_token`(선택) | 204 + 두 쿠키 `Max-Age=0`. 행이 있으면 `revoked_at = now()` | 없음 (항상 204) | UC-03, PD-01, R-06, AD-14 |
| POST | `/api/auth/refresh` | 없음 (미들웨어 없음) | 쿠키 `refresh_token` | 200 `{ user: { id, name } }` + 새 두 쿠키 (회전, 한 트랜잭션) | `UNAUTHORIZED` + 두 쿠키 삭제 (행 없음·만료·재사용 탐지. 재사용 시 사용자 전체 폐기) | NFR-06, PRD 6.4, US-16, AD-16 |
| GET | `/api/users/me` | 필요 | - | 200 `{ id, email, name }` | `UNAUTHORIZED` | UC-04 (P1), BR-03 |
| PATCH | `/api/users/me` | 필요 | 본문 `name`(trim 1~50) 또는 `currentPassword` + `newPassword`(8~64자, UTF-8 72바이트 이하). 다른 필드 무시. 비밀번호를 바꾸면 리프레시 토큰 전부 폐기 + 응답에 새 `token`·`refresh_token` 쿠키 (PRD 6.4) | 200 `{ id, email, name }` | `UNAUTHORIZED` → `VALIDATION_ERROR` → `INVALID_CREDENTIALS` | UC-04 (P1), BR-03, BR-05, BR-44, BR-45 |
| GET | `/api/categories` | 필요 | - | 200 `[{ id, name, isDefault }]` | `UNAUTHORIZED` | UC-11, BR-13 |
| POST | `/api/categories` | 필요 | 본문 `name`(trim 1~30) | 201 `{ id, name, isDefault: false }` | `UNAUTHORIZED` → `VALIDATION_ERROR` → `DUPLICATE_CATEGORY_NAME`(BR-14, '기본' BR-17) → `CATEGORY_LIMIT_EXCEEDED`(20개, BR-46) | UC-11, BR-14, BR-17, BR-46 |
| PATCH | `/api/categories/:id` | 필요 | 본문 `name`(trim 1~30) | 200 `{ id, name, isDefault }` | `UNAUTHORIZED` → `VALIDATION_ERROR` → `NOT_FOUND` → `DEFAULT_CATEGORY_PROTECTED` → `DUPLICATE_CATEGORY_NAME` | UC-11, BR-02, BR-14, BR-17 |
| DELETE | `/api/categories/:id` | 필요 | - | 204. 소속 할일은 기본 카테고리로 이동 후 삭제 (한 트랜잭션) | `UNAUTHORIZED` → `NOT_FOUND` → `DEFAULT_CATEGORY_PROTECTED` | UC-11, BR-13, BR-15, AD-12 |
| GET | `/api/todos` | 필요 | 쿼리 `today`(필수), 목록: `categoryId`, `status`(단일, AND). 캘린더: `from` + `to`(둘 다 또는 둘 다 없음, 경계일 포함 겹침) | 200 `[Todo]` 정렬 `endDate`, `startDate`, `createdAt` 오름차순. 0건은 `[]` | `UNAUTHORIZED` → `VALIDATION_ERROR`(`today`·`from`/`to`(AD-C4)·`status` 값) → `NOT_FOUND`(`categoryId`) | UC-09, UC-10, BR-31~33, BR-36, AD-11 |
| POST | `/api/todos` | 필요 | 쿼리 `today`. 본문 `title`(trim 1~100), `description`(≤1000, 선택), `startDate`, `endDate`, `categoryId`(선택, 없음·null이면 기본) | 201 `Todo` (`isCompleted: false`) | `UNAUTHORIZED` → `VALIDATION_ERROR` → `INVALID_DATE_RANGE` → `NOT_FOUND`(`categoryId`) | UC-05, BR-12, BR-16, BR-21~24, BR-26, BR-41, BR-42, AD-09 |
| GET | `/api/todos/:id` | 필요 | 쿼리 `today` | 200 `Todo` | `UNAUTHORIZED` → `VALIDATION_ERROR`(`today`) → `NOT_FOUND` | UC-06, BR-02, AD-C3, AD-13 |
| PATCH | `/api/todos/:id` | 필요 | 쿼리 `today`. 본문은 POST와 같음(편집 필드 전체, `title`·`startDate`·`endDate` 필수). `isCompleted`·`status` 무시 | 200 `Todo` (완료 여부 불변) | `UNAUTHORIZED` → `VALIDATION_ERROR` → `INVALID_DATE_RANGE` → `NOT_FOUND`(id, `categoryId`) | UC-06, BR-12, BR-16, BR-21~23, BR-26, BR-54, AD-09 |
| DELETE | `/api/todos/:id` | 필요 | - | 204 (영구 삭제) | `UNAUTHORIZED` → `NOT_FOUND` | UC-08, BR-27, AD-13 |
| PATCH | `/api/todos/:id/completed` | 필요 | 쿼리 `today`. 본문 `isCompleted`(boolean 필수, 명시 지정·멱등) | 200 `Todo` (`true`면 `completedAt = now()`, `false`면 null) | `UNAUTHORIZED` → `VALIDATION_ERROR` → `NOT_FOUND` | UC-07, BR-25, BR-28, D-10, AD-10 |
| GET | `/api/health` | 없음 | - | 200 `{ "ok": true, "db": "up" }` (`SELECT 1`) | 503 `{ "ok": false, "db": "down" }` | PRD 6.3, 원칙 6.3 |

## 3. 응답 객체

| 객체 | 필드 |
|------|------|
| `Todo` | `id`, `categoryId`, `title`, `description`(null 허용), `startDate`, `endDate`, `isCompleted`, `completedAt`(null 허용), `status`, `createdAt`, `updatedAt` |
| `Category` | `id`, `name`, `isDefault` |
| `User` | `id`, `email`, `name` (`password` 없음) |
| 인증 응답 | `{ user: { id, name } }` (PRD 6.4, AD-A2). 다른 응답은 객체·배열을 감싸지 않는다 |
| 오류 | `{ code, message }`. `code`는 BR-51의 9개 중 하나 |

`status` 값: `NOT_STARTED`(ST-03), `IN_PROGRESS`(ST-04), `COMPLETED`(ST-01), `OVERDUE`(ST-02). 판정 순서는 ST-01 → ST-02 → ST-03 → ST-04. 저장하지 않는 파생 값이다 (도메인 4.1·4.2).

## 4. 결정 사항

아키텍처 문서 10장의 미결과 문서에 없던 사항을 여기서 정한다. `backend/swagger.yaml`과 같다.

| ID | 결정 | 근거 |
|----|------|------|
| AD-C3 | 편집 진입용 단건 조회 `GET /api/todos/:id`를 둔다. 원칙 7.3 `api/todos.ts`에 `get(id, today)` | WF-04, PRD 4.2 `NOT_FOUND` 분기, US-11, US-17 |
| AD-C4 | 캘린더 `from`/`to`는 둘 다 있거나 둘 다 없어야 하며, 한쪽만 있거나 형식 오류면 `VALIDATION_ERROR` | BR-36, PRD 6.3 `today`와 같은 처리 |
| AD-C5 | 로그인 요청의 이메일·비밀번호 형식 위반(BR-43, BR-44)은 BR-52 순서대로 `VALIDATION_ERROR`. 형식이 맞으면 `INVALID_CREDENTIALS` | BR-52 (형식 → 자격 증명) |
| API-01 | 할일을 반환하는 요청(조회·등록·수정·완료)은 모두 쿼리 `today`를 필수로 받는다 | AD-A7, 8-plan T-B05 "응답마다 status 계산" |
| API-02 | `PATCH /api/todos/:id`는 부분 수정이 아니라 편집 필드 전체 전송. `categoryId` 생략·null은 기본 카테고리로 변경, `description` 생략은 비움 | BR-12, BR-21이 수정에도 적용 (AD-09) |
| API-03 | 생성 201, 수정 200(갱신 객체 반환), 삭제 204. 인증 응답만 `{ user }` 래핑 | PRD 6.4, AD-A2 |
| API-04 | 카테고리 생성 시 중복과 개수 상한이 동시에 걸리면 중복이 먼저 | BR-52 나열 순서 |
| API-05 | `status` 쿼리에 목록 밖 값, `isCompleted` 누락·boolean 아님은 `VALIDATION_ERROR` | BR-51 정의 |

미결: 캘린더 요청에 `from > to`가 오는 경우, `from`/`to`와 `categoryId`/`status`가 같이 오는 경우의 처리. 클라이언트는 캘린더 요청에 필터를 보내지 않는다 (BR-36).
