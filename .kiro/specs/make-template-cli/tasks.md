# Implementation Plan

- [x] 1. Set up project structure and core configuration








  - Create package.json with ESM configuration and Node.js CLI setup
  - Set up directory structure (src/bin, src/lib, test/)
  - Configure npm scripts for testing and development
  - _Requirements: 10.1, 10.2, 10.5_

- [x] 2. Create comprehensive functional test suite




  - [x] 2.1 Set up test fixtures for different project types


    - Create sample cf-d1-project with wrangler.jsonc and D1 configuration
    - Create sample cf-turso-project with Turso database configuration
    - Create sample vite-react-project with Vite and React setup
    - Create sample generic-node-project with basic Node.js structure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.2 Write CLI interface tests


    - Test argument parsing for all supported options (--dry-run, --yes, --type, --placeholder-format)
    - Test help option and usage information display
    - Test error handling for invalid arguments and missing required files
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.4_

  - [x] 2.3 Write project analysis and detection tests


    - Test project type detection for Cloudflare Worker projects (cf-d1, cf-turso)
    - Test project type detection for Vite-based projects
    - Test fallback to generic Node.js type when detection fails
    - Test forced project type specification via --type option
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.4 Write placeholder identification and replacement tests


    - Test identification of PROJECT_NAME, PROJECT_DESCRIPTION from package.json
    - Test identification of Cloudflare-specific placeholders from wrangler.jsonc
    - Test identification of Vite-specific placeholders from vite.config.js and index.html
    - Test placeholder replacement in different file formats (JSON, JSONC, JS, HTML, MD)
    - Test custom placeholder format support ({{NAME}}, __NAME__, %NAME%)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 3.1, 3.2, 3.3, 3.4_

  - [x] 2.5 Write template generation tests


    - Test _setup.mjs generation with correct Environment object destructuring ({ ctx, tools })
    - Test tools.placeholders.replaceAll usage with proper placeholder mapping
    - Test template.json generation with supportedOptions and metadata structure
    - Test project-type-specific setup script generation
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 2.6 Write cleanup operation tests


    - Test removal of node_modules, lock files, and build outputs
    - Test removal of version control and environment-specific files
    - Test preservation of essential template files (migrations, source code)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 2.7 Write dry-run and confirmation tests


    - Test dry-run mode displays planned changes without executing them
    - Test confirmation prompt behavior and user input handling
    - Test --yes option skips confirmation prompts
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2_

  - [x] 2.8 Write safety and validation tests


    - Test validation of essential files (package.json) before proceeding
    - Test error handling for missing configuration files
    - Test filesystem operation error handling with proper exit codes
    - _Requirements: 4.3, 4.4, 4.5, 9.1, 9.2, 9.3, 9.4, 9.5_
-

- [x] 3. Implement CLI entry point and argument parsing




  - Create bin/cli.js with proper shebang and ESM imports
  - Implement argument parsing using util.parseArgs with supported options schema
  - Add help text generation and usage information display
  - Implement input validation and error reporting for CLI arguments
  - _Requirements: 10.1, 10.2, 10.4, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Implement core conversion engine





  - Create main ConversionEngine class with orchestration logic
  - Implement conversion workflow (analyze → plan → confirm → execute)
  - Add dry-run mode support with change preview functionality
  - Implement user confirmation prompts with --yes option support
  - Add comprehensive error handling and rollback mechanisms
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2_

- [x] 5. Implement project analysis components





  - [x] 5.1 Create project type detector

    - Implement file-based detection logic for wrangler.jsonc, vite.config.js
    - Add package.json dependency analysis for project type refinement
    - Support forced project type specification via CLI option
    - Implement fallback to generic Node.js type
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_


  - [x] 5.2 Create placeholder identification system





    - Implement common placeholder detection from package.json and README.md
    - Add Cloudflare Worker specific placeholder detection from wrangler.jsonc
    - Add Vite-specific placeholder detection from vite.config.js and index.html
    - Support configurable placeholder formats ({{NAME}}, __NAME__, %NAME%)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 3.1, 3.2, 3.3, 3.4_


  - [x] 5.3 Create file system scanner





    - Implement directory traversal and file identification
    - Add target file detection based on project type
    - Create cleanup item identification (node_modules, .git, lock files)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
-

- [x] 6. Implement file processing components




  - [x] 6.1 Create placeholder replacement processor


    - Implement format-aware placeholder replacement for JSON, JSONC, JS, HTML, MD files
    - Add support for different placeholder formats with validation
    - Preserve file formatting and structure during replacement
    - Handle edge cases and malformed files gracefully
    - _Requirements: 6.4, 6.5, 3.1, 3.2, 3.3, 3.4_

  - [x] 6.2 Create cleanup processor

    - Implement safe file and directory removal operations
    - Add preservation logic for essential template files
    - Include error handling for permission issues and locked files
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7. Implement template generation components





  - [x] 7.1 Create setup script generator


    - Generate _setup.mjs with correct Environment object destructuring ({ ctx, tools })
    - Implement tools.placeholders.replaceAll usage with proper placeholder mapping
    - Add project-type-specific setup logic and IDE preset support
    - Ensure idempotent operations and proper error handling
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 7.2 Create template metadata generator


    - Generate template.json with supportedOptions and metadata structure
    - Include placeholder definitions and project type information
    - Add creation timestamp and tool attribution
    - _Requirements: 1.5, 8.1_

- [x] 8. Implement utility modules





  - Create file system utilities with proper error handling and atomic operations
  - Add input validation utilities for CLI arguments and file formats
  - Implement logging utilities with appropriate verbosity levels
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
-

- [x] 9. Integration testing and validation



  - Run complete test suite to verify all functionality works end-to-end
  - Test with real-world project examples and edge cases
  - Validate generated templates work correctly with create-scaffold
  - Verify cross-platform compatibility (Windows, macOS, Linux)
  - _Requirements: All requirements validation_



- [x] 10. Package configuration and distribution setup



  - Configure package.json for npm publication with proper bin configuration
  - Set up ESM-only configuration with Node.js version requirements
  - Add README.md with usage examples and installation instructions
  - Configure npm scripts for testing, building, and publishing
  - _Requirements: 10.1, 10.2, 10.5_