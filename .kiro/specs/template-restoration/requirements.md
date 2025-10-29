# Requirements Document

## Introduction

The Template Restoration feature extends @m5nv/make-template CLI tool to support reversing template conversion operations. This feature addresses the template author workflow challenge where authors need to test and debug templates after conversion but cannot easily return to a working project state. The restoration system uses an undo log to track all template conversion operations and provides multiple restoration modes with privacy safeguards.

## Glossary

- **Make_Template_CLI**: The command-line interface tool that converts existing projects into templates
- **Template_Restoration**: The reverse operation that converts a templatized project back to a working project state
- **Undo_Log**: A JSON file (.template-undo.json) that records all operations performed during template conversion
- **Restoration_Mode**: The method used to restore the project (full, sanitized, or selective)
- **Original_Values**: The actual project-specific values that were replaced with placeholders during template conversion
- **File_Operations_Log**: Record of files and directories that were created, modified, or deleted during template conversion
- **Sanitized_Restoration**: A restoration mode that removes potentially sensitive information from the undo log
- **Template_Author**: A developer who creates and maintains template repositories
- **Working_Project**: A functional project in its original state before template conversion

## Requirements

### Requirement 1

**User Story:** As a template author, I want to restore my templatized project back to a working state, so that I can test and debug issues found after template conversion.

#### Acceptance Criteria

1. WHEN the Make_Template_CLI is executed with --restore flag, THE Make_Template_CLI SHALL read the Undo_Log and reverse all template conversion operations
2. THE Make_Template_CLI SHALL restore Original_Values by replacing placeholders with their recorded actual values
3. THE Make_Template_CLI SHALL recreate deleted files and directories using data from the Undo_Log
4. THE Make_Template_CLI SHALL remove files that were created during template conversion (template.json, _setup.mjs)
5. THE Make_Template_CLI SHALL restore the project to a functional working state identical to pre-conversion

### Requirement 2

**User Story:** As a template author, I want an undo log to be automatically created during template conversion, so that restoration operations have complete information about the original project state.

#### Acceptance Criteria

1. WHEN template conversion is performed, THE Make_Template_CLI SHALL generate an Undo_Log file (.template-undo.json) containing all conversion operations
2. THE Undo_Log SHALL record Original_Values for all placeholder replacements performed
3. THE Undo_Log SHALL record File_Operations_Log including created, modified, and deleted files with their original content
4. THE Undo_Log SHALL include metadata such as conversion timestamp, make-template version, and project type
5. THE Undo_Log SHALL be saved in the project root directory alongside other template files

### Requirement 3

**User Story:** As a template author, I want to sanitize sensitive information from the undo log, so that I can safely commit templates to shared repositories without exposing private details.

#### Acceptance Criteria

1. WHERE the --sanitize-undo option is provided, THE Make_Template_CLI SHALL remove potentially sensitive information from the Undo_Log
2. THE Make_Template_CLI SHALL replace author names, email addresses, and personal identifiers with generic placeholders in sanitized mode
3. THE Make_Template_CLI SHALL preserve functional restoration data (file operations, placeholder mappings) while removing sensitive content
4. THE Make_Template_CLI SHALL maintain restoration capability even with sanitized undo logs by using reasonable defaults
5. WHERE sanitized restoration is performed, THE Make_Template_CLI SHALL prompt for missing values or use configurable defaults

### Requirement 4

**User Story:** As a template author, I want to preview restoration operations before they are executed, so that I can verify the restoration will work correctly.

#### Acceptance Criteria

1. WHERE the --restore --dry-run options are combined, THE Make_Template_CLI SHALL display all planned restoration operations without executing them
2. THE Make_Template_CLI SHALL show which files will be restored, created, or deleted during restoration
3. THE Make_Template_CLI SHALL show what placeholder values will be restored from the Undo_Log
4. THE Make_Template_CLI SHALL display any missing or sanitized values that will require user input
5. WHEN in restoration dry-run mode, THE Make_Template_CLI SHALL exit without making any filesystem changes

### Requirement 5

