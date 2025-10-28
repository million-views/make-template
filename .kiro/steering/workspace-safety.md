# Workspace Safety Guidelines

## Environment Awareness

### Before Any File Operations
- **ALWAYS** check existing workspace contents with `listDirectory` before creating, testing, or modifying files
- **NEVER** assume directory names are safe without verification
- **ALWAYS** use non-conflicting names for test operations

### Safe Testing Practices
- Use obviously temporary names: `test-project`, `temp-test`, `example-app`
- Avoid common directory names: `docs`, `src`, `lib`, `bin`, `config`, etc.
- Check for existing files before any create/write operations
- Use unique prefixes for temporary files: `temp-`, `test-`, `example-`

### Command Execution Safety
- Verify target directories don't exist before running commands that create them
- Use safe, non-conflicting paths for all test scenarios
- Always clean up temporary files/directories after testing

## Rationale
Failing to check workspace contents before operations can:
- Overwrite important user files
- Trigger security protections unnecessarily
- Create confusion about tool behavior
- Waste time debugging self-created conflicts

## Implementation
This applies to all file operations, command execution, and testing scenarios where new files or directories might be created.