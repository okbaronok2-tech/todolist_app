# TodoList

실행 순서 (저장소 루트에서, 터미널 2개):

1. DB 생성: `createdb todolist && createdb todolist_test` (PostgreSQL 17).
2. 백엔드 환경변수: `backend/.env.example`을 복사해 `backend/.env`와 `backend/.env.test`를 만든다. 둘 다 `JWT_SECRET`에 48자 이상 임의 문자열을 넣는다. `.env.test`의 `DATABASE_URL`은 `todolist_test`로 바꾼다 (`npm test`가 그 DB를 초기화한다). `CORS_ORIGIN`은 기본값 `http://localhost:5173` 그대로.
3. 프론트 환경변수: `frontend/.env.example`을 복사해 `frontend/.env`를 만든다 (`VITE_API_URL=http://localhost:3000`).
4. 스키마·시드: `cd backend && npm install && npm run migrate && npm run seed`
5. 실행: 터미널 1 `cd backend && npm run dev` (API :3000), 터미널 2 `cd frontend && npm install && npm run dev` (SPA :5173, API는 CORS로 직접 호출).

브라우저 `http://localhost:5173`. 시드 계정은 `docs/10-frontend-integration-guide.md` 9장. 설계 문서는 `docs/`, API 명세는 `docs/9-api-design.md`·`backend/swagger.yaml`.
