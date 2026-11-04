# TodoList 아키텍처 다이어그램 (초안)

## 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | TodoList 아키텍처 다이어그램 |
| 현재 버전 | v0.5 |
| 상태 | 초안 |
| 작성일 | 2026-11-04 |
| 참조 문서 | `docs/1-domain-definition.md` v0.8, `docs/2-PRD.md` v0.9, `docs/3-user-scenario.md` v0.6, `docs/4-wireframe.md` v0.5, `docs/5-project-principle.md` v0.5, `docs/7-erd.md` v0.4, `docs/9-api-design.md` v0.1 |

ID 규칙: 이 문서에서 새로 부여하는 ID는 AD(아키텍처 다이어그램)뿐이다. F, UC, BR, ST, D는 도메인 정의서, SC, NFR, R, A, PD는 PRD, US는 사용자 시나리오, WF, CP는 와이어프레임, PR은 프로젝트 원칙의 ID를 참조만 하며 재정의하지 않는다. 다이어그램은 모두 mermaid 코드 블록이다. 문서 간 표현이 다른 지점은 PRD를 기준으로 그리고 10장에 나열한다.

## 변경 이력

| 버전 | 일자 | 작성자 | 변경 내용 | 영향 ID |
|------|------|--------|-----------|---------|
| v0.1 | 2026-11-04 | - | 초안 작성 | AD-01~15 |
| v0.2 | 2026-11-04 | - | AD-05 ERD를 docs/7-erd.md로 분리 | 문서 정보, 4장, AD-05, 8장 |
| v0.3 | 2026-11-04 | - | PRD v0.7 인증 방식 변경 반영. AD-07·AD-08을 HS384·두 쿠키 발급으로 수정, AD-06에 refresh·logout 비보호 경로, AD-14 로그아웃을 인증 미들웨어 없이 리프레시 폐기 + 두 쿠키 삭제로 수정, AD-16(액세스 만료 → 리프레시 → 재시도) 추가, AD-01·AD-04 라벨, AD-A3 변경됨, AD-C8 해결, 참조 버전 갱신 | 문서 정보, 1.2, AD-01, AD-04, AD-06, AD-07, AD-08, AD-14, AD-16, 8장, AD-A3, AD-C8 |
| v0.4 | 2026-11-04 | - | 8문서 교차 검토 반영. AD-09 인증 실패 분기를 AD-16 리프레시·재시도 후 실패 시 이동으로 수정, AD-14에 auth-service 참여자 추가(라우트는 DB를 직접 호출하지 않음, 원칙 3장), 1장 문서 수 6개·API 설계 문서 경로, 참조 버전 갱신 | 문서 정보, 1장, AD-09, AD-14 |
| v0.5 | 2026-11-04 | - | AD-C3·C4·C5 해결(`docs/9-api-design.md` 4장), 1장 '작성 예정' 표기 제거, 참조 문서에 `docs/9-api-design.md` 추가, 참조 버전 갱신 | 문서 정보, 1장, 10장 |

---

## 1. 개요

### 1.1 목적

6개 설계 문서에 흩어진 구조·흐름을 그림 한 벌로 모아, 구현자가 레이어 배치·요청 처리 순서·검증 순서·상태 판정을 문서와 대조할 수 있게 한다. 새 규칙을 정하지 않는다.

### 1.2 읽는 법

- 시퀀스 다이어그램의 participant 약어: U 사용자, FE 프론트엔드(React SPA), MW 인증 미들웨어(`middlewares/auth.js`), RT 라우트(`routes/*.js` + `validate.js`), SV 서비스(`services/*.js`), RP 저장소(`repositories/*.js`), DB PostgreSQL 17, EH 오류 미들웨어(`middlewares/error-handler.js`).
- 거부 응답은 모두 `AppError` → 오류 미들웨어 → `{ code, message }` + HTTP status(PRD 6.3) 경로를 지난다 (PR-06). 시퀀스에서는 지면을 줄이기 위해 `BE-->>FE: 4xx CODE` 한 줄로 축약한다.
- API 함수명(`todos.create` 등)은 프로젝트 원칙 7.3 `api/todos.ts`의 함수다. 엔드포인트 경로·메서드 상세는 API 설계 문서(`docs/9-api-design.md`)에서 정하므로, 원칙 7.2에 적힌 `POST /api/auth/signup|login|logout|refresh`와 PRD 6.3의 `GET /api/health` 외에는 경로를 쓰지 않는다.
- 날짜는 전 구간 `YYYY-MM-DD` 문자열이다 (PR-05). today = 클라이언트 로컬 날짜 (D-05).

---

## 2. 시스템 컨텍스트

### AD-01 시스템 컨텍스트

사용자 → 브라우저(React SPA) → Express → PostgreSQL 단일 경로다 (PRD 6.2). 서버 세션은 없고 액세스 토큰(JWT) 쿠키와 리프레시 토큰(DB에 해시 저장) 쿠키로 인증한다 (NFR-06, PRD 6.4). SPA와 API는 같은 origin이라 CORS 설정이 없다.

```mermaid
flowchart LR
    U["사용자 (PS-01 학생, PS-02 직장인)"]
    B["브라우저: React 19 SPA (Zustand + TanStack Query)"]
    S["Express 서버: Node.js + JavaScript"]
    P[("PostgreSQL 17: users, refresh_tokens, categories, todos")]

    U -->|"화면 조작 (SC-01~07)"| B
    B -->|"REST + JSON, /api/*, 쿠키 token·refresh_token (HttpOnly)"| S
    S -->|"pg Pool (max 20), 파라미터 바인딩 $1"| P
    P -->|"행 (DATE는 YYYY-MM-DD 문자열)"| S
    S -->|"JSON, 거부 시 { code, message }"| B
```

### AD-02 개발 / 운영 배포 차이

개발은 Vite 개발 서버가 `/api`를 Express로 프록시하고, 운영은 Express 하나가 `frontend/dist`와 `/api`를 함께 제공한다 (NFR-06, 원칙 6.1, 7.3). 운영은 HTTPS만 허용한다 (NFR-08). HTTPS 종료 지점은 PD-04(open)다.

