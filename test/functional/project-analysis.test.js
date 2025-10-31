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

describe('Project Analysis and Detection Tests', () => {
  describe('Cloudflare Worker Project Detection', () => {
    test('should detect cf-d1 project type', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze cf-d1 project');
      assert.match(result.stdout, /Project type.*cf-d1/i, 'Should detect cf-d1 project type');
      assert.match(result.stdout, /wrangler\.jsonc.*found/i, 'Should detect wrangler.jsonc file');
      assert.match(result.stdout, /d1_databases.*detected/i, 'Should detect D1 database configuration');
    });

    test('should detect cf-turso project type', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-turso-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze cf-turso project');
      assert.match(result.stdout, /Project type.*cf-turso/i, 'Should detect cf-turso project type');
      assert.match(result.stdout, /wrangler\.jsonc.*found/i, 'Should detect wrangler.jsonc file');
      assert.match(result.stdout, /TURSO_DB_URL.*detected/i, 'Should detect Turso database configuration');
      assert.match(result.stdout, /@libsql\/client.*dependency/i, 'Should detect libsql client dependency');
    });

    test('should detect Cloudflare Workers types dependency', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze project');
      assert.match(result.stdout, /@cloudflare\/workers-types.*dependency/i, 'Should detect Cloudflare Workers types');
    });
  });

  describe('Vite-based Project Detection', () => {
    test('should detect vite-react project type', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze vite-react project');
      assert.match(result.stdout, /Project type.*vite-react/i, 'Should detect vite-react project type');
      assert.match(result.stdout, /vite\.config\.js.*found/i, 'Should detect vite.config.js file');
      assert.match(result.stdout, /react.*dependency/i, 'Should detect React dependency');
      assert.match(result.stdout, /vite.*dependency/i, 'Should detect Vite dependency');
    });

    test('should detect Vite configuration file', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze project');
      assert.match(result.stdout, /vite\.config\.js.*configuration/i, 'Should detect Vite configuration');
      assert.match(result.stdout, /base.*\/my-react-app\//i, 'Should detect base URL configuration');
    });
  });

  describe('Generic Node.js Project Detection', () => {
    test('should detect generic project type as fallback', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze generic project');
      assert.match(result.stdout, /Project type.*generic/i, 'Should detect generic project type');
      assert.match(result.stdout, /No specific project type.*detected/i, 'Should indicate fallback to generic');
    });

    test('should analyze package.json for generic project', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze project');
      assert.match(result.stdout, /package\.json.*analyzed/i, 'Should analyze package.json');
      assert.match(result.stdout, /my-node-app/i, 'Should detect project name');
      assert.match(result.stdout, /express.*dependency/i, 'Should detect Express dependency');
    });
  });

  describe('Forced Project Type Specification', () => {
    test('should use forced project type instead of detection', async () => {
      const result = await runCLI(['--type', 'vite-react', '--dry-run', '--force-lenient'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully use forced type');
      assert.match(result.stdout, /Project type.*vite-react/i, 'Should use forced vite-react type');
      assert.match(result.stdout, /forced.*type/i, 'Should indicate type was forced');
    });

    test('should use forced cf-d1 type', async () => {
      const result = await runCLI(['--type', 'cf-d1', '--dry-run', '--force-lenient'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully use forced type');
      assert.match(result.stdout, /Project type.*cf-d1/i, 'Should use forced cf-d1 type');
    });

    test('should use forced cf-turso type', async () => {
      const result = await runCLI(['--type', 'cf-turso', '--dry-run', '--force-lenient'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully use forced type');
      assert.match(result.stdout, /Project type.*cf-turso/i, 'Should use forced cf-turso type');
    });

    test('should use forced generic type', async () => {
      const result = await runCLI(['--type', 'generic', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully use forced type');
      assert.match(result.stdout, /Project type.*generic/i, 'Should use forced generic type');
      assert.match(result.stdout, /overriding.*detection/i, 'Should indicate detection was overridden');
    });
  });

  describe('Package.json Dependency Analysis', () => {
    test('should analyze dependencies for project type refinement', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-turso-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze dependencies');
      assert.match(result.stdout, /Dependencies analyzed/i, 'Should analyze dependencies');
      assert.match(result.stdout, /@libsql\/client.*found/i, 'Should find libsql client');
      assert.match(result.stdout, /@cloudflare\/workers-types.*found/i, 'Should find Cloudflare types');
    });

    test('should detect React and Vite dependencies', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze dependencies');
      assert.match(result.stdout, /react.*dependency.*found/i, 'Should find React dependency');
      assert.match(result.stdout, /vite.*dependency.*found/i, 'Should find Vite dependency');
      assert.match(result.stdout, /@vitejs\/plugin-react.*found/i, 'Should find Vite React plugin');
    });

    test('should handle projects with minimal dependencies', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully analyze minimal dependencies');
      assert.match(result.stdout, /express.*dependency.*found/i, 'Should find Express dependency');
      assert.match(result.stdout, /No framework-specific.*dependencies/i, 'Should indicate no framework dependencies');
    });
  });

  describe('File-based Detection Logic', () => {
    test('should prioritize wrangler.jsonc for Cloudflare detection', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully detect based on files');
      assert.match(result.stdout, /wrangler\.jsonc.*primary indicator/i, 'Should use wrangler.jsonc as primary indicator');
      assert.match(result.stdout, /Cloudflare Worker.*detected/i, 'Should detect Cloudflare Worker');
    });

    test('should prioritize vite.config.js for Vite detection', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully detect based on files');
      assert.match(result.stdout, /vite\.config\.js.*primary indicator/i, 'Should use vite.config.js as primary indicator');
      assert.match(result.stdout, /Vite.*project.*detected/i, 'Should detect Vite project');
    });

    test('should fall back to generic when no specific files found', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should successfully fall back to generic');
      assert.match(result.stdout, /No specific.*configuration.*files/i, 'Should indicate no specific files found');
      assert.match(result.stdout, /Defaulting.*generic/i, 'Should indicate fallback to generic');
    });
  });
});