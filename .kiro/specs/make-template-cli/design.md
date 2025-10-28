# Design Document

## Overview

The @m5nv/make-template CLI tool is designed as a Node.js ESM application that converts existing projects into reusable templates. The architecture follows a modular approach with clear separation of concerns: project analysis, placeholder identification, file processing, and template generation. The tool operates in-place on the current directory and generates Create_Scaffold-compatible templates.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CLI Entry     │───▶│  Core Engine     │───▶│ File Processors │
│   (bin/cli.js)  │    │  (lib/engine.js) │    │ (lib/processors)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Project        │
                       │   Analyzers      │
                       │ (lib/analyzers)  │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Template       │
                       │   Generators     │
                       │ (lib/generators) │
                       └──────────────────┘
```

### Module Structure

```
src/
├── bin/
│   └── cli.js                 # CLI entry point
├── lib/
│   ├── engine.js              # Main orchestration logic
│   ├── config.js              # Configuration and constants
│   ├── analyzers/
│   │   ├── project-detector.js    # Project type detection
│   │   ├── placeholder-finder.js  # Placeholder identification
│   │   └── file-scanner.js        # File system analysis
│   ├── processors/
│   │   ├── file-processor.js      # File modification operations
│   │   ├── cleanup-processor.js   # File/directory cleanup
│   │   └── placeholder-processor.js # Placeholder replacement
│   ├── generators/
│   │   ├── setup-generator.js     # _setup.mjs generation
│   │   └── metadata-generator.js  # template.json generation
│   └── utils/
│       ├── fs-utils.js            # File system utilities
│       ├── validation.js          # Input validation
│       └── logger.js              # Logging utilities
└── test/
    ├── unit/                      # Unit tests
    ├── integration/               # Integration tests
    └── fixtures/                  # Test fixtures
```

## Components and Interfaces

### Create-Scaffold Tools API Compatibility

The generated _setup.mjs must be compatible with the create-scaffold tools API:

**Environment Object Structure:**
```javascript
{ ctx, tools } = {
  ctx: {
    projectName: string,    // Sanitized project name
    ide: string | null,     // Target IDE (kiro, vscode, cursor, windsurf)
    options: string[]       // Array of options from --options
  },
  tools: {
    placeholders: {
      replaceAll(map, files): Promise<void>
    },
    text: {
      insertAfter(opts): Promise<void>,
      // ... other text operations
    },
    json: {
      set(file, path, value): Promise<void>,
      addToArray(file, path, value, opts): Promise<void>
      // ... other JSON operations  
    },
    files: {
      ensureDirs(paths): Promise<void>,
      // ... other file operations
    },
    templates: {
      renderFile(template, output, vars): Promise<void>
    },
    options: {
      when(option, callback): Promise<void>
    },
    ide: {
      applyPreset(ide): Promise<void>
    },
    logger: {
      info(message): void
    }
  }
}
```

### CLI Entry Point (bin/cli.js)

**Responsibilities:**
- Parse command-line arguments using util.parseArgs
- Validate input parameters
- Initialize and execute the core engine
- Handle top-level error reporting

**Interface:**
```javascript
// Command-line interface
npx @m5nv/make-template [options]

// Options schema (aligned with create-scaffold expectations)
{
  'placeholder-format': { type: 'string', default: '{{PLACEHOLDER_NAME}}' },
  'dry-run': { type: 'boolean', default: false },
  'yes': { type: 'boolean', default: false },
  'type': { type: 'string' },
  'help': { type: 'boolean', default: false }
}

