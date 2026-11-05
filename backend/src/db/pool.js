import pg from 'pg';

// DATE(OID 1082)는 JS Date로 바꾸지 않고 'YYYY-MM-DD' 문자열 그대로 반환한다 (PRD 7장, PR-05)
pg.types.setTypeParser(1082, (value) => value);
// BIGINT(OID 20) id는 JSON 숫자로 보낸다 (PRD 7장). validate.id가 15자리 이하로 제한해 2^53 미만 보장
pg.types.setTypeParser(20, Number);

// 원칙 6.3: Pool 인스턴스는 이 파일 하나뿐 (NFR-04)
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

// 헬스체크용 (원칙 6.3)
export async function ping() {
  await pool.query('SELECT 1');
}

// fn(client)을 한 트랜잭션으로 실행한다. 저장소 함수는 마지막 인자 db(pool 또는 client)를 받는다.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {}); // 연결이 끊겨도 원래 오류를 던진다
    throw err;
  } finally {
    client.release();
  }
}

// 검사와 INSERT 사이 경합으로 unique 위반(23505)이 나면 서비스가 BR-51 코드로 바꾼다
export const isUniqueViolation = (err, constraint) => err?.code === '23505' && err.constraint === constraint;
