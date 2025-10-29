/**
 * File Categorizer Unit Tests
 * 
 * Tests for the file categorization utilities.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { FileCategorizer } from '../../src/lib/utils/file-categorizer.js';

describe('FileCategorizer', () => {
  let categorizer;

  beforeEach(() => {
    categorizer = new FileCategorizer();
  });

  describe('matchesPattern', () => {
    it('should match exact file names', () => {
      assert.ok(categorizer.matchesPattern('package.json', 'package.json', 'package.json'));
      assert.ok(!categorizer.matchesPattern('package-lock.json', 'package-lock.json', 'package.json'));
    });

    it('should match directory patterns', () => {
      assert.ok(categorizer.matchesPattern('node_modules/test', 'node_modules', 'node_modules/'));
      assert.ok(categorizer.matchesPattern('dist', 'dist', 'dist/'));
    });

    it('should match glob patterns', () => {
      assert.ok(categorizer.matchesPattern('test.log', 'test.log', '*.log'));
      assert.ok(categorizer.matchesPattern('vite.config.js', 'vite.config.js', 'vite.config.*'));
      assert.ok(!categorizer.matchesPattern('package.json', 'package.json', '*.log'));
    });

    it('should match extension patterns', () => {
      assert.ok(categorizer.matchesPattern('test.log', 'test.log', '*.log'));
      assert.ok(categorizer.matchesPattern('error.log', 'error.log', '*.log'));
      assert.ok(!categorizer.matchesPattern('test.txt', 'test.txt', '*.log'));
    });
  });

  describe('matchesCategory', () => {
    it('should identify generated files', () => {
      const config = categorizer.categories.generated;
      
      const lockFileResult = categorizer.matchesCategory('package-lock.json', 'package-lock.json', false, config);
      assert.ok(lockFileResult.matches);
      assert.strictEqual(lockFileResult.pattern, 'package-lock.json');
      
      const nodeModulesResult = categorizer.matchesCategory('node_modules', 'node_modules', true, config);
      assert.ok(nodeModulesResult.matches);
      assert.strictEqual(nodeModulesResult.pattern, 'node_modules');
    });

    it('should identify user-created files', () => {
      const config = categorizer.categories.userCreated;
      
      const envResult = categorizer.matchesCategory('.env', '.env', false, config);
      assert.ok(envResult.matches);
      assert.strictEqual(envResult.pattern, '.env');
      
      const devVarsResult = categorizer.matchesCategory('.dev.vars', '.dev.vars', false, config);
      assert.ok(devVarsResult.matches);
      assert.strictEqual(devVarsResult.pattern, '.dev.vars');
    });

    it('should identify template files', () => {
      const config = categorizer.categories.templateFiles;
      
      const templateResult = categorizer.matchesCategory('template.json', 'template.json', false, config);
      assert.ok(templateResult.matches);
      assert.strictEqual(templateResult.pattern, 'template.json');
      
      const setupResult = categorizer.matchesCategory('_setup.mjs', '_setup.mjs', false, config);
      assert.ok(setupResult.matches);
      assert.strictEqual(setupResult.pattern, '_setup.mjs');
    });

    it('should identify modified files', () => {
      const config = categorizer.categories.modified;
      
      const packageResult = categorizer.matchesCategory('package.json', 'package.json', false, config);
      assert.ok(packageResult.matches);
      assert.strictEqual(packageResult.pattern, 'package.json');
      
      const readmeResult = categorizer.matchesCategory('README.md', 'README.md', false, config);
      assert.ok(readmeResult.matches);
      assert.strictEqual(readmeResult.pattern, 'README.md');
    });
  });

  describe('shouldStoreContent', () => {
    it('should not store content for directories', () => {
      const config = { storeContent: true };
      const result = categorizer.shouldStoreContent(config, 1000, true);
      assert.strictEqual(result, false);
    });

    it('should not store content when category config is false', () => {
      const config = { storeContent: false };
      const result = categorizer.shouldStoreContent(config, 1000, false);
      assert.strictEqual(result, false);
    });

    it('should not store content for files exceeding size threshold', () => {
      const config = { storeContent: true };
      const largeSize = 20 * 1024 * 1024; // 20MB
      const result = categorizer.shouldStoreContent(config, largeSize, false);
      assert.strictEqual(result, false);
    });

    it('should store content for normal files within threshold', () => {
      const config = { storeContent: true };
      const normalSize = 1024; // 1KB
      const result = categorizer.shouldStoreContent(config, normalSize, false);
      assert.strictEqual(result, true);
    });

    it('should respect force options', () => {
      const config = { storeContent: false };
      const result = categorizer.shouldStoreContent(config, 1000, false, { forceStoreContent: true });
      assert.strictEqual(result, true);
      
      const result2 = categorizer.shouldStoreContent(config, 1000, false, { neverStoreContent: true });
      assert.strictEqual(result2, false);
    });
  });

  describe('getDefaultAction', () => {
    it('should return correct default actions', () => {
      assert.strictEqual(categorizer.getDefaultAction('generated'), 'regenerate');
      assert.strictEqual(categorizer.getDefaultAction('userCreated'), 'restore-content');
      assert.strictEqual(categorizer.getDefaultAction('templateFiles'), 'preserve');
      assert.strictEqual(categorizer.getDefaultAction('modified'), 'restore-content');
      assert.strictEqual(categorizer.getDefaultAction('unknown'), 'restore-content');
    });
  });

  describe('getWarnings', () => {
    it('should warn about large files', () => {
      const largeSize = 2 * 1024 * 1024; // 2MB
      const warnings = categorizer.getWarnings(largeSize, true);
      assert.ok(warnings.length > 0);
      assert.ok(warnings[0].includes('Large file'));
    });

    it('should warn about files too large to store', () => {
      const hugeSize = 20 * 1024 * 1024; // 20MB
      const warnings = categorizer.getWarnings(hugeSize, false);
      assert.ok(warnings.length > 0);
      assert.ok(warnings[0].includes('File too large'));
    });

    it('should return no warnings for normal files', () => {
      const normalSize = 1024; // 1KB
      const warnings = categorizer.getWarnings(normalSize, true);
      assert.strictEqual(warnings.length, 0);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      assert.strictEqual(categorizer.formatFileSize(500), '500 B');
      assert.strictEqual(categorizer.formatFileSize(1536), '1.5 KB');
      assert.strictEqual(categorizer.formatFileSize(2097152), '2.0 MB');
      assert.strictEqual(categorizer.formatFileSize(3221225472), '3.0 GB');
    });
  });

  describe('addCustomRules', () => {
    it('should add custom rules to existing category', () => {
      const initialFilesCount = categorizer.categories.userCreated.files.length;
      
      categorizer.addCustomRules('userCreated', {
        files: ['.custom-env'],
        regenerationCommands: { '.custom-env': 'custom command' }
      });
      
      assert.strictEqual(categorizer.categories.userCreated.files.length, initialFilesCount + 1);
      assert.ok(categorizer.categories.userCreated.files.includes('.custom-env'));
      assert.strictEqual(categorizer.categories.userCreated.regenerationCommands['.custom-env'], 'custom command');
    });

    it('should create new category if it does not exist', () => {
      categorizer.addCustomRules('customCategory', {
        files: ['custom.file'],
        storeContent: false
      });
      
      assert.ok(categorizer.categories.customCategory);
      assert.ok(categorizer.categories.customCategory.files.includes('custom.file'));
      assert.strictEqual(categorizer.categories.customCategory.storeContent, false);
    });
  });

  describe('validateRules', () => {
    it('should validate rules without issues for default configuration', () => {
      const result = categorizer.validateRules();
      assert.ok(result.valid);
      assert.strictEqual(result.issues.length, 0);
    });
  });
});