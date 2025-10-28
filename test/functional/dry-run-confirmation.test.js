import { test, describe } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '../../src/bin/cli.js');

/**
 * Helper function to run CLI command and capture output
 */
function runCLI(args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      stdio: 'pipe',
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });

    child.on('error', reject);

    // Handle timeout
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('CLI command timed out'));
    }, 10000);

    child.on('close', () => clearTimeout(timeout));
  });
}

/**
 * Helper function to run CLI with input simulation
 */
function runCLIWithInput(args = [], input = '', options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      stdio: 'pipe',
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Send input after a short delay
    setTimeout(() => {
      if (child.stdin && !child.stdin.destroyed) {
        child.stdin.write(input);
        child.stdin.end();
      }
    }, 100);

    child.on('close', (code) => {
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });

    child.on('error', reject);

    // Handle timeout
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('CLI command timed out'));
    }, 10000);

    child.on('close', () => clearTimeout(timeout));
  });
}

describe('Dry-Run and Confirmation Tests', () => {
  describe('Dry-Run Mode Display', () => {
    test('should display all planned changes without executing them', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully complete dry-run');
      assert.match(result.stdout, /DRY RUN MODE.*no changes.*will be made/i, 'Should indicate dry-run mode');
      assert.match(result.stdout, /planned changes.*preview/i, 'Should show planned changes preview');
      assert.match(result.stdout, /would be.*modified|created|removed/i, 'Should use conditional language');
    });

    test('should show which files will be modified', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully show file modifications');
      assert.match(result.stdout, /Files.*would be modified/i, 'Should show files to be modified');
      assert.match(result.stdout, /package\.json.*would be modified/i, 'Should show package.json modification');
      assert.match(result.stdout, /README\.md.*would be modified/i, 'Should show README.md modification');
    });

    test('should show placeholder replacements that would occur', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully show placeholder replacements');
      assert.match(result.stdout, /Placeholder replacements.*would be made/i, 'Should show placeholder replacements');
      assert.match(result.stdout, /"my-node-app".*would become.*"{{PROJECT_NAME}}"/i, 'Should show specific replacements');
      assert.match(result.stdout, /"Test Author".*would become.*"{{AUTHOR}}"/i, 'Should show author replacement');
    });

    test('should show files and directories that would be deleted', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully show deletions');
      assert.match(result.stdout, /Files.*would be deleted/i, 'Should show files to be deleted');
      assert.match(result.stdout, /package-lock\.json.*would be removed/i, 'Should show package-lock.json removal');
      assert.match(result.stdout, /\.env.*would be removed/i, 'Should show .env removal');
      assert.match(result.stdout, /Directories.*would be deleted/i, 'Should show directories to be deleted');
    });

    test('should show content of generated files in preview', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully show generated file content');
      assert.match(result.stdout, /_setup\.mjs.*would be created.*with content/i, 'Should show _setup.mjs content');
      assert.match(result.stdout, /export default async function setup/i, 'Should show setup function');
      assert.match(result.stdout, /template\.json.*would be created.*with content/i, 'Should show template.json content');
      assert.match(result.stdout, /"supportedOptions"/i, 'Should show template metadata');
    });

    test('should exit without making filesystem changes', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should exit successfully');
      assert.match(result.stdout, /No changes.*were made.*dry.*run/i, 'Should confirm no changes made');
      assert.match(result.stdout, /To execute.*remove.*--dry-run/i, 'Should provide execution instructions');
    });
  });

  describe('Confirmation Prompt Behavior', () => {
    test('should prompt for confirmation before destructive operations', async () => {
      const result = await runCLIWithInput([], 'n\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      // Should show confirmation prompt
      assert.match(result.stdout, /Are you sure.*want to proceed/i, 'Should show confirmation prompt');
      assert.match(result.stdout, /This will.*modify.*delete.*files/i, 'Should warn about destructive operations');
      assert.match(result.stdout, /\[y\/N\]/i, 'Should show y/N options');
    });

    test('should proceed when user confirms with "y"', async () => {
      const result = await runCLIWithInput([], 'y\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.match(result.stdout, /Proceeding.*with.*conversion/i, 'Should proceed with conversion');
      assert.match(result.stdout, /User.*confirmed.*operation/i, 'Should acknowledge user confirmation');
    });

    test('should proceed when user confirms with "yes"', async () => {
      const result = await runCLIWithInput([], 'yes\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.match(result.stdout, /Proceeding.*with.*conversion/i, 'Should proceed with conversion');
      assert.match(result.stdout, /User.*confirmed.*operation/i, 'Should acknowledge user confirmation');
    });

    test('should cancel when user declines with "n"', async () => {
      const result = await runCLIWithInput([], 'n\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should exit cleanly when cancelled');
      assert.match(result.stdout, /Operation.*cancelled.*by.*user/i, 'Should show cancellation message');
      assert.match(result.stdout, /No changes.*were made/i, 'Should confirm no changes made');
    });

    test('should cancel when user declines with "no"', async () => {
      const result = await runCLIWithInput([], 'no\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should exit cleanly when cancelled');
      assert.match(result.stdout, /Operation.*cancelled.*by.*user/i, 'Should show cancellation message');
    });

    test('should default to "no" on empty input', async () => {
      const result = await runCLIWithInput([], '\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should exit cleanly with default');
      assert.match(result.stdout, /Operation.*cancelled.*default.*no/i, 'Should show default cancellation');
      assert.match(result.stdout, /No changes.*were made/i, 'Should confirm no changes made');
    });

    test('should handle invalid input gracefully', async () => {
      const result = await runCLIWithInput([], 'invalid\nn\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.match(result.stdout, /Please.*enter.*y.*or.*n/i, 'Should prompt for valid input');
      assert.match(result.stdout, /Invalid.*input.*try.*again/i, 'Should indicate invalid input');
      assert.match(result.stdout, /Operation.*cancelled/i, 'Should eventually cancel');
    });
  });

  describe('--yes Option Behavior', () => {
    test('should skip confirmation prompts with --yes flag', async () => {
      const result = await runCLI(['--yes'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.doesNotMatch(result.stdout, /Are you sure.*want to proceed/i, 'Should not show confirmation prompt');
      assert.match(result.stdout, /Skipping.*confirmation.*--yes.*flag/i, 'Should indicate confirmation skipped');
      assert.match(result.stdout, /Proceeding.*automatically/i, 'Should proceed automatically');
    });

    test('should work with --yes and --dry-run together', async () => {
      const result = await runCLI(['--yes', '--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully complete dry-run with --yes');
      assert.match(result.stdout, /DRY RUN MODE/i, 'Should still be in dry-run mode');
      assert.doesNotMatch(result.stdout, /Are you sure/i, 'Should not show confirmation in dry-run');
      assert.match(result.stdout, /No changes.*were made.*dry.*run/i, 'Should confirm dry-run completion');
    });

    test('should proceed immediately with --yes flag', async () => {
      const result = await runCLI(['--yes'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.match(result.stdout, /Auto-confirmed.*with.*--yes.*flag/i, 'Should show auto-confirmation');
      assert.match(result.stdout, /Starting.*conversion.*process/i, 'Should start conversion immediately');
    });
  });

  describe('User Input Handling', () => {
    test('should handle case-insensitive input', async () => {
      const result = await runCLIWithInput([], 'Y\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.match(result.stdout, /Proceeding.*with.*conversion/i, 'Should accept uppercase Y');
    });

    test('should handle whitespace in input', async () => {
      const result = await runCLIWithInput([], ' y \n', { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.match(result.stdout, /Proceeding.*with.*conversion/i, 'Should accept input with whitespace');
    });

    test('should timeout on no input after reasonable time', async () => {
      const result = await runCLI([], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      // Should eventually timeout or default to no
      assert.match(result.stdout, /timeout|cancelled|no.*input/i, 'Should handle timeout or default');
    });
  });

  describe('Confirmation Content Display', () => {
    test('should show summary of changes in confirmation prompt', async () => {
      const result = await runCLIWithInput([], 'n\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });
      
      assert.match(result.stdout, /Summary.*of.*changes/i, 'Should show change summary');
      assert.match(result.stdout, /\d+.*files.*will be modified/i, 'Should show file modification count');
      assert.match(result.stdout, /\d+.*files.*will be deleted/i, 'Should show file deletion count');
      assert.match(result.stdout, /\d+.*files.*will be created/i, 'Should show file creation count');
    });

    test('should show project type in confirmation', async () => {
      const result = await runCLIWithInput([], 'n\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });
      
      assert.match(result.stdout, /Project type.*vite-react/i, 'Should show detected project type');
      assert.match(result.stdout, /Converting.*vite-react.*project/i, 'Should mention project type in conversion');
    });

    test('should warn about irreversible operations', async () => {
      const result = await runCLIWithInput([], 'n\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.match(result.stdout, /WARNING.*irreversible.*operations/i, 'Should show irreversible warning');
      assert.match(result.stdout, /git.*history.*will be lost/i, 'Should warn about git history loss');
      assert.match(result.stdout, /backup.*recommended/i, 'Should recommend backup');
    });

    test('should show placeholder format in confirmation', async () => {
      const result = await runCLIWithInput(['--placeholder-format', '__NAME__'], 'n\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.match(result.stdout, /Placeholder format.*__NAME__/i, 'Should show custom placeholder format');
      assert.match(result.stdout, /Using.*double.*underscore.*format/i, 'Should describe format choice');
    });
  });

  describe('Dry-Run and Confirmation Integration', () => {
    test('should recommend dry-run when user cancels', async () => {
      const result = await runCLIWithInput([], 'n\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.match(result.stdout, /Try.*--dry-run.*to.*preview.*changes/i, 'Should recommend dry-run');
      assert.match(result.stdout, /make-template.*--dry-run/i, 'Should show dry-run command');
    });

    test('should show different confirmation for different project types', async () => {
      const cfResult = await runCLIWithInput([], 'n\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });
      
      assert.match(cfResult.stdout, /Cloudflare.*Worker.*D1/i, 'Should mention Cloudflare D1 specifics');
      assert.match(cfResult.stdout, /wrangler\.jsonc.*account_id/i, 'Should mention Cloudflare-specific files');
      
      const viteResult = await runCLIWithInput([], 'n\n', { 
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });
      
      assert.match(viteResult.stdout, /Vite.*React.*application/i, 'Should mention Vite React specifics');
      assert.match(viteResult.stdout, /vite\.config\.js.*index\.html/i, 'Should mention Vite-specific files');
    });

    test('should provide clear next steps after dry-run', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.match(result.stdout, /To execute.*these.*changes/i, 'Should provide execution instructions');
      assert.match(result.stdout, /make-template.*without.*--dry-run/i, 'Should show command without dry-run');
      assert.match(result.stdout, /make-template.*--yes.*skip.*confirmation/i, 'Should show --yes option');
    });
  });
});