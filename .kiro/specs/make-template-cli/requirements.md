# Requirements Document

## Introduction

The @m5nv/make-template CLI tool converts existing Node.js project directories into reusable templates compatible with @m5nv/create-scaffold. The tool analyzes project structure, identifies project types, replaces project-specific values with placeholders, performs cleanup operations, and generates the necessary template files (_setup.mjs and template.json) to make the project usable as a scaffold template.

## Glossary

- **Make_Template_CLI**: The command-line interface tool that converts existing projects into templates
- **Create_Scaffold**: The counterpart tool that uses templates created by Make_Template_CLI to generate new projects
- **Template_Directory**: A project directory that has been converted to serve as a reusable template
- **Placeholder**: A token in template files that gets replaced with actual values during project generation (format: {{PLACEHOLDER_NAME}})
- **Project_Type**: The detected or specified type of project (e.g., vite-react, cf-d1, cf-turso)
- **Setup_Script**: The _setup.mjs file that contains instructions for Create_Scaffold to customize the template
- **Template_Metadata**: The template.json file containing placeholder definitions and project type information
- **Dry_Run_Mode**: A preview mode that shows planned changes without executing them
- **Target_Files**: Configuration files that will have placeholders inserted (package.json, README.md, etc.)

## Requirements

### Requirement 1

**User Story:** As a developer, I want to convert my existing Node.js project into a reusable template, so that I can quickly scaffold similar projects in the future.

#### Acceptance Criteria

1. WHEN the Make_Template_CLI is executed in a project directory, THE Make_Template_CLI SHALL analyze the current directory structure and convert it into a template format
2. THE Make_Template_CLI SHALL detect the project type based on file presence and package.json dependencies
3. THE Make_Template_CLI SHALL identify project-specific values in configuration files and replace them with placeholders
4. THE Make_Template_CLI SHALL generate a Setup_Script (_setup.mjs) with placeholder replacement instructions
5. THE Make_Template_CLI SHALL generate Template_Metadata (template.json) listing all identified placeholders and project type

### Requirement 2

**User Story:** As a developer, I want to preview the changes before they are applied, so that I can verify the conversion will work correctly.

#### Acceptance Criteria

1. WHERE the --dry-run option is provided, THE Make_Template_CLI SHALL display all planned changes without modifying any files
2. THE Make_Template_CLI SHALL show which files will be modified and what placeholder replacements will occur
3. THE Make_Template_CLI SHALL show which files and directories will be deleted during cleanup
4. THE Make_Template_CLI SHALL show the content of generated files (Setup_Script and Template_Metadata) in preview mode
5. WHEN in Dry_Run_Mode, THE Make_Template_CLI SHALL exit without making any filesystem changes

### Requirement 3

**User Story:** As a developer, I want to customize placeholder formats and project type detection, so that I can adapt the tool to different project conventions.

#### Acceptance Criteria

1. WHERE the --placeholder-format option is provided, THE Make_Template_CLI SHALL use the specified format instead of the default {{PLACEHOLDER_NAME}}
2. WHERE the --type option is provided, THE Make_Template_CLI SHALL use the specified Project_Type instead of automatic detection
3. THE Make_Template_CLI SHALL support common placeholder formats including {{NAME}}, __NAME__, and %NAME%
4. THE Make_Template_CLI SHALL validate that the specified placeholder format contains a name substitution mechanism
5. WHERE an invalid placeholder format is provided, THE Make_Template_CLI SHALL display an error message and exit

### Requirement 4

**User Story:** As a developer, I want the tool to safely handle destructive operations, so that I don't accidentally lose important project files.

#### Acceptance Criteria

1. THE Make_Template_CLI SHALL require user confirmation before performing any destructive operations
2. WHERE the -y or --yes option is provided, THE Make_Template_CLI SHALL skip confirmation prompts
3. THE Make_Template_CLI SHALL validate that essential files (package.json) exist before proceeding
4. IF a required configuration file is missing, THEN THE Make_Template_CLI SHALL display an error message and exit
5. THE Make_Template_CLI SHALL preserve essential template files (migrations, source code) during cleanup operations

