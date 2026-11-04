import pg from 'pg';

// DATE(OID 1082)는 JS Date로 바꾸지 않고 'YYYY-MM-DD' 문자열 그대로 반환한다 (PRD 7장, PR-05)
pg.types.setTypeParser(1082, (value) => value);

// 원칙 6.3: Pool 인스턴스는 이 파일 하나뿐 (NFR-04)
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});
