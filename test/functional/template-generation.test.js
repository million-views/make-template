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

describe('Template Generation Tests', () => {
  describe('_setup.mjs Generation', () => {
    test('should generate _setup.mjs with correct Environment object destructuring', async () => {
      const result = await runCLI(['--dry-run'], { 
        cwd: join(__dirname, '../fixtures/input-projects/generic-node-project')
      });
      
      assert.strictEqual(result.code, 0, 'Should successfully generate setup script');
      assert.match(result.stdout, /_setup\.mjs.*will be created/i, 'Should indicate _setup.mjs creation');
      assert.match(result.stdout, /export default async function setup\(\{ ctx, tools \}\)/i, 'Should use correct Environment destructuring');
      assert.match(result.stdout, /async function setup\(\{ ctx, tools \}\)/i, 'Should destructure ctx and tools parameters');
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
      assert.match(result.stdout, /index\.html.*title.*replacement/i, 'Should handle index.html title');
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
      assert.match(result.stdout, /"placeholders".*array/i, 'Should include placeholders array');
      assert.match(result.stdout, /"name".*"{{PROJECT_NAME}}"/i, 'Should define PROJECT_NAME placeholder');
      assert.match(result.stdout, /"description".*"name of the project"/i, 'Should include placeholder descriptions');
      assert.match(result.stdout, /"required".*true/i, 'Should mark required placeholders');
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
      assert.match(result.stdout, /migrations.*preserved/i, 'Should preserve migrations');
      
      // Template metadata should include cf-d1 specifics
      assert.match(result.stdout, /supportedOptions.*database.*migration/i, 'Should include database options');
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
      assert.doesNotMatch(result.stdout, /wrangler|vite|cloudflare|d1|turso/i, 'Should not include framework-specific logic');
      
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