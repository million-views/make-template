# Design Document

## Overview

The Template Restoration feature extends the existing @m5nv/make-template CLI tool to support reversing template conversion operations. This addresses the critical template author workflow where developers need to test and debug templates after conversion but cannot easily return to a working project state. The design integrates seamlessly with the existing ConversionEngine architecture while adding new restoration capabilities through an undo log system.

## Architecture

### High-Level Architecture Extension

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CLI Entry     │───▶│  Core Engine     │───▶│ File Processors │
│   (bin/cli.js)  │    │  (lib/engine.js) │    │ (lib/processors)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Restoration    │
                       │   Engine         │
                       │ (lib/restoration)│
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Undo Log       │
                       │   Manager        │
                       │ (lib/undo-log)   │
                       └──────────────────┘
```

### Extended Module Structure

```
src/
├── bin/
│   └── cli.js                     # Extended CLI with restoration options
├── lib/
│   ├── engine.js                  # Extended with undo log generation
│   ├── restoration/
│   │   ├── restoration-engine.js  # Main restoration orchestration
│   │   ├── undo-log-manager.js    # Undo log creation and reading
│   │   ├── restoration-planner.js # Plan restoration operations
│   │   └── sanitizer.js           # Sanitize sensitive data
│   ├── processors/
│   │   ├── restoration-processor.js # Execute restoration operations
│   │   └── [existing processors]
│   └── [existing modules]
```

## Components and Interfaces

### Extended CLI Interface (bin/cli.js)

**New Options Schema:**
```javascript
const RESTORATION_OPTIONS = {
  'restore': {
    type: 'boolean',
    default: false
  },
  'sanitize-undo': {
    type: 'boolean',
    default: false
  },
  'restore-files': {
    type: 'string'
  },
  'restore-placeholders': {
    type: 'boolean',
    default: false
  },
  'generate-defaults': {
    type: 'boolean',
    default: false
  }
};

// Combined with existing options
const EXTENDED_OPTIONS_SCHEMA = {
  ...OPTIONS_SCHEMA,
  ...RESTORATION_OPTIONS
};
```

**New CLI Workflows:**
```bash
# Full restoration
make-template --restore

# Sanitized restoration with defaults
make-template --restore --sanitize-undo

# Selective file restoration
make-template --restore --restore-files "package.json,README.md"

# Preview restoration
make-template --restore --dry-run

# Generate defaults file
make-template --generate-defaults
```

### Undo Log Manager (lib/restoration/undo-log-manager.js)

**Responsibilities:**
- Create comprehensive undo logs during template conversion
- Categorize files for appropriate restoration handling
- Read and validate undo logs for restoration
- Handle sanitization of sensitive information
- Manage undo log versioning and compatibility

**File Categorization Logic:**
```javascript
const FILE_CATEGORIES = {
  generated: {
    files: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
    directories: ['node_modules', 'dist', 'build', '.next', 'coverage'],
    storeContent: false,
    regenerationCommands: {
      'package-lock.json': 'npm install',
      'yarn.lock': 'yarn install', 
      'pnpm-lock.yaml': 'pnpm install',
      'node_modules': 'npm install',
      'dist': 'npm run build',
      'build': 'npm run build'
    }
  },
  userCreated: {
    files: ['.env', '.dev.vars', '.env.local', '.env.production'],
    directories: [],
    storeContent: true,
    regenerationCommands: {}
  },
  templateFiles: {
    files: ['template.json', '_setup.mjs', '.template-undo.json'],
    directories: [],
    storeContent: false,
    action: 'preserve'
  },
  // TEMPORARY CATEGORY - Remove after .git deletion bug is fixed
  incorrectlyDeleted: {
    files: [],
    directories: ['.git'],
    storeContent: false,
    action: 'cannot-restore',
    note: 'This category exists only due to current bug - will be removed once fixed'
  }
};
```

**Undo Log Schema:**
```javascript
{
  "version": "1.0.0",
  "metadata": {
    "makeTemplateVersion": "1.2.0",
    "projectType": "cf-d1",
    "timestamp": "2024-10-27T10:30:00Z",
    "placeholderFormat": "{{NAME}}"
  },
  "originalValues": {
    "{{PROJECT_NAME}}": "my-actual-project",
    "{{AUTHOR_NAME}}": "John Doe",
    "{{PROJECT_DESCRIPTION}}": "My working project description",
    "{{CLOUDFLARE_ACCOUNT_ID}}": "abc123def456"
  },
  "fileOperations": [
    {
      "type": "modified",
      "path": "package.json",
      "originalContent": "{\n  \"name\": \"my-actual-project\",\n  ...",
      "backupPath": null,
      "restorationAction": "restore-content"
    },
    {
      "type": "deleted",
      "path": ".env",
      "originalContent": "DATABASE_URL=postgres://localhost...",
      "backupPath": null,
      "restorationAction": "restore-content",
      "category": "user-created"
    },
    {
      "type": "deleted",
      "path": "package-lock.json",
      "originalContent": null,
      "backupPath": null,
      "restorationAction": "regenerate",
      "category": "generated",
      "regenerationCommand": "npm install"
    },
    {
      "type": "deleted",
      "path": "node_modules/",
      "originalContent": null,
      "backupPath": null,
      "restorationAction": "regenerate",
      "category": "generated",
      "regenerationCommand": "npm install"
    },
    {
      "type": "created",
      "path": "template.json",
      "originalContent": null,
      "backupPath": null,
      "restorationAction": "preserve",
      "category": "template-file"
    }
  ],
  "sanitized": false,
  "sanitizationMap": {}
}
```

**Key Methods:**
```javascript
class UndoLogManager {
  async createUndoLog(conversionPlan, options) {
    // Generate comprehensive undo log during conversion
  }
  
