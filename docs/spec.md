## Specification: @m5nv/make-template Tool (v0.1)

### 1. Overview 📜

@m5nv/make-template converts existing Node.js project directories into reusable templates compatible with @m5nv/create-scaffold. This version identifies project types, replaces specific configuration values with placeholders, performs targeted cleanup, and generates _setup.mjs and template.json tailored to the template. It operates in-place on the current directory.

  * **Public Package:** @m5nv/make-template (on npm)
  * **Source Code Repo (Private):** `https://github.com/million-views/make-template` (Adjust as needed)

-----

### 2. Core Features ✨

  * **ESM Only:** Built with ES Modules for Node.js (latest stable).
  * **In-Place Conversion:** Modifies the current working directory.
  * **Project Type Awareness (Heuristic):** Attempts to detect project type (Vite+React, RRv7+CF+D1, RRv7+CF+Turso) based on file presence (e.g., wrangler.jsonc, vite.config.js).
  * **Configurable Placeholders:** Identifies and replaces common project-specific values in key configuration files (package.json, README.md, wrangler.jsonc, vite.config.js, potentially index.html) with placeholders (default format: {{PLACEHOLDER_NAME}}).
  * **Targeted Cleanup:** Removes instance-specific files/directories (node_modules/, lock files, build outputs, .git/, .dev.vars, .wrangler/). Keeps essential template files (e.g., migrations/).
  * **Generates _setup.mjs:** Creates a setup script including tools.placeholders.replaceAll calls for all identified placeholders and potentially template-specific instructions.
  * **Generates template.json:** Creates a metadata file listing identified placeholders, optionally with descriptions and the detected template type.
  * **Dry Run Mode:** Allows users to preview all planned changes without modifying the filesystem.
  * **Confirmation Prompt:** Requires user confirmation before making changes (unless forced).

-----

### 3. Usage (CLI) 💻

Run inside the project directory to convert.

bash
npx @m5nv/make-template@latest [options]



**Options:**

  * --placeholder-format <string>: (Optional) Specify the placeholder format (e.g., __PLACEHOLDER__). Defaults to {{PLACEHOLDER_NAME}}.
  * --dry-run: (Optional) Show planned changes without executing them.
  * -y, --yes: (Optional) Skip the confirmation prompt.
  * --type <type>: (Optional) Force a specific project type detection (e.g., cf-d1, cf-turso, vite-react). Overrides heuristics.

-----

### 4. Technology Stack 🛠️

  * **Runtime:** Node.js (latest stable LTS)
  * **Language:** JavaScript (ES Modules / ESM)
  * **Core Modules:** fs/promises, path, readline/promises
  * **Argument Parsing:** minimist (Recommended for handling options).

-----

### 5. Dependencies 🔗

  * **System:** None (beyond Node.js).
  * **npm (Runtime):** minimist (if used).

-----

### 6. Workflow ⚙️

1.  **Parse Arguments:** Read options (--placeholder-format, --dry-run, -y, --type).
2.  **Detect Project Type:** Use --type if provided. Otherwise, check for key files (wrangler.jsonc, vite.config.js, known dependencies in package.json) to infer the type. Default to a generic Node.js type if unsure.
3.  **Identify Placeholders & Target Files:**
      * **Always:** Read package.json for name, description, author, repository.url. Target package.json, README.md. Placeholder: {{PROJECT_NAME}}, {{PROJECT_DESCRIPTION}}, etc.
      * **If Vite:** Check vite.config.js for base. Target vite.config.js, index.html (title). Placeholders: {{BASE_URL}}, {{HTML_TITLE}}.
      * **If Cloudflare Worker:** Read wrangler.jsonc. Target wrangler.jsonc. Identify name, account_id, secrets/vars (TURSO_DB_URL, TURSO_AUTH_TOKEN), D1 bindings (d1_databases[].binding, d1_databases[].database_id, d1_databases[].database_name). Placeholders: {{WORKER_NAME}}, {{CLOUDFLARE_ACCOUNT_ID}}, {{TURSO_DB_URL}}, {{TURSO_AUTH_TOKEN}}, {{D1_BINDING_NAME}}, {{D1_DATABASE_ID}}, {{D1_DATABASE_NAME}}.
4.  **Plan Changes:** Create a list of actions:
      * Files to modify + placeholder replacements needed.
      * Files/Directories to delete.
      * Files to create (_setup.mjs, template.json).
5.  **Dry Run / Confirm:**
      * If --dry-run, print the planned actions (show diffs for modifications) and exit.
      * If not --dry-run and not -y, display planned actions and prompt for confirmation. Exit if denied.
6.  **Execute Changes:**
      * Perform placeholder replacements in target files.
      * Delete specified files/directories.
      * Generate template.json listing all unique placeholders identified (e.g., {"placeholders": ["{{PROJECT_NAME}}", "{{CLOUDFLARE_ACCOUNT_ID}}", ...], "type": "cf-d1"}).
      * Generate _setup.mjs with tools.placeholders.replaceAll calls mapping placeholders from template.json to ctx values (like ctx.projectName, ctx.env.CLOUDFLARE_ACCOUNT_ID, etc. - Note: create-scaffold needs to provide these\!) and listing the modified files.
7.  **Success Message:** Print confirmation.

-----

### 7. Generated Files Example (_setup.mjs for CF+D1)

javascript
// _setup.mjs generated by @m5nv/make-template (type: cf-d1)
export default async function setup(ctx, tools) {
  tools.logger.info(`Setting up Cloudflare D1 project: ${ctx.projectName}`);

  // Assumes create-scaffold provides these via ctx.env or ctx.config
  const placeholderMap = {
    '{{PROJECT_NAME}}': ctx.projectName,
    '{{PROJECT_DESCRIPTION}}': ctx.projectDescription || '', // Example optional value
    '{{WORKER_NAME}}': ctx.config?.workerName || ctx.projectName,
    '{{CLOUDFLARE_ACCOUNT_ID}}': ctx.env?.CLOUDFLARE_ACCOUNT_ID,
    '{{D1_BINDING_NAME}}': ctx.config?.d1BindingName || 'DB',
    '{{D1_DATABASE_ID}}': ctx.env?.D1_DATABASE_ID,
    '{{D1_DATABASE_NAME}}': ctx.config?.d1DatabaseName || `${ctx.projectName}-db`,
    // Add others as identified...
  };

  const filesToProcess = [
    'package.json',
    'README.md',
    'wrangler.jsonc',
    // Add others as identified...
  ];

  await tools.placeholders.replaceAll(placeholderMap, filesToProcess, {
    onMissing: 'skip' // Decide how to handle missing ctx values
  });

  tools.logger.info('Placeholder replacement complete.');
  tools.logger.info('Remember to set up necessary secrets/environment variables for deployment.');
  // Optional: Add command to run initial D1 migration if needed?
}



-----

### 8. Error Handling & Safety ⚠️

  * Fail gracefully if key files (package.json, wrangler.jsonc for CF types) are missing.
  * Use try...catch for all filesystem operations.
  * Confirmation prompt is essential before destructive actions.

-----

This enhanced spec provides a more robust foundation for handling different project structures and configurations.