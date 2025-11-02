# make-template
Convert existing Node.js projects into reusable templates compatible with @m5nv/create-scaffold

## Quick Start
```bash
# One-time usage (recommended)
npx make-template

# Or install globally
npm install -g make-template
make-template

# Preview changes first
npx make-template --dry-run
```

## Key Features
- ✅ **Zero dependencies** - Pure Node.js implementation for maximum security
- ✅ **Smart project detection** - Automatically identifies Cloudflare Workers, Vite, and Node.js projects
- ✅ **Safe placeholder replacement** - Converts project-specific values to template placeholders
- ✅ **Intelligent cleanup** - Removes build artifacts while preserving essential source code
- ✅ **Template restoration** - Reverse conversion to restore working project state for development
- ✅ **Create-scaffold ready** - Generates _setup.mjs and template.json for seamless integration

## Usage Examples

### Basic Conversion
```bash
# Convert current directory to template
npx make-template

# Expected output:
✅ Detected project type: vite-react
✅ Found 3 placeholders: PROJECT_NAME, PROJECT_DESCRIPTION, HTML_TITLE
✅ Generated _setup.mjs and template.json
✅ Template conversion complete!
```

### Preview Mode
```bash
# See what changes will be made
npx make-template --dry-run

# Shows planned changes without executing:
📋 Planned Changes:
  📝 package.json: "my-app" → "{{PROJECT_NAME}}"
  📝 index.html: "My App" → "{{HTML_TITLE}}"
  🗑️ Remove: node_modules, .git, dist/
  📄 Create: _setup.mjs, template.json
```

### Advanced Options
```bash
# Skip confirmation prompts
npx make-template --yes

# Force specific project type
npx make-template --type cf-d1

# Use custom placeholder format
npx make-template --placeholder-format "__NAME__"
```

## CLI Options

| Option | Description | Example |
|--------|-------------|---------|
| `--dry-run` | Preview changes without executing | `--dry-run` |
| `--yes` | Skip confirmation prompts | `--yes` |
| `--type <type>` | Force project type detection | `--type vite-react` |
| `--placeholder-format <format>` | Custom placeholder format | `--placeholder-format "%NAME%"` |
| `--help` | Show usage information | `--help` |

### Supported Project Types
- `cf-d1` - Cloudflare Workers with D1 database
- `cf-turso` - Cloudflare Workers with Turso database  
- `vite-react` - Vite-based React applications
- `generic` - Generic Node.js projects (fallback)

## Template Naming Conventions

make-template generates templates with both display names and handles for compatibility with create-scaffold.

### Display Name vs Handle

- **Display Name** (`name` in template.json): Human-readable title shown to users
  - Example: "Cloudflare Worker with D1 Database"
  - Can contain spaces, capitalization, and special characters
  - Used for presentation in create-scaffold's template listing

- **Handle** (`handle` in template.json): Machine-readable identifier for template selection
  - Example: "cloudflare-worker-with-d1-database"  
  - Must be kebab-case (lowercase, hyphens, no spaces or special characters)
  - Used with `create-scaffold --from-template <handle>`

### Directory Name Requirements

When creating templates, make-template validates that the project directory name follows kebab-case conventions:

```bash
# ✅ Valid directory names
my-awesome-project/
cloudflare-worker-with-d1/
vite-react-app/

# ❌ Invalid directory names  
MyAwesomeProject/    # Contains uppercase
my_awesome_project/  # Uses underscores
my awesome project/  # Contains spaces
my.awesome.project/  # Contains dots
```

### Automatic Handle Generation

Handles are automatically generated from display names using these rules:
1. Convert to lowercase
2. Replace spaces and special characters with hyphens
3. Remove consecutive hyphens
4. Trim leading/trailing hyphens

## Template Restoration

The restoration feature allows template authors to reverse template conversion, returning a templatized project back to a working state. This enables efficient template development and testing workflows.

### Restoration Options

| Option | Description | Example |
|--------|-------------|---------|
| `--restore` | Restore template to working project | `--restore` |
| `--restore-files <files>` | Restore only specific files | `--restore-files "package.json,README.md"` |
| `--restore-placeholders` | Restore only placeholder values | `--restore-placeholders` |
| `--sanitize-undo` | Remove sensitive data from undo log | `--sanitize-undo` |
| `--generate-defaults` | Create restoration defaults file | `--generate-defaults` |

### Template Author Workflow

```bash
# 1. Convert working project to template
npx make-template

# 2. Test template with create-scaffold
npx @m5nv/create-scaffold my-template test-project

# 3. Find issues, restore to working state
npx make-template --restore

# 4. Fix issues in working project
# Edit files, test functionality

# 5. Update template with fixes
npx make-template
```

## Schema Validation

Templates generated by make-template are validated against the canonical JSON schema from `@m5nv/create-scaffold`. This ensures compatibility and consistency across the ecosystem.

### Editor Support

For enhanced development experience, configure your IDE to use the schema for `template.json` validation and auto-completion:

