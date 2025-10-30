import { test, describe } from 'node:test';
import assert from 'node:assert';
import { existsSync, accessSync, constants } from 'node:fs';
import { join } from 'node:path';
import { main as cliMain } from '../../src/bin/cli.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// using in-process cliMain; no external CLI path needed

/**
 * Helper function to run CLI command and capture output
 */
function runCLI(args = [], options = {}) {
  return (async () => {
    // Capture stdout/stderr by monkey-patching console methods temporarily
    const originalCout = process.stdout.write;
    const originalErr = process.stderr.write;
    let stdout = '';
    let stderr = '';

    process.stdout.write = (chunk, encoding, cb) => {
      stdout += chunk instanceof Buffer ? chunk.toString() : String(chunk);
      if (typeof cb === 'function') cb();
      return true;
    };
    process.stderr.write = (chunk, encoding, cb) => {
      stderr += chunk instanceof Buffer ? chunk.toString() : String(chunk);
      if (typeof cb === 'function') cb();
      return true;
    };

    const cwd = options.cwd || process.cwd();
    const originalCwd = process.cwd();
    try {
      process.chdir(cwd);
      const runArgs = Array.isArray(args) ? [...args] : [];
      if (options.silent !== false && !runArgs.includes('--silent')) runArgs.push('--silent');
      // call the exported main() from CLI
      let exitCode = 0;
      try {
        await cliMain(runArgs);
      } catch (err) {
        // CLI throws errors for exit code 1 scenarios; capture code if present
        exitCode = err && err.code ? err.code : 1;
      }

      return {
        code: exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      };
    } finally {
      // restore
      process.stdout.write = originalCout;
      process.stderr.write = originalErr;
      try { process.chdir(originalCwd); } catch (e) { }
    }
  })();
}

