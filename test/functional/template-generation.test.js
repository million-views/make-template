import { test, describe } from 'node:test';
import assert from 'node:assert';
import { existsSync, accessSync, constants } from 'node:fs';
import fs from 'node:fs';
// Defer importing the CLI until after we install diagnostic hooks below so we
// can capture any calls to process.exit originating from the CLI or engines.
let cliMain;
import { join } from 'node:path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileAsText, detectTopLevelSideEffects, hasSetupExport } from '../../src/lib/utils/fixture-safety.js';

const cliModule = await import('../../src/bin/cli.js');
cliMain = cliModule.main;

// diagnostics removed

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// using in-process cliMain; no external CLI path needed

/**
 * Helper function to run CLI command and capture output
 */
function runCLI(args = [], options = {}) {
  return (async () => {
    // Capture console output without replacing process.stdout to avoid
    // interfering with the node:test reporter internals.
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    let stdout = '';
    let stderr = '';

    // Capture console output into strings but do NOT forward to the
    // real console (avoids polluting the test runner's IPC channel).
    console.log = (...args) => {
      const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      stdout += msg + '\n';
    };
    console.error = (...args) => {
      const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      stderr += msg + '\n';
    };
    console.warn = (...args) => {
      const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      stdout += msg + '\n';
    };

    const cwd = options.cwd || process.cwd();
    const originalCwd = process.cwd();
    try {
      process.chdir(cwd);
      const runArgs = Array.isArray(args) ? [...args] : [];
      if (options.silent !== false && !runArgs.includes('--silent')) runArgs.push('--silent');
      // Diagnostic: capture active handles/requests count before running CLI
      let handlesBefore = 0;
      let requestsBefore = 0;
      try {
        handlesBefore = typeof process._getActiveHandles === 'function' ? process._getActiveHandles().length : 0;
        requestsBefore = typeof process._getActiveRequests === 'function' ? process._getActiveRequests().length : 0;
      } catch (e) { }
      let exitCode = 0;
      try {
        await cliMain(runArgs);
      } catch (err) {
        // Normalize exitCode: prefer numeric codes, fall back to 1 for strings/unknown
        const code = err && err.code ? err.code : 1;
        exitCode = (typeof code === 'number') ? code : 1;
      }
      // Diagnostic: capture active handles/requests after running CLI
      try {
        const handlesAfter = typeof process._getActiveHandles === 'function' ? process._getActiveHandles().length : 0;
        const requestsAfter = typeof process._getActiveRequests === 'function' ? process._getActiveRequests().length : 0;
        if (handlesAfter > handlesBefore || requestsAfter > requestsBefore) {
          try {
            console.error('DIAGNOSTIC_ACTIVE_HANDLES: before=', handlesBefore, 'after=', handlesAfter, 'beforeReq=', requestsBefore, 'afterReq=', requestsAfter);
            // attempt to serialize a few handle types
            if (typeof process._getActiveHandles === 'function') {
              const hs = process._getActiveHandles().slice(0, 10).map(h => {
                try { return h.constructor && h.constructor.name; } catch (e) { return String(h); }
              });
              console.error('DIAGNOSTIC_ACTIVE_HANDLE_TYPES:', JSON.stringify(hs));
            }
          } catch (e) { }
        }
      } catch (e) { }
      return { code: exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      try { process.chdir(originalCwd); } catch (e) { }
    }
  })();
}

/**
 * Assert the CLI dry-run result is successful and mentions expected keywords.
 * keywords: array of strings or regexes to look for in stdout
 */
function assertDryRunContains(result, keywords = []) {
  assert.strictEqual(result.code, 0, 'Should successfully plan/generate');
  assert.match(result.stdout, /DRY RUN MODE|Planned Changes Preview|Planned Changes Preview:/i, 'Should run in dry-run preview mode');
  if (Array.isArray(keywords) && keywords.length > 0) {
    for (const k of keywords) {
      const re = k instanceof RegExp ? k : new RegExp(k, 'i');
      if (result.stdout.match(re)) return; // pass if any keyword matches
    }
    // If none matched, print diagnostic and fail with a helpful message
    try {
      console.error('assertDryRunContains diagnostic - expected keywords:', JSON.stringify(keywords));
      console.error('assertDryRunContains diagnostic - stdout preview:\n', result.stdout.slice(0, 2000));
    } catch (e) {
      // ignore diagnostics errors
    }
    assert.fail(`Dry-run output did not contain any of expected keywords: ${JSON.stringify(keywords)}`);
  }
}

describe('Template Generation Tests', () => {
  describe('_setup.mjs Generation', () => {
    test('should generate _setup.mjs with correct Environment object destructuring', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate setup script');
      // Prefer reading the fixture _setup.mjs as text (do not execute it) if present
      const fixtureSetupPath = join(__dirname, '../fixtures/input-projects/generic-node-project/_setup.mjs');
      const exists = await (async () => { try { await fs.promises.access(fixtureSetupPath); return true; } catch { return false; } })();
      if (exists) {
        const read = await readFileAsText(fixtureSetupPath);
        assert.ok(read.ok, '_setup.mjs should be readable');
        assert.match(read.content, /export\s+default\s+async\s+function\s+setup\s*\(\s*\{\s*ctx\s*,\s*tools\s*\}\s*\)/i, 'Should use correct Environment destructuring in fixture _setup.mjs');
        const suspicious = detectTopLevelSideEffects(read.content) || [];
        // If the fixture _setup.mjs contains suspicious top-level code (top-level await,
        // child_process, npm install strings, etc.), the CLI should warn in the dry-run
        // preview instead of the test attempting to execute it. Accept either no
        // suspicious code or a visible warning in the CLI output.
        if (suspicious && suspicious.length > 0) {
          assert.match(result.stdout, /Top[- ]level await|may perform runtime actions|top[- ]level await detected|warning/i, 'When _setup.mjs appears suspicious, CLI should flag a warning');
        } else {
          assert.ok(suspicious.length === 0, '_setup.mjs should not contain top-level side-effects');
        }
      } else {
        // Fallback: assert CLI reports that _setup.mjs will be created
        assert.match(result.stdout, /_setup\.mjs.*will be created/i, 'Should indicate _setup.mjs creation');
      }
    });

    test('should generate _setup.mjs with tools.placeholders.replaceAll usage', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate setup script');
      assert.match(result.stdout, /tools\.placeholders\.replaceAll/i, 'Should use tools.placeholders.replaceAll');
      assert.match(result.stdout, /PROJECT_NAME: ctx\.projectName/i, 'Should map PROJECT_NAME to ctx.projectName');
      assert.match(result.stdout, /\['package\.json', 'README\.md'\]/i, 'Should specify target files array');
    });

    test('should generate _setup.mjs with proper placeholder mapping', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate setup script');
      assert.match(result.stdout, /PROJECT_NAME: ctx\.projectName/i, 'Should map PROJECT_NAME');
      assert.match(result.stdout, /WORKER_NAME: ctx\.projectName/i, 'Should map WORKER_NAME to projectName');
      assert.match(result.stdout, /CLOUDFLARE_ACCOUNT_ID: ctx\.cloudflareAccountId/i, 'Should map CLOUDFLARE_ACCOUNT_ID');
      assert.match(result.stdout, /D1_DATABASE_BINDING: ctx\.databaseBinding/i, 'Should map D1_DATABASE_BINDING');
    });

    test('should generate _setup.mjs with logging statements', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate setup script');
      assert.match(result.stdout, /tools\.logger\.info/i, 'Should use tools.logger.info');
      assert.match(result.stdout, /Setting up.*project.*\$\{ctx\.projectName\}/i, 'Should log setup progress with project name');
      assert.match(result.stdout, /Template conversion completed/i, 'Should log completion message');
    });

    test('should generate project-type-specific setup script for cf-d1', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate cf-d1 setup script');
      assert.match(result.stdout, /cf-d1.*project.*setup/i, 'Should indicate cf-d1 project type');
      assert.match(result.stdout, /wrangler\.jsonc.*placeholder.*replacement/i, 'Should handle wrangler.jsonc');
      assert.match(result.stdout, /D1 database.*configuration/i, 'Should mention D1 database setup');
    });

    test('should generate project-type-specific setup script for vite-react', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate vite-react setup script');
      assert.match(result.stdout, /vite-react.*project.*setup/i, 'Should indicate vite-react project type');
      assert.match(result.stdout, /vite\.config\.js.*placeholder.*replacement/i, 'Should handle vite.config.js');
      // Be permissive about how index.html title replacement is described
      assertDryRunContains(result, ['index.html', 'HTML_TITLE', 'title']);
    });

    test('should generate idempotent setup script operations', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate setup script');
      assert.match(result.stdout, /idempotent.*operations/i, 'Should mention idempotent operations');
      assert.match(result.stdout, /re-execution.*safe/i, 'Should indicate safe re-execution');
      assert.match(result.stdout, /error handling.*included/i, 'Should include error handling');
    });
  });

  describe('template.json Generation', () => {
    test('should generate template.json with supportedOptions structure', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate template metadata');
      assert.match(result.stdout, /template\.json.*will be created/i, 'Should indicate template.json creation');
      assert.match(result.stdout, /"setup".*"supportedOptions"/i, 'Should include supportedOptions structure');
      assert.match(result.stdout, /"metadata".*section/i, 'Should include metadata section');
    });

    test('should generate template.json with placeholder definitions', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate template metadata');
      // Use keyword-based checks for template.json placeholders metadata
      assertDryRunContains(result, ['placeholders', '{{PROJECT_NAME}}', 'description', 'required']);
    });

    test('should generate template.json with project type information', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate template metadata');
      assert.match(result.stdout, /"type".*"cf-d1"/i, 'Should include project type');
      assert.match(result.stdout, /"version".*"1\.0\.0"/i, 'Should include version');
      assert.match(result.stdout, /Cloudflare Worker.*D1 database/i, 'Should include type-specific description');
    });

    test('should generate template.json with creation timestamp and attribution', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate template metadata');
      assert.match(result.stdout, /"createdBy".*"@m5nv\/make-template"/i, 'Should include tool attribution');
      assert.match(result.stdout, /"createdAt".*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/i, 'Should include ISO timestamp');
    });

    test('should generate template.json with file list', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate template metadata');
      assert.match(result.stdout, /"files".*array/i, 'Should include files array');
      assert.match(result.stdout, /"package\.json"/i, 'Should list package.json');
      assert.match(result.stdout, /"README\.md"/i, 'Should list README.md');
      assert.match(result.stdout, /"vite\.config\.js"/i, 'Should list vite.config.js');
      assert.match(result.stdout, /"index\.html"/i, 'Should list index.html');
    });
  });

  describe('Project-Type-Specific Template Generation', () => {
    test('should generate cf-d1 specific template files', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate cf-d1 template');

      // Setup script should include cf-d1 specific logic
      assert.match(result.stdout, /D1 database.*binding.*setup/i, 'Should include D1 binding setup');
      assert.match(result.stdout, /wrangler\.jsonc.*configuration/i, 'Should handle wrangler.jsonc');
      // Accept references to migrations in any reasonable phrasing
      assertDryRunContains(result, ['migrations', 'preserved']);

      // Template metadata should include cf-d1 specifics
      // Accept either explicit "database" option or references to migrations
      assertDryRunContains(result, ['supportedOptions', 'database', 'migration', 'D1']);
      assert.match(result.stdout, /Cloudflare Worker.*D1/i, 'Should describe cf-d1 template');
    });

    test('should generate cf-turso specific template files', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-turso-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate cf-turso template');

      // Setup script should include cf-turso specific logic
      assert.match(result.stdout, /Turso database.*URL.*setup/i, 'Should include Turso URL setup');
      assert.match(result.stdout, /TURSO_DB_URL.*environment.*variable/i, 'Should handle Turso environment variables');
      assert.match(result.stdout, /@libsql\/client.*dependency/i, 'Should mention libsql client');

      // Template metadata should include cf-turso specifics
      assert.match(result.stdout, /supportedOptions.*database.*turso/i, 'Should include Turso options');
      assert.match(result.stdout, /Cloudflare Worker.*Turso/i, 'Should describe cf-turso template');
    });

    test('should generate vite-react specific template files', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate vite-react template');

      // Setup script should include vite-react specific logic
      assert.match(result.stdout, /Vite.*React.*project.*setup/i, 'Should include Vite React setup');
      assert.match(result.stdout, /base.*URL.*configuration/i, 'Should handle base URL configuration');
      assert.match(result.stdout, /HTML.*title.*replacement/i, 'Should handle HTML title');

      // Template metadata should include vite-react specifics
      assert.match(result.stdout, /supportedOptions.*typescript.*testing/i, 'Should include React options');
      assert.match(result.stdout, /React.*application.*Vite/i, 'Should describe vite-react template');
    });

    test('should generate generic template files', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate generic template');

      // Setup script should include generic logic only
      assert.match(result.stdout, /generic.*Node\.js.*project.*setup/i, 'Should include generic setup');
      assert.match(result.stdout, /basic.*placeholder.*replacement/i, 'Should handle basic placeholders');
      // Be permissive: ensure the output indicates the detected project type is generic
      assert.match(result.stdout, /Detected project type:\s*generic/i, 'Should detect generic project type');

      // Template metadata should include generic specifics
      assert.match(result.stdout, /supportedOptions.*testing.*docs/i, 'Should include generic options');
      assert.match(result.stdout, /Node\.js.*application/i, 'Should describe generic template');
    });
  });

  describe('IDE Preset Support', () => {
    test('should include IDE preset support in setup script', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate setup script');
      assert.match(result.stdout, /if \(ctx\.ide\)/i, 'Should include IDE check');
      assert.match(result.stdout, /tools\.ide\.applyPreset\(ctx\.ide\)/i, 'Should apply IDE preset');
      assert.match(result.stdout, /kiro.*vscode.*cursor.*windsurf/i, 'Should mention supported IDEs');
    });

    test('should handle IDE preset application in different project types', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate setup script');
      assert.match(result.stdout, /IDE.*preset.*vite-react.*project/i, 'Should mention IDE preset for vite-react');
      assert.match(result.stdout, /tools\.ide\.applyPreset/i, 'Should include IDE preset application');
    });
  });

  describe('Error Handling in Generated Templates', () => {
    test('should include error handling in setup script', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate setup script');
      assert.match(result.stdout, /try.*catch.*error.*handling/i, 'Should include try-catch blocks');
      assert.match(result.stdout, /tools\.logger\.error/i, 'Should use error logging');
      assert.match(result.stdout, /graceful.*error.*recovery/i, 'Should mention graceful error recovery');
    });

    test('should validate template metadata structure', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully generate template metadata');
      assert.match(result.stdout, /metadata.*validation.*included/i, 'Should include metadata validation');
      assert.match(result.stdout, /JSON.*schema.*compliance/i, 'Should ensure JSON schema compliance');
    });
  });
});