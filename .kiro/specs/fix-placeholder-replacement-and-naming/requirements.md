# Requirements: Fix Placeholder Replacement & Template Naming Issues

## Overview
The create-scaffold team has identified critical issues blocking template functionality. This feature addresses placeholder replacement failures, template naming confusion, missing tests, and schema issues.

## Issues to Resolve

### Issue 1: Placeholder Replacement Completely Broken
- Template instantiation fails to replace placeholders
- Root cause: Incorrect replacement map format in generated _setup.mjs
- Setup script hardcodes ctx.projectName instead of using ctx.inputs[token]
- No integration with CLI's placeholder resolution system

### Issue 2: Template Naming Confusion
- Users confused about which name to use for --from-template
- Directory names can be invalid handles
- No distinction between display names and handles

### Issue 3: Missing Unit Tests
- No tests for placeholder replacement end-to-end
- No tests for setup script generation
- No tests for template naming validation

### Issue 4: Template.json Schema Issues
- Placeholders lack default values
- Missing proper validation structure

## Success Criteria
- All placeholders replaced correctly during instantiation
- Users can identify correct handles from --list-templates output
- All unit tests pass for placeholder functionality
- Template creation enforces valid directory names
- Existing templates can be migrated to new standards

## Priority
CRITICAL - Blocks template functionality
Due: Immediate

## Testing Requirements
- Create template with placeholders
- Run create-scaffold with custom placeholder values
- Verify replacements and defaults work
- Test invalid directory names are rejected