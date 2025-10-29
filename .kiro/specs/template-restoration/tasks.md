# Implementation Plan

## Overview

Convert the template restoration feature design into a series of coding tasks that build incrementally on the existing make-template codebase. Each task focuses on specific functionality while maintaining compatibility with existing features.

## Implementation Tasks

- [x] 1. Fix .git deletion bug in existing make-template






  - Remove .git from cleanup rules in existing codebase
  - Update cleanup processor to preserve .git directory
  - Add validation to prevent accidental deletion of version control
  - Update tests to verify .git preservation
  - _Requirements: 3.1, 4.1_




- [x] 2. Implement file categorization system



  - [x] 2.1 Create file categorization utilities

    - Implement logic to distinguish user-created vs generated files

    - Add categorization rules for common ecosystem files
    - Create file size thresholds for content storage decisions
    - _Requirements: 2.1, 2.2_
  
  - [x] 2.2 Extend cleanup processor with categorization

    - Modify cleanup processor to use file categories
    - Add logic to determine content storage vs regeneration guidance
    - Implement category-specific handling for different file types
    - _Requirements: 2.1, 2.2_

- [x] 3. Implement undo log generation






  - [x] 3.1 Create undo log manager


    - Create src/lib/restoration/undo-log-manager.js with UndoLogManager class
    - Implement createUndoLog, readUndoLog, validateUndoLogVersion methods
    - Add undo log schema validation and version compatibility
    - Implement file content capture for user-created files using file categorizer
    - _Requirements: 2.1, 2.2, 6.1_
  
  - [x] 3.2 Integrate undo log creation with conversion engine


    - Extend ConversionEngine.executePlan to generate undo logs during conversion
    - Capture original file contents before placeholder replacement
    - Record file operations with appropriate categorization using existing cleanup processor metadata
    - Save undo log atomically with template generation (.template-undo.json)
    - _Requirements: 2.1, 2.2_

- [x] 4. Implement sanitization functionality






  - [x] 4.1 Create sanitizer component


    - Create src/lib/restoration/sanitizer.js with Sanitizer class
    - Implement configurable sanitization rules for emails, names, API keys, file paths
    - Add sanitizeUndoLog method with pattern matching and replacement
    - Create sanitization report generation
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 4.2 Add sanitization options to CLI


    - Extend src/bin/cli.js OPTIONS_SCHEMA to support --sanitize-undo flag
    - Integrate sanitization with undo log generation workflow in ConversionEngine
    - Add sanitization preview and confirmation prompts
    - _Requirements: 3.1, 3.2_

- [x] 5. Implement restoration engine core




  - [x] 5.1 Create restoration engine


    - Create src/lib/restoration/restoration-engine.js with RestorationEngine class
    - Implement restoration workflow orchestration (read → plan → execute)
    - Add error handling and user confirmation patterns following existing ConversionEngine
    - Integrate with existing Logger and FSUtils utilities
    - _Requirements: 1.1, 1.2, 8.1, 8.2_
  
  - [x] 5.2 Create restoration planner


    - Create src/lib/restoration/restoration-planner.js with RestorationPlanner class
    - Implement createRestorationPlan method for different restoration modes (full, sanitized, selective)
    - Add restoration action planning based on existing file categories
    - Generate restoration plan schema with actions, missing values, and warnings
    - _Requirements: 1.1, 5.1, 5.2_


- [x] 6. Implement restoration processor




  - [x] 6.1 Create restoration processor


    - Create src/lib/processors/restoration-processor.js with RestorationProcessor class
    - Implement executePlan method to execute restoration plans
    - Add file restoration with placeholder replacement using existing FileProcessor patterns
    - Implement template file preservation logic and regeneration guidance for generated files
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 6.2 Add restoration safety features


    - Implement file conflict detection and backup options in RestorationProcessor
    - Add atomic restoration operations using existing FSUtils patterns
    - Implement restoration rollback on failure with proper cleanup



    - _Requirements: 8.1, 8.2, 8.3_