```mermaid
flowchart TB
    subgraph DEV["개발 (NODE_ENV != production, HTTP 허용)"]
        DB1["브라우저"]
        DV["Vite 개발 서버 (frontend/)"]
        DE["Express (backend/, PORT 기본 3000)"]
        DP[("PostgreSQL: DATABASE_URL")]
        DB1 -->|"/ (SPA 자산)"| DV
        DB1 -->|"/api/*"| DV
        DV -->|"프록시 /api → http://localhost:3000"| DE
        DE --> DP
    end

    subgraph PROD["운영 (NODE_ENV=production, HTTPS만, 쿠키 Secure)"]
        PB["브라우저"]
        PE["Express 1 프로세스 (A-01)"]
        PS["정적 파일 frontend/dist"]
        PP[("PostgreSQL 17")]
        PB -->|"/ (SPA 자산)"| PE
        PB -->|"/api/*"| PE
        PE --> PS
        PE --> PP
    end
```

---

## 3. 컴포넌트 / 레이어 아키텍처

원칙 7.2·7.3 디렉토리 구조와 1:1이다. 화살표는 import 방향이며 한 방향만 허용된다 (원칙 3.1, 3.2, 3.4).

### AD-03 프론트엔드 레이어 (frontend/src)

```mermaid
flowchart TB
    subgraph PAGES["pages/ (SC-01~07 1:1, 화면 조립·이동만)"]
        P1["LoginPage (SC-01, WF-01)"]
        P2["SignupPage (SC-02, WF-02)"]
        P3["TodoListPage (SC-03, WF-03)"]
        P4["TodoFormPage (SC-04, WF-04, new·edit 공용)"]
        P5["CalendarPage (SC-05, WF-05)"]
        P6["MePage (SC-06, WF-06, P1)"]
        P7["CategoriesPage (SC-07, WF-07)"]
    end

    subgraph COMP["components/"]
        CAL["calendar/: MonthView, WeekView, DayView"]
        CMN["common/: TopNav (CP-01), ErrorMessage (CP-02), ConfirmDialog (CP-03), StatusBadge (CP-04), TodoRow (CP-05), EmptyList (CP-06)"]
    end

    subgraph DATA["서버 데이터"]
        Q["queries/: use-categories, use-todos (쿼리 키·invalidate 규칙)"]
        API["api/: client (fetch 래퍼, UNAUTHORIZED → refresh 1회 → 재시도 → 실패 시 reset·/login), auth, categories, todos"]
    end

    subgraph STATE["클라이언트 UI 상태"]
        ST["stores/app-store.ts (Zustand 1개): user, filter, calendar(view, anchorDate), reset()"]
    end

    subgraph LIB["lib/ (순수 함수, React·스토어·api import 금지)"]
        L1["date.ts: 로컬 today, 날짜 더하기·비교"]
        L2["calendar-range.ts: BR-35 from/to, PRD 4.2 이전·다음"]
    end

    subgraph TYPES["types/"]
        T["todo.ts (TodoStatus 상수), category.ts, api.ts (ApiError, 코드 유니온 BR-51)"]
    end

    ROOT["main.tsx (QueryClientProvider, Router) → App.tsx (라우트, RequireAuth)"] --> PAGES
    PAGES --> COMP
    PAGES --> Q
    PAGES --> ST
    PAGES --> LIB
    CAL --> CMN
    CMN -.->|"예외: CP-01 로그아웃 mutation만"| Q
    Q --> API
    API --> ST
    Q --> T
    API --> T
```

### AD-04 백엔드 레이어 (backend/src)

```mermaid
flowchart TB
    SRV["server.js: 환경변수 검사, app.listen, graceful shutdown"]
    APP["app.js: express(), 미들웨어·라우트 등록, 정적 dist, 오류 미들웨어"]

    subgraph MW["middlewares/"]
        MA["auth.js: 액세스 토큰 검증 (HS384 고정), req.userId 주입, 두 쿠키 옵션 (NFR-06, BR-01)"]
        ME["error-handler.js: AppError → status·본문, 1줄 JSON 로그"]
    end

    subgraph RT["routes/ (인증 미들웨어, 형식·길이·날짜 범위 검증, HTTP 변환)"]
        R1["auth.js: signup/login/logout/refresh (UC-01~03). refresh·logout은 인증 미들웨어 없음"]
        R2["users.js: users/me (UC-04, P1)"]
        R3["categories.js: CRUD (UC-11)"]
        R4["todos.js: CRUD, 완료 지정, 목록·캘린더 조회 (UC-05~10)"]
        RV["validate.js: BR-21, BR-22, BR-32 today, BR-41~46, ID 양의 정수"]
    end

    subgraph SV["services/ (BR, ST-01~04, 트랜잭션 경계)"]
        S1["auth-service.js: BR-04~06, BR-11 트랜잭션"]
        S2["user-service.js: BR-03, BR-05"]
        S3["category-service.js: BR-13~17, BR-46, BR-15 트랜잭션"]
        S4["todo-service.js: BR-12, BR-16, BR-24~28, 상태 부여"]
        S5["todo-status.js: ST-01~04 순수 함수, 상태 상수"]
    end

    subgraph RP["repositories/ (SQL만, 모든 쿼리에 user_id 조건 PR-07)"]
        P1["user-repo.js"]
        P0["refresh-token-repo.js: 삽입·해시 조회·폐기·사용자 전체 폐기·정리 (NFR-06)"]
        P2["category-repo.js"]
        P3["todo-repo.js: 필터 BR-31·32 SQL, 겹침 BR-33, 기본 정렬"]
    end

    subgraph ERR["errors/"]
        E1["app-error.js: class AppError(code, message)"]
        E2["codes.js: BR-51 코드 상수 + HTTP status 매핑 (PRD 6.3)"]
    end

    subgraph DBL["db/"]
        D1["pool.js: Pool(max 20), DATE OID 1082 → 문자열"]
        D2["migrate.js + migrations/001_init.sql"]
        D3["seed.sql: 시나리오 3장 샘플"]
    end

    SRV --> APP
    APP --> MW
    APP --> RT
    RT --> SV
    SV --> RP
    RP --> D1
    RT --> E1
    SV --> E1
    ME --> E2
    S4 --> S5
    D2 --> D1
```

---

## 4. 데이터 모델 ERD

### AD-05 ERD