- **VS Code**: Add to `.vscode/settings.json`:
  ```json
  {
    "json.schemas": [
      {
        "fileMatch": ["template.json"],
        "url": "./node_modules/@m5nv/create-scaffold/schema/template.json"
      }
    ]
  }
  ```

### Release Notes

**Upcoming Release**: make-template now validates generated `template.json` files against the `@m5nv/create-scaffold` schema to ensure compatibility. Requires `@m5nv/create-scaffold` >= [version to be published].

### Restoration Examples

```bash
# Preview restoration changes
npx make-template --restore --dry-run

# Full restoration (restore everything)
npx make-template --restore

# Selective file restoration
npx make-template --restore-files "package.json,wrangler.jsonc"

# Restore only placeholder values
npx make-template --restore-placeholders

# Generate defaults for automated restoration
npx make-template --generate-defaults
```

### Undo Log Management

The `.template-undo.json` file contains restoration data for template authors:

**For Template Development:**
```bash
# Keep undo log for development workflow
git add .template-undo.json
git commit -m "Add template with restoration data"
```

**For Public Templates:**
```bash
# Use sanitized undo log for privacy
npx make-template --sanitize-undo

# Or exclude from repository
echo ".template-undo.json" >> .gitignore
```

**Undo Log Best Practices:**
- ✅ Safe to commit for template maintenance
- ✅ create-scaffold ignores .template-undo.json automatically  
- ✅ Use `--sanitize-undo` to remove sensitive information
- ✅ Keep for template development, gitignore for public templates
- ✅ Use `.restore-defaults.json` for automated restoration

### Sanitization and Privacy

Protect sensitive information when sharing templates:

```bash
# Create template with sanitized undo log
npx make-template --sanitize-undo --dry-run

# Generate defaults file for restoration
npx make-template --generate-defaults

# Edit .restore-defaults.json with safe defaults
{
  "defaults": {
    "{{PROJECT_NAME}}": "${PWD##*/}",
    "{{AUTHOR_NAME}}": "${USER}",
    "{{AUTHOR_EMAIL}}": "dev@example.com"
  }
}

# Restore using defaults (no prompts)
npx make-template --restore
```

**Sanitization removes:**
- Email addresses and personal identifiers
- File paths containing usernames
- API keys and sensitive configuration values
- Author names and personal information

**Sanitization preserves:**
- File operation records
- Placeholder mapping structure
- Template functionality
- Restoration capability

### Troubleshooting Restoration

**Undo log not found:**
```bash
# Solution: Create template first
npx make-template
```

**Missing values during restoration:**
```bash
# Solution: Create defaults file
npx make-template --generate-defaults

# Edit .restore-defaults.json with your values
# Then restore
npx make-template --restore
```

**File conflicts during restoration:**
```bash
# Solution: Preview first, then selective restore
npx make-template --restore --dry-run
npx make-template --restore-files "package.json"
```

**Sanitized restoration prompts:**
```bash
# Solution: Use defaults or placeholder-only restore
npx make-template --restore-placeholders
```

## Installation

### NPX (Recommended)
```bash
# Run once without installation
npx make-template
```

### Global Installation
```bash
# Install globally for repeated use
npm install -g make-template
make-template
```

### Requirements
- Node.js 18+ (ESM support required)
- Project must have package.json file
- Git repository (optional, will be cleaned up)

## How It Works

1. **Analyzes** your project structure and detects project type
2. **Identifies** project-specific values in configuration files
3. **Replaces** values with placeholders ({{PROJECT_NAME}}, etc.)
4. **Cleans up** build artifacts, dependencies, and version control
5. **Generates** _setup.mjs and template.json for create-scaffold compatibility

## Generated Files

### _setup.mjs
```javascript
export default async function setup({ ctx, tools }) {
  await tools.placeholders.replaceAll({
    PROJECT_NAME: ctx.projectName,
    PROJECT_DESCRIPTION: ctx.projectDescription || ctx.projectName
  }, ['package.json', 'README.md']);
}
```

### template.json
```json
{
  "name": "My Template",
  "setup": { "supportedOptions": [] },
  "metadata": {
    "type": "vite-react",
    "placeholders": [
      { "name": "{{PROJECT_NAME}}", "required": true }
    ]
  }
}
```

## Safety Features

- **Dry run mode** - Preview all changes before execution
- **Confirmation prompts** - Explicit approval for destructive operations
- **Essential file preservation** - Never removes source code or configurations
- **Path validation** - Prevents operations outside project directory

## Development

```bash
# Clone and install
git clone https://github.com/m5nv/make-template.git
cd make-template
npm install

# Run comprehensive test suite
npm test

# Run specific test categories
npm run test:unit        # Unit tests
npm run test:integration # Integration tests  
npm run test:functional  # End-to-end CLI tests

# Development mode
npm run dev -- --dry-run

# Validate before publishing
npm run validate
```

## Publishing

```bash
# Test package before publishing
npm run publish:dry

# Publish beta version
npm run publish:beta

# Publish stable release
npm run publish:latest
```

## License

MIT