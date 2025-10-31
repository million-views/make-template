# Follow-up: make-template Schema Consumption

**Repository:** https://github.com/million-views/make-template

## Goal
Ensure make-template reads the canonical `@m5nv/create-scaffold` template schema and generated types so placeholder/dimension tooling stays aligned without manual copies.

## Proposed Tasks

1. **Upgrade Dependency**
   - Bump `@m5nv/create-scaffold` dev dependency to the first release containing `schema/template.json` and `types/template-schema`.
   - Document the minimum required version in make-template README/CHANGELOG.

2. **Runtime Validation**
   - Replace local schema definitions (if any) with an import from `@m5nv/create-scaffold/schema/template.json`.
   - Wire the bespoke validator or JSON Schema validator already in make-template to run against the imported schema.

3. **Type Integration**
   - Update TypeScript definitions to `import type { TemplateManifest } from '@m5nv/create-scaffold/types/template-schema';`.
   - Remove redundant type declarations and ensure the project compiles with the shared types.

4. **Editor Support**
   - Update VS Code recommendations or template author docs to point to `node_modules/@m5nv/create-scaffold/schema/template.json` for auto-complete.

5. **Testing & CI**
   - Add `npm run schema:check` (or equivalent) to verify the schema import path during CI.
   - Regenerate fixtures to confirm no behaviour changes.

6. **Release Notes**
   - Communicate schema-driven validation in the next make-template release notes.

## Open Questions
- Should make-template fallback gracefully when the schema export is unavailable (older CLI versions)?
- Do we need a CLI flag to opt out of schema validation for legacy templates?

## Next Steps
- File an issue in the make-template repo referencing this document.
- Coordinate with maintainers on release timing once create-scaffold publishes the schema artifacts.