ERD는 `docs/7-erd.md`(ERD-01 개념, ERD-02 물리)로 분리했다. 이 번호는 추적표 호환을 위해 유지한다.

---

## 5. 요청 처리 파이프라인

### AD-06 미들웨어 체인

`app.js` 등록 순서다 (원칙 7.2, 3.1). `POST /api/auth/refresh`와 `POST /api/auth/logout`은 인증 미들웨어를 거치지 않는다 (PRD 6.4, AD-14, AD-16). BR-52 검증 순서의 분담: 인증 → 형식·길이 → 날짜 범위는 라우트, 존재·소유 → 보호 대상 → 중복·개수 → 자격 증명은 서비스다. ID 형식(양의 정수) 검사는 라우트에서 DB 조회 없이 `NOT_FOUND`를 낸다 (PRD 6.3, 원칙 6.2).

```mermaid
flowchart LR
    REQ["HTTP 요청"] --> CP["cookie-parser"]
    CP --> OPEN{"비보호 경로?"}
    OPEN -->|"GET /api/health, POST /api/auth/signup, POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/logout"| RT
    OPEN -->|"그 외 /api/*"| MW["인증 미들웨어 auth.js: 쿠키 token JWT HS384 검증 (algorithms 고정) → req.userId (BR-01). refresh_token 쿠키는 보지 않음"]
    MW -->|"쿠키 없음·만료·서명 불일치"| ERR
    MW --> RT["라우트 + validate.js: 형식·길이 (VALIDATION_ERROR) → 날짜 범위 (INVALID_DATE_RANGE) → ID 양의 정수 (NOT_FOUND, DB 조회 없음)"]
    RT -->|"위반"| ERR
    RT --> SV["서비스: 존재·소유 (NOT_FOUND) → 보호 대상 (DEFAULT_CATEGORY_PROTECTED) → 중복·개수 (409 코드) → 자격 증명 (INVALID_CREDENTIALS), ST-01~04, 트랜잭션"]
    SV -->|"AppError"| ERR
    SV --> RP["저장소: SQL + $1 바인딩, user_id 조건 필수"]
    RP --> POOL["db/pool.js (max 20)"]
    POOL --> PG[("PostgreSQL 17")]
    PG --> RP
    RP --> SV
    SV --> RT
    RT --> RES["2xx JSON 응답"]
    ERR["오류 미들웨어 error-handler.js: codes.js 매핑 → status + { code, message }, 1줄 로그 (5xx만 stack)"]
    ERR --> RES4["4xx/5xx 응답"]
    STATIC["운영: 비 /api 경로 → frontend/dist 정적 제공"]
    CP -.-> STATIC
```

HTTP status 매핑 (PRD 6.3):

| 코드 | status |
|------|--------|
| `UNAUTHORIZED`, `INVALID_CREDENTIALS` | 401 |
| `NOT_FOUND` | 404 |
| `VALIDATION_ERROR`, `INVALID_DATE_RANGE` | 400 |
| `DUPLICATE_EMAIL`, `DUPLICATE_CATEGORY_NAME`, `CATEGORY_LIMIT_EXCEEDED` | 409 |
| `DEFAULT_CATEGORY_PROTECTED` | 403 |

---

## 6. 시퀀스 다이어그램

### AD-07 회원가입 → 자동 로그인 → 기본 카테고리 생성 (UC-01, BR-04, BR-11, BR-43~45, US-01, SC-02)

계정 생성과 기본 카테고리 생성은 `auth-service.js`의 한 트랜잭션이다 (원칙 3.1). 실패 시 둘 다 생성되지 않는다 (UC-01 예외 흐름).

```mermaid
sequenceDiagram
    participant U as 사용자
    participant FE as 프론트엔드 SignupPage
    participant RT as 라우트 auth.js
    participant SV as auth-service
    participant DB as PostgreSQL

    U->>FE: 이메일·비밀번호·이름 입력, [가입]
    FE->>RT: POST /api/auth/signup { email, password, name }
    RT->>RT: 형식·길이 검사 BR-43, BR-44, BR-45
    alt 형식 위반
        RT-->>FE: 400 VALIDATION_ERROR
        FE->>U: SC-02 유지, CP-02 message 표시
    else 통과
        RT->>SV: signup(input)
        SV->>DB: BEGIN
        SV->>DB: SELECT users WHERE lower(email) = lower($1)
        alt 이미 존재 (BR-04, 대소문자 무시)
            SV->>DB: ROLLBACK
            SV-->>RT: AppError DUPLICATE_EMAIL
            RT-->>FE: 409 DUPLICATE_EMAIL
            FE->>U: SC-02 유지, 오류 표시, 계정 미생성
        else 없음
            SV->>SV: bcrypt 해시 cost 10 (BR-05, NFR-07)
            SV->>DB: INSERT users
            SV->>DB: INSERT categories (name '기본', is_default true) BR-11
            SV->>DB: COMMIT
            SV->>DB: INSERT refresh_tokens (user_id, token_hash SHA-256, expires_at +14일) NFR-06
            SV-->>RT: user { id, name } + 리프레시 토큰 원문
            RT->>RT: 액세스 토큰 JWT HS384 서명 (sub = userId, iat, exp +15분)
            RT-->>FE: 2xx + Set-Cookie token (Path=/, Max-Age=900) + Set-Cookie refresh_token (Path=/api/auth, Max-Age=1209600), 둘 다 HttpOnly SameSite=Lax
            FE->>FE: app-store user 설정
            FE->>U: SC-03 이동 (SC-01 거치지 않음), 빈 목록 안내 CP-06
        end
    end
```

### AD-08 로그인 + 액세스·리프레시 쿠키 발급 + 보호 API 인증 검사 (UC-02, BR-01, BR-06, BR-53, US-02, US-16, NFR-06)

로그인 실패 사유는 구분하지 않는다 (BR-06). `INVALID_CREDENTIALS`는 401이지만 화면 이동이 없다. 보호 API의 `UNAUTHORIZED`는 클라이언트가 먼저 리프레시 1회 후 재시도하고(AD-16), 그래도 실패할 때만 SC-01로 이동한다 (PRD 4.2, CP-02). 로그인 시 그 사용자의 만료·폐기된 리프레시 행을 삭제한다 (PRD 6.4).

