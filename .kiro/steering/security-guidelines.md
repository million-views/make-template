---
inclusion: always
---

# Security Guidelines for Public CLI Tools

## Supply Chain Security

### Dependency Management
- **Minimize Dependencies**: Prefer zero external dependencies when possible
- **Audit Dependencies**: Every dependency introduces potential attack vectors
- **Pin Versions**: Use exact versions in package.json, not ranges
- **Regular Updates**: Keep dependencies updated but verify changes
- **Dependency Review**: Manually review all dependency code before adding

### Code Execution Risks
- **No Dynamic Imports from User Input**: Never import/require user-provided paths
- **No eval() or Function()**: Avoid dynamic code execution entirely  
- **Sanitize File Paths**: Validate all file operations to prevent directory traversal
- **Template Script Isolation**: Setup scripts run in user's context, not ours

## Input Validation & Sanitization

### Command Line Arguments
- **Validate All Inputs**: Never trust user-provided arguments
- **Path Traversal Prevention**: Block `../`, absolute paths in file operations
- **Placeholder Format Validation**: Ensure placeholder formats are safe

### File System Operations
- **Restrict Write Locations**: Only write to intended project directories
- **Prevent Overwrites**: Check for existing files/directories before operations
- **Temporary File Security**: Use secure temporary directories with proper cleanup
- **Permission Checks**: Verify write permissions before attempting operations

## Template Processing Security

### File Operations
- **Path Validation**: Ensure all file operations stay within project boundaries
- **No Remote Operations**: This tool only processes local files, no network requests
- **Setup Script Generation**: Generated scripts run in user's project context, not CLI tool context

## Attack Surface Reduction

### Forbidden Features
- ❌ **Remote Code Execution**: No downloading and executing arbitrary code
- ❌ **Network Requests**: No HTTP/HTTPS requests (this tool is local-only)
- ❌ **System Command Injection**: No user input in shell commands
- ❌ **Environment Variable Manipulation**: No setting system-wide env vars

### Safe Patterns Only
- ✅ **Local File Operations**: Reading, writing, and deleting files within project boundaries
- ✅ **Template Processing**: Basic file/directory operations and placeholder replacement
- ✅ **Setup Script Generation**: Creating setup scripts for later execution by create-scaffold

## Error Handling Security

### Information Disclosure
- **Sanitize Error Messages**: Don't leak sensitive file paths or system info
- **Path Normalization**: Normalize paths in error messages
- **No Credential Exposure**: Ensure no sensitive data appears in logs or errors

### Fail Securely
- **Default Deny**: When in doubt, fail safely
- **Clean Failure**: Remove temporary files on any failure
- **No Partial States**: Either complete successfully or clean up entirely
- **Exit Codes**: Use appropriate exit codes without leaking information

## User Education

### Security Warnings
- **Destructive Operations**: Clearly warn about file deletion and modification
- **Setup Script Generation**: Explain that generated scripts will be executed by create-scaffold
- **Backup Recommendations**: Suggest users backup projects before conversion

### Best Practices Documentation
- **Dry Run Usage**: Encourage users to use --dry-run first
- **Confirmation Prompts**: Explain the importance of reviewing planned changes
- **Regular Updates**: Keep the CLI tool updated for security patches

## Implementation Requirements

### Code Review Focus
- **Input Validation**: Every user input must be validated
- **Path Operations**: All file operations must be bounded
- **Process Spawning**: Only spawn necessary processes with minimal privileges
- **Temporary Resources**: All temporary resources must be cleaned up

### Security Testing
- **Path Traversal Tests**: Test against directory traversal attacks
- **Input Fuzzing**: Test with malformed CLI arguments and file contents
- **File Operation Bounds**: Verify all operations stay within project directory
- **Generated Script Safety**: Verify generated setup scripts are safe

## Red Flags to Reject

Immediately reject any feature requests that involve:
- Downloading files from the internet
- Executing code during template conversion
- Storing or transmitting user credentials
- System-wide configuration changes
- Any network operations (this tool is local-only)
- Dynamic code execution during conversion
- Operations outside the current project directory