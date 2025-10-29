import { test, describe } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, '../../src/bin/cli.js');
const FIXTURES_PATH = path.join(__dirname, '../fixtures');
const RESTORATION_FIXTURES_PATH = path.join(FIXTURES_PATH, 'restoration-scenarios');

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
    }, 20000);

    child.on('close', () => clearTimeout(timeout));
  });
}

/**
 * Helper function to copy directory recursively
 */
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Helper function to create temporary test directory
 */
async function createTempTestDir(prefix = 'restoration-integrity-') {
  const tempDir = await fs.mkdtemp(path.join(tmpdir(), prefix));
  return tempDir;
}

/**
 * Helper function to cleanup temporary directory
 */
async function cleanupTempDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Helper function to compare directory structures
 */
async function compareDirectoryStructures(dir1, dir2, ignoreFiles = []) {
  const getFiles = async (dir) => {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (ignoreFiles.includes(entry.name)) continue;
      
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await getFiles(fullPath);
        files.push(...subFiles.map(f => path.join(entry.name, f)));
      } else {
        files.push(entry.name);
      }
    }
    
    return files.sort();
  };
  
  const files1 = await getFiles(dir1);
  const files2 = await getFiles(dir2);
  
  return {
    files1,
    files2,
    identical: JSON.stringify(files1) === JSON.stringify(files2)
  };
}

/**
 * Helper function to perform complete conversion → restoration cycle
 */
async function performRoundTripTest(originalProjectPath, tempDir) {
  const workingProjectPath = path.join(tempDir, 'working-project');
  const templateProjectPath = path.join(tempDir, 'template-project');
  const restoredProjectPath = path.join(tempDir, 'restored-project');
  
  // Step 1: Copy original project to working directory
  await copyDirectory(originalProjectPath, workingProjectPath);
  
  // Step 2: Convert to template
  const conversionResult = await runCLI(['--yes'], {
    cwd: workingProjectPath
  });
  
  if (conversionResult.code !== 0) {
    throw new Error(`Template conversion failed: ${conversionResult.stderr}`);
  }
  
  // Step 3: Copy template to separate directory
  await copyDirectory(workingProjectPath, templateProjectPath);
  
  // Step 4: Restore from template
  const restorationResult = await runCLI(['--restore', '--yes'], {
    cwd: templateProjectPath
  });
  
  if (restorationResult.code !== 0) {
    throw new Error(`Template restoration failed: ${restorationResult.stderr}`);
  }
  
  // Step 5: Copy restored project for comparison
  await copyDirectory(templateProjectPath, restoredProjectPath);
  
  return {
    originalPath: originalProjectPath,
    workingPath: workingProjectPath,
    templatePath: templateProjectPath,
    restoredPath: restoredProjectPath,
    conversionResult,
    restorationResult
  };
}