// Supported placeholder formats
const SUPPORTED_FORMATS = ['{{NAME}}', '__NAME__', '%NAME%'];
```

### Core Engine (lib/engine.js)

**Responsibilities:**
- Orchestrate the entire conversion process
- Coordinate between analyzers, processors, and generators
- Handle dry-run mode and user confirmation
- Manage error handling and rollback

**Key Methods:**
```javascript
class ConversionEngine {
  async convert(options) {
    // Main conversion workflow
    const analysis = await this.analyzeProject(options);
    const plan = await this.createConversionPlan(analysis);
    
    if (options.dryRun) {
      return this.displayPlan(plan);
    }
    
    if (!options.yes) {
      await this.confirmPlan(plan);
    }
    
    return this.executePlan(plan);
  }
}
```

### Project Detector (lib/analyzers/project-detector.js)

**Responsibilities:**
- Detect project type based on file presence and package.json
- Support forced type specification via CLI option
- Provide project-specific configuration

**Detection Logic:**
```javascript
const PROJECT_TYPES = {
  'cf-d1': {
    files: ['wrangler.jsonc'],
    dependencies: ['@cloudflare/workers-types'],
    indicators: ['d1_databases']
  },
  'cf-turso': {
    files: ['wrangler.jsonc'],
    dependencies: ['@libsql/client'],
    indicators: ['TURSO_DB_URL']
  },
  'vite-react': {
    files: ['vite.config.js', 'vite.config.ts'],
    dependencies: ['vite', 'react']
  }
};
```

### Placeholder Finder (lib/analyzers/placeholder-finder.js)

**Responsibilities:**
- Identify project-specific values that should become placeholders
- Map values to appropriate placeholder names
- Support different project types with type-specific logic

**Placeholder Mapping:**
```javascript
const PLACEHOLDER_MAPPINGS = {
  common: {
    'package.json': ['name', 'description', 'author', 'repository.url'],
    'README.md': ['title', 'description']
  },
  'cf-d1': {
    'wrangler.jsonc': ['name', 'account_id', 'd1_databases[].binding', 'd1_databases[].database_id']
  },
  'vite-react': {
    'vite.config.js': ['base'],
    'index.html': ['title']
  }
};

// Default placeholder format: {{PLACEHOLDER_NAME}}
// Supported formats: {{NAME}}, __NAME__, %NAME%
const PLACEHOLDER_FORMATS = {
  'double-brace': '{{PLACEHOLDER_NAME}}',
  'double-underscore': '__PLACEHOLDER_NAME__', 
  'percent': '%PLACEHOLDER_NAME%'
};
```

### File Processor (lib/processors/file-processor.js)

**Responsibilities:**
- Perform placeholder replacements in target files
- Handle different file formats (JSON, JSONC, JS, HTML, MD)
- Preserve file formatting and structure

**Processing Strategy:**
```javascript
class FileProcessor {
  async processFile(filePath, placeholders, format) {
    const content = await fs.readFile(filePath, 'utf8');
    const processed = this.replacePlaceholders(content, placeholders, format);
    await fs.writeFile(filePath, processed, 'utf8');
  }
  
