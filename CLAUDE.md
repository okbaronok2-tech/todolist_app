# todolist_app 의 최상위 지침

## 반드시 지켜야 할 지침

- 모든 응답은 한국어
- 오버엔지니어링 금지

## 문서 목록

| 경로 | 문서 | 버전 |
|------|------|------|
| `docs/1-domain-definition.md` | 도메인 정의서 (F, UC, BR, ST, D) | v0.9 |
| `docs/2-PRD.md` | PRD (정본: 4.2 화면 동작, 6.3 API, 6.4 인증, NFR, 7장 DB) | v0.13 |
| `docs/3-user-scenario.md` | 사용자 시나리오 (US, 샘플 데이터) | v0.6 |
| `docs/4-wireframe.md` | 와이어프레임 (WF, CP) | v0.7 |
| `docs/5-project-principle.md` | 프로젝트 구조 설계 원칙 (PR, 디렉터리 트리) | v0.11 |
| `docs/6-arch-diagram.md` | 아키텍처 다이어그램 (AD, mermaid) | v0.8 |
| `docs/7-erd.md` | ERD (mermaid) | v0.5 |
| `docs/8-plan.md` | 실행 계획 (WBS, Task T-X/D/B/F) | v0.12 |
| `docs/schema.sql` | PostgreSQL 17 DDL (`backend/src/db/migrations/001_init.sql`의 원본) | - |
| `docs/assets/wf-05-calendar-month.svg` | 캘린더 월 뷰 와이어프레임 SVG | - |
| `docs/assets/sg-calendar-{month,week,day}.svg` | 스타일 가이드 적용 캘린더 데스크톱 월·주·일 뷰 SVG (`docs/style-guide.md` 3.7) | - |
| `backend/swagger.yaml` | OpenAPI 3.0.3 API 명세 | v0.9 |
| `docs/9-api-design.md` | API 설계 문서 (엔드포인트 표, AD-C3·C4·C5 결정) | v0.6 |
| `swagger/swagger.json` | `backend/swagger.yaml`에서 생성한 Swagger JSON (`cd backend && npm run swagger:json`). 개발 서버 `/api/docs`·`/api/docs.json` | - |
| `docs/10-frontend-integration-guide.md` | 프론트엔드 연동 가이드 (실행, CORS 연결, 쿠키·refresh, 오류 모델, 엔드포인트 요약) | v0.5 |
| `docs/11-security-review.md` | 백엔드 보안 검토 (OWASP Top 10, npm audit, 후속 조치) | v0.3 |
| `docs/perf-result.md` | 부하 테스트 결과 (T-X04, k6 1000 VU, EXPLAIN) | v0.1 |
| `docs/style-guide.md` | 스타일 가이드 (색·타이포·간격 토큰, CP 컴포넌트 스타일, 캘린더 막대 표시, 반응형, 접근성, `styles.css` 골격) | v0.3 |

`backend/` 안에서 작업할 때는 `backend/CLAUDE.md`의 지침을 추가로 따른다.

문서를 고치면 그 문서의 `현재 버전`·변경 이력과 다른 문서의 `참조 문서` 버전을 함께 갱신한다. `backend/swagger.yaml`은 머리 주석과 `x-document-info`·`x-changelog`를 갱신한다.
