-- TodoList 스키마 (PostgreSQL 17)
-- 출처: docs/7-erd.md v0.2 (ERD-02~06, ERD-08), docs/2-PRD.md v0.7 7장
-- 실행: psql -d todolist -f docs/schema.sql  (backend/src/db/migrations/001_init.sql의 원본)
-- 미결 항목 결정(7-erd.md 9장 참조): ERD-C2 ON DELETE, ERD-C5 is_default 기본값, ERD-C6 복합 FK, ERD-C7 타임스탬프 기본값

BEGIN;

-- ERD-03 users
CREATE TABLE users (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       VARCHAR NOT NULL,                      -- BR-43 길이는 서버 검증 (PRD 7장)
  password    VARCHAR NOT NULL,                      -- bcrypt 해시 (BR-05, NFR-07)
  name        VARCHAR NOT NULL,                      -- BR-45
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),    -- ERD-C7: 기본값 now(), updated_at 갱신은 애플리케이션
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BR-04 이메일 대소문자 무시 유일
CREATE UNIQUE INDEX users_email_lower_uk ON users (lower(email));

-- ERD-08 refresh_tokens (PRD NFR-06, 6.4). 리프레시 토큰 원문은 저장하지 않고 SHA-256 hex 해시만 저장
CREATE TABLE refresh_tokens (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  CHAR(64) NOT NULL,                     -- SHA-256 hex
  expires_at  TIMESTAMPTZ NOT NULL,                  -- 발급 +14일 (Max-Age=1209600)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ NULL                       -- 회전·로그아웃·재사용 탐지 시 now()
);

-- NFR-06 리프레시 쿠키 해시 조회
CREATE UNIQUE INDEX refresh_tokens_token_hash_uk ON refresh_tokens (token_hash);
-- NFR-06 사용자 전체 폐기, 로그인 시 만료·폐기 행 삭제
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

-- ERD-04 categories
CREATE TABLE categories (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,  -- ERD-C2: 회원 탈퇴 비범위(D-04)지만 고아 방지
  name        VARCHAR NOT NULL,                      -- BR-46
  is_default  BOOLEAN NOT NULL DEFAULT false,        -- ERD-C5: 기본값 false, 가입 시 1건만 true (BR-11)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)                               -- ERD-C6: todos 복합 FK 대상
);

-- BR-14 사용자 내 이름 유일 (정규화 후)
CREATE UNIQUE INDEX categories_user_name_uk ON categories (user_id, lower(btrim(name)));
-- BR-13 사용자당 기본 카테고리 1개
CREATE UNIQUE INDEX categories_user_default_uk ON categories (user_id) WHERE is_default;

-- ERD-05 todos
CREATE TABLE todos (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id   BIGINT NOT NULL,
  title         VARCHAR NOT NULL,                    -- BR-41
  description   TEXT,                                -- BR-42
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  is_completed  BOOLEAN NOT NULL DEFAULT false,      -- BR-24
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT todos_date_range_chk CHECK (start_date <= end_date),                       -- BR-22
  CONSTRAINT todos_completed_chk  CHECK (is_completed = (completed_at IS NOT NULL)),   -- BR-28
  -- ERD-C6 / BR-16: 카테고리는 같은 사용자 소유여야 한다. ERD-C2: 카테고리 삭제는 BR-15 이동 후이므로 RESTRICT
  CONSTRAINT todos_category_fk FOREIGN KEY (category_id, user_id)
    REFERENCES categories (id, user_id) ON DELETE RESTRICT
);

-- PRD 7장 인덱스
CREATE INDEX todos_user_end_start_created_idx ON todos (user_id, end_date, start_date, created_at); -- 목록 정렬·상태 필터 (UC-09)
CREATE INDEX todos_user_start_end_idx         ON todos (user_id, start_date, end_date);             -- 캘린더 겹침 (BR-33)
CREATE INDEX todos_user_category_idx          ON todos (user_id, category_id);                      -- 카테고리 필터, BR-15 이동

COMMIT;
