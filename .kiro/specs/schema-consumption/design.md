## Design Overview

To implement schema consumption from `@m5nv/create-scaffold`, we need to integrate the shared schema and types into make-template's validation and type system. This ensures alignment without manual duplication.

### Key Components

1. **Dependency Integration**
   - Add `@m5nv/create-scaffold` as a dev dependency to access schema and types.
   - Ensure the package is installed during development and CI.

2. **Schema Import**
   - Import the canonical schema from `@m5nv/create-scaffold/schema/template.json`.
   - Replace any local schema definitions with this import.

3. **Type Integration**
   - Import `TemplateManifest` and other relevant types from `@m5nv/create-scaffold/types/template-schema`.
   - Update all type annotations in make-template to use these shared types.
   - Remove redundant local type definitions.

4. **Validation Logic**
   - Modify the existing validator (likely in `src/lib/` or processors) to use the imported schema.
   - Ensure validation runs against the canonical schema for consistency.

5. **Build and CI Integration**
   - Add a new npm script `schema:check` to verify schema availability and import paths.
   - Integrate into CI pipeline to prevent regressions.

6. **Documentation Updates**
   - Update README and CHANGELOG to document the minimum required version of `@m5nv/create-scaffold`.
   - Point template authors to the schema in `node_modules/` for editor support.

### Fallback Strategy
For the open question on fallbacks: Implement graceful degradation where if the schema is unavailable (e.g., older CLI versions), make-template falls back to local validation or skips schema validation with a warning. This ensures backward compatibility.

### Opt-out Mechanism
For legacy templates, add a CLI flag `--skip-schema-validation` to bypass schema checks, allowing users to work with older templates without strict validation.