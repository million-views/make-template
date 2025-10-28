# @m5nv/make-template
Convert existing Node.js projects into reusable templates compatible with @m5nv/create-scaffold

## Quick Start
```bash
# One-time usage (recommended)
npx @m5nv/make-template

# Or install globally
npm install -g @m5nv/make-template
make-template

# Preview changes first
npx @m5nv/make-template --dry-run
```

## Key Features
- ✅ **Zero dependencies** - Pure Node.js implementation for maximum security
- ✅ **Smart project detection** - Automatically identifies Cloudflare Workers, Vite, and Node.js projects
- ✅ **Safe placeholder replacement** - Converts project-specific values to template placeholders
- ✅ **Intelligent cleanup** - Removes build artifacts while preserving essential source code
- ✅ **Create-scaffold ready** - Generates _setup.mjs and template.json for seamless integration

## Usage Examples

### Basic Conversion
```bash
# Convert current directory to template
npx @m5nv/make-template

# Expected output:
✅ Detected project type: vite-react
✅ Found 3 placeholders: PROJECT_NAME, PROJECT_DESCRIPTION, HTML_TITLE
✅ Generated _setup.mjs and template.json
✅ Template conversion complete!
```

### Preview Mode
```bash
# See what changes will be made
npx @m5nv/make-template --dry-run

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
npx @m5nv/make-template --yes

# Force specific project type
npx @m5nv/make-template --type cf-d1

# Use custom placeholder format
npx @m5nv/make-template --placeholder-format "__NAME__"
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

## Installation

### NPX (Recommended)
```bash
# Run once without installation
npx @m5nv/make-template
```

### Global Installation
```bash
# Install globally for repeated use
npm install -g @m5nv/make-template
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