```mermaid
sequenceDiagram
    participant U as 사용자
    participant FE as 프론트엔드
    participant MW as 인증 미들웨어
    participant RT as 라우트
    participant SV as 서비스
    participant DB as PostgreSQL

    U->>FE: 이메일·비밀번호 입력, [로그인]
    FE->>RT: POST /api/auth/login { email, password }
    RT->>SV: login(input)
    SV->>DB: SELECT users WHERE lower(email) = lower($1)
    SV->>SV: bcrypt 비교 (이메일 없음과 비밀번호 틀림을 같은 결과로 처리)
    alt 자격 증명 불일치 (BR-06)
        SV-->>RT: AppError INVALID_CREDENTIALS
        RT-->>FE: 401 INVALID_CREDENTIALS
        FE->>U: SC-01 유지, 단일 message 표시 (이동 없음)
    else 일치
        SV->>DB: DELETE refresh_tokens WHERE user_id = $1 AND (expires_at < now() OR revoked_at IS NOT NULL)
        SV->>DB: INSERT refresh_tokens (user_id, token_hash SHA-256, expires_at +14일)
        SV-->>RT: user { id, name } + 리프레시 토큰 원문 (randomBytes(32) base64url)
        RT->>RT: 액세스 토큰 JWT HS384 서명 (sub, iat, exp +15분)
        RT-->>FE: 2xx user { id, name } + Set-Cookie token (Path=/, Max-Age=900) + Set-Cookie refresh_token (Path=/api/auth, Max-Age=1209600)
        FE->>FE: app-store user 설정
        FE->>U: SC-03 이동
    end

    Note over FE,DB: 이후 보호 API 요청 (예: todos.list)
    FE->>MW: 요청 + Cookie token (브라우저 자동 첨부, refresh_token은 Path=/api/auth라 첨부되지 않음)
    MW->>MW: cookie-parser → jwt.verify(token, JWT_SECRET, { algorithms: ['HS384'] })
    alt 쿠키 없음·만료·서명 불일치 (BR-01, BR-53)
        MW-->>FE: 401 UNAUTHORIZED (데이터 변경 없음)
        FE->>FE: api/client.ts: POST /api/auth/refresh 1회 → 성공 시 원 요청 재시도 (AD-16)
        FE->>U: 리프레시·재시도 실패 시에만 SC-01 이동 (message 표시 없음, CP-02)
    else 유효
        MW->>RT: req.userId 주입, next()
        RT->>SV: 처리 계속
        SV-->>FE: 2xx
    end
```

### AD-09 할일 생성·수정의 BR-52 검증 순서 (UC-05, UC-06, BR-12, BR-16, BR-21~24, BR-41, BR-42, BR-52, US-07, US-08, US-09, SC-04)

한 요청에 여러 위반이 있으면 첫 위반 코드로 거부하고 부분 저장하지 않는다 (BR-52). 수정 시에도 `isCompleted`는 바뀌지 않는다 (UC-06). 할일에는 보호 대상·중복·자격 증명 단계가 없다.

```mermaid
sequenceDiagram
    participant U as 사용자
    participant FE as 프론트엔드 TodoFormPage
    participant MW as 인증 미들웨어
    participant RT as 라우트 todos.js
    participant SV as todo-service
    participant DB as PostgreSQL

    U->>FE: 제목·설명·시작일·종료일·카테고리 입력, [저장]
    Note over FE: 시작일 > 종료일이면 사전 안내만 표시, 요청은 막지 않음 (PR-03)
    FE->>MW: todos.create(body) 또는 todos.update(id, body)
    alt 1 인증 실패 (BR-01)
        MW-->>FE: 401 UNAUTHORIZED
        Note over FE: AD-16 리프레시 1회 → 재시도. 재시도도 실패할 때만 SC-01 이동 (BR-53, US-16)
    else 인증 통과
        MW->>RT: req.userId
        RT->>RT: 2 형식·길이: title 공백 제거 1~100자 (BR-21, BR-41), description 1000자 이하 (BR-42), startDate·endDate 존재·YYYY-MM-DD (BR-21)
        alt 위반
            RT-->>FE: 400 VALIDATION_ERROR
            FE->>U: SC-04 유지, CP-02 + 필드 오류 표시
        else 통과
            RT->>RT: 3 날짜 범위: startDate가 endDate보다 뒤인가 (BR-22)
            alt 위반
                RT-->>FE: 400 INVALID_DATE_RANGE
                FE->>U: SC-04 유지, 날짜 입력란 아래 오류 표시
            else 통과
                RT->>RT: 4a ID 형식: 경로 id·본문 categoryId 양의 정수 (PRD 6.3)
                alt 형식 아님
                    RT-->>FE: 404 NOT_FOUND (DB 조회 없음)
                    FE->>U: 오류 표시
                else 통과
                    RT->>SV: create/update(userId, input)
                    alt 수정 요청
                        SV->>DB: SELECT todos WHERE id = $1 AND user_id = $2 (BR-02)
                        alt 없음·타인 소유
                            SV-->>FE: 404 NOT_FOUND (동일 본문)
                        end
                    end
                    alt categoryId 미지정 또는 null (BR-12)
                        SV->>DB: SELECT categories WHERE user_id = $1 AND is_default
                    else categoryId 지정
                        SV->>DB: SELECT categories WHERE id = $1 AND user_id = $2 (BR-16)
                        alt 없음·타인 소유
                            SV-->>FE: 404 NOT_FOUND
                        end
                    end
                    SV->>DB: INSERT (is_completed false, BR-24) 또는 UPDATE (is_completed 유지, updated_at 갱신)
                    DB-->>SV: 행 (start_date·end_date 문자열)
                    SV->>SV: todo-status.js로 status 부여 (ST-01~04, today 기준)
                    SV-->>FE: 2xx todo + status
                    FE->>FE: todos 쿼리 invalidate
                    FE->>U: SC-03 이동, 변경 반영
                end
            end
        end
    end
```

### AD-10 완료 처리와 상태 파생 (UC-07, BR-25, BR-28, ST-01~04, D-10, US-10, CP-04, CP-05)

요청은 `isCompleted` 값을 명시 지정한다 (토글 아님, 멱등). 낙관적 업데이트 없이 서버 응답 후 배지를 갱신한다 (PRD 4.2).

