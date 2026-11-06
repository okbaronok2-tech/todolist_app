# TodoList 부하 테스트 결과 (T-X04)

## 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | TodoList 부하 테스트 결과 |
| 현재 버전 | v0.1 |
| 상태 | 초안 |
| 작성일 | 2026-11-05 |
| 참조 문서 | `docs/2-PRD.md` v0.16 (5.1 NFR-01~05, R-02, R-03, A-01, PD-04), `docs/8-plan.md` v0.14 (T-X04), `backend/tests/load.js`, `backend/tests/load-seed.js` |

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 | 영향 범위 |
|------|------|--------|-----------|-----------|
| v0.1 | 2026-11-05 | - | 초안. k6 1000 VU 램프 60초 + 5분 측정 1회, `EXPLAIN (ANALYZE)` 2건 | 전체 |

---

## 1. 측정 환경

| 항목 | 값 |
|------|----|
| 서버·DB·부하 생성기 위치 | 모두 같은 PC (로컬). PRD R-02·8-plan T-X04 3항에 따라 NFR-02 수치는 **참고치**이며 운영 환경(PD-04 미정)에서 재측정해야 한다 |
| CPU | Intel Core i7-8700 @ 3.20GHz, 12 논리 프로세서 |
| 메모리 | 31.9 GB |
| OS | Windows 11 Enterprise |
| Node | v24.22.2, 프로세스 1개 (A-01), `pg` Pool max 20 (NFR-04) |
| PostgreSQL | 17.11 (localhost), `max_connections` 100 |
| 부하 생성기 | k6 v2.3.0 (`backend/tests/load.js`), `noCookiesReset: true` |
| 데이터 | `npm run load:seed`: 사용자 1000명(`load-0001`~`load-1000@example.com`) × 할일 100건 = 100,000행 + 개발 시드 8행 (NFR-05). `npm run seed`로 원복 |
| 시나리오 | 60초 램프로 1000 VU 진입(VU당 로그인 1회), 이후 5분 유지. 요청 비율 목록 50 / 캘린더 30 / 등록 8 / 수정 4 / 완료 4 / 삭제 4, think time 지수분포 평균 10초, 타임아웃 10초 (PRD 5.1) |
| 집계 구간 | 램프 이후 5분 (`phase:steady` 태그). 로그인은 램프 구간 |

## 2. 결과

| 지표 | 값 | NFR 기준 | 판정 |
|------|----|----------|------|
| 조회 API p95 (목록·캘린더, 정상 구간) | 8.5 ms | ≤ 500 ms (NFR-02) | 충족 |
| 쓰기 API p95 (등록·수정·완료·삭제, 정상 구간) | 8.1 ms | ≤ 800 ms (NFR-02) | 충족 |
| 로그인 p95 (램프 구간) | 56.6 ms | ≤ 1500 ms (NFR-02) | 충족 |
| 5xx·타임아웃·4xx 비율 (정상 구간) | 0.00% | < 1% (NFR-03) | 충족 |
| 전체 요청 실패율 (`http_req_failed`) | 0.00% | < 1% | 충족 |
| 총 요청 / 초당 요청 | 34836 / 92.9 req/s | 약 100 req/s 가정 (NFR-01) | - |
| 반복(iteration) / 최대 VU | 33616 / 1000 | 1000 VU (NFR-01) | 충족 |
| refresh 호출 | 0 | 시나리오상 0 (액세스 15분 > 측정 5분) | 충족 |

- NFR-02: 충족 (단, 같은 PC 측정이라 수치는 참고치. R-02·PD-04)
- NFR-03: 충족
- 같은 PC 측정의 영향: 부하 생성기(k6, 1000 VU)가 서버·DB와 CPU를 나눠 쓴다. 지연은 실제 운영보다 낮게(네트워크 왕복 없음) 또는 높게(CPU 경합) 나올 수 있어 "충족"은 로컬 기준이다. 운영 사양이 정해지면(PD-04) 부하 생성기를 다른 호스트에 두고 재측정한다.

### k6 임계값

| 지표 | 임계값 | 결과 |
|------|--------|------|
| `login_duration` | `p(95)<1500` | ok |
| `write_duration{phase:steady}` | `p(95)<800` | ok |
| `http_req_failed` | `rate<0.01` | ok |
| `error_rate{phase:steady}` | `rate<0.01` | ok |
| `read_duration{phase:steady}` | `p(95)<500` | ok |

### k6 요약 (원문)

