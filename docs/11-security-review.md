# TodoList 백엔드 보안 검토 (OWASP Top 10 2021)

## 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | TodoList 백엔드 보안 검토 |
| 현재 버전 | v0.5 |
| 상태 | 초안 |
| 작성일 | 2026-11-05 |
| 참조 문서 | `docs/2-PRD.md` v0.15, `docs/5-project-principle.md` v0.14, `docs/9-api-design.md` v0.7, `backend/swagger.yaml` v0.11 |
| 설계 근거 | PRD 6.4·NFR-06~10, 도메인 정의서 BR-01·02·06·51~53 |

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 | 영향 범위 |
|------|------|--------|-----------|-----------|
| v0.1 | 2026-11-05 | - | 초안 작성. 읽기 전용 수동 검토 + `npm audit` | 전체 |
| v0.2 | 2026-11-05 | - | CORS 방식 전환(PRD v0.10) 반영. 설계 결정 표의 CORS 행을 `CORS_ORIGIN` 허용 목록으로, `SameSite=Lax` 같은 site 조건 행 추가, A05 근거에 `middlewares/cors.js`, 참조 버전 갱신 | 문서 정보, 1장, 2장 A05 |
| v0.3 | 2026-11-05 | - | S-01~S-06 조치 완료 반영. 2장 결과를 양호로, 3장 각 항목에 조치 내용, 4장 체크. S-01은 PRD 6.4 규칙으로 승격(비밀번호 변경 시 리프레시 전부 폐기 + 새 쿠키) | 문서 정보, 2장, 3장, 4장 |
| v0.4 | 2026-11-06 | - | 대상 파일 수 22→23 정정(`backend/src/**/*.js` 실제 개수). 참조 버전 갱신 | 문서 정보, 1장 |
| v0.5 | 2026-11-06 | - | 설계 결정 표: 쿠키 `SameSite`를 운영 `None`+`Secure`로(Vercel 다른 site 배포), CSRF 완화 근거를 CORS 허용 목록 + JSON 본문 프리플라이트로 갱신. 참조 버전 갱신 | 문서 정보, 설계 결정 |

---

## 1. 범위·방법·도구