  async readUndoLog(filePath = '.template-undo.json') {
    // Read and validate existing undo log
  }
  
  async sanitizeUndoLog(undoLog, options) {
    // Remove sensitive information while preserving functionality
  }
  
  validateUndoLogVersion(undoLog) {
    // Ensure compatibility with current make-template version
  }
}
```

### Restoration Engine (lib/restoration/restoration-engine.js)

**Responsibilities:**
- Orchestrate the complete restoration process
- Integrate with existing ConversionEngine patterns
- Handle restoration modes (full, sanitized, selective)
- Manage user confirmation and dry-run preview

**Key Methods:**
```javascript
class RestorationEngine {
  constructor() {
    this.logger = new Logger();
    this.undoLogManager = new UndoLogManager();
    this.restorationPlanner = new RestorationPlanner();
    this.restorationProcessor = new RestorationProcessor();
    this.sanitizer = new Sanitizer();
  }

  async restore(options) {
    // Main restoration workflow
    const undoLog = await this.undoLogManager.readUndoLog();
    const plan = await this.restorationPlanner.createRestorationPlan(undoLog, options);
    
    if (options['dry-run']) {
      return await this.displayRestorationPreview(plan);
    }
    
    if (!options.yes) {
      const confirmed = await this.getUserConfirmation(plan);
      if (!confirmed) return;
    }
    
    return await this.restorationProcessor.executePlan(plan);
  }
}
```

### Restoration Planner (lib/restoration/restoration-planner.js)

**Responsibilities:**
- Create detailed restoration execution plans
- Handle selective restoration logic
- Validate restoration feasibility
- Calculate restoration dependencies

**Restoration Plan Schema:**
```javascript
{
  "undoLog": UndoLogData,
  "mode": "full" | "sanitized" | "selective",
  "actions": [
    {
      "type": "restore-file",
      "path": "package.json",
      "content": "original content...",
      "placeholderReplacements": [
        { "from": "{{PROJECT_NAME}}", "to": "my-actual-project" }
      ]
    },
    {
      "type": "preserve-file",
      "path": "template.json",
      "note": "Template metadata - preserved for template functionality"
    },
    {
      "type": "preserve-file", 
      "path": "_setup.mjs",
      "note": "Template setup script - preserved for template functionality"
    },
    {
      "type": "recreate-directory",
      "path": "node_modules/",
      "note": "Directory will be empty - run npm install"
    },
    {
      "type": "recreate-file",
      "path": ".env",
      "content": "DATABASE_URL=postgres://localhost...",
      "note": "Restore original environment file"
    }
  ],
  "missingValues": ["{{AUTHOR_EMAIL}}"],
  "warnings": [
    "Git history preserved (if .git deletion bug is fixed)",
    "Template files preserved - project remains usable as template"
  ]
}
```

### Sanitizer (lib/restoration/sanitizer.js)

**Responsibilities:**
- Identify and sanitize sensitive information
- Maintain functional restoration capability
- Support configurable sanitization rules
- Generate sanitization reports

**Sanitization Rules:**
```javascript
const SANITIZATION_RULES = {
  personalInfo: {
    patterns: [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // full names
      /\/Users\/[^\/]+/g, // user paths
      /C:\\Users\\[^\\]+/g // Windows user paths
    ],
    replacement: "{{SANITIZED_VALUE}}"
  },
  cloudflareIds: {
    patterns: [
      /[a-f0-9]{32}/g, // account IDs
      /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g // UUIDs
    ],
    replacement: "{{SANITIZED_ID}}"
  }
};
```

### Restoration Processor (lib/processors/restoration-processor.js)

**Responsibilities:**
- Execute restoration plans safely
- Handle file operations with proper error handling
- Maintain atomic operations where possible
- Provide detailed progress reporting

**Key Methods:**
```javascript
class RestorationProcessor {
  async executePlan(plan) {
    // Execute restoration plan with proper error handling
  }
  
