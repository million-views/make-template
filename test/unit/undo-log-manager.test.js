/**
 * Undo Log Manager Unit Tests
 * 
 * Tests for the undo log creation, reading, and validation functionality.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UndoLogManager } from '../../src/lib/restoration/undo-log-manager.js';

describe('UndoLogManager', () => {
  let undoLogManager;
  let testDir;

  beforeEach(async () => {
    undoLogManager = new UndoLogManager();
    testDir = join(process.cwd(), 'test-temp-undo-log');
    
    // Create test directory
    try {
      await mkdir(testDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Change back to original directory
    process.chdir(join(testDir, '..'));
    
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('createUndoLog', () => {
    it('should create basic undo log structure', async () => {
      const conversionPlan = {
        analysis: {
          projectType: 'generic',
          placeholders: [
            { placeholder: '{{PROJECT_NAME}}', value: 'my-project', files: ['package.json'] }
          ]
        },
        actions: []
      };

      const undoLog = await undoLogManager.createUndoLog(conversionPlan);

      assert.strictEqual(undoLog.version, '1.0.0');
      assert.strictEqual(undoLog.metadata.projectType, 'generic');
      assert.ok(undoLog.metadata.timestamp);
      assert.strictEqual(undoLog.originalValues['{{PROJECT_NAME}}'], 'my-project');
      assert.strictEqual(undoLog.sanitized, false);
      assert.ok(Array.isArray(undoLog.fileOperations));
    });

    it('should capture placeholder values correctly', async () => {
      const conversionPlan = {
        analysis: {
          projectType: 'cf-d1',
          placeholders: [
            { placeholder: '{{PROJECT_NAME}}', value: 'my-cf-project', files: ['package.json'] },
            { placeholder: '{{AUTHOR_NAME}}', value: 'John Doe', files: ['package.json'] },
            { placeholder: '{{CLOUDFLARE_ACCOUNT_ID}}', value: 'abc123def456', files: ['wrangler.jsonc'] }
          ]
        },
        actions: []
      };

      const undoLog = await undoLogManager.createUndoLog(conversionPlan);

      assert.strictEqual(undoLog.originalValues['{{PROJECT_NAME}}'], 'my-cf-project');
      assert.strictEqual(undoLog.originalValues['{{AUTHOR_NAME}}'], 'John Doe');
      assert.strictEqual(undoLog.originalValues['{{CLOUDFLARE_ACCOUNT_ID}}'], 'abc123def456');
    });

    it('should process file modification actions', async () => {
      // Create test file
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }, null, 2));

      const conversionPlan = {
        analysis: {
          projectType: 'generic',
          placeholders: []
        },
        actions: [
          {
            type: 'modify',
            file: 'package.json',
            replacements: [{ from: 'test-project', to: '{{PROJECT_NAME}}' }]
          }
        ]
      };

      const undoLog = await undoLogManager.createUndoLog(conversionPlan);

      const modifyOperation = undoLog.fileOperations.find(op => op.type === 'modified');
      assert.ok(modifyOperation);
      assert.strictEqual(modifyOperation.path, 'package.json');
      assert.ok(modifyOperation.originalContent.includes('test-project'));
      assert.strictEqual(modifyOperation.restorationAction, 'restore-content');
    });

    it('should process file deletion actions with categorization', async () => {
      // Create test files
      await writeFile('.env', 'DATABASE_URL=postgres://localhost');
      await writeFile('package-lock.json', '{"lockfileVersion": 2}');

      const conversionPlan = {
        analysis: {
          projectType: 'generic',
          placeholders: []
        },
        actions: [
          { type: 'delete', path: '.env' },
          { type: 'delete', path: 'package-lock.json' }
        ]
      };

      const undoLog = await undoLogManager.createUndoLog(conversionPlan);

      const envOperation = undoLog.fileOperations.find(op => op.path === '.env');
      const lockOperation = undoLog.fileOperations.find(op => op.path === 'package-lock.json');

      assert.ok(envOperation);
      assert.strictEqual(envOperation.type, 'deleted');
      assert.strictEqual(envOperation.category, 'userCreated');
      assert.ok(envOperation.originalContent.includes('DATABASE_URL'));

      assert.ok(lockOperation);
      assert.strictEqual(lockOperation.type, 'deleted');
      assert.strictEqual(lockOperation.category, 'generated');
      assert.strictEqual(lockOperation.originalContent, null); // Generated files don't store content
    });

    it('should process file creation actions', async () => {
      const conversionPlan = {
        analysis: {
          projectType: 'generic',
          placeholders: []
        },
        actions: [
          {
            type: 'create',
            file: 'template.json',
            content: '{"name": "test-template"}'
          }
        ]
      };

      const undoLog = await undoLogManager.createUndoLog(conversionPlan);

      const createOperation = undoLog.fileOperations.find(op => op.type === 'created');
      assert.ok(createOperation);
      assert.strictEqual(createOperation.path, 'template.json');
      assert.strictEqual(createOperation.restorationAction, 'preserve');
      assert.strictEqual(createOperation.category, 'templateFiles');
    });
  });

  describe('readUndoLog', () => {
    it('should read and validate valid undo log', async () => {
      const validUndoLog = {
        version: '1.0.0',
        metadata: {
          makeTemplateVersion: '1.0.0',
          projectType: 'generic',
          timestamp: new Date().toISOString(),
          placeholderFormat: '{{PLACEHOLDER_NAME}}'
        },
        originalValues: {
          '{{PROJECT_NAME}}': 'test-project'
        },
        fileOperations: [
          {
            type: 'modified',
            path: 'package.json',
            originalContent: '{"name": "test-project"}',
            restorationAction: 'restore-content'
          }
        ],
        sanitized: false,
        sanitizationMap: {}
      };

      await writeFile('.template-undo.json', JSON.stringify(validUndoLog, null, 2));

      const readUndoLog = await undoLogManager.readUndoLog();
      
      assert.strictEqual(readUndoLog.version, '1.0.0');
      assert.strictEqual(readUndoLog.metadata.projectType, 'generic');
      assert.strictEqual(readUndoLog.originalValues['{{PROJECT_NAME}}'], 'test-project');
    });

    it('should throw error for missing undo log', async () => {
      await assert.rejects(
        () => undoLogManager.readUndoLog('nonexistent.json'),
        /Undo log not found/
      );
    });

    it('should throw error for invalid JSON', async () => {
      await writeFile('.template-undo.json', 'invalid json content');

      await assert.rejects(
        () => undoLogManager.readUndoLog(),
        /invalid JSON/
      );
    });

    it('should throw error for missing required fields', async () => {
      const invalidUndoLog = {
        version: '1.0.0'
        // Missing required fields
      };

      await writeFile('.template-undo.json', JSON.stringify(invalidUndoLog));

      await assert.rejects(
        () => undoLogManager.readUndoLog(),
        /missing required field/
      );
    });
  });

  describe('validateUndoLogVersion', () => {
    it('should validate compatible versions', () => {
      const undoLog = { version: '1.0.0' };
      assert.ok(undoLogManager.validateUndoLogVersion(undoLog));
    });

    it('should reject incompatible versions', () => {
      const undoLog = { version: '2.0.0' };
      assert.ok(!undoLogManager.validateUndoLogVersion(undoLog));
    });
  });

  describe('sanitizeUndoLog', () => {
    it('should sanitize email addresses', async () => {
      const undoLog = {
        version: '1.0.0',
        metadata: {},
        originalValues: {
          '{{AUTHOR_EMAIL}}': 'john.doe@example.com'
        },
        fileOperations: [
          {
            type: 'modified',
            path: 'package.json',
            originalContent: '{"author": "john.doe@example.com"}'
          }
        ],
        sanitized: false,
        sanitizationMap: {}
      };

      await undoLogManager.sanitizeUndoLog(undoLog);

      assert.strictEqual(undoLog.sanitized, true);
      assert.strictEqual(undoLog.originalValues['{{AUTHOR_EMAIL}}'], '{{SANITIZED_VALUE}}');
      assert.ok(undoLog.fileOperations[0].originalContent.includes('{{SANITIZED_VALUE}}'));
      assert.ok(undoLog.sanitizationMap.personalInfo);
    });

    it('should sanitize file paths with user directories', async () => {
      const undoLog = {
        version: '1.0.0',
        metadata: {},
        originalValues: {},
        fileOperations: [
          {
            type: 'modified',
            path: '/Users/john/project/package.json',
            originalContent: 'content'
          }
        ],
        sanitized: false,
        sanitizationMap: {}
      };

      await undoLogManager.sanitizeUndoLog(undoLog);

      assert.strictEqual(undoLog.sanitized, true);
      assert.ok(undoLog.fileOperations[0].path.includes('{{SANITIZED_VALUE}}'));
    });

    it('should sanitize API keys', async () => {
      const undoLog = {
        version: '1.0.0',
        metadata: {},
        originalValues: {
          '{{API_KEY}}': 'sk-1234567890abcdef1234567890abcdef1234567890abcdef'
        },
        fileOperations: [],
        sanitized: false,
        sanitizationMap: {}
      };

      await undoLogManager.sanitizeUndoLog(undoLog);

      assert.strictEqual(undoLog.sanitized, true);
      assert.strictEqual(undoLog.originalValues['{{API_KEY}}'], '{{SANITIZED_API_KEY}}');
      assert.ok(undoLog.sanitizationMap.apiKeys);
    });
  });

  describe('getUndoLogSummary', () => {
    it('should generate correct summary', () => {
      const undoLog = {
        version: '1.0.0',
        metadata: {
          projectType: 'cf-d1',
          timestamp: '2024-01-01T00:00:00.000Z'
        },
        originalValues: {
          '{{PROJECT_NAME}}': 'test',
          '{{AUTHOR_NAME}}': 'John'
        },
        fileOperations: [
          { type: 'modified', fileSize: 100 },
          { type: 'deleted', fileSize: 200 },
          { type: 'created', fileSize: 50 }
        ],
        sanitized: false
      };

      const summary = undoLogManager.getUndoLogSummary(undoLog);

      assert.strictEqual(summary.version, '1.0.0');
      assert.strictEqual(summary.projectType, 'cf-d1');
      assert.strictEqual(summary.placeholderCount, 2);
      assert.strictEqual(summary.fileOperations.modified, 1);
      assert.strictEqual(summary.fileOperations.deleted, 1);
      assert.strictEqual(summary.fileOperations.created, 1);
      assert.strictEqual(summary.totalSize, 350);
      assert.strictEqual(summary.sanitized, false);
    });
  });

  describe('validateUndoLogIntegrity', () => {
    it('should validate complete undo log', () => {
      const undoLog = {
        version: '1.0.0',
        metadata: {},
        originalValues: {
          '{{PROJECT_NAME}}': 'test'
        },
        fileOperations: [
          {
            type: 'deleted',
            category: 'userCreated',
            originalContent: 'content'
          },
          {
            type: 'created',
            category: 'templateFiles'
          }
        ]
      };

      const result = undoLogManager.validateUndoLogIntegrity(undoLog);

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.issues.length, 0);
    });

    it('should warn about missing content for user files', () => {
      const undoLog = {
        version: '1.0.0',
        metadata: {},
        originalValues: {
          '{{PROJECT_NAME}}': 'test'
        },
        fileOperations: [
          {
            type: 'deleted',
            category: 'userCreated',
            originalContent: null // Missing content
          }
        ]
      };

      const result = undoLogManager.validateUndoLogIntegrity(undoLog);

      assert.strictEqual(result.valid, true);
      assert.ok(result.warnings.some(w => w.includes('missing content')));
    });
  });

  describe('sanitizeValue', () => {
    it('should sanitize individual values correctly', () => {
      const sanitizationMap = {};
      
      const email = 'test@example.com';
      const sanitizedEmail = undoLogManager.sanitizeValue(email, sanitizationMap);
      assert.strictEqual(sanitizedEmail, '{{SANITIZED_VALUE}}');
      assert.ok(sanitizationMap.personalInfo.includes(email));

      const apiKey = 'sk-1234567890abcdef1234567890abcdef1234567890abcdef';
      const sanitizedKey = undoLogManager.sanitizeValue(apiKey, sanitizationMap);
      assert.strictEqual(sanitizedKey, '{{SANITIZED_API_KEY}}');
      assert.ok(sanitizationMap.apiKeys.includes(apiKey));
    });

    it('should not modify non-sensitive values', () => {
      const sanitizationMap = {};
      const normalValue = 'just a normal string';
      const result = undoLogManager.sanitizeValue(normalValue, sanitizationMap);
      assert.strictEqual(result, normalValue);
    });
  });
});