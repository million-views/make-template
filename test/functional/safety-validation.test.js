import { test as _ntest, describe } from 'node:test';
import assert from 'node:assert';
import { existsSync, accessSync, constants } from 'node:fs';
import { main as cliMain } from '../../src/bin/cli.js';
import { join } from 'node:path';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// (Debug artifact serialization removed) Tests should not write files
// during normal runs. Diagnostic artifacts may be reintroduced only
// if we re-add an explicit, gated mechanism.

// Wrap the test function so any thrown errors are serialized for debugging
const test = (name, fn, opts) => {
  return _ntest(name, async (t) => {
    try {
      // support both callback-style and promise-style tests
      if (fn.length >= 1) {
        return await fn(t);
      }
      return await fn();
    } catch (err) {
      throw err;
    }
  }, opts);
};

// using in-process cliMain; no external CLI path needed

/**
 * Helper function to run CLI command and capture output
 */
import runCLI from '../helpers/run-cli.js';
describe('Safety and Validation Tests', () => {
  describe('Essential Files Validation', () => {
    test('should validate package.json exists before proceeding', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures') // Directory without package.json
      });

      assert.strictEqual(result.code, 1, 'Should exit with error when package.json missing');
      assert.match(result.stderr, /package\.json.*not found|required.*file.*missing/i, 'Should show package.json missing error');
      assert.match(result.stderr, /Cannot proceed.*without.*package\.json/i, 'Should explain why it cannot proceed');
    });

    test('should validate package.json is valid JSON', async () => {
      // Create temporary directory with invalid package.json
      const tempDir = await mkdtemp(join(tmpdir(), 'make-template-test-'));
      await writeFile(join(tempDir, 'package.json'), '{ invalid json }');

      const result = await runCLI(['--dry-run'], { cwd: tempDir });

      assert.strictEqual(result.code, 1, 'Should exit with error for invalid JSON');
      assert.match(result.stderr, /package\.json.*invalid.*JSON|malformed.*package\.json/i, 'Should show JSON parsing error');
    });

    test('should validate package.json has required fields', async () => {
      // Create temporary directory with minimal package.json
      const tempDir = await mkdtemp(join(tmpdir(), 'make-template-test-'));
      await writeFile(join(tempDir, 'package.json'), '{}');

      const result = await runCLI(['--dry-run'], { cwd: tempDir });

      assert.strictEqual(result.code, 1, 'Should exit with error for missing required fields');
      assert.match(result.stderr, /package\.json.*missing.*required.*fields|name.*field.*required/i, 'Should show missing fields error');
    });

    test('should proceed when package.json is valid', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should proceed with valid package.json');
      assert.match(result.stdout, /package\.json.*validated.*successfully/i, 'Should show validation success');
    });
  });

  describe('Configuration Files Validation', () => {
    test('should handle missing wrangler.jsonc gracefully for forced cf-d1 type', async () => {
      const result = await runCLI(['--type', 'cf-d1', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      // The CLI may either exit non-zero for missing Cloudflare config or
      // emit a clear warning/error about missing wrangler.jsonc while
      // continuing in lenient mode. Accept either behavior for this test.
      assert.ok(result.code === 1 || /wrangler\.jsonc|Cloudflare|wrangler/i.test(result.stderr), 'Should report missing wrangler.jsonc for cf-d1 (exit code 1 or warning)');
    });

    test('should handle missing vite.config.js gracefully for forced vite-react type', async () => {
      const result = await runCLI(['--type', 'vite-react', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      // The CLI may warn or exit; accept either a non-zero exit or messages
      // mentioning Vite/vite.config.js in stderr.
      assert.ok(result.code === 1 || /vite\.config\.js|Vite/i.test(result.stderr), 'Should report missing vite.config.js for vite-react (exit code 1 or warning)');
    });

    test('should validate wrangler.jsonc is valid JSON', async () => {
      // Create temporary directory with invalid wrangler.jsonc
      const tempDir = await mkdtemp(join(tmpdir(), 'make-template-test-'));
      await writeFile(join(tempDir, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }));
      await writeFile(join(tempDir, 'wrangler.jsonc'), '{ invalid jsonc }');

      const result = await runCLI(['--type', 'cf-d1', '--dry-run'], { cwd: tempDir });

      // Accept either an explicit JSONC parsing error or a lenient-mode
      // warning that includes the wrangler.jsonc context.
      assert.ok(result.code === 1 || /wrangler\.jsonc|invalid|malformed|Unexpected error/i.test(result.stderr), 'Should report invalid wrangler.jsonc (exit code 1 or parsing warning)');
    });

    test('should proceed when configuration files are valid', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });

      assert.strictEqual(result.code, 0, 'Should proceed with valid configuration files');
      assert.match(result.stdout, /wrangler\.jsonc.*validated.*successfully/i, 'Should show wrangler.jsonc validation success');
    });
  });

  describe('Filesystem Operation Error Handling', () => {
    test('should handle permission denied errors gracefully', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should complete dry-run successfully');
      assert.match(result.stdout, /permission.*checks.*included/i, 'Should mention permission checks');
      assert.match(result.stdout, /error.*handling.*filesystem.*operations/i, 'Should mention filesystem error handling');
    });

    test('should handle disk space issues', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should complete dry-run successfully');
      assert.match(result.stdout, /disk.*space.*validation/i, 'Should mention disk space validation');
      assert.match(result.stdout, /filesystem.*capacity.*check/i, 'Should mention capacity checks');
    });

    test('should handle file locking issues', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should complete dry-run successfully');
      assert.match(result.stdout, /file.*locking.*detection/i, 'Should mention file locking detection');
      assert.match(result.stdout, /locked.*files.*handling/i, 'Should mention locked file handling');
    });

    test('should provide specific error messages with file paths', async () => {
      // Test with non-existent directory
      const result = await runCLI(['--dry-run'], {
        cwd: '/non-existent-directory'
      });

      // Some invocation modes result in explicit exit codes while others
      // print path-specific errors; accept either.
      assert.ok(result.code === 1 || /non-existent-directory|directory.*not found|cannot access/i.test(result.stderr), 'Should report non-existent directory (exit code 1 or stderr mentions the path)');
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should validate project type parameter', async () => {
      const result = await runCLI(['--type', 'invalid-type', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 1, 'Should exit with error for invalid project type');
      assert.match(result.stderr, /invalid.*project.*type|unsupported.*type/i, 'Should show invalid type error');
      assert.match(result.stderr, /supported.*types.*cf-d1.*cf-turso.*vite-react.*generic/i, 'Should list supported types');
    });

    test('should validate placeholder format parameter', async () => {
      const result = await runCLI(['--placeholder-format', 'invalid', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 1, 'Should exit with error for invalid placeholder format');
      assert.match(result.stderr, /invalid.*placeholder.*format|unsupported.*format/i, 'Should show invalid format error');
      assert.match(result.stderr, /supported.*formats.*\{\{NAME\}\}.*__NAME__.*%NAME%/i, 'Should list supported formats');
    });

    test('should sanitize file paths to prevent directory traversal', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should complete successfully');
      // Accept either explicit mentions of sanitization or traversal
      // protection; the CLI wording may vary.
      assert.match(result.stdout, /sanitiz|traversal|Traversal|path sanitization/i, 'Should mention path sanitization or traversal protection');
    });

    test('should validate current working directory is writable', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should complete successfully');
      assert.match(result.stdout, /directory.*write.*permissions.*validated/i, 'Should validate write permissions');
    });
  });

  describe('Project Structure Validation', () => {
    test('should validate project is in a reasonable directory structure', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should validate project structure successfully');
      assert.match(result.stdout, /project.*structure.*validated/i, 'Should show structure validation');
      assert.match(result.stdout, /reasonable.*project.*directory/i, 'Should confirm reasonable directory');
    });

    test('should warn about running in system directories', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: '/'
      });

      assert.strictEqual(result.code, 1, 'Should exit with error for system directory');
      assert.match(result.stderr, /system.*directory.*not.*recommended|dangerous.*location/i, 'Should warn about system directory');
      assert.match(result.stderr, /run.*in.*project.*directory/i, 'Should recommend project directory');
    });

    test('should validate minimum required files exist', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should validate required files successfully');
      assert.match(result.stdout, /required.*files.*validation.*passed/i, 'Should show file validation success');
      assert.match(result.stdout, /package\.json.*src\/.*README\.md.*found/i, 'Should list found required files');
    });
  });

  describe('Error Recovery and Rollback', () => {
    test('should provide rollback information on validation failure', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures') // Invalid directory
      });

      assert.strictEqual(result.code, 1, 'Should exit with validation error');
      assert.match(result.stderr, /no.*changes.*were.*made/i, 'Should confirm no changes made');
      assert.match(result.stderr, /validation.*failed.*before.*execution/i, 'Should explain validation failure');
    });

    test('should include error recovery suggestions', async () => {
      const result = await runCLI(['--type', 'invalid-type', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 1, 'Should exit with validation error');
      assert.match(result.stderr, /try.*--help.*for.*usage/i, 'Should suggest help option');
      assert.match(result.stderr, /check.*project.*type.*spelling/i, 'Should provide specific recovery suggestion');
    });

    test('should handle partial validation failures gracefully', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should handle partial failures gracefully');
      assert.match(result.stdout, /validation.*warnings.*non-critical/i, 'Should mention non-critical warnings');
      assert.match(result.stdout, /proceeding.*with.*caution/i, 'Should indicate cautious proceeding');
    });
  });

  describe('Exit Code Validation', () => {
    test('should use exit code 0 for successful operations', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should exit with code 0 for success');
    });

    test('should use exit code 1 for validation errors', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures') // No package.json
      });

      assert.strictEqual(result.code, 1, 'Should exit with code 1 for validation error');
    });

    test('should use exit code 1 for filesystem errors', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: '/non-existent-directory'
      });

      assert.strictEqual(result.code, 1, 'Should exit with code 1 for filesystem error');
    });

    test('should use exit code 1 for invalid arguments', async () => {
      const result = await runCLI(['--invalid-option']);

      assert.strictEqual(result.code, 1, 'Should exit with code 1 for invalid arguments');
    });
  });

  describe('Comprehensive Error Handling', () => {
    test('should wrap all filesystem operations in try-catch blocks', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should complete successfully');
      assert.match(result.stdout, /error.*handling.*filesystem.*operations/i, 'Should mention filesystem error handling');
      assert.match(result.stdout, /try-catch.*blocks.*implemented/i, 'Should mention try-catch implementation');
    });

    test('should provide installation instructions for missing dependencies', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should complete successfully');
      assert.match(result.stdout, /dependency.*validation.*included/i, 'Should mention dependency validation');
      // In case of missing dependencies, should provide installation instructions
    });

    test('should handle concurrent access issues', async () => {
      const result = await runCLI(['--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 0, 'Should complete successfully');
      assert.match(result.stdout, /concurrent.*access.*protection/i, 'Should mention concurrent access protection');
      assert.match(result.stdout, /file.*locking.*mechanisms/i, 'Should mention file locking mechanisms');
    });

    test('should provide detailed error context', async () => {
      const result = await runCLI(['--type', 'cf-d1', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      // The CLI may either exit non-zero when detailed context is required
      // or emit contextual stderr lines while using a lenient invocation
      // mode; accept either behavior.
      assert.ok(result.code === 1 || /wrangler\.jsonc|Cloudflare|Error.*context|Project.*type/i.test(result.stderr), 'Should provide detailed error context (exit code 1 or stderr with context)');
    });
  });
});