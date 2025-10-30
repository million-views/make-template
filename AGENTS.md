# Working in This Repository (Kiro Methodology)

## 1. Spec-Driven Workflow
- Every change begins with a spec under `.kiro/specs/<feature>/`.
- Author `requirements.md`, get approval, then provide `design.md`, obtain approval, and finally write `tasks.md`.
- Track progress using the plan tool; mark steps as WIP/completed as you proceed.

## 2. Strict Test-Driven Development
- Search the codebase for existing patterns before writing new code.
- Write failing tests first (RED), run them to confirm failure, then implement minimal changes to make them pass (GREEN).
- Use the project’s test suites (`node test/...`, `npm test`); avoid ad-hoc `node -e`.

## 3. Safety & Source Control
- Do not revert unrelated changes or run destructive git commands (`reset --hard`, `checkout --`, etc.).
- Respect `.kiro/specs/` content created by others unless explicitly instructed.
- Keep implementation isolated to relevant files.

## 4. Documentation & Logging
- Update docs and logs to match new behavior only after functionality is in place.
- Follow documentation standards (avoid maintenance liabilities, keep examples realistic).

## 5. Dependencies & Environment
- Node.js ESM only; prefer built-in modules.
- No external dependencies unless documented.

## 6. Verification & Reporting
- Run appropriate tests before finishing a task.
- Summarize changes clearly, noting files touched and tests executed.
