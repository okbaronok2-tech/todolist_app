# backend 지침

상위 `CLAUDE.md`의 지침(한국어 응답, 오버엔지니어링 금지, 문서 버전 갱신)을 그대로 따른다. 이 파일은 `backend/` 안에서만 추가로 적용한다.

## 반드시 지켜야 할 지침

- 배포할 때 바뀔 수 있는 값은 환경변수로 분리한다. 현재 사용하는 환경변수: `DATABASE_URL`, `JWT_SECRET`(48자 이상), `PORT`(기본 3000), `NODE_ENV`, `CORS_ORIGIN`(허용 SPA origin, 쉼표 구분). 새 환경변수를 추가하면 `.env.example`에 키를 등록하고 `src/server.js`의 기동 검사에 넣는다. `.env`, `.env.test`는 커밋하지 않는다.
- SOLID 원칙과 Clean 아키텍처를 준수한다. 의존 방향은 `routes → services → repositories → db` 한 방향이다. 역방향 import 금지.
- 라우트에 SQL을 쓰지 않는다. 서비스에 `req`/`res`를 넘기지 않는다. 리포지토리는 마지막 인자로 `db = pool`을 받아 트랜잭션 클라이언트를 주입받는다.
- HTTP 상태 코드와 오류 코드는 `src/errors/codes.js`에만 둔다. 오류는 `AppError(code, message)`로 던지고 `error-handler`가 응답으로 바꾼다.
- 비밀번호, 해시, 토큰 값은 로그와 응답에 절대 남기지 않는다.
- API를 바꾸면 `swagger.yaml`(머리 주석, `x-document-info`, `x-changelog`)과 `docs/9-api-design.md`를 함께 갱신한다.

## 아키텍처 골격

```
src/
  server.js        환경변수 검사, listen, SIGTERM/SIGINT 종료
  app.js           express 조립: cors, json, cookie-parser, /api/health, /api/docs(개발만), 라우터, notFound, errorHandler. named export `app` + default export(서버리스 핸들러용)
  routes/          HTTP 입출력만. validate.js로 입력 검증(BR-52 순서) 후 서비스 호출. users.js는 비밀번호 변경 시 새 쿠키 설정
  services/        비즈니스 규칙(BR), 트랜잭션 경계(withTransaction), 상태 판정(todo-status.js)
  repositories/    SQL만. 고정 SQL + 파라미터, 유니크 위반은 isUniqueViolation으로 판별
  db/              pool.js(타입 파서, withTransaction), migrate.js, migrations/NNN_*.sql, seed.sql
  errors/          codes.js(CODES, HTTP), app-error.js
  middlewares/     cors.js(CORS_ORIGIN 허용 목록, 프리플라이트 204), auth.js(JWT HS384 쿠키, refresh 회전), error-handler.js
tests/             node:test, DB를 쓰는 테스트 파일마다 beforeEach(resetDb). 롤백 검증은 DB 트리거로, pg 모킹 금지
```

## 명령

- 테스트: `npm test` (`.env.test`와 `todolist_test` DB 필요)
- 스모크: 서버 실행 후 `npm run smoke`
- 마이그레이션·시드: `npm run migrate`, `npm run seed`
- 부하 테스트: `npm run load:seed`(사용자 1000명 × 할일 100건 추가) → `k6 run tests/load.js`(k6 별도 설치) → `npm run seed`로 원복. 결과는 `docs/perf-result.md`
- Swagger JSON 재생성: `npm run swagger:json` (`swagger.yaml` → `../swagger/swagger.json`). 개발 모드 서버가 `/api/docs`(Swagger UI), `/api/docs.json`으로 제공. `swagger.yaml`을 고치면 반드시 재생성