```mermaid
sequenceDiagram
    participant U as 사용자
    participant FE as 프론트엔드 TodoListPage
    participant RT as 라우트 todos.js
    participant SV as todo-service
    participant ST as todo-status.js
    participant DB as PostgreSQL

    U->>FE: 할일 행 [완료 체크] 변경 (CP-05)
    Note over FE: 체크·배지는 아직 바꾸지 않음 (낙관적 갱신 없음)
    FE->>RT: todos.setCompleted(id, { isCompleted: true 또는 false }, today)
    RT->>RT: 인증 → today 형식 → id 양의 정수
    RT->>SV: setCompleted(userId, id, isCompleted, today)
    SV->>DB: SELECT todos WHERE id = $1 AND user_id = $2
    alt 없음·타인 소유 (BR-02)
        SV-->>FE: 404 NOT_FOUND
        FE->>U: CP-02 표시 후 목록 재조회 (AD-13)
    else 존재
        alt isCompleted = true
            SV->>DB: UPDATE is_completed = true, completed_at = now() (BR-25)
        else isCompleted = false
            SV->>DB: UPDATE is_completed = false, completed_at = NULL (BR-25)
        end
        Note over DB: CHECK is_completed = (completed_at IS NOT NULL) 보장 (BR-28)
        DB-->>SV: 갱신 행
        SV->>ST: status(todo, today)
        Note over ST: ST-01 isCompleted → 완료, ST-02 today가 endDate보다 뒤 → 기한 초과, ST-03 today가 startDate보다 앞 → 시작 전, ST-04 그 외 → 진행중
        ST-->>SV: COMPLETED / OVERDUE / NOT_STARTED / IN_PROGRESS
        SV-->>FE: 2xx todo { isCompleted, completedAt, status }
        FE->>FE: todos 쿼리 invalidate
        FE->>U: 응답 status로 체크·배지 갱신 (CP-04, PR-04)
    end
```

### AD-11 캘린더 조회와 기간 이동 (UC-10, BR-33, BR-35, BR-36, US-13, US-14, US-15, SC-05, PRD 4.2)

캘린더는 별도 리소스가 아니다. 클라이언트가 BR-35로 `from`/`to`를 산정해 todos 목록을 기간 조건으로 조회하고, 서버는 BR-33 겹침 조건과 today 상태 판정만 적용한다 (PRD 6.3). 카테고리·상태 필터는 적용하지 않는다 (BR-36).

```mermaid
sequenceDiagram
    participant U as 사용자
    participant FE as 프론트엔드 CalendarPage
    participant LIB as lib/calendar-range.ts
    participant RT as 라우트 todos.js
    participant RP as todo-repo
    participant DB as PostgreSQL

    U->>FE: SC-05 진입 (기본 월 뷰, anchorDate = today)
    FE->>LIB: range(view, anchorDate)
    Note over LIB: BR-35: 일 = anchorDate 하루, 주 = 월~일 7일, 월 = 1일이 속한 주 월요일 ~ 말일이 속한 주 일요일. 예: 11-03 → 주 11-02~11-08, 월 10-26~12-06
    LIB-->>FE: { from, to }
    FE->>RT: todos.range(from, to, today) (쿼리 키에 from·to·today 포함)
    RT->>RT: 인증 → today YYYY-MM-DD 형식 (BR-32, BR-36)
    alt today 누락·형식 오류
        RT-->>FE: 400 VALIDATION_ERROR
    else 통과
        RT->>RP: findOverlapping(userId, from, to)
        RP->>DB: SELECT todos WHERE user_id = $1 AND start_date <= $3 AND end_date >= $2 ORDER BY end_date, start_date, created_at
        Note over DB: BR-33 겹침: 경계일 포함. 인덱스 (user_id, start_date, end_date)
        DB-->>RP: 행
        RP-->>RT: todos (서비스에서 ST-01~04로 status 부여, 완료 포함)
        RT-->>FE: 2xx todos + status
        FE->>FE: 각 할일을 max(startDate, from) ~ min(endDate, to)의 모든 날짜 칸에 배치 (BR-33)
        FE->>U: MonthView / WeekView / DayView, 축약 배지 CP-04
    end

    Note over U,FE: 기간 이동 (PRD 4.2)
    U->>FE: [이전] 또는 [다음]
    FE->>LIB: 월 뷰 = 이전/다음 달 1일, 주 뷰 = ±7일, 일 뷰 = ±1일
    LIB-->>FE: 새 anchorDate → app-store calendar.anchorDate
    FE->>FE: from/to 재계산 → 쿼리 키 변경 → 재조회
    U->>FE: [오늘]
    FE->>FE: anchorDate = today → 재조회
    U->>FE: 칸의 할일 선택
    FE->>U: SC-04 편집 모드 이동 (D-12)
```

### AD-12 카테고리 삭제 (UC-11, BR-13, BR-15, US-05, US-06, SC-07, CP-03)

기본 카테고리 삭제는 `DEFAULT_CATEGORY_PROTECTED`(403)로 거부한다 (BR-13). 일반 카테고리 삭제는 소속 할일을 기본 카테고리로 이동한 뒤 삭제하며, 이동과 삭제는 하나의 트랜잭션이다 (BR-15). 할일은 삭제하지 않는다.

