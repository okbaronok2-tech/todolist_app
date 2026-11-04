-- 시나리오 3장 샘플 데이터 (docs/3-user-scenario.md 3.2~3.4). 원칙 5장 "시드".
-- id가 시드 순서대로 1부터 붙도록 TRUNCATE ... RESTART IDENTITY 후 넣는다. refresh_tokens는 CASCADE로 함께 비워진다.
-- 비밀번호 해시: bcrypt cost 10 (NFR-07). haneul1234, seojun1234
-- created_at은 id 순으로 1분 간격(시나리오 3.1 "createdAt도 id 순" 가정, 목록 정렬 BR-32 tie-break 고정)

BEGIN;

TRUNCATE users, categories, todos RESTART IDENTITY CASCADE;

INSERT INTO users (email, password, name, created_at, updated_at) VALUES
  ('haneul@example.com', '$2b$10$fLkSQUfeBtlVwoMty5tem.8/5FzVX16iusobvQciK6.eNpNyhWA1W', '김하늘', '2026-10-25 09:00:00+09', '2026-10-25 09:00:00+09'),
  ('seojun@example.com', '$2b$10$m9uou0yJ.SoKJ9tkaqE2wOUp9We5ooerIA4ZaSK2XLsCapYepkLZG', '이서준', '2026-10-25 09:00:00+09', '2026-10-25 09:00:00+09');

INSERT INTO categories (user_id, name, is_default, created_at, updated_at) VALUES
  (1, '기본', true,  '2026-10-25 09:00:00+09', '2026-10-25 09:00:00+09'),
  (1, '과제', false, '2026-10-25 09:00:00+09', '2026-10-25 09:00:00+09'),
  (2, '기본', true,  '2026-10-25 09:00:00+09', '2026-10-25 09:00:00+09'),
  (2, '업무', false, '2026-10-25 09:00:00+09', '2026-10-25 09:00:00+09'),
  (2, '개인', false, '2026-10-25 09:00:00+09', '2026-10-25 09:00:00+09');

INSERT INTO todos (user_id, category_id, title, description, start_date, end_date, is_completed, completed_at, created_at, updated_at) VALUES
  (2, 4, '주간 보고서 제출', NULL, '2026-11-01', '2026-11-02', true,  '2026-11-02 18:00:00+09', '2026-10-25 09:01:00+09', '2026-11-02 18:00:00+09'),
  (2, 4, '거래처 견적 회신', NULL, '2026-11-01', '2026-11-02', false, NULL, '2026-10-25 09:02:00+09', '2026-10-25 09:02:00+09'),
  (2, 4, '팀 회의 자료 준비', NULL, '2026-11-04', '2026-11-05', false, NULL, '2026-10-25 09:03:00+09', '2026-10-25 09:03:00+09'),
  (2, 5, '은행 서류 제출',   NULL, '2026-11-03', '2026-11-03', false, NULL, '2026-10-25 09:04:00+09', '2026-10-25 09:04:00+09'),
  (2, 4, '분기 계획 작성',   NULL, '2026-10-31', '2026-11-03', false, NULL, '2026-10-25 09:05:00+09', '2026-10-25 09:05:00+09'),
  (2, 3, '헬스장 등록',      NULL, '2026-10-26', '2026-11-01', false, NULL, '2026-10-25 09:06:00+09', '2026-10-25 09:06:00+09'),
  (2, 5, '가족 여행 준비',   NULL, '2026-11-08', '2026-11-10', false, NULL, '2026-10-25 09:07:00+09', '2026-10-25 09:07:00+09'),
  (1, 2, '알고리즘 과제',    NULL, '2026-11-02', '2026-11-06', false, NULL, '2026-10-25 09:08:00+09', '2026-10-25 09:08:00+09');

COMMIT;
