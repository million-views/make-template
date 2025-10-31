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
- **Path Traversal Prevention**: Block `../`, absolute paths in template names
- **Repository URL Validation**: Ensure repo URLs are properly formatted
- **Branch Name Sanitization**: Validate git branch names against injection

### File System Operations
- **Restrict Write Locations**: Only write to intended project directories
- **Prevent Overwrites**: Check for existing files/directories before operations
- **Temporary File Security**: Use secure temporary directories with proper cleanup
- **Permission Checks**: Verify write permissions before attempting operations

## Git Integration Security

### Repository Cloning
- **URL Validation**: Validate repository URLs to prevent malicious redirects
- **Shallow Clones Only**: Use `--depth 1` to limit exposure
- **No Credential Handling**: Never store or transmit git credentials
- **Timeout Operations**: Set reasonable timeouts for git operations
- **Error Message Sanitization**: Don't leak sensitive info in error messages

### Template Repository Trust
- **User Responsibility**: Make clear that template repos are user's responsibility
- **No Default Execution**: Don't auto-execute any scripts without explicit user consent
- **Setup Script Warnings**: Warn users about setup script execution risks
- **Isolation**: Setup scripts run in project context, not CLI tool context

## Attack Surface Reduction

### Forbidden Features
- ❌ **Remote Code Execution**: No downloading and executing arbitrary code
- ❌ **Network Requests**: No HTTP/HTTPS requests beyond git operations
- ❌ **System Command Injection**: No user input in shell commands
- ❌ **File Upload/Download**: No arbitrary file transfer capabilities
- ❌ **Environment Variable Manipulation**: No setting system-wide env vars

### Safe Patterns Only
- ✅ **Git Clone Operations**: Using system git with user's credentials
- ✅ **File System Copy**: Copying files within project boundaries
- ✅ **Template Processing**: Basic file/directory operations
- ✅ **Setup Script Execution**: In user's project context with clear warnings

## Error Handling Security

### Information Disclosure
- **Sanitize Error Messages**: Don't leak file paths, credentials, or system info
- **Generic Network Errors**: Don't expose internal network details
- **Path Normalization**: Normalize paths in error messages
- **Credential Masking**: Ensure no credentials appear in logs or errors

### Fail Securely
- **Default Deny**: When in doubt, fail safely
- **Clean Failure**: Remove temporary files on any failure
- **No Partial States**: Either complete successfully or clean up entirely
- **Exit Codes**: Use appropriate exit codes without leaking information

## User Education

### Security Warnings
- **Template Trust**: Warn users about trusting template repositories
- **Setup Script Risks**: Clearly explain setup script execution implications
- **Credential Security**: Document secure git credential practices
- **Private Repository Access**: Explain authentication without storing credentials

### Best Practices Documentation
- **Repository Verification**: How to verify template repository authenticity
- **Setup Script Review**: Encourage users to review setup scripts before execution
- **Minimal Permissions**: Use least-privilege git access when possible
- **Regular Updates**: Keep the CLI tool updated for security patches

## Implementation Requirements

### Code Review Focus
- **Input Validation**: Every user input must be validated
- **Path Operations**: All file operations must be bounded
- **Process Spawning**: Only spawn necessary processes with minimal privileges
- **Temporary Resources**: All temporary resources must be cleaned up

### Security Testing
- **Path Traversal Tests**: Test against directory traversal attacks
- **Input Fuzzing**: Test with malformed inputs
- **Repository URL Tests**: Test with malicious repository URLs
- **Setup Script Isolation**: Verify setup scripts can't escape project context

## Red Flags to Reject

Immediately reject any feature requests that involve:
- Downloading executable files from the internet
- Executing code from untrusted sources without user consent
- Storing or transmitting user credentials
- System-wide configuration changes
- Network operations beyond git clone
- Dynamic code generation or evaluation
- Privilege escalation or system modification