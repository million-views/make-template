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

describe('Cleanup Operations Tests', () => {
  describe('Node Modules and Lock Files Removal', () => {
    test('should plan removal of node_modules directory', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /node_modules.*will be removed/i, 'Should plan node_modules removal');
      assert.match(result.stdout, /directory.*cleanup/i, 'Should indicate directory cleanup');
    });

    test('should plan removal of package-lock.json', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /package-lock\.json.*will be removed/i, 'Should plan package-lock.json removal');
      assert.match(result.stdout, /lock file.*cleanup/i, 'Should indicate lock file cleanup');
    });

    test('should plan removal of yarn.lock', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /yarn\.lock.*will be removed/i, 'Should plan yarn.lock removal');
      assert.match(result.stdout, /yarn.*lock file.*cleanup/i, 'Should indicate yarn lock file cleanup');
    });

    test('should plan removal of pnpm-lock.yaml if present', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      // Should mention pnpm-lock.yaml in cleanup rules even if not present
      assert.match(result.stdout, /pnpm-lock\.yaml.*cleanup.*rule/i, 'Should include pnpm-lock.yaml in cleanup rules');
    });
  });

  describe('Build Output Directories Removal', () => {
    test('should plan removal of dist directory', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /dist.*directory.*will be removed/i, 'Should plan dist directory removal');
      assert.match(result.stdout, /build output.*cleanup/i, 'Should indicate build output cleanup');
    });

    test('should plan removal of build directory', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /build.*directory.*cleanup.*rule/i, 'Should include build directory in cleanup rules');
    });

    test('should plan removal of .next directory', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /\.next.*directory.*cleanup.*rule/i, 'Should include .next directory in cleanup rules');
    });

    test('should plan removal of .wrangler directory', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /\.wrangler.*directory.*will be removed/i, 'Should plan .wrangler directory removal');
      assert.match(result.stdout, /Cloudflare.*build.*cache/i, 'Should indicate Cloudflare build cache cleanup');
    });

    test('should plan removal of coverage directory', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /coverage.*directory.*cleanup.*rule/i, 'Should include coverage directory in cleanup rules');
    });
  });

  describe('Version Control Artifacts Removal', () => {
    test('should plan removal of .git directory', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /\.git.*directory.*will be removed/i, 'Should plan .git directory removal');
      assert.match(result.stdout, /version control.*cleanup/i, 'Should indicate version control cleanup');
    });

    test('should warn about version control removal', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /git.*history.*will be lost/i, 'Should warn about git history loss');
      assert.match(result.stdout, /backup.*recommended/i, 'Should recommend backup');
    });
  });

  describe('Environment-Specific Files Removal', () => {
    test('should plan removal of .env files', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /\.env.*will be removed/i, 'Should plan .env file removal');
      assert.match(result.stdout, /environment.*variables.*cleanup/i, 'Should indicate environment variables cleanup');
    });

    test('should plan removal of .env.local files', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /\.env\.local.*will be removed/i, 'Should plan .env.local file removal');
    });

    test('should plan removal of .dev.vars files', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /\.dev\.vars.*cleanup.*rule/i, 'Should include .dev.vars in cleanup rules');
      assert.match(result.stdout, /Cloudflare.*development.*variables/i, 'Should indicate Cloudflare dev variables');
    });

    test('should warn about sensitive data removal', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /sensitive.*data.*will be removed/i, 'Should warn about sensitive data removal');
      assert.match(result.stdout, /API.*keys.*tokens.*removed/i, 'Should warn about API keys and tokens');
    });
  });

  describe('Essential Template Files Preservation', () => {
    test('should preserve source code directories', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /src\/.*will be preserved/i, 'Should preserve src directory');
      assert.match(result.stdout, /source code.*preserved/i, 'Should indicate source code preservation');
    });

    test('should preserve migrations directory', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /migrations\/.*will be preserved/i, 'Should preserve migrations directory');
      assert.match(result.stdout, /database.*migrations.*preserved/i, 'Should indicate database migrations preservation');
    });

    test('should preserve public directory', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /public\/.*preserved.*rule/i, 'Should include public directory in preservation rules');
    });

    test('should preserve configuration files', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /package\.json.*will be preserved/i, 'Should preserve package.json');
      assert.match(result.stdout, /vite\.config\.js.*will be preserved/i, 'Should preserve vite.config.js');
      assert.match(result.stdout, /configuration.*templates.*preserved/i, 'Should indicate configuration preservation');
    });

    test('should preserve README and documentation files', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /README\.md.*will be preserved/i, 'Should preserve README.md');
      assert.match(result.stdout, /\.md.*files.*preserved/i, 'Should preserve markdown files');
    });

    test('should preserve wrangler.jsonc for Cloudflare projects', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /wrangler\.jsonc.*will be preserved/i, 'Should preserve wrangler.jsonc');
      assert.match(result.stdout, /Cloudflare.*configuration.*preserved/i, 'Should indicate Cloudflare config preservation');
    });
  });

  describe('Cleanup Safety and Validation', () => {
    test('should validate cleanup operations before execution', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully validate cleanup');
      assert.match(result.stdout, /cleanup.*validation.*performed/i, 'Should perform cleanup validation');
      assert.match(result.stdout, /essential.*files.*check/i, 'Should check essential files');
    });

    test('should show cleanup summary with file counts', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully show cleanup summary');
      assert.match(result.stdout, /cleanup.*summary/i, 'Should show cleanup summary');
      assert.match(result.stdout, /\d+.*files.*will be removed/i, 'Should show file count to be removed');
      assert.match(result.stdout, /\d+.*directories.*will be removed/i, 'Should show directory count to be removed');
      assert.match(result.stdout, /\d+.*files.*will be preserved/i, 'Should show file count to be preserved');
    });

    test('should handle permission issues gracefully', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /permission.*issues.*handling/i, 'Should mention permission issue handling');
      assert.match(result.stdout, /locked.*files.*detection/i, 'Should mention locked file detection');
    });

    test('should provide rollback information', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /backup.*recommended.*before.*cleanup/i, 'Should recommend backup');
      assert.match(result.stdout, /irreversible.*operations/i, 'Should warn about irreversible operations');
    });
  });

  describe('Project-Type-Specific Cleanup Rules', () => {
    test('should apply Cloudflare-specific cleanup for cf-d1 projects', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/cf-d1-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cf-d1 cleanup');
      assert.match(result.stdout, /\.wrangler.*directory.*removed/i, 'Should remove .wrangler directory');
      assert.match(result.stdout, /\.dev\.vars.*removed/i, 'Should remove .dev.vars file');
      assert.match(result.stdout, /migrations.*preserved/i, 'Should preserve migrations');
      assert.match(result.stdout, /wrangler\.jsonc.*preserved/i, 'Should preserve wrangler.jsonc');
    });

    test('should apply Vite-specific cleanup for vite-react projects', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/vite-react-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan vite-react cleanup');
      assert.match(result.stdout, /dist.*directory.*removed/i, 'Should remove dist directory');
      assert.match(result.stdout, /yarn\.lock.*removed/i, 'Should remove yarn.lock');
      assert.match(result.stdout, /vite\.config\.js.*preserved/i, 'Should preserve vite.config.js');
      assert.match(result.stdout, /index\.html.*preserved/i, 'Should preserve index.html');
      assert.match(result.stdout, /src\/.*preserved/i, 'Should preserve src directory');
    });

    test('should apply generic cleanup for generic projects', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan generic cleanup');
      assert.match(result.stdout, /node_modules.*removed/i, 'Should remove node_modules');
      assert.match(result.stdout, /\.env\.local.*removed/i, 'Should remove .env.local');
      assert.match(result.stdout, /package\.json.*preserved/i, 'Should preserve package.json');
      assert.match(result.stdout, /src\/.*preserved/i, 'Should preserve src directory');
      assert.doesNotMatch(result.stdout, /wrangler|\.wrangler|vite\.config/i, 'Should not mention framework-specific files');
    });
  });

  describe('Cleanup Error Handling', () => {
    test('should handle missing files gracefully', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully handle missing files');
      assert.match(result.stdout, /missing.*files.*skipped/i, 'Should skip missing files');
      assert.match(result.stdout, /cleanup.*continues.*missing.*files/i, 'Should continue cleanup despite missing files');
    });

    test('should provide detailed error reporting', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully plan cleanup');
      assert.match(result.stdout, /error.*reporting.*included/i, 'Should include error reporting');
      assert.match(result.stdout, /failed.*operations.*logged/i, 'Should log failed operations');
    });
  });
});