describe('CLI Interface Tests', () => {
  describe('Help Option', () => {
    test('should display help with --help flag', async () => {
      const result = await runCLI(['--help']);

      assert.strictEqual(result.code, 0, 'Help command should exit with code 0');
      assert.match(result.stdout, /make-template/, 'Should display tool name');
      assert.match(result.stdout, /Convert existing Node\.js projects/, 'Should display description');
      assert.match(result.stdout, /--dry-run/, 'Should show dry-run option');
      assert.match(result.stdout, /--yes/, 'Should show yes option');
      assert.match(result.stdout, /--type/, 'Should show type option');
      assert.match(result.stdout, /--placeholder-format/, 'Should show placeholder-format option');
    });

    test('should display help with -h flag', async () => {
      const result = await runCLI(['-h']);

      assert.strictEqual(result.code, 0, 'Help command should exit with code 0');
      assert.match(result.stdout, /make-template/, 'Should display tool name');
    });

    test('should display help when no arguments provided', async () => {
      const result = await runCLI([]);

      assert.strictEqual(result.code, 0, 'No args should show help and exit with code 0');
      assert.match(result.stdout, /Usage:/, 'Should display usage information');
    });
  });

  describe('Argument Parsing', () => {
    test('should accept --dry-run flag', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      // Should not fail due to invalid argument
      assert.notStrictEqual(result.code, 2, 'Should not exit with argument parsing error');
      assert.doesNotMatch(result.stderr, /Unknown option/, 'Should recognize --dry-run option');
    });

    test('should accept --yes flag', async () => {
      const result = await runCLI(['--yes', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.notStrictEqual(result.code, 2, 'Should not exit with argument parsing error');
      assert.doesNotMatch(result.stderr, /Unknown option/, 'Should recognize --yes option');
    });

    test('should accept --type option with value', async () => {
      const result = await runCLI(['--type', 'vite-react', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.notStrictEqual(result.code, 2, 'Should not exit with argument parsing error');
      assert.doesNotMatch(result.stderr, /Unknown option/, 'Should recognize --type option');
    });

    test('should accept --placeholder-format option with value', async () => {
      const result = await runCLI(['--placeholder-format', '{{NAME}}', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.notStrictEqual(result.code, 2, 'Should not exit with argument parsing error');
      assert.doesNotMatch(result.stderr, /Unknown option/, 'Should recognize --placeholder-format option');
    });

    test('should accept multiple options together', async () => {
      const result = await runCLI([
        '--dry-run',
        '--yes',
        '--type', 'generic',
        '--placeholder-format', '__NAME__'
      ], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.notStrictEqual(result.code, 2, 'Should not exit with argument parsing error');
      assert.doesNotMatch(result.stderr, /Unknown option/, 'Should recognize all options');
    });
  });

  describe('Error Handling for Invalid Arguments', () => {
    test('should reject unknown options', async () => {
      const result = await runCLI(['--invalid-option']);

      assert.strictEqual(result.code, 1, 'Should exit with error code for unknown option');
      assert.match(result.stderr, /Unknown option|Invalid argument/, 'Should show error for unknown option');
    });

    test('should reject --type without value', async () => {
      const result = await runCLI(['--type']);

      assert.strictEqual(result.code, 1, 'Should exit with error code for missing type value');
      assert.match(result.stderr, /requires a value|Missing value/, 'Should show error for missing type value');
    });

    test('should reject --placeholder-format without value', async () => {
      const result = await runCLI(['--placeholder-format']);

      assert.strictEqual(result.code, 1, 'Should exit with error code for missing format value');
      assert.match(result.stderr, /requires a value|Missing value/, 'Should show error for missing format value');
    });

    test('should reject invalid placeholder format', async () => {
      const result = await runCLI(['--placeholder-format', 'invalid-format', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 1, 'Should exit with error code for invalid format');
      assert.match(result.stderr, /Invalid placeholder format|Unsupported format/, 'Should show error for invalid format');
    });

    test('should reject invalid project type', async () => {
      const result = await runCLI(['--type', 'invalid-type', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 1, 'Should exit with error code for invalid type');
      assert.match(result.stderr, /Invalid project type|Unsupported type/, 'Should show error for invalid type');
    });
  });

  describe('Missing Required Files', () => {
    test('should error when package.json is missing', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures') // Directory without package.json
      });

      assert.strictEqual(result.code, 1, 'Should exit with error code when package.json missing');
      assert.match(result.stderr, /package\.json.*not found|Missing package\.json/, 'Should show error for missing package.json');
    });

    test('should error when not in a valid project directory', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: '/tmp' // System directory that's not a project
      });

      assert.strictEqual(result.code, 1, 'Should exit with error code for invalid directory');
      assert.match(result.stderr, /not a valid project|package\.json.*not found/, 'Should show error for invalid project directory');
    });
  });

  describe('Usage Information Display', () => {
    test('should show usage information in help', async () => {
      const result = await runCLI(['--help']);

      assert.match(result.stdout, /Usage:/, 'Should show usage section');
      assert.match(result.stdout, /make-template \[options\]/, 'Should show command format');
      assert.match(result.stdout, /Options:/, 'Should show options section');
      assert.match(result.stdout, /Examples:/, 'Should show examples section');
    });

    test('should show supported placeholder formats in help', async () => {
      const result = await runCLI(['--help']);

      assert.match(result.stdout, /\{\{NAME\}\}/, 'Should show double-brace format');
      assert.match(result.stdout, /__NAME__/, 'Should show double-underscore format');
      assert.match(result.stdout, /%NAME%/, 'Should show percent format');
    });

    test('should show supported project types in help', async () => {
      const result = await runCLI(['--help']);

      assert.match(result.stdout, /cf-d1/, 'Should show cf-d1 project type');
      assert.match(result.stdout, /cf-turso/, 'Should show cf-turso project type');
      assert.match(result.stdout, /vite-react/, 'Should show vite-react project type');
      assert.match(result.stdout, /generic/, 'Should show generic project type');
    });
  });
});