```mermaid
sequenceDiagram
    participant U as 사용자
    participant FE as 프론트엔드 CategoriesPage
    participant RT as 라우트 categories.js
    participant SV as category-service
    participant DB as PostgreSQL

    U->>FE: [삭제] (기본 행은 버튼 비활성, BR-13)
    FE->>U: CP-03 확인 대화상자 (소속 할일이 기본 카테고리로 이동 안내)
    U->>FE: [확인]
    FE->>RT: categories.remove(id)
    RT->>RT: 인증 → id 양의 정수
    RT->>SV: remove(userId, id)
    SV->>DB: SELECT categories WHERE id = $1 AND user_id = $2
    alt 없음·타인 소유 (BR-02)
        SV-->>FE: 404 NOT_FOUND
        FE->>U: CP-02 표시 후 카테고리 목록 재조회 (PRD 4.2)
    else is_default = true (BR-13)
        SV-->>FE: 403 DEFAULT_CATEGORY_PROTECTED
        FE->>U: 오류 표시, 카테고리 유지 (API 직접 호출 시에만 발생, US-06)
    else 일반 카테고리
        SV->>DB: BEGIN
        SV->>DB: SELECT categories WHERE user_id = $1 AND is_default (기본 카테고리 id)
        SV->>DB: UPDATE todos SET category_id = 기본 id WHERE category_id = $1 AND user_id = $2 (BR-15)
        SV->>DB: DELETE categories WHERE id = $1 AND user_id = $2
        alt 이동 또는 삭제 실패
            SV->>DB: ROLLBACK (카테고리·할일 모두 원상 유지)
            SV-->>FE: 5xx
        else 성공
            SV->>DB: COMMIT
            SV-->>FE: 2xx
            FE->>FE: categories·todos 쿼리 invalidate
            FE->>U: 목록에서 사라짐. SC-03에서 해당 할일은 카테고리 '기본' (US-05)
        end
    end
```

### AD-13 목록에서 NOT_FOUND 처리 (BR-02, BR-27, UC-06~08, US-11, US-17, SC-03, PRD 4.2)

SC-03의 수정·완료·삭제 요청과 SC-07의 이름 변경·삭제 요청이 `NOT_FOUND`면 오류를 표시하고 해당 목록을 다시 조회한다. 편집 화면 진입 시 `NOT_FOUND`는 오류 표시 후 SC-03으로 이동한다. 타인 소유·미존재·형식 오류 ID의 응답 본문은 모두 같다 (BR-02).

```mermaid
sequenceDiagram
    participant U as 사용자
    participant FE as 프론트엔드 TodoListPage
    participant BE as Express (라우트 → 서비스)
    participant DB as PostgreSQL

    U->>FE: 할일 행 [삭제] → [확인] (또는 [완료 체크], 저장)
    FE->>BE: todos.remove(id)
    alt id가 양의 정수 아님 (예: abc)
        BE-->>FE: 404 NOT_FOUND (DB 조회 없음, PRD 6.3)
    else 정수
        BE->>DB: DELETE todos WHERE id = $1 AND user_id = $2 (PR-07)
        alt 0행 (이미 삭제됨 또는 타인 소유)
            BE-->>FE: 404 NOT_FOUND (동일 본문)
        else 1행
            BE-->>FE: 2xx
            FE->>FE: todos 쿼리 invalidate
            FE->>U: 목록에서 사라짐 (BR-27)
        end
    end
    Note over FE,U: NOT_FOUND 분기 (페이지 onError, CP-02는 message만 표시)
    FE->>FE: CP-02에 message 표시 (code는 표시하지 않음)
    FE->>BE: todos.list(filter, today) 재조회
    BE-->>FE: 2xx 현재 목록
    FE->>U: 최신 목록 표시, 필터 선택 유지 (CP-06)

    Note over U,DB: 편집 화면 진입 시 NOT_FOUND (US-11 4단계, US-17 1~3단계)
    U->>FE: /todos/:id/edit 진입
    FE->>BE: 할일 조회
    BE-->>FE: 404 NOT_FOUND
    FE->>U: 오류 메시지 표시 후 SC-03 이동
```

### AD-14 로그아웃 (UC-03, BR-01, F-09, US-03, CP-01, PD-01, NFR-06)

`POST /api/auth/logout`은 인증 미들웨어를 거치지 않는다 (액세스 만료 상태에서도 로그아웃 가능). `refresh_token` 쿠키가 있고 행이 있으면 `revoked_at = now()`로 폐기하고, 항상 두 쿠키를 `Max-Age=0`으로 삭제하는 204 응답을 보낸다 (PRD 6.4). `HttpOnly` 쿠키라 클라이언트는 직접 지울 수 없다. 액세스 토큰은 블랙리스트 없이 최대 15분 잔존한다 (R-06).

```mermaid
sequenceDiagram
    participant U as 사용자
    participant NAV as TopNav (CP-01)
    participant Q as queries 로그아웃 mutation
    participant RT as 라우트 auth.js
    participant SV as auth-service
    participant DB as PostgreSQL
    participant STORE as app-store (Zustand)

    U->>NAV: [로그아웃]
    NAV->>Q: logout()
    Q->>RT: POST /api/auth/logout + Cookie refresh_token (인증 미들웨어 없음)
    alt refresh_token 쿠키 있음
        RT->>SV: logout(refreshToken)
        SV->>DB: UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = SHA-256($1) (refresh-token-repo)
        Note over DB: 행이 없어도 오류 아님
    else 쿠키 없음
        Note over RT: 서비스·DB 접근 없음
    end
    RT-->>Q: 204 + Set-Cookie token= Max-Age=0 (Path=/) + Set-Cookie refresh_token= Max-Age=0 (Path=/api/auth)
    Q->>Q: queryClient.clear() (TanStack Query 캐시 초기화)
    Q->>STORE: reset() (user, filter, calendar 초기화)
    Q->>U: SC-01 이동
    Note over U,STORE: 이후 (US-03 2·3단계)
    U->>NAV: 브라우저 뒤로 가기 또는 /calendar 직접 입력
    NAV->>STORE: RequireAuth: user 없음
    STORE-->>U: SC-01 이동, 목록 데이터 미표시 (캐시 잔존 없음)
    Note over RT,DB: 쿠키 없는 이후 API 요청은 401 UNAUTHORIZED (BR-01). 폐기된 리프레시 토큰으로는 재발급되지 않는다. 액세스 토큰은 최대 15분 잔존 (R-06)
```

### AD-16 액세스 토큰 만료 → 리프레시 → 재시도 (NFR-06, BR-53, US-16, PRD 4.2)

보호 API가 `UNAUTHORIZED`를 반환하면 `api/client.ts`가 `POST /api/auth/refresh`를 1회 호출하고, 성공하면 원 요청을 1회 재시도한다. 동시에 여러 요청이 실패하면 진행 중인 리프레시 Promise 1개를 공유한다. `/api/auth/*` 요청의 `UNAUTHORIZED`는 리프레시를 시도하지 않는다. 회전(기존 행 폐기 + 새 행 삽입)은 한 트랜잭션이다. `revoked_at`이 이미 있는 토큰이 다시 오면 재사용 탐지로 그 사용자의 리프레시 행 전부를 폐기한다 (PRD 6.4).

