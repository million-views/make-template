---
inclusion: always
---

# Workspace Safety Guidelines

## Environment Awareness

### Before Any File Operations
- **ALWAYS** inspect existing workspace contents with `listDirectory` before creating, testing, or modifying files.
- **NEVER** assume directory names are free to use without verification.
- **ALWAYS** pick non-conflicting names for temporary operations.

### Safe Testing Practices
- Use obviously temporary names such as `test-project`, `temp-test`, or `example-app`.
- Avoid common directory names (`docs`, `src`, `lib`, `bin`, `config`, etc.) that might already exist.
- Check for existing files before every create or write operation.
- Prefix temporary files and directories with `temp-`, `test-`, or `example-` to prevent clashes.

### Command Execution Safety
- Verify target directories do not exist before running commands that create them.
- Use safe, isolated paths for all test scenarios.
- Clean up temporary files and directories after every test run.

## Rationale
Failing to check workspace contents before operating can overwrite important user files, trigger security protections unnecessarily, create confusion about tool behavior, and waste time debugging self-inflicted conflicts.

## Implementation
Apply these guardrails to all file operations, command execution, and testing scenarios where new files or directories might be created.