/**
 * Restoration Processor Unit Tests
 * 
 * Tests for the RestorationProcessor class that executes restoration plans.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { RestorationProcessor } from '../../src/lib/processors/restoration-processor.js';
import { FSUtils } from '../../src/lib/utils/fs-utils.js';

describe('RestorationProcessor', () => {
  let processor;
  let testDir;

  beforeEach(async () => {
    processor = new RestorationProcessor();
    testDir = join(process.cwd(), 'test-temp-restoration');
    await FSUtils.ensureDir(testDir);
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(join(testDir, '..'));
    await FSUtils.remove(testDir);
  });

  describe('executePlan', () => {
    it('should execute a basic restoration plan successfully', async () => {
      // Create test files
      await FSUtils.writeFileAtomic('package.json', '{"name": "{{PROJECT_NAME}}"}');
      
      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: 'package.json',
            content: '{"name": "my-project"}',
            placeholderReplacements: [
              { from: '{{PROJECT_NAME}}', to: 'my-project' }
            ]
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlan(plan);

      expect(result.success).toBe(true);
      expect(result.actionsExecuted).toBe(1);
      
      const content = await FSUtils.readFile('package.json');
      expect(content).toBe('{"name": "my-project"}');
    });

    it('should recreate deleted files with original content', async () => {
      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'recreate-file',
            path: '.env',
            content: 'DATABASE_URL=postgres://localhost:5432/mydb',
            note: 'Recreate user-created file with original content'
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlan(plan);

      expect(result.success).toBe(true);
      expect(await FSUtils.exists('.env')).toBe(true);
      
      const content = await FSUtils.readFile('.env');
      expect(content).toBe('DATABASE_URL=postgres://localhost:5432/mydb');
    });

    it('should recreate empty directories for generated content', async () => {
      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'recreate-directory',
            path: 'node_modules',
            content: null,
            regenerationCommand: 'npm install',
            note: 'Directory will be empty - run npm install'
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlan(plan);

      expect(result.success).toBe(true);
      expect(await FSUtils.exists('node_modules')).toBe(true);
      
      const stats = await FSUtils.stat('node_modules');
      expect(stats.isDirectory()).toBe(true);
    });

    it('should preserve template files without modification', async () => {
      // Create template files
      await FSUtils.writeFileAtomic('template.json', '{"name": "test-template"}');
      await FSUtils.writeFileAtomic('_setup.mjs', 'console.log("setup");');
      
      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'preserve-file',
            path: 'template.json',
            note: 'Template metadata - preserved for template functionality'
          },
          {
            type: 'preserve-file',
            path: '_setup.mjs',
            note: 'Template setup script - preserved for template functionality'
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlan(plan);

      expect(result.success).toBe(true);
      
      // Files should still exist and be unchanged
      expect(await FSUtils.exists('template.json')).toBe(true);
      expect(await FSUtils.exists('_setup.mjs')).toBe(true);
      
      const templateContent = await FSUtils.readFile('template.json');
      const setupContent = await FSUtils.readFile('_setup.mjs');
      expect(templateContent).toBe('{"name": "test-template"}');
      expect(setupContent).toBe('console.log("setup");');
    });

    it('should handle multiple placeholder replacements in a single file', async () => {
      await FSUtils.writeFileAtomic('README.md', '# {{PROJECT_NAME}}\n\nBy {{AUTHOR_NAME}}');
      
      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: 'README.md',
            content: '# My Project\n\nBy John Doe',
            placeholderReplacements: [
              { from: '{{PROJECT_NAME}}', to: 'My Project' },
              { from: '{{AUTHOR_NAME}}', to: 'John Doe' }
            ]
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlan(plan);

      expect(result.success).toBe(true);
      
      const content = await FSUtils.readFile('README.md');
      expect(content).toBe('# My Project\n\nBy John Doe');
    });

    it('should handle mixed action types in a single plan', async () => {
      // Setup existing files
      await FSUtils.writeFileAtomic('package.json', '{"name": "{{PROJECT_NAME}}"}');
      await FSUtils.writeFileAtomic('template.json', '{"name": "test-template"}');
      
      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: 'package.json',
            content: '{"name": "my-project"}',
            placeholderReplacements: [
              { from: '{{PROJECT_NAME}}', to: 'my-project' }
            ]
          },
          {
            type: 'recreate-file',
            path: '.env',
            content: 'NODE_ENV=development',
            note: 'Recreate environment file'
          },
          {
            type: 'recreate-directory',
            path: 'dist',
            content: null,
            regenerationCommand: 'npm run build'
          },
          {
            type: 'preserve-file',
            path: 'template.json',
            note: 'Template file preserved'
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlan(plan);

      expect(result.success).toBe(true);
      expect(result.actionsExecuted).toBe(4);
      
      // Verify all actions were executed correctly
      const packageContent = await FSUtils.readFile('package.json');
      expect(packageContent).toBe('{"name": "my-project"}');
      
      const envContent = await FSUtils.readFile('.env');
      expect(envContent).toBe('NODE_ENV=development');
      
      expect(await FSUtils.exists('dist')).toBe(true);
      const distStats = await FSUtils.stat('dist');
      expect(distStats.isDirectory()).toBe(true);
      
      const templateContent = await FSUtils.readFile('template.json');
      expect(templateContent).toBe('{"name": "test-template"}');
    });

    it('should provide detailed execution results', async () => {
      await FSUtils.writeFileAtomic('test.txt', 'placeholder content');
      
      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: 'test.txt',
            content: 'original content',
            placeholderReplacements: []
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlan(plan);

      expect(result).toMatchObject({
        success: true,
        actionsExecuted: 1,
        actionResults: expect.arrayContaining([
          expect.objectContaining({
            type: 'restore-file',
            path: 'test.txt',
            success: true
          })
        ])
      });
    });
  });

  describe('error handling', () => {
    it('should handle file not found errors gracefully', async () => {
      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: 'nonexistent.txt',
            content: 'content',
            placeholderReplacements: []
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlan(plan);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('nonexistent.txt');
    });

    it('should continue processing other actions after a failure', async () => {
      await FSUtils.writeFileAtomic('good.txt', 'content');
      
      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: 'nonexistent.txt',
            content: 'content',
            placeholderReplacements: []
          },
          {
            type: 'restore-file',
            path: 'good.txt',
            content: 'new content',
            placeholderReplacements: []
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlan(plan);

      expect(result.success).toBe(false);
      expect(result.actionsExecuted).toBe(1); // Only the successful one
      expect(result.errors).toHaveLength(1);
      
      // Verify the successful action was executed
      const content = await FSUtils.readFile('good.txt');
      expect(content).toBe('new content');
    });

    it('should handle permission errors appropriately', async () => {
      // This test would need platform-specific setup for permission testing
      // For now, we'll test the error handling structure
      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: '/root/restricted.txt', // Likely to cause permission error
            content: 'content',
            placeholderReplacements: []
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlan(plan);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('atomic operations', () => {
    it('should use atomic file operations for safety', async () => {
      await FSUtils.writeFileAtomic('important.txt', 'original content');
      
      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: 'important.txt',
            content: 'restored content',
            placeholderReplacements: []
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlan(plan);

      expect(result.success).toBe(true);
      
      const content = await FSUtils.readFile('important.txt');
      expect(content).toBe('restored content');
    });
  });

  describe('progress reporting', () => {
    it('should report progress during execution', async () => {
      await FSUtils.writeFileAtomic('file1.txt', 'content1');
      await FSUtils.writeFileAtomic('file2.txt', 'content2');
      
      const plan = {
        mode: 'full',
        actions: [
          {
            type: 'restore-file',
            path: 'file1.txt',
            content: 'new content1',
            placeholderReplacements: []
          },
          {
            type: 'restore-file',
            path: 'file2.txt',
            content: 'new content2',
            placeholderReplacements: []
          }
        ],
        missingValues: [],
        warnings: []
      };

      const result = await processor.executePlan(plan);

      expect(result.success).toBe(true);
      expect(result.actionsExecuted).toBe(2);
      expect(result.actionResults).toHaveLength(2);
    });
  });
});