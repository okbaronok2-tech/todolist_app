# TodoList

실행 순서:

1. DB 생성: `createdb todolist && createdb todolist_test` (PostgreSQL 17). `backend/.env.example`을 복사해 `backend/.env`, `backend/.env.test`를 만든다.
2. 스키마·시드: `cd backend && npm install && npm run migrate && npm run seed`
3. 실행: `cd backend && npm run dev` (API :3000), `cd frontend && npm install && npm run dev` (SPA, `/api` 프록시)

설계 문서는 `docs/`, API 명세는 `docs/9-api-design.md`·`backend/swagger.yaml`.