```mermaid
sequenceDiagram
    participant FE as api/client.ts
    participant MW as 인증 미들웨어
    participant RT as 라우트 auth.js (refresh, 인증 미들웨어 없음)
    participant SV as auth-service
    participant DB as PostgreSQL

    FE->>MW: 보호 API 요청 + Cookie token (만료)
    MW-->>FE: 401 UNAUTHORIZED
    Note over FE: 요청이 /api/auth/*가 아니고 첫 실패 → refresh 1회. 동시 실패 요청은 같은 Promise 공유
    FE->>RT: POST /api/auth/refresh + Cookie refresh_token (Path=/api/auth)
    RT->>SV: refresh(refreshToken)
    SV->>DB: SELECT refresh_tokens WHERE token_hash = SHA-256($1)
    alt 행 없음 또는 expires_at 경과
        SV-->>RT: AppError UNAUTHORIZED
        RT-->>FE: 401 UNAUTHORIZED + 두 쿠키 Max-Age=0
        FE->>FE: queryClient.clear() + store.reset() → /login 이동 (US-16 (b))
    else revoked_at 있음 (재사용 탐지)
        SV->>DB: UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL
        SV-->>RT: AppError UNAUTHORIZED
        RT-->>FE: 401 UNAUTHORIZED + 두 쿠키 Max-Age=0
        FE->>FE: queryClient.clear() + store.reset() → /login 이동
    else 정상 (회전, 한 트랜잭션)
        SV->>DB: BEGIN
        SV->>DB: UPDATE refresh_tokens SET revoked_at = now() WHERE id = 기존 행
        SV->>DB: INSERT refresh_tokens (user_id, 새 token_hash, expires_at +14일)
        SV->>DB: COMMIT
        SV-->>RT: user { id, name } + 새 리프레시 토큰 원문
        RT->>RT: 새 액세스 토큰 JWT HS384 서명 (sub, iat, exp +15분)
        RT-->>FE: 200 { user: { id, name } } + Set-Cookie token + Set-Cookie refresh_token
        FE->>MW: 원 요청 1회 재시도 + 새 Cookie token
        alt 재시도도 UNAUTHORIZED
            MW-->>FE: 401 UNAUTHORIZED
            FE->>FE: queryClient.clear() + store.reset() → /login 이동
        else 성공
            MW-->>FE: 2xx (사용자는 액세스 만료를 느끼지 못함, US-16 (a))
        end
    end
```

---

## 7. 상태 판정 플로우차트

### AD-15 TodoStatus 판정 (ST-01~04, BR-26, PR-04)

ST-01부터 순서대로 평가하고 처음 만족하는 규칙을 적용한다 (도메인 정의서 4.3). 날짜는 시각 없이 문자열 `YYYY-MM-DD`로 비교한다. 백엔드 `services/todo-status.js`에만 있고 프론트는 응답의 `status`만 표시한다. 목록 상태 필터(BR-32)의 SQL 조건은 이 판정과 결과가 같아야 한다 (PRD 6.5).

```mermaid
flowchart TD
    IN(["입력: isCompleted, startDate, endDate, today"]) --> C1{"ST-01: isCompleted = true ?"}
    C1 -->|"예"| R1["완료 COMPLETED (날짜 무관, 최우선)"]
    C1 -->|"아니오"| C2{"ST-02: today가 endDate보다 뒤인가 ?"}
    C2 -->|"예"| R2["기한 초과 OVERDUE (종료일 다음 날부터)"]
    C2 -->|"아니오"| C3{"ST-03: today가 startDate보다 앞인가 ?"}
    C3 -->|"예"| R3["시작 전 NOT_STARTED"]
    C3 -->|"아니오"| R4["진행중 IN_PROGRESS (시작일·종료일 당일 포함)"]
```

검증 예 (today = 2026-11-03, `backend/tests/todo-status.test.js`로 옮긴다):

| ID | 입력 | 결과 |
|----|------|------|
| ST-01 | 11-01~11-02, 완료 | 완료 |
| ST-02 | 11-01~11-02, 미완료 | 기한 초과 |
| ST-03 | 11-04~11-05, 미완료 | 시작 전 |
| ST-04 | 11-03~11-03, 미완료 | 진행중 |

---

## 8. 부록: 다이어그램 ↔ 문서 ID 추적표

| AD | 종류 | 제목 | 도메인 정의서 | PRD | 시나리오 | 와이어프레임 | 원칙 |
|----|------|------|---------------|-----|----------|--------------|------|
| AD-01 | flowchart | 시스템 컨텍스트 | - | 6.2, 6.4, NFR-06 | PS-01, PS-02 | - | PR-05, PR-06 |
| AD-02 | flowchart | 개발 / 운영 배포 | - | NFR-06, NFR-08, A-01, PD-04 | - | - | 6.1, 7.3 |
| AD-03 | flowchart | 프론트엔드 레이어 | - | 6.1, 4.1 | - | WF-01~07, CP-01~06 | 3.2, 3.3, 3.4, 7.3 |
| AD-04 | flowchart | 백엔드 레이어 | BR-51, BR-52 | 6.2, 6.3, NFR-04 | - | - | 3.1, 7.2, PR-06, PR-07 |
| AD-05 | → 7-erd.md ERD-01/02 | ERD | 3.1, 3.2, BR-04, BR-13, BR-14, BR-22, BR-28, BR-41~46 | 7장 | - | - | PR-04, PR-05 |
| AD-06 | flowchart | 요청 파이프라인 | BR-01, BR-51, BR-52 | 6.2, 6.3 | - | - | 3.1, 6.2, 6.3, 7.2 |
| AD-07 | sequenceDiagram | 회원가입 | UC-01, BR-04, BR-05, BR-11, BR-43~45 | 4.2, NFR-06, NFR-07 | US-01 | WF-02, CP-02, CP-06 | 3.1 |
| AD-08 | sequenceDiagram | 로그인·인증 검사 | UC-02, BR-01, BR-06, BR-53 | 4.2, 6.4, NFR-06 | US-02, US-16 | WF-01, CP-02 | 3.3, 7.3 |
| AD-09 | sequenceDiagram | 할일 생성·수정 BR-52 | UC-05, UC-06, BR-12, BR-16, BR-21~24, BR-41, BR-42, BR-52 | 4.2, 6.3 | US-07, US-08, US-09 | WF-04, CP-02 | PR-03, 3.1 |
| AD-10 | sequenceDiagram | 완료 처리·상태 파생 | UC-07, BR-25, BR-28, ST-01~04, D-10 | 4.2, 6.5 | US-10 | CP-04, CP-05 | PR-04 |
| AD-11 | sequenceDiagram | 캘린더 조회·이동 | UC-10, BR-33, BR-35, BR-36, D-12 | 4.2, 6.3, 7장 | US-13, US-14, US-15 | WF-05 | 3.2, 3.3, 7.3 |
| AD-12 | sequenceDiagram | 카테고리 삭제 | UC-11, BR-13, BR-15 | 4.2 | US-05, US-06 | WF-07, CP-03 | 3.1 |
| AD-13 | sequenceDiagram | NOT_FOUND 처리 | BR-02, BR-27, UC-06~08 | 4.2, 6.3 | US-11, US-17 | WF-03, CP-02, CP-06 | PR-07 |
| AD-14 | sequenceDiagram | 로그아웃 | UC-03, BR-01 | 4.2, 6.4, NFR-06, PD-01, R-06 | US-03 | CP-01 | 3.3 |
| AD-15 | flowchart | 상태 판정 | 4.3, ST-01~04, BR-26 | 6.5 | 3.4 | CP-04 | PR-04, 5장 |
| AD-16 | sequenceDiagram | 액세스 만료 → 리프레시 → 재시도 | BR-01, BR-53 | 4.2, 6.4, NFR-06, 7장, R-06 | US-16 | CP-02 | 3.3, 6.2, 7.2, 7.3 |

