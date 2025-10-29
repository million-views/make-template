/**
 * Restoration Safety Features Tests
 * 
 * Tests for file conflict detection, backup options, and rollback functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { RestorationProcessor } from '../../src/lib/processors/restoration-processor.js';
import { FSUtils } from '../../src/lib/utils/fs-utils.js';

describe('RestorationProcessor Safety Features', () => {
  let processor;
  let testDir;

  beforeEach(async () => {
    processor = new RestorationProcessor();
    testDir = join(process.cwd(), 'test-temp-safety');
    await FSUtils.ensureDir(testDir);
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(join(testDir, '..'));
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

      expect(conflicts).toHaveLength(2);
      expect(conflicts[0]).toMatchObject({
        type: 'file-exists',
        path: 'existing.txt',
        action: 'recreate-file'
      });
      expect(conflicts[1]).toMatchObject({
        type: 'file-exists',
        path: 'another.txt',
        action: 'recreate-file'
      });
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
      expect(conflicts).toHaveLength(0);
    });

    it('should handle empty plans', async () => {
      const plan = {
        mode: 'full',
        actions: [],
        missingValues: [],
        warnings: []
      };

      const conflicts = await processor.detectConflicts(plan);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('backup creation', () => {
    it('should create backups of existing files', async () => {
      // Create test files
      await FSUtils.writeFileAtomic('file1.txt', 'content1');
      await FSUtils.writeFileAtomic('file2.txt', 'content2');
      
      const filePaths = ['file1.txt', 'file2.txt', 'nonexistent.txt'];
      const backupResult = await processor.createBackups(filePaths);

      expect(backupResult.backups).toHaveLength(2);
      expect(backupResult.timestamp).toBeDefined();
      
      // Check backup files exist
      for (const backup of backupResult.backups) {
        expect(await FSUtils.exists(backup.backup)).toBe(true);
        const backupContent = await FSUtils.readFile(backup.backup);
        const originalContent = await FSUtils.readFile(backup.original);
        expect(backupContent).toBe(originalContent);
      }
    });

    it('should handle empty file list', async () => {
      const backupResult = await processor.createBackups([]);
      
      expect(backupResult.backups).toHaveLength(0);
      expect(backupResult.timestamp).toBeDefined();
    });

    it('should skip non-existent files gracefully', async () => {
      const filePaths = ['nonexistent1.txt', 'nonexistent2.txt'];
      const backupResult = await processor.createBackups(filePaths);

      expect(backupResult.backups).toHaveLength(0);
      expect(backupResult.timestamp).toBeDefined();
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
      
      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.restoredFiles).toBe(2);
      expect(rollbackResult.errors).toHaveLength(0);
      
      // Verify files are restored
      const content1 = await FSUtils.readFile('file1.txt');
      const content2 = await FSUtils.readFile('file2.txt');
      expect(content1).toBe('original1');
      expect(content2).toBe('original2');
      
      // Verify backup files are cleaned up
      for (const backup of backupResult.backups) {
        expect(await FSUtils.exists(backup.backup)).toBe(false);
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
      
      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.restoredFiles).toBe(0);
      expect(rollbackResult.errors).toHaveLength(2);
    });

    it('should handle empty backup data', async () => {
      const rollbackResult = await processor.rollbackRestoration({}, null);
      
      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.restoredFiles).toBe(0);
      expect(rollbackResult.errors).toHaveLength(0);
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

      expect(result.success).toBe(false);
      expect(result.actionsExecuted).toBe(2); // Two successful actions
      expect(result.errors).toHaveLength(1);
      expect(result.backupInfo).toBeDefined();
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

      expect(result.success).toBe(true);
      expect(result.actionsExecuted).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.backupInfo).toBeDefined();
      
      const content = await FSUtils.readFile('test.txt');
      expect(content).toBe('restored content');
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
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Action 0 missing required \'type\' field');
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

      expect(result.success).toBe(true);
      expect(result.backupInfo).toBeUndefined();
      expect(result.conflicts).toBeDefined();
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

      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(3);
      expect(stats.failed).toBe(0);
      expect(stats.operations).toMatchObject({
        'restore-content': 1,
        'recreate-content': 1,
        'preserve': 1
      });
    });
  });
});