### Requirement 5

**User Story:** As a developer, I want the tool to detect different project types automatically, so that appropriate placeholders and setup instructions are generated.

#### Acceptance Criteria

1. WHEN wrangler.jsonc is present, THE Make_Template_CLI SHALL detect Cloudflare Worker project types
2. WHEN vite.config.js is present, THE Make_Template_CLI SHALL detect Vite-based projects
3. THE Make_Template_CLI SHALL examine package.json dependencies to refine project type detection
4. THE Make_Template_CLI SHALL support cf-d1, cf-turso, and vite-react project types
5. WHERE project type cannot be determined, THE Make_Template_CLI SHALL default to generic Node.js template type

### Requirement 6

**User Story:** As a developer, I want appropriate placeholders to be identified based on project type, so that the generated template works correctly with Create_Scaffold.

#### Acceptance Criteria

1. THE Make_Template_CLI SHALL identify PROJECT_NAME, PROJECT_DESCRIPTION, and AUTHOR placeholders from package.json for all project types
2. WHEN Project_Type is Cloudflare Worker, THE Make_Template_CLI SHALL identify WORKER_NAME, CLOUDFLARE_ACCOUNT_ID, and database-related placeholders from wrangler.jsonc
3. WHEN Project_Type is Vite-based, THE Make_Template_CLI SHALL identify BASE_URL from vite.config.js and HTML_TITLE from index.html
4. THE Make_Template_CLI SHALL replace identified values with placeholders in Target_Files
5. THE Make_Template_CLI SHALL record all identified placeholders in the Template_Metadata file

### Requirement 7

**User Story:** As a developer, I want unnecessary files to be cleaned up during conversion, so that the template doesn't contain instance-specific artifacts.

#### Acceptance Criteria

1. THE Make_Template_CLI SHALL remove node_modules directory and package lock files
2. THE Make_Template_CLI SHALL remove build output directories (dist, build, .next)
3. THE Make_Template_CLI SHALL remove version control artifacts (.git directory)
4. THE Make_Template_CLI SHALL remove environment-specific files (.env, .dev.vars, .wrangler)
5. THE Make_Template_CLI SHALL preserve source code, configuration templates, and migration files

### Requirement 8

**User Story:** As a developer, I want a setup script to be generated that works with Create_Scaffold, so that the template can be properly instantiated.

#### Acceptance Criteria

1. THE Make_Template_CLI SHALL generate a Setup_Script that exports a default async function accepting destructured Environment object ({ ctx, tools })
2. THE Setup_Script SHALL use tools.placeholders.replaceAll to perform placeholder replacements
3. THE Setup_Script SHALL map placeholders to ctx.projectName and other ctx properties provided by Create_Scaffold
4. THE Setup_Script SHALL include logging statements using tools.logger.info for setup progress
5. THE Setup_Script SHALL be idempotent and handle re-execution gracefully

### Requirement 9

**User Story:** As a developer, I want clear error messages and proper exit codes, so that I can understand and resolve any issues that occur.

#### Acceptance Criteria

1. THE Make_Template_CLI SHALL use exit code 0 for successful operations
2. THE Make_Template_CLI SHALL use exit code 1 for errors and failures
3. WHEN filesystem operations fail, THE Make_Template_CLI SHALL display specific error messages with file paths
4. WHEN required dependencies are missing, THE Make_Template_CLI SHALL display installation instructions
5. THE Make_Template_CLI SHALL wrap all filesystem operations in try-catch blocks for proper error handling

### Requirement 10

**User Story:** As a developer, I want the tool to follow Node.js CLI best practices, so that it integrates well with my development workflow.

#### Acceptance Criteria

1. THE Make_Template_CLI SHALL use ES Modules exclusively (no CommonJS)
2. THE Make_Template_CLI SHALL use native Node.js modules for argument parsing (util.parseArgs)
3. THE Make_Template_CLI SHALL use fs/promises for all file operations
4. THE Make_Template_CLI SHALL provide --help option with usage information
5. THE Make_Template_CLI SHALL be installable and executable via npx