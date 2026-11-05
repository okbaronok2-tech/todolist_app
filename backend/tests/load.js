/* global __ENV, __VU, __ITER */ // k6 런타임 전역
// k6 부하 시나리오 (T-X04, PRD 5.1, NFR-01~03). 사전: `node --env-file=.env tests/load-seed.js` (사용자 load-0001~1000).
// 실행: k6 run --summary-export=load-summary.json tests/load.js
//   60초 램프로 1000 VU 진입(VU당 로그인 1회), 이후 5분 유지. 요청 비율: 목록 50, 캘린더 30, 등록 8, 수정 4, 완료 4, 삭제 4.
//   think time 지수분포 평균 10초, 타임아웃 10초. 401이면 POST /api/auth/refresh 1회 후 원 요청 1회 재시도.
//   측정은 램프 이후 5분 구간만 집계한다 (태그 phase:steady).
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const TODAY = '2026-11-03';
const RAMP_SEC = 60;
const STEADY_SEC = 300;
const VUS = Number(__ENV.VUS || 1000);
const THINK_MEAN = Number(__ENV.THINK_MEAN || 10);

export const options = {
  noCookiesReset: true, // k6는 기본으로 반복마다 VU 쿠키 jar를 비운다. 로그인 쿠키를 유지해야 한다
  scenarios: {
    main: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: `${RAMP_SEC}s`, target: VUS },
        { duration: `${STEADY_SEC}s`, target: VUS },
      ],
      gracefulRampDown: '5s',
      gracefulStop: '15s',
    },
  },
  thresholds: {
    // NFR-02: 정상 구간 조회 p95 ≤ 500ms, 쓰기 p95 ≤ 800ms, 로그인(램프) p95 ≤ 1500ms. NFR-03: 오류율 < 1%
    'read_duration{phase:steady}': ['p(95)<500'],
    'write_duration{phase:steady}': ['p(95)<800'],
    login_duration: ['p(95)<1500'],
    'error_rate{phase:steady}': ['rate<0.01'],
    http_req_failed: ['rate<0.01'], // 4xx·5xx 포함 전체
  },
};

const readDuration = new Trend('read_duration', true);
const writeDuration = new Trend('write_duration', true);
const loginDuration = new Trend('login_duration', true);
const errorRate = new Rate('error_rate');
const refreshCount = new Rate('refresh_used');

let startMs = null;
const steady = () => Date.now() - startMs >= RAMP_SEC * 1000;
const phase = () => (steady() ? 'steady' : 'ramp');
const expThink = () => -Math.log(1 - Math.random()) * THINK_MEAN;
const jsonParams = (extra = {}) => ({ headers: { 'content-type': 'application/json' }, timeout: '10s', ...extra });

function record(kind, res, tags) {
  // 5xx·타임아웃(NFR-03) 외에 4xx도 오류로 센다. 정상 시나리오에서 4xx는 나오면 안 된다 (401이면 쿠키 유실)
  const failed = res.status === 0 || res.status >= 400 || res.error_code === 1050; // 1050 = timeout
  errorRate.add(failed, tags);
  (kind === 'write' ? writeDuration : readDuration).add(res.timings.duration, tags);
  return !failed;
}

// 401 UNAUTHORIZED → refresh 1회 → 원 요청 재시도 (PRD 5.1). k6 VU별 쿠키 jar가 Set-Cookie를 자동 반영한다
function call(method, path, body, kind) {
  const tags = { phase: phase(), kind };
  const send = () => (body === undefined ? http.request(method, BASE + path, null, jsonParams({ tags })) : http.request(method, BASE + path, JSON.stringify(body), jsonParams({ tags })));
  let res = send();
  if (res.status === 401) {
    const r = http.post(`${BASE}/api/auth/refresh`, null, jsonParams({ tags: { ...tags, kind: 'refresh' } }));
    refreshCount.add(1);
    if (r.status === 200) res = send();
  }
  record(kind, res, tags);
  return res;
}

export function setup() {
  return { startMs: Date.now() };
}

export default function (data) {
  startMs ??= data.startMs;
  if (!__VU_STATE.loggedIn) {
    const email = `load-${String(((__VU - 1) % 1000) + 1).padStart(4, '0')}@example.com`;
    const res = http.post(`${BASE}/api/auth/login`, JSON.stringify({ email, password: 'haneul1234' }), jsonParams({ tags: { kind: 'login', phase: phase() } }));
    loginDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200, { phase: phase(), kind: 'login' });
    if (!check(res, { 'login 200': (r) => r.status === 200 })) return;
    __VU_STATE.loggedIn = true;
    __VU_STATE.created = [];
  }

  const r = Math.random() * 100;
  if (r < 50) {
    call('GET', `/api/todos?today=${TODAY}`, undefined, 'read');
  } else if (r < 80) {
    call('GET', `/api/todos?today=${TODAY}&from=2026-10-26&to=2026-12-06`, undefined, 'read');
  } else if (r < 88) {
    const res = call('POST', `/api/todos?today=${TODAY}`, { title: `k6 ${__VU}-${__ITER}`, startDate: '2026-11-03', endDate: '2026-11-05' }, 'write');
    if (res.status === 201) __VU_STATE.created.push(res.json('id'));
  } else if (r < 92) {
    const id = __VU_STATE.created[0];
    if (id) call('PATCH', `/api/todos/${id}?today=${TODAY}`, { title: `k6 수정 ${__ITER}`, startDate: '2026-11-03', endDate: '2026-11-06' }, 'write');
    else call('GET', `/api/todos?today=${TODAY}`, undefined, 'read');
  } else if (r < 96) {
    const id = __VU_STATE.created[0];
    if (id) call('PATCH', `/api/todos/${id}/completed?today=${TODAY}`, { isCompleted: __ITER % 2 === 0 }, 'write');
    else call('GET', `/api/todos?today=${TODAY}`, undefined, 'read');
  } else {
    const id = __VU_STATE.created.shift();
    if (id) call('DELETE', `/api/todos/${id}`, undefined, 'write');
    else call('GET', `/api/todos?today=${TODAY}&from=2026-11-02&to=2026-11-08`, undefined, 'read');
  }
  // think time: 지수분포 평균 10초 (NFR-01)
  const t = expThink();
  // k6 sleep은 초 단위
  sleepSec(Math.min(t, 60));
}

import { sleep } from 'k6';
const sleepSec = (s) => sleep(s);
const __VU_STATE = {};
