/**
 * Undo Log Integration Tests
 *
 * Tests for the integration of undo log generation with the conversion engine.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { writeFile, mkdir, rm, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ConversionEngine } from '../../src/lib/engine.js';

describe('Undo Log Integration', () => {
  let conversionEngine;
  let testDir;
  let originalCwd;

  beforeEach(async () => {
    conversionEngine = new ConversionEngine();
    originalCwd = process.cwd();

    // Use OS temp dir to avoid creating test-temp directories in the repo
    testDir = join(tmpdir(), `make-template-test-${Date.now()}`);

    // Create test directory
    await mkdir(testDir, { recursive: true });

    // Change to test directory
    process.chdir(testDir);

    // Create basic project structure
    await writeFile('package.json', JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      description: 'A test project'
    }, null, 2));

    await writeFile('README.md', '# Test Project\n\nThis is a test project.');
    await writeFile('.env', 'DATABASE_URL=postgres://localhost/test');
    await writeFile('package-lock.json', '{"lockfileVersion": 2}');
  });

  afterEach(async () => {
    // Change back to original directory
    try { process.chdir(originalCwd); } catch (e) { }

    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('executePlan with undo log generation', () => {
    it('should generate undo log during conversion', async () => {
      const plan = {
        analysis: {
          projectType: 'generic',
          placeholders: [
            { placeholder: '{{PROJECT_NAME}}', value: 'test-project', files: ['package.json'] }
          ]
        },
        actions: [
          {
            type: 'modify',
            file: 'package.json',
            replacements: [{ from: 'test-project', to: '{{PROJECT_NAME}}' }]
          },
          {
            type: 'delete',
            path: '.env'
          },
          {
            type: 'delete',
            path: 'package-lock.json'
          },
          {
            type: 'create',
            file: 'template.json',
            content: '{"name": "test-template"}'
          }
        ],
        options: {}
      };

      await conversionEngine.executePlan(plan);

      // Check that undo log was created
      const undoLogExists = await access('.template-undo.json').then(() => true).catch(() => false);
      assert.ok(undoLogExists, 'Undo log should be created');

      // Read and validate undo log
      const undoLogContent = await readFile('.template-undo.json', 'utf8');
      const undoLog = JSON.parse(undoLogContent);

      assert.strictEqual(undoLog.version, '1.0.0');
      assert.strictEqual(undoLog.metadata.projectType, 'generic');
      assert.strictEqual(undoLog.originalValues['{{PROJECT_NAME}}'], 'test-project');
      assert.ok(Array.isArray(undoLog.fileOperations));
      assert.ok(undoLog.fileOperations.length > 0);

      // Check file operations
      const modifyOperation = undoLog.fileOperations.find(op => op.type === 'modified');
      const deleteOperations = undoLog.fileOperations.filter(op => op.type === 'deleted');
      const createOperation = undoLog.fileOperations.find(op => op.type === 'created');

      assert.ok(modifyOperation, 'Should have modify operation');
      assert.strictEqual(modifyOperation.path, 'package.json');
      assert.ok(modifyOperation.originalContent.includes('test-project'));

      assert.strictEqual(deleteOperations.length, 2, 'Should have two delete operations');

      assert.ok(createOperation, 'Should have create operation');
      assert.strictEqual(createOperation.path, 'template.json');
    });

    it('should generate sanitized undo log when requested', async () => {
      // Create a file with sensitive data
      await writeFile('config.json', JSON.stringify({
        email: 'user@example.com',
        apiKey: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef'
      }, null, 2));

      const plan = {
        analysis: {
          projectType: 'generic',
          placeholders: [
            { placeholder: '{{EMAIL}}', value: 'user@example.com', files: ['config.json'] }
          ]
        },
        actions: [
          {
            type: 'modify',
            file: 'config.json',
            replacements: [{ from: 'user@example.com', to: '{{EMAIL}}' }]
          }
        ],
        options: {
          'sanitize-undo': true
        }
      };

      await conversionEngine.executePlan(plan);

      // Read and validate sanitized undo log
      const undoLogContent = await readFile('.template-undo.json', 'utf8');
      const undoLog = JSON.parse(undoLogContent);

      assert.strictEqual(undoLog.sanitized, true);
      assert.ok(undoLog.sanitizationMap);

      // Check that sensitive data was sanitized
      const modifyOperation = undoLog.fileOperations.find(op => op.type === 'modified');
      assert.ok(modifyOperation.originalContent.includes('{{SANITIZED_VALUE}}'));
      assert.ok(modifyOperation.originalContent.includes('{{SANITIZED_API_KEY}}'));
    });

    it('should handle file categorization correctly', async () => {
      const plan = {
        analysis: {
          projectType: 'generic',
          placeholders: []
        },
        actions: [
          {
            type: 'delete',
            path: '.env'
          },
          {
            type: 'delete',
            path: 'package-lock.json'
          }
        ],
        options: {}
      };

      await conversionEngine.executePlan(plan);

      // Read undo log
      const undoLogContent = await readFile('.template-undo.json', 'utf8');
      const undoLog = JSON.parse(undoLogContent);

      const envOperation = undoLog.fileOperations.find(op => op.path === '.env');
      const lockOperation = undoLog.fileOperations.find(op => op.path === 'package-lock.json');

      // .env should be categorized as userCreated and have content stored
      assert.ok(envOperation);
      assert.strictEqual(envOperation.category, 'userCreated');
      assert.ok(envOperation.originalContent);
      assert.ok(envOperation.originalContent.includes('DATABASE_URL'));

      // package-lock.json should be categorized as generated and not have content stored
      assert.ok(lockOperation);
      assert.strictEqual(lockOperation.category, 'generated');
      assert.strictEqual(lockOperation.originalContent, null);
      assert.ok(lockOperation.regenerationCommand);
    });

    it('should preserve template files during restoration planning', async () => {
      const plan = {
        analysis: {
          projectType: 'generic',
          placeholders: []
        },
        actions: [
          {
            type: 'create',
            file: 'template.json',
            content: '{"name": "test-template"}'
          },
          {
            type: 'create',
            file: '_setup.mjs',
            content: 'export default function setup() {}'
          }
        ],
        options: {}
      };

      await conversionEngine.executePlan(plan);

      // Read undo log
      const undoLogContent = await readFile('.template-undo.json', 'utf8');
      const undoLog = JSON.parse(undoLogContent);

      const templateOperations = undoLog.fileOperations.filter(op => op.type === 'created');

      assert.strictEqual(templateOperations.length, 2);

      for (const operation of templateOperations) {
        assert.strictEqual(operation.category, 'templateFiles');
        assert.strictEqual(operation.restorationAction, 'preserve');
      }
    });
  });

  describe('error handling', () => {
    it('should handle undo log generation errors gracefully', async () => {
      // Create a plan with invalid file reference
      const plan = {
        analysis: {
          projectType: 'generic',
          placeholders: []
        },
        actions: [
          {
            type: 'modify',
            file: 'nonexistent.json',
            replacements: []
          }
        ],
        options: {}
      };

      // Should throw error but not crash
      await assert.rejects(
        () => conversionEngine.executePlan(plan),
        /Failed to execute conversion plan/
      );
    });
  });
});