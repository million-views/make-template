import { test, describe } from 'node:test';
import assert from 'node:assert';
import { existsSync, accessSync, constants } from 'node:fs';
import { main as cliMain } from '../../src/bin/cli.js';
import { join } from 'node:path';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// using in-process cliMain; no external CLI path needed

/**
 * Helper function to run CLI command and capture output
 */
function runCLI(args = [], options = {}) {
  // Use a separate node process to invoke the CLI so we don't intercept
  // node:test runner output by reassigning process.stdout in-process.
  const cwd = options.cwd || process.cwd();
  const runArgs = Array.isArray(args) ? [...args] : [];
  if (options.silent !== false && !runArgs.includes('--silent')) runArgs.push('--silent');

  const cliPath = path.resolve(__dirname, '../../src/bin/cli.js');

  const result = spawnSync(process.execPath, [cliPath, ...runArgs], {
    cwd,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return {
    code: typeof result.status === 'number' ? result.status : 1,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim()
  };
}

describe('Placeholder Identification and Replacement Tests', () => {
  describe('Common Placeholder Detection from package.json', () => {
    test('should identify PROJECT_NAME from package.json', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze project');
      assert.match(result.stdout, /PROJECT_NAME.*my-node-app/i, 'Should identify PROJECT_NAME placeholder');
      assert.match(result.stdout, /package\.json.*name.*field/i, 'Should indicate source is package.json name field');
    });

    test('should identify PROJECT_DESCRIPTION from package.json', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze project');
      assert.match(result.stdout, /PROJECT_DESCRIPTION.*generic Node\.js application/i, 'Should identify PROJECT_DESCRIPTION placeholder');
      assert.match(result.stdout, /package\.json.*description.*field/i, 'Should indicate source is package.json description field');
    });

    test('should identify AUTHOR from package.json', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze project');
      assert.match(result.stdout, /AUTHOR.*Test Author/i, 'Should identify AUTHOR placeholder');
      assert.match(result.stdout, /package\.json.*author.*field/i, 'Should indicate source is package.json author field');
    });

    test('should identify REPOSITORY_URL from package.json', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze project');
      assert.match(result.stdout, /REPOSITORY_URL.*github\.com\/testuser\/my-node-app/i, 'Should identify REPOSITORY_URL placeholder');
      assert.match(result.stdout, /package\.json.*repository\.url/i, 'Should indicate source is package.json repository.url');
    });
  });

  describe('Cloudflare-specific Placeholder Detection', () => {
    test('should identify WORKER_NAME from wrangler.jsonc', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze cf-d1 project');
      assert.match(result.stdout, /WORKER_NAME.*my-d1-worker/i, 'Should identify WORKER_NAME placeholder');
      assert.match(result.stdout, /wrangler\.jsonc.*name.*field/i, 'Should indicate source is wrangler.jsonc name field');
    });

    test('should identify CLOUDFLARE_ACCOUNT_ID from wrangler.jsonc', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze cf-d1 project');
      assert.match(result.stdout, /CLOUDFLARE_ACCOUNT_ID.*abc123def456ghi789jkl012mno345pq/i, 'Should identify CLOUDFLARE_ACCOUNT_ID placeholder');
      assert.match(result.stdout, /wrangler\.jsonc.*account_id.*field/i, 'Should indicate source is wrangler.jsonc account_id field');
    });

    test('should identify D1_DATABASE_BINDING from wrangler.jsonc', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze cf-d1 project');
      assert.match(result.stdout, /D1_DATABASE_BINDING.*DB/i, 'Should identify D1_DATABASE_BINDING placeholder');
      assert.match(result.stdout, /d1_databases.*binding/i, 'Should indicate source is d1_databases binding');
    });

    test('should identify D1_DATABASE_ID from wrangler.jsonc', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze cf-d1 project');
      assert.match(result.stdout, /D1_DATABASE_ID.*d1db-12345678-90ab-cdef-1234-567890abcdef/i, 'Should identify D1_DATABASE_ID placeholder');
      assert.match(result.stdout, /d1_databases.*database_id/i, 'Should indicate source is d1_databases database_id');
    });

    test('should identify TURSO_DB_URL from wrangler.jsonc', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-turso-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze cf-turso project');
      assert.match(result.stdout, /TURSO_DB_URL.*libsql:\/\/my-database-user\.turso\.io/i, 'Should identify TURSO_DB_URL placeholder');
      assert.match(result.stdout, /wrangler\.jsonc.*vars.*TURSO_DB_URL/i, 'Should indicate source is wrangler.jsonc vars');
    });
  });

  describe('Vite-specific Placeholder Detection', () => {
    test('should identify BASE_URL from vite.config.js', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze vite-react project');
      assert.match(result.stdout, /BASE_URL.*\/my-react-app\//i, 'Should identify BASE_URL placeholder');
      assert.match(result.stdout, /vite\.config\.js.*base.*field/i, 'Should indicate source is vite.config.js base field');
    });

    test('should identify HTML_TITLE from index.html', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze vite-react project');
      assert.match(result.stdout, /HTML_TITLE.*My React App/i, 'Should identify HTML_TITLE placeholder');
      assert.match(result.stdout, /index\.html.*title.*element/i, 'Should indicate source is index.html title element');
    });
  });

  describe('Placeholder Replacement in Different File Formats', () => {
    test('should show JSON placeholder replacements', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully plan replacements');
      assert.match(result.stdout, /package\.json.*replacements/i, 'Should show package.json replacements');
      assert.match(result.stdout, /"my-node-app".*"{{PROJECT_NAME}}"/i, 'Should show JSON string replacement');
      assert.match(result.stdout, /"Test Author".*"{{AUTHOR}}"/i, 'Should show JSON author replacement');
    });

    test('should show JSONC placeholder replacements', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully plan replacements');
      assert.match(result.stdout, /wrangler\.jsonc.*replacements/i, 'Should show wrangler.jsonc replacements');
      assert.match(result.stdout, /"my-d1-worker".*"{{WORKER_NAME}}"/i, 'Should show JSONC string replacement');
      assert.match(result.stdout, /account_id.*{{CLOUDFLARE_ACCOUNT_ID}}/i, 'Should show JSONC account_id replacement');
    });

    test('should show JavaScript placeholder replacements', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully plan replacements');
      assert.match(result.stdout, /vite\.config\.js.*replacements/i, 'Should show vite.config.js replacements');
      assert.match(result.stdout, /base:.*'\/my-react-app\/'.*'{{BASE_URL}}'/i, 'Should show JS string replacement');
    });

    test('should show HTML placeholder replacements', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully plan replacements');
      assert.match(result.stdout, /index\.html.*replacements/i, 'Should show index.html replacements');
      assert.match(result.stdout, /<title>My React App<\/title>.*<title>{{HTML_TITLE}}<\/title>/i, 'Should show HTML title replacement');
    });

    test('should show Markdown placeholder replacements', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully plan replacements');
      assert.match(result.stdout, /README\.md.*replacements/i, 'Should show README.md replacements');
      assert.match(result.stdout, /# My Node App.*# {{PROJECT_NAME}}/i, 'Should show Markdown heading replacement');
      assert.match(result.stdout, /Created by Test Author.*Created by {{AUTHOR}}/i, 'Should show Markdown text replacement');
    });
  });

  describe('Custom Placeholder Format Support', () => {
    test('should support double-brace format {{NAME}}', async () => {
      const result = await runCLI(['--placeholder-format', '{{NAME}}', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully use double-brace format');
      assert.match(result.stdout, /Placeholder format.*\{\{NAME\}\}/i, 'Should show double-brace format');
      assert.match(result.stdout, /"my-node-app".*"{{PROJECT_NAME}}"/i, 'Should use double-brace in replacements');
    });

    test('should support double-underscore format __NAME__', async () => {
      const result = await runCLI(['--placeholder-format', '__NAME__', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully use double-underscore format');
      assert.match(result.stdout, /Placeholder format.*__NAME__/i, 'Should show double-underscore format');
      assert.match(result.stdout, /"my-node-app".*"__PROJECT_NAME__"/i, 'Should use double-underscore in replacements');
    });

    test('should support percent format %NAME%', async () => {
      const result = await runCLI(['--placeholder-format', '%NAME%', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully use percent format');
      assert.match(result.stdout, /Placeholder format.*%NAME%/i, 'Should show percent format');
      assert.match(result.stdout, /"my-node-app".*"%PROJECT_NAME%"/i, 'Should use percent in replacements');
    });

    test('should validate placeholder format contains name substitution', async () => {
      const result = await runCLI(['--placeholder-format', 'invalid-format', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 1, 'Should exit with error for invalid format');
      assert.match(result.stderr, /Invalid placeholder format.*NAME.*substitution/i, 'Should show format validation error');
    });
  });

  describe('Placeholder Identification Across Project Types', () => {
    test('should identify all common placeholders for cf-d1 project', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze cf-d1 project');

      // Common placeholders
      assert.match(result.stdout, /PROJECT_NAME.*my-d1-worker/i, 'Should identify PROJECT_NAME');
      assert.match(result.stdout, /PROJECT_DESCRIPTION.*Cloudflare Worker with D1/i, 'Should identify PROJECT_DESCRIPTION');
      assert.match(result.stdout, /AUTHOR.*Test Author/i, 'Should identify AUTHOR');

      // Cloudflare-specific placeholders
      assert.match(result.stdout, /WORKER_NAME.*my-d1-worker/i, 'Should identify WORKER_NAME');
      assert.match(result.stdout, /CLOUDFLARE_ACCOUNT_ID/i, 'Should identify CLOUDFLARE_ACCOUNT_ID');
      assert.match(result.stdout, /D1_DATABASE_BINDING.*DB/i, 'Should identify D1_DATABASE_BINDING');
      assert.match(result.stdout, /D1_DATABASE_ID/i, 'Should identify D1_DATABASE_ID');
    });

    test('should identify all common placeholders for vite-react project', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze vite-react project');

      // Common placeholders
      assert.match(result.stdout, /PROJECT_NAME.*my-react-app/i, 'Should identify PROJECT_NAME');
      assert.match(result.stdout, /PROJECT_DESCRIPTION.*modern React application/i, 'Should identify PROJECT_DESCRIPTION');
      assert.match(result.stdout, /AUTHOR.*Test Author/i, 'Should identify AUTHOR');

      // Vite-specific placeholders
      assert.match(result.stdout, /BASE_URL.*\/my-react-app\//i, 'Should identify BASE_URL');
      assert.match(result.stdout, /HTML_TITLE.*My React App/i, 'Should identify HTML_TITLE');
    });

    test('should identify only common placeholders for generic project', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze generic project');

      // Common placeholders only
      assert.match(result.stdout, /PROJECT_NAME.*my-node-app/i, 'Should identify PROJECT_NAME');
      assert.match(result.stdout, /PROJECT_DESCRIPTION.*generic Node\.js application/i, 'Should identify PROJECT_DESCRIPTION');
      assert.match(result.stdout, /AUTHOR.*Test Author/i, 'Should identify AUTHOR');
      assert.match(result.stdout, /REPOSITORY_URL.*github\.com/i, 'Should identify REPOSITORY_URL');

      // Should not have framework-specific placeholders
      assert.doesNotMatch(result.stdout, /WORKER_NAME|CLOUDFLARE_ACCOUNT_ID|BASE_URL|HTML_TITLE/i, 'Should not have framework-specific placeholders');
    });

    test('should identify JSX content placeholders in vite-react projects', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze vite-react project');
      assert.match(result.stdout, /TAGLINE.*My React App/i, 'Should identify JSX text content');
      assert.match(result.stdout, /TEXT_CONTENT_3.*and save to test HMR/i, 'Should identify longer text content');
      assert.match(result.stdout, /TEXT_CONTENT_4.*Click on the Vite and React logos/i, 'Should identify additional text content');
      assert.match(result.stdout, /src\/App\.jsx/i, 'Should indicate JSX file source');
    });
  });
});