---

## 9. 다이어그램에서 추정한 지점

문서에 명시가 없어 그림을 완성하기 위해 택한 표현이다. 구현 전 API 설계 문서에서 확정한다.

| ID | 추정 | 근거 문서 | 위치 |
|----|------|-----------|------|
| AD-A1 | 이메일 중복 검사를 BR-11 트랜잭션 안에서 `SELECT lower(email)`로 먼저 수행 | UC-01 흐름 "중복 검사 → 계정 생성", 원칙 3.1 트랜잭션 | AD-07 |
| AD-A2 | 가입·로그인 응답 본문에 `user { id, name }`이 포함되고 이를 Zustand에 저장 | 원칙 3.3 "서버 응답을 한 번 받아" | AD-07, AD-08 |
| AD-A3 | 변경됨: 로그아웃 API는 인증 미들웨어를 거치지 않는다 (PRD v0.7 6.4에서 확정. 액세스 만료 상태에서도 로그아웃 가능) | PRD 6.4, UC-03 | AD-06, AD-14 |
| AD-A4 | ID 양의 정수 검사(`NOT_FOUND`)의 위치를 형식·길이·날짜 범위 검사 다음, DB 조회 전으로 둠 | 원칙 6.2 "먼저 검사", BR-52의 존재·소유 단계와 같은 코드 | AD-06, AD-09 |
| AD-A5 | 카테고리 삭제 성공 시 `categories`와 `todos` 쿼리를 모두 invalidate | 원칙 3.3 "관련 쿼리 invalidate", US-05 4단계 | AD-12 |
| AD-A6 | `RequireAuth`가 스토어 `user` 유무로 SC-01 리다이렉트 | 원칙 7.3 `App.tsx` RequireAuth, US-03 2·3단계 | AD-14 |
| AD-A7 | 완료 처리 요청에도 `today`를 보내 응답에 `status`를 포함 | PRD 6.3 "모든 todos 조회 요청은 today", US-10 "응답 후 배지 갱신" | AD-10 |
| AD-A8 | BR-15 트랜잭션 내부 실패는 5xx로 응답 | BR-51 목록에 해당 코드 없음 | AD-12 |

---

## 10. 확인 필요

문서 간 어긋남 또는 공백이다. 다이어그램은 PRD 기준으로 그렸다.

| ID | 내용 | 관련 ID |
|----|------|---------|
| AD-C1 | PRD 6.3·원칙 4장·7.1이 API 설계 문서를 `docs/6-api-design.md`로 지정했으나 이 문서가 6번을 사용. `docs/9-api-design.md`로 재지정 완료 (7번은 ERD, 해결) | PRD 6.3, 원칙 4장, 7.1 |
| AD-C2 | 도메인 정의서 3.2 ERD는 id를 `string`으로 표기하고 PRD 7장은 `BIGINT IDENTITY`다. 도메인 정의서는 관계 파악용이라 명시했으므로 PRD를 따랐다 | 도메인 3.2, PRD 7장 |
| AD-C3 | 해결: 편집 진입용 단건 조회 `GET /api/todos/:id` 추가, 원칙 7.3 `api/todos.ts`에 `get(id, today)` (`docs/9-api-design.md` 4장) | 원칙 7.3, WF-04, PRD 4.2, US-11, US-17 |
| AD-C4 | 해결: `from`/`to`는 둘 다 있거나 둘 다 없어야 하며, 한쪽만 있거나 형식 오류면 `VALIDATION_ERROR` (`docs/9-api-design.md` 4장) | BR-36, PRD 6.3, UC-10 |
| AD-C5 | 해결: 형식 위반(BR-43, BR-44)은 BR-52 순서대로 `VALIDATION_ERROR`, 형식이 맞으면 `INVALID_CREDENTIALS` (`docs/9-api-design.md` 4장) | BR-52, UC-02, SC-01 |
| AD-C6 | 도메인 정의서·시나리오·원칙의 참조 버전이 PRD v0.5였음. v0.6으로 갱신 완료 (해결) | 각 문서 "문서 정보" |
| AD-C7 | 작업 지시의 "완료 토글"은 D-10(명시 지정, 토글 아님)과 표현이 다르다. 다이어그램은 D-10을 따랐다 | D-10, UC-07 |
| AD-C8 | 로그아웃 API의 인증 미들웨어 적용 여부. 해결(인증 미들웨어 없음, PRD v0.7 6.4). refresh도 같다 | UC-03, PRD 6.4, 원칙 7.2 |
