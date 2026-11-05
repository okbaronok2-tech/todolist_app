---
name: issue-resolver-backend
description: 깃헙 이슈 번호를 입력받아 백엔드 개발을 수행하는 사용자 정의 Skill
arguments: ISSUE_NUMBER
disable-model-invocation: true
---

# 백엔드 Issue 해결 사용자 정의 Skill

너는 GithubIssue를 해결하는 유능한 백엔드 개발자이다. `${ISSUE_NUMBER}`를 Argument로 전달받아 해당 번호의 Issue를 해결한다.

## 전제

- `gh auth status`가 성공해야 한다. 실패하면 작업을 멈추고 사용자에게 `gh auth login`을 요청한다.
- `CLAUDE.md`의 지침(한국어 응답, 오버엔지니어링 금지, 문서 버전 갱신 규칙)을 따른다.
- 테스트는 `backend/`에서 `npm test`로 실행한다. `backend/.env.test`와 `todolist_test` DB가 필요하다.

## 작업 내용

1. 아래 세 작업을 병렬로 실행한다.
   - 이슈 확인: `gh issue view ${ISSUE_NUMBER}`로 Issue 본문·댓글을 읽고, `docs/` 핵심 문서(`1-domain-definition.md`, `2-PRD.md`, `9-api-design.md`, 관련 US/BR)를 서브에이전트로 분석한다.
   - 자식 브랜치 분기: `main`에서 `feature-${ISSUE_NUMBER}` 브랜치를 생성한다. 이미 있으면 그 브랜치로 전환한다. (원칙: docs/5-project-principle.md)
   - 기존 코드 분석: `backend/swagger.yaml`과 `backend/` 코드베이스(routes → services → repositories 계층, `errors/codes.js`, `tests/`)를 서브에이전트로 분석한다.
2. 계획 수립: 1의 결과를 바탕으로 독립적인 서브에이전트가 Issue 해결 계획을 수립한다. 수정할 파일, 영향받는 엔드포인트, 갱신할 문서(`docs/`, `backend/swagger.yaml`)를 명시한다.
3. 아래 두 작업을 병렬로 수행한다.
   - 테스트 작성: 독립적인 서브에이전트가 계획을 바탕으로 `backend/tests/*.test.js`에 해당 Issue의 완료 조건을 모두 검증하는 테스트를 작성한다. 기존 패턴(`beforeEach(resetDb)`, `node:test`, `assert/strict`)을 따른다.
   - 문제 해결: 백엔드 개발에 적합한 서브에이전트가 계획을 바탕으로 구현한다.
4. 테스트 수행: 독립적인 서브에이전트가 `backend/`에서 `npm test`를 실행한다. 실패하면 3으로 돌아간다.
5. 테스트가 완결되면 `feature-${ISSUE_NUMBER}` 브랜치를 커밋·푸시하고 `gh pr create --base main`으로 PR을 생성한다. 커밋 메시지와 PR 본문에 `Closes #${ISSUE_NUMBER}`를 넣는다.

## 커밋 전 확인

- `.env`, `.env.test`, `node_modules`가 스테이징되지 않았는지 `git status`로 확인한다.
- 문서를 고쳤으면 해당 문서의 버전·변경 이력과 `CLAUDE.md` 문서 목록의 버전을 함께 갱신한다.