  replacePlaceholders(content, placeholders, format) {
    // Format-specific replacement logic
    // Preserve JSON structure, handle JSONC comments, etc.
  }
}
```

### Setup Generator (lib/generators/setup-generator.js)

**Responsibilities:**
- Generate _setup.mjs compatible with Create_Scaffold
- Map placeholders to ctx properties using destructured Environment object
- Include project-type-specific setup logic
- Ensure idempotent operations

**Generated Setup Script Structure:**
```javascript
// Template for generated _setup.mjs
export default async function setup({ ctx, tools }) {
  tools.logger.info(`Setting up ${projectType} project: ${ctx.projectName}`);
  
  // Replace placeholders using tools.placeholders.replaceAll
  await tools.placeholders.replaceAll(
    { PROJECT_NAME: ctx.projectName },
    ['package.json', 'README.md', 'wrangler.jsonc']
  );
  
  // Project-specific setup logic using available tools
  // - tools.json for JSON manipulation
  // - tools.text for text operations
  // - tools.files for file operations
  // - tools.options.when() for conditional features
  
  if (ctx.ide) {
    await tools.ide.applyPreset(ctx.ide);
  }
}
```

### Cleanup Processor (lib/processors/cleanup-processor.js)

**Responsibilities:**
- Remove instance-specific files and directories
- Preserve essential template files
- Handle cleanup errors gracefully

**Cleanup Rules:**
```javascript
const CLEANUP_RULES = {
  directories: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.wrangler',
    'coverage'
  ],
  files: [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.env',
    '.env.local',
    '.dev.vars'
  ],
  preserve: [
    'migrations/',
    'src/',
    'public/',
    '*.md',
    'package.json',
    'wrangler.jsonc',
    'vite.config.*'
  ]
};
```

## Data Models

### Project Analysis Result

```javascript
{
  projectType: 'cf-d1' | 'cf-turso' | 'vite-react' | 'generic',
  placeholders: [
    {
      name: 'PROJECT_NAME',
      value: 'my-project',
      files: ['package.json', 'README.md']
    }
  ],
  targetFiles: ['package.json', 'README.md', 'wrangler.jsonc'],
  cleanupItems: ['node_modules', '.git', 'package-lock.json']
}
```

### Conversion Plan

```javascript
{
  analysis: ProjectAnalysisResult,
  actions: [
    {
      type: 'modify',
      file: 'package.json',
      replacements: [{ from: 'my-project', to: '{{PROJECT_NAME}}' }]
    },
    {
      type: 'delete',
      path: 'node_modules'
    },
    {
      type: 'create',
      file: '_setup.mjs',
      content: '...'
    }
  ]
}
```

### Template Metadata (template.json)

```javascript
{
  "name": "Template Name",
  "description": "Template Description", 
  "setup": {
    "supportedOptions": ["testing", "docs", "database"]
  },
  "metadata": {
    "type": "cf-d1",
    "version": "1.0.0",
    "placeholders": [
      {
        "name": "{{PROJECT_NAME}}",
        "description": "The name of the project",
        "required": true,
        "default": null
      }
    ],
    "files": [
      "package.json",
      "README.md", 
      "wrangler.jsonc"
    ],
    "createdBy": "@m5nv/make-template",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Error Handling

### Error Categories

1. **Validation Errors**: Invalid CLI arguments, missing required files
2. **Filesystem Errors**: Permission issues, disk space, file not found
3. **Processing Errors**: Invalid JSON, unsupported file formats
4. **User Cancellation**: User declines confirmation prompt

### Error Handling Strategy

```javascript
class MakeTemplateError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'MakeTemplateError';
    this.code = code;
    this.details = details;
  }
}

// Error codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILESYSTEM_ERROR: 'FILESYSTEM_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  USER_CANCELLED: 'USER_CANCELLED'
};
```

### Recovery Mechanisms

- **Atomic Operations**: Use temporary files and atomic moves
- **Rollback Support**: Track changes for potential rollback
- **Graceful Degradation**: Continue processing when non-critical operations fail
- **Clear Error Messages**: Provide actionable error information

## Testing Strategy

### Functional Testing Only

- **End-to-End CLI Workflows**: Test complete conversion process with real project fixtures
- **Project Type Detection**: Test detection logic with various project structures
- **Placeholder Processing**: Test placeholder identification and replacement across different file formats
- **Template Generation**: Test _setup.mjs and template.json generation for different project types
- **CLI Interface**: Test all command-line options and argument combinations
- **Error Scenarios**: Test error handling, validation, and recovery mechanisms
- **Dry Run Mode**: Verify dry run produces accurate previews without filesystem changes

### Test Fixtures

```
test/fixtures/
├── input-projects/
│   ├── cf-d1-project/          # Sample Cloudflare D1 project
│   ├── cf-turso-project/       # Sample Cloudflare Turso project
│   ├── vite-react-project/     # Sample Vite React project
│   └── generic-node-project/   # Generic Node.js project
└── expected-templates/
    ├── cf-d1-template/         # Expected template output
    ├── cf-turso-template/      # Expected template output
    ├── vite-react-template/    # Expected template output
    └── generic-node-template/  # Expected template output
```

### Test-First Development Approach

1. **Write Failing Tests First**: Create comprehensive functional tests that define expected behavior before implementing any functionality
2. **Verify RED State**: Run tests to confirm they fail with expected error messages
3. **Implement Minimal Code**: Write only enough code to make tests pass (GREEN)
4. **Refactor**: Improve code quality while maintaining green tests
5. **Real-World Scenarios**: Use realistic project structures and edge cases in test fixtures
6. **Cross-Platform Testing**: Ensure compatibility across Windows, macOS, and Linux

## Security Considerations

### Input Validation

- Validate all CLI arguments and file paths
- Prevent directory traversal attacks
- Sanitize placeholder formats to prevent code injection

### File System Security

- Restrict operations to current directory and subdirectories
- Validate file permissions before operations
- Use safe file operations (atomic writes, proper cleanup)

### Generated Code Security

- Sanitize placeholder values in generated setup scripts
- Avoid dynamic code execution in templates
- Validate template metadata structure

## Performance Considerations

### Optimization Strategies

- **Lazy Loading**: Load modules only when needed
- **Streaming Processing**: Process large files in chunks
- **Parallel Operations**: Process multiple files concurrently where safe
- **Caching**: Cache analysis results for repeated operations

### Resource Management

- **Memory Usage**: Avoid loading entire large files into memory
- **File Handles**: Properly close file handles and clean up resources
- **Temporary Files**: Clean up temporary files on exit or error

## Deployment and Distribution

### Package Configuration

```json
{
  "name": "@m5nv/make-template",
  "type": "module",
  "bin": {
    "make-template": "./src/bin/cli.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "files": [
    "src/",
    "README.md",
    "LICENSE"
  ]
}
```

### Installation and Usage

- Distributed via npm as a public package
- Executable via npx for one-time usage
- Global installation supported for frequent use
- Clear documentation and examples provided