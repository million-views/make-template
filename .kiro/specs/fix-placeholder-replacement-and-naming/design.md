# Design: Fix Placeholder Replacement & Template Naming Issues

## Architecture Overview
The fixes will modify the template generation and instantiation pipeline to properly handle placeholders and enforce naming conventions.

## Component Changes

### 1. Setup Script Generation (engine.js)
- Modify `generateSetupScript()` to extract token names from {{TOKEN}} format
- Generate PLACEHOLDER_MAP using ctx.inputs[token] with fallbacks
- Include all placeholders with sensible defaults

### 2. Template Creation (generators/)
- Add validation for directory names to ensure valid handles
- Implement handle generation from display names (kebab-case)
- Separate handle generation from display name input

### 3. Template.json Schema
- Add "placeholders" array to metadata with name, description, required, type, default
- Update existing templates to include defaults

### 4. Test Coverage
- Unit tests for setup script generation
- Integration tests for placeholder replacement
- Tests for template naming validation

## Implementation Phases

### Phase 1: Core Fixes
- Fix replacement map generation in engine.js
- Update template.json schemas with defaults
- Ensure ctx.inputs integration

### Phase 2: Testing
- Add comprehensive unit tests
- Add integration tests for end-to-end flow

### Phase 3: Naming
- Implement handle generation and validation
- Update template creation workflow

### Phase 4: Migration
- Update existing templates
- Add documentation and validation scripts

## Data Flow
1. Template creation: Validate directory name, generate handle
2. Template instantiation: Generate setup script with correct PLACEHOLDER_MAP
3. Setup execution: Use ctx.inputs[token] for replacements with fallbacks

## Backward Compatibility
- Existing templates will need migration to new schema
- Old setup scripts will be regenerated on instantiation
- Handle validation will apply to new templates only initially