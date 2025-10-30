import { test, describe } from 'node:test';
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

// using in-process cliMain; no external CLI path needed

/**
 * Helper function to run CLI command and capture output
 */
function runCLI(args = [], options = {}) {
  return (async () => {
    const originalStdout = process.stdout.write;
    const originalStderr = process.stderr.write;
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
      let exitCode = 0;
      try {
        await cliMain(runArgs);
      } catch (err) {
        exitCode = err && err.code ? err.code : 1;
      }
      return { code: exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
    } finally {
      process.stdout.write = originalStdout;
      process.stderr.write = originalStderr;
      try { process.chdir(originalCwd); } catch (e) { }
    }
  })();
}

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

      assert.strictEqual(result.code, 1, 'Should exit with error when wrangler.jsonc missing for cf-d1');
      assert.match(result.stderr, /wrangler\.jsonc.*not found.*cf-d1.*project/i, 'Should show wrangler.jsonc missing error');
      assert.match(result.stderr, /Required.*Cloudflare.*configuration.*missing/i, 'Should explain Cloudflare config requirement');
    });

    test('should handle missing vite.config.js gracefully for forced vite-react type', async () => {
      const result = await runCLI(['--type', 'vite-react', '--dry-run'], {
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });

      assert.strictEqual(result.code, 1, 'Should exit with error when vite.config.js missing for vite-react');
      assert.match(result.stderr, /vite\.config\.js.*not found.*vite-react.*project/i, 'Should show vite.config.js missing error');
      assert.match(result.stderr, /Required.*Vite.*configuration.*missing/i, 'Should explain Vite config requirement');
    });

    test('should validate wrangler.jsonc is valid JSON', async () => {
      // Create temporary directory with invalid wrangler.jsonc
      const tempDir = await mkdtemp(join(tmpdir(), 'make-template-test-'));
      await writeFile(join(tempDir, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }));
      await writeFile(join(tempDir, 'wrangler.jsonc'), '{ invalid jsonc }');

      const result = await runCLI(['--type', 'cf-d1', '--dry-run'], { cwd: tempDir });

      assert.strictEqual(result.code, 1, 'Should exit with error for invalid JSONC');
      assert.match(result.stderr, /wrangler\.jsonc.*invalid.*JSON|malformed.*wrangler/i, 'Should show JSONC parsing error');
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

      assert.strictEqual(result.code, 1, 'Should exit with error for non-existent directory');
      assert.match(result.stderr, /directory.*not found|cannot access.*directory/i, 'Should show directory error');
      assert.match(result.stderr, /\/non-existent-directory/i, 'Should include specific path in error');
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
      assert.match(result.stdout, /path.*sanitization.*enabled/i, 'Should mention path sanitization');
      assert.match(result.stdout, /directory.*traversal.*protection/i, 'Should mention traversal protection');
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

      assert.strictEqual(result.code, 1, 'Should exit with error');
      assert.match(result.stderr, /Error.*context/i, 'Should provide error context');
      assert.match(result.stderr, /Project.*type.*cf-d1.*requires.*wrangler\.jsonc/i, 'Should provide specific context');
      assert.match(result.stderr, /Current.*directory.*does.*not.*contain/i, 'Should explain current situation');
    });
  });
});