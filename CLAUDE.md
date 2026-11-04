# todolist_app 의 최상위 지침

## 반드시 지켜야 할 지침

- 모든 응답은 한국어
- 오버엔지니어링 금지

## 문서 목록

| 경로 | 문서 | 버전 |
|------|------|------|
| `docs/1-domain-definition.md` | 도메인 정의서 (F, UC, BR, ST, D) | v0.8 |
| `docs/2-PRD.md` | PRD (정본: 4.2 화면 동작, 6.3 API, 6.4 인증, NFR, 7장 DB) | v0.9 |
| `docs/3-user-scenario.md` | 사용자 시나리오 (US, 샘플 데이터) | v0.6 |
| `docs/4-wireframe.md` | 와이어프레임 (WF, CP) | v0.5 |
| `docs/5-project-principle.md` | 프로젝트 구조 설계 원칙 (PR, 디렉터리 트리) | v0.4 |
| `docs/6-arch-diagram.md` | 아키텍처 다이어그램 (AD, mermaid) | v0.5 |
| `docs/7-erd.md` | ERD (mermaid) | v0.4 |
| `docs/8-plan.md` | 실행 계획 (WBS, Task T-X/D/B/F) | v0.4 |
| `docs/schema.sql` | PostgreSQL 17 DDL (`backend/src/db/migrations/001_init.sql`의 원본) | - |
| `docs/assets/wf-05-calendar-month.svg` | 캘린더 월 뷰 와이어프레임 SVG | - |
| `backend/swagger.yaml` | OpenAPI 3.0.3 API 명세 | v0.2 |
| `docs/9-api-design.md` | API 설계 문서 (엔드포인트 표, AD-C3·C4·C5 결정) | v0.1 |

문서를 고치면 그 문서의 `현재 버전`·변경 이력과 다른 문서의 `참조 문서` 버전을 함께 갱신한다. `backend/swagger.yaml`은 머리 주석과 `x-document-info`·`x-changelog`를 갱신한다.
