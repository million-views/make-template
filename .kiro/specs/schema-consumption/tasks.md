# Schema Consumption Implementation Tasks

## Sprint Tasks

- [x] **Upgrade Dependency**
  - Bump `@m5nv/create-scaffold` dev dependency to the first release containing `schema/template.json` and `types/template-schema`.
  - Document the minimum required version in make-template README/CHANGELOG.

- [x] **Runtime Validation**
  - Replace local schema definitions (if any) with an import from `@m5nv/create-scaffold/schema/template.json`.
  - Wire the bespoke validator or JSON Schema validator already in make-template to run against the imported schema.

- [x] **Type Integration**
  - Update TypeScript definitions to `import type { TemplateManifest } from '@m5nv/create-scaffold/types/template-schema';`.
  - Remove redundant type declarations and ensure the project compiles with the shared types.

- [x] **Editor Support**
  - Update VS Code recommendations or template author docs to point to `node_modules/@m5nv/create-scaffold/schema/template.json` for auto-complete.

- [x] **Testing & CI**
  - Add `npm run schema:check` (or equivalent) to verify the schema import path during CI.
  - Regenerate fixtures to confirm no behaviour changes.

- [x] **Release Notes**
  - Communicate schema-driven validation in the next make-template release notes.

## Open Questions Resolution
- [*] Decide on fallback strategy for unavailable schema (older CLI versions).
- [*] Implement CLI flag for opting out of schema validation for legacy templates.