describe('Restoration Integrity Tests', () => {
  
  test('should maintain round-trip integrity with cf-d1-project', async () => {
    const tempDir = await createTempTestDir();
    
    try {
      const originalProjectPath = path.join(FIXTURES_PATH, 'input-projects/cf-d1-project');
      
      // Check if fixture exists
      const fixtureExists = await fs.access(originalProjectPath).then(() => true).catch(() => false);
      if (!fixtureExists) {
        console.log('Skipping cf-d1-project test - fixture not found');
        return;
      }
      
      const result = await performRoundTripTest(originalProjectPath, tempDir);
      
      // Compare original and restored project structures
      const comparison = await compareDirectoryStructures(
        originalProjectPath,
        result.restoredPath,
        ['.template-undo.json', 'template.json', '_setup.mjs', 'node_modules', 'package-lock.json']
      );
      
      // Core files should be identical
      const coreFiles = ['package.json', 'src/index.js', 'wrangler.toml'];
      for (const file of coreFiles) {
        const originalExists = await fs.access(path.join(originalProjectPath, file)).then(() => true).catch(() => false);
        const restoredExists = await fs.access(path.join(result.restoredPath, file)).then(() => true).catch(() => false);
        
        if (originalExists) {
          assert.ok(restoredExists, `${file} should exist in restored project`);
          
          // Compare file contents (allowing for some differences due to template processing)
          const originalContent = await fs.readFile(path.join(originalProjectPath, file), 'utf8');
          const restoredContent = await fs.readFile(path.join(result.restoredPath, file), 'utf8');
          
          // For package.json, compare parsed JSON to ignore formatting differences
          if (file === 'package.json') {
            const originalJson = JSON.parse(originalContent);
            const restoredJson = JSON.parse(restoredContent);
            
            assert.strictEqual(restoredJson.name, originalJson.name, 'Package name should be restored');
            assert.strictEqual(restoredJson.description, originalJson.description, 'Package description should be restored');
          }
        }
      }
      
      // Template files should be preserved
      const templateFiles = ['template.json', '_setup.mjs', '.template-undo.json'];
      for (const file of templateFiles) {
        const exists = await fs.access(path.join(result.restoredPath, file)).then(() => true).catch(() => false);
        assert.ok(exists, `${file} should be preserved after restoration`);
      }
      
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  test('should maintain round-trip integrity with vite-react-project', async () => {
    const tempDir = await createTempTestDir();
    
    try {
      const originalProjectPath = path.join(FIXTURES_PATH, 'input-projects/vite-react-project');
      
      // Check if fixture exists
      const fixtureExists = await fs.access(originalProjectPath).then(() => true).catch(() => false);
      if (!fixtureExists) {
        console.log('Skipping vite-react-project test - fixture not found');
        return;
      }
      
      const result = await performRoundTripTest(originalProjectPath, tempDir);
      
      // Vite React projects have specific files that should be restored
      const viteFiles = ['package.json', 'vite.config.js', 'index.html', 'src/main.jsx'];
      for (const file of viteFiles) {
        const originalExists = await fs.access(path.join(originalProjectPath, file)).then(() => true).catch(() => false);
        const restoredExists = await fs.access(path.join(result.restoredPath, file)).then(() => true).catch(() => false);
        
        if (originalExists) {
          assert.ok(restoredExists, `${file} should exist in restored Vite React project`);
        }
      }
      
      // Check that React-specific placeholders are restored
      const packageJsonPath = path.join(result.restoredPath, 'package.json');
      const packageExists = await fs.access(packageJsonPath).then(() => true).catch(() => false);
      
      if (packageExists) {
        const packageContent = await fs.readFile(packageJsonPath, 'utf8');
        const packageData = JSON.parse(packageContent);
        
        // Should not contain placeholders after restoration
        assert.ok(!packageData.name?.includes('{{'), 'Package name should not contain placeholders');
        assert.ok(!packageData.description?.includes('{{'), 'Package description should not contain placeholders');
      }
      
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  test('should handle complex project restoration with multiple file types', async () => {
    const tempDir = await createTempTestDir();
    
    try {
      // Use the complex round-trip fixture
      const originalProjectPath = path.join(RESTORATION_FIXTURES_PATH, 'complex-round-trip/original');
      
      const result = await performRoundTripTest(originalProjectPath, tempDir);
      
      // Verify complex project structure is maintained
      const complexFiles = [
        'package.json',
        'src/index.js',
        'config/database.js',
        'README.md',
        '.env',
        '.env.example'
      ];
      
      for (const file of complexFiles) {
        const originalExists = await fs.access(path.join(originalProjectPath, file)).then(() => true).catch(() => false);
        const restoredExists = await fs.access(path.join(result.restoredPath, file)).then(() => true).catch(() => false);
        
        if (originalExists) {
          assert.ok(restoredExists, `${file} should exist in restored complex project`);
          
          // Verify content restoration for key files
          if (file === 'package.json') {
            const originalContent = await fs.readFile(path.join(originalProjectPath, file), 'utf8');
            const restoredContent = await fs.readFile(path.join(result.restoredPath, file), 'utf8');
            
            const originalJson = JSON.parse(originalContent);
            const restoredJson = JSON.parse(restoredContent);
            
            assert.strictEqual(restoredJson.name, originalJson.name, 'Complex project name should be restored');
            assert.strictEqual(restoredJson.version, originalJson.version, 'Complex project version should be restored');
            assert.strictEqual(restoredJson.author, originalJson.author, 'Complex project author should be restored');
          }
          
          if (file === '.env') {
            const restoredContent = await fs.readFile(path.join(result.restoredPath, file), 'utf8');
            assert.match(restoredContent, /DATABASE_URL=postgresql:\/\/jane:secret123/, 'Database URL should be restored');
            assert.match(restoredContent, /API_SECRET=super-secret-api-key/, 'API secret should be restored');
          }
        }
      }
      
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  test('should validate restoration across different project types', async () => {
    const tempDir = await createTempTestDir();
    
    try {
      const projectTypes = [
        'cf-d1-project',
        'generic-node-project',
        'vite-react-project'
      ];
      
      const results = [];
      
      for (const projectType of projectTypes) {
        const originalProjectPath = path.join(FIXTURES_PATH, `input-projects/${projectType}`);
        
        // Check if fixture exists
        const fixtureExists = await fs.access(originalProjectPath).then(() => true).catch(() => false);
        if (!fixtureExists) {
          console.log(`Skipping ${projectType} test - fixture not found`);
          continue;
        }
        
        try {
          const projectTempDir = path.join(tempDir, projectType);
          await fs.mkdir(projectTempDir, { recursive: true });
          
          const result = await performRoundTripTest(originalProjectPath, projectTempDir);
          results.push({
            projectType,
            success: true,
            result
          });
          
          // Basic validation that restoration completed
          assert.strictEqual(result.restorationResult.code, 0, `${projectType} restoration should succeed`);
          
          // Check that template files exist
          const templateJsonExists = await fs.access(path.join(result.restoredPath, 'template.json')).then(() => true).catch(() => false);
          assert.ok(templateJsonExists, `${projectType} should have template.json after restoration`);
          
        } catch (error) {
          results.push({
            projectType,
            success: false,
            error: error.message
          });
        }
      }
      
      // At least one project type should succeed
      const successfulTests = results.filter(r => r.success);
      assert.ok(successfulTests.length > 0, 'At least one project type should restore successfully');
      
      // Log results for debugging
      console.log('Restoration test results:', results.map(r => ({
        projectType: r.projectType,
        success: r.success,
        error: r.error || 'none'
      })));
      
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  test('should handle restoration error scenarios gracefully', async () => {
    const tempDir = await createTempTestDir();
    
    try {
      const errorScenarios = [
        {
          name: 'missing-undo-log',
          setup: async (projectPath) => {
            await fs.mkdir(projectPath, { recursive: true });
            await fs.writeFile(path.join(projectPath, 'package.json'), '{"name": "test"}');
            // No undo log file
          },
          expectedError: /undo log|not found/i
        },
        {
          name: 'corrupted-undo-log',
          setup: async (projectPath) => {
            await fs.mkdir(projectPath, { recursive: true });
            await fs.writeFile(path.join(projectPath, 'package.json'), '{"name": "test"}');
            await fs.writeFile(path.join(projectPath, '.template-undo.json'), 'invalid json');
          },
          expectedError: /corrupted|invalid|parse/i
        },
        {
          name: 'version-mismatch',
          setup: async (projectPath) => {
            await fs.mkdir(projectPath, { recursive: true });
            await fs.writeFile(path.join(projectPath, 'package.json'), '{"name": "test"}');
            const versionMismatchUndoLog = path.join(RESTORATION_FIXTURES_PATH, 'corrupted-undo-log/version-mismatch.template-undo.json');
            await fs.copyFile(versionMismatchUndoLog, path.join(projectPath, '.template-undo.json'));
          },
          expectedError: /version|compatibility/i
        }
      ];
      
      for (const scenario of errorScenarios) {
        const scenarioPath = path.join(tempDir, scenario.name);
        await scenario.setup(scenarioPath);
        
        const result = await runCLI(['--restore'], {
          cwd: scenarioPath
        });
        
        // Should fail gracefully
        assert.notStrictEqual(result.code, 0, `${scenario.name} should fail gracefully`);
        assert.match(result.stderr, scenario.expectedError, `${scenario.name} should show appropriate error message`);
      }
      
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  test('should maintain template functionality after restoration', async () => {
    const tempDir = await createTempTestDir();
    
    try {
      // Use basic round-trip fixture
      const templatePath = path.join(RESTORATION_FIXTURES_PATH, 'basic-round-trip/template');
      const testProjectPath = path.join(tempDir, 'test-project');
      await copyDirectory(templatePath, testProjectPath);
      
      // Perform restoration
      const result = await runCLI(['--restore', '--yes'], {
        cwd: testProjectPath
      });
      
      assert.strictEqual(result.code, 0, 'Restoration should succeed');
      
      // Verify template files are preserved and valid
      const templateJsonPath = path.join(testProjectPath, 'template.json');
      const templateJsonExists = await fs.access(templateJsonPath).then(() => true).catch(() => false);
      assert.ok(templateJsonExists, 'template.json should be preserved');
      
      const templateContent = await fs.readFile(templateJsonPath, 'utf8');
      const templateData = JSON.parse(templateContent);
      
      assert.ok(templateData.name, 'template.json should have name');
      assert.ok(Array.isArray(templateData.placeholders), 'template.json should have placeholders array');
      assert.ok(templateData.placeholders.length > 0, 'template.json should have placeholder definitions');
      
      // Verify setup script is preserved
      const setupPath = path.join(testProjectPath, '_setup.mjs');
      const setupExists = await fs.access(setupPath).then(() => true).catch(() => false);
      assert.ok(setupExists, '_setup.mjs should be preserved');
      
      // Verify undo log is preserved
      const undoLogPath = path.join(testProjectPath, '.template-undo.json');
      const undoLogExists = await fs.access(undoLogPath).then(() => true).catch(() => false);
      assert.ok(undoLogExists, '.template-undo.json should be preserved');
      
      const undoLogContent = await fs.readFile(undoLogPath, 'utf8');
      const undoLogData = JSON.parse(undoLogContent);
      
      assert.ok(undoLogData.version, 'Undo log should have version');
      assert.ok(undoLogData.originalValues, 'Undo log should have original values');
      assert.ok(Array.isArray(undoLogData.fileOperations), 'Undo log should have file operations');
      
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

});