  async restoreFile(action) {
    // Restore individual file with placeholder replacement
  }
  
  async deleteTemplateFile(action) {
    // Remove template-specific files
  }
  
  async recreateDirectory(action) {
    // Recreate deleted directories (empty)
  }
}
```

## File Operation Categories and Restoration Logic

### Critical Understanding: Template Maintenance Workflow

Template authors need to maintain templates in git repositories and iterate on them. The restoration feature must support this workflow without breaking template functionality.

### File Categories for Restoration

#### 1. Files Modified by make-template (RESTORE original content)
**Examples:** `package.json`, `README.md`, `wrangler.jsonc`
- **What happened**: Placeholders replaced original values
- **Undo log**: Stores complete original file content
- **Restoration**: Replace current content with original content
- **Result**: File returns to working project state

#### 2a. User-Created Files Deleted by make-template (RESTORE with content)
**Examples:** `.env`, `.dev.vars`, custom config files
- **What happened**: Cleanup removed user-created instance-specific files
- **Undo log**: Stores complete original file content
- **Restoration**: Recreate files with exact original content
- **Result**: User's custom configuration restored

#### 2b. Generated Files Deleted by make-template (RECREATE empty + guidance)
**Examples:** `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `node_modules/`, `dist/`, `build/`
- **What happened**: Cleanup removed ecosystem-generated files
- **Undo log**: Records existence but NOT content (too large, regenerable)
- **Restoration**: Recreate empty or skip, provide regeneration guidance
- **Result**: User runs `npm install`, `npm run build` to regenerate

#### 3. Files/Directories Incorrectly Deleted - CURRENT BUG (ONE-TIME FIX NEEDED)
**Examples:** `.git/` directory
- **Current Bug**: make-template incorrectly deletes `.git` directory in existing implementation
- **Problem**: Template authors lose git history and can't maintain templates
- **One-Time Fix Required**: Remove `.git` from cleanup rules in make-template codebase
- **Future State**: Once fixed, `.git/` will NEVER be deleted by make-template
- **Restoration Impact**: Cannot restore git history - this is why the deletion is fundamentally wrong
- **Implementation Note**: This category exists only to document the current bug, not as ongoing functionality

#### 4. Template Files Created by make-template (PRESERVE)
**Examples:** `template.json`, `_setup.mjs`, `.template-undo.json`
- **What happened**: make-template generated template functionality files
- **Template author role**: Authors customize `_setup.mjs` and `template.json` extensively
- **Restoration**: PRESERVE these files - they are part of template functionality
- **Result**: Project remains usable as both working project AND template

### Restoration Result State

After restoration, the project should be in a **hybrid state**:
- ✅ **Working project**: Can run, test, and debug the actual application
- ✅ **Template functionality**: Still usable with create-scaffold
- ✅ **Git history**: Preserved (once .git deletion bug is fixed)
- ✅ **Template customizations**: Author's _setup.mjs and template.json preserved