```text
TOTAL RESULTS 

    checks_total.......: 1000    2.66665/s
    checks_succeeded...: 100.00% 1000 out of 1000
    checks_failed......: 0.00%   0 out of 1000

    ✓ login 200

    CUSTOM
    error_rate.....................: 0.00%  0 out of 34836
      { phase:steady }.............: 0.00%  0 out of 29952
    login_duration.................: avg=53.72ms min=40.26ms med=54.26ms max=104.4ms p(90)=55.36ms p(95)=56.55ms
    read_duration..................: avg=3.26ms  min=0s      med=2.43ms  max=83.93ms p(90)=6.98ms  p(95)=8.32ms 
      { phase:steady }.............: avg=3.51ms  min=0s      med=2.77ms  max=83.93ms p(90)=7.31ms  p(95)=8.5ms  
    write_duration.................: avg=3.07ms  min=0s      med=2.36ms  max=62.48ms p(90)=6.34ms  p(95)=7.85ms 
      { phase:steady }.............: avg=3.16ms  min=0s      med=2.47ms  max=62.48ms p(90)=6.51ms  p(95)=8.12ms 

    HTTP
    http_req_duration..............: avg=4.68ms  min=0s      med=2.5ms   max=104.4ms p(90)=7.58ms  p(95)=9.88ms 
      { expected_response:true }...: avg=4.68ms  min=0s      med=2.5ms   max=104.4ms p(90)=7.58ms  p(95)=9.88ms 
    http_req_failed................: 0.00%  0 out of 34836
    http_reqs......................: 34836  92.895428/s

    EXECUTION
    iteration_duration.............: avg=9.88s   min=2.43ms  med=6.87s   max=1m0s    p(90)=22.75s  p(95)=29.51s 
    iterations.....................: 33616  89.642115/s
    vus............................: 222    min=15         max=1000
    vus_max........................: 1000   min=1000       max=1000

    NETWORK
    data_received..................: 603 MB 1.6 MB/s
    data_sent......................: 11 MB  30 kB/s
```

## 3. 쿼리 실행 계획 (10만 행 상태, `EXPLAIN (ANALYZE, BUFFERS)`)

대상 사용자: `load-0500@example.com`(할일 100건). 둘 다 `todos_user_*` 인덱스를 타며 seq scan이 아니다.

### 3.1 목록 쿼리 (`GET /api/todos?today=2026-11-03`, `todo-repo.js list`, 필터 없음)

```text
Incremental Sort  (cost=2.21..186.86 rows=102 width=97) (actual time=0.111..0.162 rows=103 loops=1)
  Sort Key: end_date, start_date, created_at, id
  Presorted Key: end_date, start_date, created_at
  Full-sort Groups: 4  Sort Method: quicksort  Average Memory: 27kB  Peak Memory: 27kB
  Buffers: shared hit=89
  ->  Index Scan using todos_user_end_start_created_idx on todos  (cost=0.42..182.26 rows=102 width=97) (actual time=0.040..0.086 rows=103 loops=1)
        Index Cond: (user_id = 1502)
        Buffers: shared hit=74
Planning:
  Buffers: shared hit=184
Planning Time: 0.788 ms
Execution Time: 0.215 ms
```

### 3.2 캘린더 쿼리 (`GET /api/todos?today=2026-11-03&from=2026-10-26&to=2026-12-06`)

```text
Incremental Sort  (cost=2.34..92.25 rows=47 width=97) (actual time=0.128..0.134 rows=42 loops=1)
  Sort Key: end_date, start_date, created_at, id
  Presorted Key: end_date, start_date, created_at
  Full-sort Groups: 2  Sort Method: quicksort  Average Memory: 27kB  Peak Memory: 27kB
  Buffers: shared hit=52
  ->  Index Scan using todos_user_end_start_created_idx on todos  (cost=0.42..90.14 rows=47 width=97) (actual time=0.042..0.076 rows=42 loops=1)
        Index Cond: ((user_id = 1502) AND (end_date >= '2026-10-26'::date) AND (start_date <= '2026-12-06'::date))
        Buffers: shared hit=37
Planning:
  Buffers: shared hit=190
Planning Time: 0.819 ms
Execution Time: 0.189 ms
```

## 4. 결론·후속

- 로컬 1000 VU·약 93 req/s에서 p95는 기준 대비 큰 여유가 있다. 병목은 bcrypt 로그인(램프 구간)이며 60초 분산으로 충분했다 (R-03).
- 운영 사양 확정(PD-04) 후 부하 생성기를 분리해 재측정하고, NFR-02 "충족"을 참고치에서 확정으로 바꾼다.
- 재실행: `cd backend && npm run load:seed && k6 run --summary-export=load-summary.json tests/load.js && npm run seed`