**User Story:** As a template author, I want to selectively restore parts of my project, so that I can maintain some template artifacts while restoring working functionality.

#### Acceptance Criteria

1. WHERE the --restore-files option is provided, THE Make_Template_CLI SHALL restore only specified files from the Undo_Log
2. WHERE the --restore-placeholders option is provided, THE Make_Template_CLI SHALL restore only placeholder values without file operations
3. THE Make_Template_CLI SHALL support comma-separated lists for selective restoration (--restore-files "package.json,README.md")
4. THE Make_Template_CLI SHALL validate that requested files exist in the Undo_Log before attempting restoration
5. WHERE selective restoration is performed, THE Make_Template_CLI SHALL preserve template files (template.json, _setup.mjs) unless explicitly included

### Requirement 6

**User Story:** As a template author, I want the undo log to be ignored by create-scaffold, so that template consumers don't see internal restoration data.

#### Acceptance Criteria

1. THE Make_Template_CLI SHALL document that create-scaffold should ignore .template-undo.json files
2. THE Undo_Log SHALL be structured to not interfere with template consumption workflows
3. THE Make_Template_CLI SHALL provide guidance for template authors on whether to commit or gitignore the Undo_Log
4. THE Undo_Log SHALL use a filename pattern that clearly indicates its purpose (.template-undo.json)
5. THE Make_Template_CLI SHALL validate Undo_Log format and version compatibility before restoration

### Requirement 7

**User Story:** As a template author, I want to configure default values for sanitized restoration, so that I can automate the restoration process without manual input.

#### Acceptance Criteria

1. WHERE a .restore-defaults.json file exists, THE Make_Template_CLI SHALL use configured default values for sanitized restoration
2. THE Make_Template_CLI SHALL support environment variable substitution in default values (${USER}, ${PWD})
3. THE Make_Template_CLI SHALL validate that provided defaults match the expected placeholder format
4. WHERE defaults are insufficient, THE Make_Template_CLI SHALL prompt for missing values interactively
5. THE Make_Template_CLI SHALL provide a --generate-defaults option to create a template defaults file

### Requirement 8

**User Story:** As a template author, I want restoration operations to be safe and reversible, so that I don't accidentally lose work during the restoration process.

#### Acceptance Criteria

1. THE Make_Template_CLI SHALL require confirmation before performing restoration operations that will overwrite existing files
2. WHERE the --yes option is provided with --restore, THE Make_Template_CLI SHALL skip confirmation prompts
3. THE Make_Template_CLI SHALL validate that the Undo_Log is complete and uncorrupted before beginning restoration
4. IF restoration fails partway through, THE Make_Template_CLI SHALL provide clear error messages and guidance for recovery
5. THE Make_Template_CLI SHALL preserve the original Undo_Log file during restoration operations

### Requirement 9

**User Story:** As a template author, I want clear documentation and help for restoration features, so that I can effectively use the restoration workflow.

#### Acceptance Criteria

1. THE Make_Template_CLI SHALL provide --help output that includes all restoration options and examples
2. THE Make_Template_CLI SHALL document the complete template author workflow including conversion and restoration cycles
3. THE Make_Template_CLI SHALL provide examples of sanitized vs full restoration modes
4. THE Make_Template_CLI SHALL document best practices for undo log management in template repositories
5. THE Make_Template_CLI SHALL include troubleshooting guidance for common restoration scenarios

### Requirement 10

**User Story:** As a template author, I want restoration to integrate seamlessly with the existing make-template workflow, so that I can efficiently iterate on template development.

#### Acceptance Criteria

1. THE Make_Template_CLI SHALL support chaining operations (convert → test → restore → fix → convert)
2. THE Make_Template_CLI SHALL maintain compatibility with existing make-template options when restoration features are added
3. THE Make_Template_CLI SHALL use consistent argument parsing and error handling patterns for restoration operations
4. THE Make_Template_CLI SHALL follow the same Node.js CLI best practices for restoration features
5. THE Make_Template_CLI SHALL ensure restoration operations complete in reasonable time for typical project sizes