This enables the template author workflow:
1. Convert working project → template
2. Test template with create-scaffold
3. Find bugs in generated projects
4. **Restore to working state** (hybrid)
5. Fix bugs in working project
6. Re-run make-template to update template

**Implementation Priority Note**: The `.git` deletion bug should be fixed in the existing make-template codebase BEFORE or ALONGSIDE implementing the restoration feature. This ensures future template conversions don't create this problem.

## Data Models

### Extended Conversion Plan

The existing conversion plan is extended to include undo log generation:

```javascript
{
  analysis: ProjectAnalysisResult,
  actions: ConversionAction[],
  options: ConversionOptions,
  undoLog: UndoLogData  // NEW: Generated during planning
}
```

### Restoration Defaults Configuration

```javascript
// .restore-defaults.json
{
  "version": "1.0.0",
  "defaults": {
    "{{PROJECT_NAME}}": "${PWD##*/}",  // Current directory name
    "{{AUTHOR_NAME}}": "${USER}",      // System user
    "{{AUTHOR_EMAIL}}": "dev@example.com",
    "{{PROJECT_DESCRIPTION}}": "A template-restored project"
  },
  "environmentVariables": true,
  "promptForMissing": true
}
```

### Sanitization Report

```javascript
{
  "sanitized": true,
  "itemsRemoved": 5,
  "categoriesAffected": ["personalInfo", "cloudflareIds"],
  "functionalityPreserved": true,
  "missingForRestoration": ["{{AUTHOR_EMAIL}}"],
  "recommendations": [
    "Create .restore-defaults.json for automated restoration",
    "Review sanitized values before committing"
  ]
}
```

## Integration with Existing Architecture

### Extended ConversionEngine

The existing ConversionEngine is extended to generate undo logs:

```javascript
// In lib/engine.js - extended executePlan method
async executePlan(plan) {
  // Generate undo log before making changes
  const undoLog = await this.undoLogManager.createUndoLog(plan);
  
  // Apply sanitization if requested
  if (plan.options['sanitize-undo']) {
    undoLog = await this.undoLogManager.sanitizeUndoLog(undoLog, plan.options);
  }
  
  // Save undo log
  await FSUtils.writeFileAtomic('.template-undo.json', JSON.stringify(undoLog, null, 2));
  
  // Execute existing conversion logic
  // ... existing implementation
}
```

### Extended CLI Argument Handling

```javascript
// In bin/cli.js - extended main function
async function main() {
  // ... existing argument parsing
  
  // Handle restoration workflow
  if (options.restore) {
    const restorationEngine = new RestorationEngine();
    await restorationEngine.restore(options);
    return;
  }
  
  // Handle defaults generation
  if (options['generate-defaults']) {
    await generateDefaultsFile();
    return;
  }
  
  // ... existing conversion workflow
}
```

## Error Handling

### Restoration-Specific Errors

```javascript
const RESTORATION_ERROR_CODES = {
  UNDO_LOG_NOT_FOUND: 'UNDO_LOG_NOT_FOUND',
  UNDO_LOG_CORRUPTED: 'UNDO_LOG_CORRUPTED',
  UNDO_LOG_VERSION_MISMATCH: 'UNDO_LOG_VERSION_MISMATCH',
  RESTORATION_CONFLICT: 'RESTORATION_CONFLICT',
  MISSING_RESTORATION_VALUES: 'MISSING_RESTORATION_VALUES'
};
```

### Error Recovery Strategies

1. **Undo Log Issues**: Provide guidance for manual restoration
2. **Partial Restoration Failures**: Continue with remaining operations, report failures
3. **Missing Values**: Prompt user or use defaults file
4. **File Conflicts**: Offer backup and overwrite options

## Testing Strategy

### Functional Testing Approach

**End-to-End Restoration Workflows:**
- Full restoration cycle (convert → restore)
- Sanitized restoration with defaults
- Selective restoration scenarios
- Dry-run restoration preview
- Error recovery scenarios

**Test Fixtures:**
```
test/fixtures/
├── restoration-scenarios/
│   ├── cf-d1-with-undo/           # Template with undo log
│   ├── sanitized-undo-log/        # Sanitized undo log scenarios
│   ├── partial-undo-log/          # Missing data scenarios
│   └── corrupted-undo-log/        # Error handling scenarios
└── restoration-defaults/
    ├── complete-defaults.json     # Full defaults configuration
    ├── partial-defaults.json      # Partial defaults
    └── invalid-defaults.json      # Error scenarios
```