- 대상: `backend/src/**/*.js`(23개), `backend/package.json`, `backend/package-lock.json`, `backend/.env.example`, `.gitignore`, `backend/swagger.yaml`.
- 기준: OWASP Top 10 2021 A01~A10 (https://owasp.org/www-project-top-ten/).
- 도구: `sast` MCP는 연결에 실패했고 gemini-cli·codex는 설치되어 있지 않다. 수동 코드 검토로 진행했다. `npm audit --omit=dev --json`은 `backend/`에서 실행했다 (2절 A06).
- 표기: "추정"은 코드만으로 확정할 수 없는 판단이다. "설계 결정"은 PRD에 근거가 있는 의도된 동작이며 결함으로 세지 않는다.

### 설계 결정 (결함 아님)

| 항목 | 근거 |
|------|------|
| CORS 허용 목록은 환경변수 `CORS_ORIGIN`, 요청 Origin 정확 일치만 허용(`*` 없음), `Allow-Credentials: true` (`middlewares/cors.js`) | PRD NFR-06 (6), 8-plan T-X03 |
| 쿠키 `SameSite`는 개발 `Lax`, 운영 `None`+`Secure`(SPA·API가 다른 site인 Vercel 배포). `None`이라 CSRF 완화는 CORS 허용 목록(`CORS_ORIGIN` 정확 일치, 아니면 응답 헤더 없음)과 JSON 본문이다: 상태 변경 요청은 `application/json` 본문이 필요해 프리플라이트를 거치고, 본문 없는 `POST /api/auth/logout`만 cross-site 폼으로 호출 가능(영향: 로그아웃뿐) | PRD NFR-06 (1)(2)(3)(6), `middlewares/auth.js` |
| 서버 세션 없음, 로그아웃 후 액세스 토큰 최대 15분 잔존 | PRD 6.4, R-06, PD-01 |
| `Secure` 쿠키는 `NODE_ENV=production`에서만 설정 | NFR-06 (3), `middlewares/auth.js` |
| 로그인 시도 제한·rate limit 없음 | PD-03 (MVP 범위 밖) |
| 가입 시 `DUPLICATE_EMAIL`로 이메일 존재 여부가 드러남 | BR-04 |
| `/api/health` 비인증 | PRD 6.3 |
| Swagger UI·JSON(`/api/docs`, `/api/docs.json`)은 개발 모드만 제공 | `app.js` `NODE_ENV !== 'production'` |
| 할일 개수 상한 없음, 목록 전체 반환 | PD-02, A-02 |

## 2. OWASP 항목별 결과

| 항목 | 결과 | 근거 파일:줄 | 조치 |
|------|------|-------------|------|
| A01 Broken Access Control | 양호 | `routes/users.js`, `routes/categories.js`, `routes/todos.js` (`requireAuth`), `repositories/todo-repo.js`·`category-repo.js` 모든 쿼리에 `user_id`, `routes/users.js` `/me` 고정(BR-03), `services/todo-service.js` BR-16 | 없음 |
| A02 Cryptographic Failures | 양호 | `server.js:5-9` (JWT_SECRET 48자 검사), `middlewares/auth.js` (HS384 고정), `services/auth-service.js` (bcrypt 10, SHA-256, randomBytes 32), `routes/validate.js` (비밀번호 UTF-8 72바이트 검사), `.env.example` (운영 `sslmode=require` 안내) | S-03·S-06 조치 완료 |
| A03 Injection | 양호 | `repositories/*.js` 전체 `$n` 바인딩, `todo-repo.js` 고정 SQL, `refresh-token-repo.js` 상수 조각만 결합, `db/migrate.js` 고정 디렉터리 파일 | 없음 |
| A04 Insecure Design | 양호 | `routes/validate.js:6` (ID 15자리 이하), `db/pool.js:5` | S-02 조치 완료 |
| A05 Security Misconfiguration | 양호 | `app.js` (`x-powered-by` 비활성. HSTS·nosniff는 PD-04 결정 후 리버스 프록시), `middlewares/cors.js` (Origin 정확 일치, `*` 없음), `error-handler.js` (500 응답에 내부 정보 없음), `.gitignore:69-71` (`.env`, `.env.*` 제외, `.env.example`만 허용) | S-04 조치 완료 |
| A06 Vulnerable Components | 양호 | `npm audit --omit=dev` 2026-11-05: 운영 의존성 98개, 취약점 0 (info 0, low 0, moderate 0, high 0, critical 0). express 5.3.0, jsonwebtoken 9.0.3, bcrypt 6.0.0, pg 8.23.1, cookie-parser 1.4.7 | 배포 전 재실행 |
| A07 Identification and Authentication Failures | 양호 | `services/auth-service.js` (BR-06 더미 해시로 타이밍 동일화, 회전·재사용 탐지 `FOR UPDATE`), `services/user-service.js` (비밀번호 변경 시 리프레시 전부 폐기 + 새 토큰 발급) | S-01 조치 완료 |
| A08 Software and Data Integrity Failures | 양호 | `package-lock.json` 존재, `middlewares/auth.js` `algorithms` 고정으로 `alg` 변조 차단, 역직렬화는 `express.json`뿐 | 배포는 `npm ci` 사용 |
| A09 Security Logging and Monitoring Failures | 양호 | `middlewares/error-handler.js` (오류 1줄 JSON + 인증된 요청의 `userId`), `services/auth-service.js` (재사용 탐지 `event: 'refresh_reuse'` 1줄). 비밀번호·토큰은 로그에 남지 않음 | S-05 조치 완료 |
| A10 SSRF | 해당 없음 | 외부 HTTP 호출 코드 없음 (`backend/src` 전체) | 없음 |

## 3. 주의 상세

### S-01 비밀번호 변경 후 리프레시 토큰 유지 (A07, Medium)

- 위치: `backend/src/services/user-service.js` `updateMe`
- 문제: 비밀번호만 갱신하고 `refresh_tokens`는 그대로 둔다. PRD 6.4에는 이 경우의 규정이 없다(설계 갭).
- 재현: (1) 공격자가 피해자의 `refresh_token`을 확보한다. (2) 피해자가 `PATCH /api/users/me`로 비밀번호를 바꾼다. (3) 공격자가 `POST /api/auth/refresh`를 호출하면 200이 오고 새 토큰이 발급된다. 이 상태가 최대 14일 계속된다.
- 제안: `withTransaction` 안에서 `tokens.revokeAllForUser(userId, db)`를 호출하고 현재 요청에는 새 리프레시를 발급한다. 이 조치를 하지 않으면 PRD R-표에 수용 리스크로 기록한다.
- 조치(2026-11-05): 구현. `user-service.js` `updateMe`가 비밀번호 변경 시 같은 트랜잭션에서 전부 폐기하고 새 리프레시를 발급, `routes/users.js`가 새 쿠키 2개를 설정한다. PRD 6.4에 규칙 추가. 테스트 `user-service.test.js` S-01, `scenarios.test.js` US-19

### S-02 ID 정규식이 JS 안전 정수 범위를 넘음 (A04, Low)

- 위치: `backend/src/routes/validate.js:6`, `backend/src/db/pool.js:5`
- 문제: `/^[1-9]\d{0,17}$/`는 18자리까지 허용한다. `Number.MAX_SAFE_INTEGER`는 9007199254740991(16자리)이다. 주석의 "2^53 미만 보장"은 사실과 다르다.
- 재현: `GET /api/todos/9007199254740993?today=2026-11-05`를 보내면 `Number()`가 9007199254740992로 반올림해 다른 ID를 조회한다. 모든 쿼리에 `user_id` 조건이 있어 타인 데이터에는 접근할 수 없다. 영향은 정확성 문제에 그친다.
- 제안: `/^[1-9]\d{0,14}$/`(15자리)로 바꾸거나 변환 후 `Number.isSafeInteger`로 검사한다. 두 주석도 고친다.
- 조치(2026-11-05): 15자리로 변경, 주석 수정. 테스트 `validate.test.js`(15자리 허용, 16자리 `NOT_FOUND`)

### S-03 bcrypt 72바이트 절단 (A02, Low)

- 위치: `backend/src/routes/validate.js:22`, `backend/src/services/auth-service.js`, `backend/src/services/user-service.js`
- 문제: BR-44는 글자 수 64자 제한이다. bcrypt는 앞 72바이트만 사용한다. UTF-8 한글은 글자당 3바이트이므로 25번째 글자부터 해시에 반영되지 않는다.
- 재현: 한글 30자 비밀번호로 가입한다. 앞 24자가 같고 나머지가 다른 비밀번호로 로그인해도 성공한다.
- 제안: `Buffer.byteLength(value, 'utf8') > 72`이면 `VALIDATION_ERROR`로 거부한다. 또는 BR-44에 바이트 기준을 명시한다.
- 조치(2026-11-05): 둘 다. `validate.password`에 72바이트 검사, BR-44에 바이트 기준 명시. 테스트 `validate.test.js`(한글 24자 허용, 25자 거부)

### S-04 기본 응답 헤더 (A05, Low)

- 위치: `backend/src/app.js`
- 문제: Express 5는 기본으로 `X-Powered-By: Express`를 보낸다. `X-Content-Type-Options: nosniff` 헤더도 없다.
- 재현: `curl -i http://localhost:3000/api/health` 응답에 `X-Powered-By: Express`가 있다.
- 제안: `app.disable('x-powered-by')` 1줄을 추가한다. HSTS·nosniff 등은 PD-04(HTTPS 종료 지점) 결정 후 리버스 프록시에서 설정한다. helmet 의존성은 추가하지 않는다(원칙 3.5).
- 조치(2026-11-05): `app.js`에 추가. `smoke.js`가 헤더 부재를 확인

### S-05 보안 이벤트 로그 부족 (A09, Low)

- 위치: `backend/src/middlewares/error-handler.js`, `backend/src/services/auth-service.js`
- 문제: 리프레시 재사용 탐지(토큰 탈취 신호)가 일반 `UNAUTHORIZED` 로그와 구분되지 않는다. 로그에 userId·IP가 없고 로그인 성공도 기록되지 않는다.
- 재현: 회전된 이전 `refresh_token`으로 `/api/auth/refresh`를 호출하면 전체 폐기가 일어난다. 그런데 로그에는 `{"status":401,"code":"UNAUTHORIZED","message":"please log in again"}`만 남는다.
- 제안: 재사용 탐지 시 `{event:'refresh_reuse', userId}` 1줄 JSON을 남긴다. 오류 로그에 `req.userId`(있을 때)를 추가한다. 토큰과 비밀번호 값은 계속 남기지 않는다.
- 조치(2026-11-05): 둘 다 구현 (`auth-service.js` refresh, `error-handler.js`)

### S-06 DB 연결 TLS 미설정 (A02, Low, 추정)

- 위치: `backend/src/db/pool.js`, `backend/.env.example`
- 문제: TLS 옵션이 없다. 운영 DB가 다른 호스트에 있으면 자격 증명과 데이터가 평문으로 오갈 수 있다. 배포 구성은 PD-04 미정이라 추정이다.
- 제안: 운영 `DATABASE_URL`에 `sslmode=require`를 쓴다고 `.env.example` 주석에 명시한다. 코드 변경은 필요 없다.
- 조치(2026-11-05): `.env.example` 주석에 명시. 실제 적용은 PD-04 결정 시

## 4. 후속 조치

- [x] S-01 비밀번호 변경 시 리프레시 전체 폐기 여부를 결정한다(구현 또는 PRD R-표 기록) — 구현, PRD 6.4
- [x] S-02 ID 정규식을 15자리 이하로 바꾸고 주석을 고친다(`validate.js:6`, `pool.js:5`)
- [x] S-03 비밀번호 72바이트 검사를 추가하거나 BR-44에 바이트 기준을 명시한다
- [x] S-04 `app.disable('x-powered-by')`를 추가한다
- [x] S-05 재사용 탐지 이벤트 로그와 userId를 추가한다
- [x] S-06 `.env.example`에 `sslmode=require` 안내 (실제 적용은 PD-04 결정 시)
- [ ] PD-03(브루트포스 방어) 재검토 시점을 운영 배포 전으로 정한다
- [ ] 배포 전 `npm audit --omit=dev`를 재실행한다
