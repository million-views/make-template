/**
 * Restoration Safety Features Tests
 *
 * Tests for file conflict detection, backup options, and rollback functionality.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'fs';
import { join } from 'path';
import { RestorationProcessor } from '../../src/lib/processors/restoration-processor.js';
import { FSUtils } from '../../src/lib/utils/fs-utils.js';

describe('RestorationProcessor Safety Features', () => {
  let processor;
  let testDir;
  let originalCwd;

  beforeEach(async () => {
    processor = new RestorationProcessor();
    // During unit tests, reduce logger verbosity to avoid sending large
    // or structured objects through console which can interfere with the
    // test runner's IPC serialization. Keep errors visible.
    try {
      if (processor && processor.logger && typeof processor.logger.setLevel === 'function') {
        processor.logger.setLevel('error');
      }
    } catch (e) {
      // ignore
    }
    const { mkdtemp } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    testDir = await mkdtemp(join(tmpdir(), 'safety-'));
    originalCwd = process.cwd();
    await FSUtils.ensureDir(testDir);
    process.chdir(testDir);
  });

  afterEach(async () => {
    try { process.chdir(originalCwd); } catch (e) { }
    await FSUtils.remove(testDir);
  });

  describe('conflict detection', () => {
    it('should detect file conflicts before restoration', async () => {
      // Create existing files that would conflict
      await FSUtils.writeFileAtomic('existing.txt', 'existing content');
      await FSUtils.writeFileAtomic('another.txt', 'another content');

      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'recreate-file',
            path: 'existing.txt',
            content: 'new content'
          },
          {
            type: 'recreate-file',
            path: 'nonexistent.txt',
            content: 'content'
          },
          {
            type: 'recreate-file',
            path: 'another.txt',
            content: 'different content'
          }
        ],
        missingValues: [],
        warnings: []
      };

      const conflicts = await processor.detectConflicts(plan);

      assert.strictEqual(conflicts.length, 2);
      assert.strictEqual(conflicts[0].type, 'file-exists');
      assert.strictEqual(conflicts[0].path, 'existing.txt');
      assert.strictEqual(conflicts[0].action, 'recreate-file');
      assert.strictEqual(conflicts[1].type, 'file-exists');
      assert.strictEqual(conflicts[1].path, 'another.txt');
      assert.strictEqual(conflicts[1].action, 'recreate-file');
    });

    it('should not detect conflicts for restore-file actions', async () => {
      await FSUtils.writeFileAtomic('existing.txt', 'content');

      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: 'existing.txt',
            content: 'restored content'
          }
        ],
        missingValues: [],
        warnings: []
      };

      const conflicts = await processor.detectConflicts(plan);
      assert.strictEqual(conflicts.length, 0);
    });

    it('should handle empty plans', async () => {
      const plan = {
        mode: 'full',
        actions: [],
        missingValues: [],
        warnings: []
      };

      const conflicts = await processor.detectConflicts(plan);
      assert.strictEqual(conflicts.length, 0);
    });
  });

  describe('backup creation', () => {
    it('should create backups of existing files', async () => {
      // Create test files
      await FSUtils.writeFileAtomic('file1.txt', 'content1');
      await FSUtils.writeFileAtomic('file2.txt', 'content2');

      const filePaths = ['file1.txt', 'file2.txt', 'nonexistent.txt'];
      const backupResult = await processor.createBackups(filePaths);

      assert.strictEqual(backupResult.backups.length, 2);
      assert.ok(backupResult.timestamp);

      // Check backup files exist
      for (const backup of backupResult.backups) {
        assert.strictEqual(await FSUtils.exists(backup.backup), true);
        const backupContent = await FSUtils.readFile(backup.backup);
        const originalContent = await FSUtils.readFile(backup.original);
        assert.strictEqual(backupContent, originalContent);
      }
    });

    it('should handle empty file list', async () => {
      const backupResult = await processor.createBackups([]);

      assert.strictEqual(backupResult.backups.length, 0);
      assert.ok(backupResult.timestamp);
    });

    it('should skip non-existent files gracefully', async () => {
      const filePaths = ['nonexistent1.txt', 'nonexistent2.txt'];
      const backupResult = await processor.createBackups(filePaths);

      assert.strictEqual(backupResult.backups.length, 0);
      assert.ok(backupResult.timestamp);
    });
  });

  describe('rollback functionality', () => {
    it('should rollback restoration using backups', async () => {
      // Create original files
      await FSUtils.writeFileAtomic('file1.txt', 'original1');
      await FSUtils.writeFileAtomic('file2.txt', 'original2');

      // Create backups
      const backupResult = await processor.createBackups(['file1.txt', 'file2.txt']);

      // Modify original files (simulate partial restoration)
      await FSUtils.writeFileAtomic('file1.txt', 'modified1');
      await FSUtils.writeFileAtomic('file2.txt', 'modified2');

      // Rollback
      const rollbackResult = await processor.rollbackRestoration({}, backupResult);

      assert.strictEqual(rollbackResult.success, true);
      assert.strictEqual(rollbackResult.restoredFiles, 2);
      assert.strictEqual(rollbackResult.errors.length, 0);

      // Verify files are restored
      const content1 = await FSUtils.readFile('file1.txt');
      const content2 = await FSUtils.readFile('file2.txt');
      assert.strictEqual(content1, 'original1');
      assert.strictEqual(content2, 'original2');

      // Verify backup files are cleaned up
      for (const backup of backupResult.backups) {
        assert.strictEqual(await FSUtils.exists(backup.backup), false);
      }
    });

    it('should handle rollback errors gracefully', async () => {
      // Create a backup structure with invalid paths
      const invalidBackups = {
        backups: [
          { original: 'file1.txt', backup: '/invalid/path/backup1.txt' },
          { original: 'file2.txt', backup: '/invalid/path/backup2.txt' }
        ],
        timestamp: '2024-01-01T00-00-00-000Z'
      };

      const rollbackResult = await processor.rollbackRestoration({}, invalidBackups);

      assert.strictEqual(rollbackResult.success, false);
      assert.strictEqual(rollbackResult.restoredFiles, 0);
      assert.strictEqual(rollbackResult.errors.length, 2);
    });

    it('should handle empty backup data', async () => {
      const rollbackResult = await processor.rollbackRestoration({}, null);

      assert.strictEqual(rollbackResult.success, true);
      assert.strictEqual(rollbackResult.restoredFiles, 0);
      assert.strictEqual(rollbackResult.errors.length, 0);
    });
  });

  describe('atomic operations with safety', () => {
    it('should execute plan with backup and rollback on failure', async () => {
      // Create existing files
      await FSUtils.writeFileAtomic('important.txt', 'important data');
      await FSUtils.writeFileAtomic('config.json', '{"key": "value"}');

      // Create a plan that will partially fail
      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: 'important.txt',
            content: 'restored important data'
          },
          {
            type: 'restore-file',
            path: 'nonexistent.txt', // This will fail
            content: 'content'
          },
          {
            type: 'restore-file',
            path: 'config.json',
            content: '{"key": "restored"}'
          }
        ],
        missingValues: [],
        warnings: []
      };

      // Execute with safety features
      const result = await processor.executePlanWithSafety(plan, { createBackups: true });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.actionsExecuted, 2);
      assert.strictEqual(result.errors.length, 1);
      assert.ok(result.backupInfo);
    });

    it('should execute plan successfully without rollback', async () => {
      await FSUtils.writeFileAtomic('test.txt', 'original');

      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: 'test.txt',
            content: 'restored content'
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlanWithSafety(plan, { createBackups: true });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.actionsExecuted, 1);
      assert.strictEqual(result.errors.length, 0);
      assert.ok(result.backupInfo);

      const content = await FSUtils.readFile('test.txt');
      assert.strictEqual(content, 'restored content');
    });
  });

  describe('validation and safety checks', () => {
    it('should validate plan before execution', async () => {
      const invalidPlan = {
        mode: 'full',
        actions: [
          {
            // Missing type field
            path: 'test.txt',
            content: 'content'
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlanWithSafety(invalidPlan);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errors.length, 1);
      assert.ok(result.errors[0].includes("Action 0 missing required 'type' field"));
    });

    it('should handle safety options', async () => {
      await FSUtils.writeFileAtomic('test.txt', 'content');

      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: 'test.txt',
            content: 'new content'
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlanWithSafety(plan, {
        createBackups: false,
        detectConflicts: true
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.backupInfo, undefined);
      assert.ok(result.conflicts);
    });
  });

  describe('statistics and reporting', () => {
    it('should provide detailed restoration statistics', async () => {
      await FSUtils.writeFileAtomic('file1.txt', 'content1');
      await FSUtils.writeFileAtomic('file2.txt', 'content2');

      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: 'file1.txt',
            content: 'restored1'
          },
          {
            type: 'recreate-file',
            path: 'new.txt',
            content: 'new content'
          },
          {
            type: 'preserve-file',
            path: 'file2.txt'
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlan(plan);
      const stats = processor.getRestorationStats(result);

      assert.strictEqual(stats.total, 3);
      assert.strictEqual(stats.successful, 3);
      assert.strictEqual(stats.failed, 0);
      assert.strictEqual(stats.operations['restore-content'], 1);
      assert.strictEqual(stats.operations['recreate-content'], 1);
      assert.strictEqual(stats.operations['preserve'], 1);
    });
  });
});