**Key Test Scenarios:**
1. **Round-trip Integrity**: Convert project → restore → verify identical to original
2. **Sanitization Effectiveness**: Verify sensitive data removal while preserving functionality
3. **Selective Restoration**: Test file-specific and placeholder-specific restoration
4. **Error Handling**: Test all error scenarios with appropriate recovery
5. **Cross-Platform**: Ensure restoration works across Windows, macOS, Linux

## Security Considerations

### Undo Log Security

**Sensitive Data Protection:**
- Automatic detection of emails, names, API keys
- Configurable sanitization rules
- Clear warnings about data exposure
- Guidance on .gitignore usage

**File System Security:**
- Validate all restoration paths to prevent directory traversal
- Atomic file operations where possible
- Proper cleanup on restoration failures
- Permission validation before restoration

### Restoration Safety

**Conflict Prevention:**
- Check for existing files before restoration
- Offer backup options for conflicts
- Validate restoration plan before execution
- Provide rollback guidance for failures

## Performance Considerations

### Undo Log Optimization

**Storage Efficiency:**
- Compress large file contents in undo logs
- Use file hashes to detect unchanged content
- Implement incremental undo logs for large projects
- Provide cleanup commands for old undo logs

**Restoration Performance:**
- Stream large file restorations
- Parallel restoration of independent files
- Progress reporting for long operations
- Cancellation support for user interruption

## User Experience Design

### Restoration Workflow UX

**Clear Progress Indication:**
```
🔄 Reading undo log (.template-undo.json)...
📋 Planning restoration (15 files, 8 placeholders)...
⚠️  WARNING: This will overwrite 3 existing files

📝 Restoring modified files:
   ✅ package.json restored (placeholders → original values)
   ✅ README.md restored (placeholders → original values)
   ✅ wrangler.jsonc restored (placeholders → original values)

� RRestoring user-created files:
   ✅ .env restored (original content)
   ✅ .dev.vars restored (original content)

�  Generated files marked for regeneration:
   ⏭️  package-lock.json (will be regenerated by npm install)
   ⏭️  node_modules/ (will be regenerated by npm install)
   ⏭️  dist/ (will be regenerated by npm run build)

🔧 Preserving template functionality:
   ✅ template.json preserved (template metadata)
   ✅ _setup.mjs preserved (custom setup logic)
   ✅ .template-undo.json preserved (restoration data)
   ✅ .git/ preserved (git history maintained)

⚠️  NEXT STEPS REQUIRED:
   📦 Run 'npm install' to restore dependencies
   🔑 Review .env file and update credentials if needed
   🧪 Test the working project functionality

✅ Restoration completed! Project is now in hybrid state:
   • Working project: Ready for testing and debugging
   • Template functionality: Still usable with create-scaffold
   • Git history: Preserved for template maintenance
```

**Helpful Error Messages:**
```
❌ Undo log not found (.template-undo.json)
💡 This directory may not be a converted template
💡 Try running make-template first to create a template

❌ Missing restoration values: {{AUTHOR_EMAIL}}
💡 Create .restore-defaults.json with default values
💡 Or use --sanitize-undo to use generic defaults
```

### Documentation Integration

**Extended Help Text:**
- Clear restoration workflow examples
- Sanitization best practices
- Template author workflow guidance
- Troubleshooting common scenarios

**Workflow Documentation:**
1. Template Creation Workflow
2. Testing and Debugging Cycle
3. Sanitization and Privacy Guidelines
4. Repository Management Best Practices

## Deployment Considerations

### Backward Compatibility

- Existing make-template installations continue working unchanged
- New restoration features are opt-in
- Undo logs are optional and don't affect create-scaffold
- Graceful handling of missing undo logs

### Version Management

- Undo log format versioning for future compatibility
- Migration support for undo log format changes
- Clear version compatibility documentation
- Deprecation strategy for old formats

### Package Distribution

- No additional dependencies required
- Restoration features included in main package
- Optional .restore-defaults.json template generation
- Clear feature documentation in README