- [x] 7. Extend CLI interface for restoration



  - [x] 7.1 Add restoration command-line options

    - Extend src/bin/cli.js OPTIONS_SCHEMA with restoration options
    - Add --restore, --restore-files, --restore-placeholders, --generate-defaults flags
    - Implement restoration workflow routing in main CLI function
    - _Requirements: 1.1, 5.1, 5.2_
  


  - [ ] 7.2 Add restoration dry-run and preview
    - Implement restoration dry-run mode with detailed preview using existing dry-run patterns

    - Add restoration plan display with file-by-file breakdown

    - Implement user confirmation prompts following existing confirmation patterns
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 8. Implement defaults and configuration system



  - [x] 8.1 Create restoration defaults system

    - Create src/lib/restoration/defaults-manager.js with DefaultsManager class
    - Implement .restore-defaults.json configuration file support
    - Add environment variable substitution in default values (${USER}, ${PWD})
    - Create defaults file generation with --generate-defaults option
    - _Requirements: 7.1, 7.2, 7.3_
  

  - [x] 8.2 Add interactive value prompting

    - Implement interactive prompts for missing restoration values using existing readline patterns
    - Add validation for user-provided restoration values
    - Integrate defaults with sanitized restoration workflow



    - _Requirements: 7.1, 7.4, 3.4_

- [x] 9. Add comprehensive error handling and validation



  - [x] 9.1 Implement restoration-specific error handling

    - Extend src/lib/config.js ERROR_CODES with restoration error codes
    - Create RestorationError class extending existing MakeTemplateError
    - Implement undo log validation and corruption detection in UndoLogManager
    - Add version compatibility checking for undo logs
    - _Requirements: 8.3, 8.4, 6.1_
  
  - [x] 9.2 Add restoration conflict resolution


    - Implement file conflict detection and resolution options in RestorationProcessor
    - Add backup creation for conflicting files using existing FSUtils patterns
    - Implement partial restoration failure handling with proper cleanup
    - _Requirements: 8.1, 8.2, 8.4_
-

- [x] 10. Update documentation and help system




  - [x] 10.1 Extend CLI help and documentation


    - Update displayHelp function in src/bin/cli.js to include all restoration options
    - Add restoration workflow examples and usage patterns to help text
    - Document template author workflow with restoration cycle
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 10.2 Add restoration troubleshooting guidance


    - Update README.md with restoration feature documentation
    - Add guidance for undo log management in template repositories
    - Create best practices documentation for sanitization
    - _Requirements: 9.4, 9.5, 6.1_
- [x] 11. Comprehensive testing and validation




- [ ] 11. Comprehensive testing and validation

  - [x] 11.1 Create restoration test fixtures


    - Create test/fixtures/restoration-scenarios/ with various restoration test cases
    - Add templates with undo logs for round-trip testing
    - Create sanitized undo log test cases and corrupted undo log scenarios
    - _Requirements: All requirements_
  
  - [x] 11.2 Implement end-to-end restoration tests


    - Create test/functional/restoration-workflow.test.js for complete conversion → restoration cycles
    - Add test/integration/restoration-integrity.test.js to validate restoration across project types
    - Test error scenarios and recovery mechanisms in restoration components
    - _Requirements: All requirements_

## Implementation Notes

### Integration Strategy
- Build on existing ConversionEngine patterns for consistency
- Extend existing CLI argument parsing rather than replacing
- Reuse existing error handling and logging infrastructure
- Maintain backward compatibility with existing make-template functionality

### Testing Approach
- Focus on round-trip integrity (convert → restore → verify identical)
- Test all restoration modes with real project fixtures
- Validate sanitization effectiveness without breaking functionality
- Test cross-platform compatibility for restoration operations

### Performance Considerations
- Implement streaming for large file operations
- Use file categorization to avoid storing huge generated files
- Implement progress reporting for long restoration operations
- Add cancellation support for user interruption

### Security Considerations
- Validate all restoration paths to prevent directory traversal
- Implement safe file operations with proper cleanup
- Sanitize sensitive data effectively while preserving functionality
- Provide clear guidance on undo log privacy implications