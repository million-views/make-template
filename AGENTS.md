# Working in This Repository (Kiro Methodology)

## 1. Spec-Driven Workflow
- Every change begins with a spec under `.kiro/specs/<feature>/`.
- **Read `docs/spec-driven-development.md`** for complete guidance on creating requirements, design, and implementation plans.
- Author and drive changeset for one or more features in a sprint in 3 phases:
  - Create `requirements.md` and iterate to get approval
  - Create `design.md` and iterate to get approval
  - Create `tasks.md` and iterate to completion:
    - Track progress incrementally: work on ONE task at a time, mark it `[x]` when completed, then move to the next task
    - Use `[ ]` for not started tasks, `[x]` for completed tasks, `[*]` for optional tasks
    - NEVER mark all tasks complete at once - progress must be tracked incrementally through the sprint

## 2. Strict Test-Driven Development
- Search the codebase for existing patterns before writing new code.
- Write failing tests first (RED), run them to confirm failure, then implement minimal changes to make them pass (GREEN).
- Use the project's test suites (`node test/...`, `npm test`); avoid ad-hoc `node -e`.

## 3. Safety & Source Control
- Do not revert unrelated changes or run destructive git commands (`reset --hard`, `checkout --`, etc.).
- Respect `.kiro/specs/` content created by others unless explicitly instructed.
- Keep implementation isolated to relevant files.

## 4. Documentation & Logging
- Update docs and logs to match new behavior only after functionality is in place.
- Follow documentation standards (avoid maintenance liabilities, keep examples realistic).

## 5. Steering Documents
- **Comprehensive guidance** for implementation details is available in `.kiro/steering/**`:
  - `greenfield-development.md` - Write everything as first-time implementation
  - `workspace-safety.md` - File operation safety and temporary resource handling
  - `documentation-standards.md` - Avoid maintenance liabilities in docs
  - `security-guidelines.md` - Security principles for CLI tools
  - `nodejs-cli-focus.md` - Node.js ESM, test-first development, technology constraints
  - `diataxis-documentation.md` - Documentation structure and organization
  - `naming-conventions.md` - Consistent naming patterns
  - `readme-guidelines.md` - README structure and content standards
- **Read these documents** before implementing any feature to understand detailed requirements and constraints.

## 5. Dependencies & Environment
- Node.js ESM only; prefer built-in modules.
- No external dependencies unless documented.

## 6. Verification & Reporting
- Run appropriate tests before finishing a task.
- Summarize changes clearly, noting files touched and tests executed.
