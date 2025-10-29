/**
 * Tests for DefaultsManager
 * 
 * Tests the restoration defaults system including configuration file support,
 * environment variable substitution, and defaults file generation.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DefaultsManager } from '../../src/lib/restoration/defaults-manager.js';
import { FSUtils } from '../../src/lib/utils/fs-utils.js';

describe('DefaultsManager', () => {
  let testDir;
  let defaultsManager;
  let originalCwd;
  let originalEnv;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'defaults-manager-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    
    // Backup original environment
    originalEnv = { ...process.env };
    
    // Set test environment variables
    process.env.USER = 'testuser';
    process.env.PWD = testDir;
    process.env.TEST_VAR = 'test-value';
    
    defaultsManager = new DefaultsManager();
  });

  afterEach(async () => {
    // Restore original directory and environment
    process.chdir(originalCwd);
    process.env = originalEnv;
    
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('loadDefaults', () => {
    it('should load defaults from .restore-defaults.json', async () => {
      const defaultsConfig = {
        version: '1.0.0',
        defaults: {
          '{{PROJECT_NAME}}': 'my-project',
          '{{AUTHOR_NAME}}': 'Test Author',
          '{{AUTHOR_EMAIL}}': 'test@example.com'
        },
        environmentVariables: true,
        promptForMissing: true
      };

      await FSUtils.writeFileAtomic('.restore-defaults.json', JSON.stringify(defaultsConfig, null, 2));

      const result = await defaultsManager.loadDefaults();

      assert.deepStrictEqual(result.defaults, defaultsConfig.defaults);
      assert.strictEqual(result.environmentVariables, true);
      assert.strictEqual(result.promptForMissing, true);
    });

    it('should return empty defaults when file does not exist', async () => {
      const result = await defaultsManager.loadDefaults();

      assert.deepStrictEqual(result.defaults, {});
      assert.strictEqual(result.environmentVariables, true);
      assert.strictEqual(result.promptForMissing, true);
    });

    it('should throw error for invalid JSON in defaults file', async () => {
      await FSUtils.writeFileAtomic('.restore-defaults.json', 'invalid json');

      await assert.rejects(
        () => defaultsManager.loadDefaults(),
        /Invalid JSON in defaults file/
      );
    });

    it('should validate defaults file schema', async () => {
      const invalidConfig = {
        // Missing version
        defaults: {
          '{{PROJECT_NAME}}': 'test'
        }
      };

      await FSUtils.writeFileAtomic('.restore-defaults.json', JSON.stringify(invalidConfig));

      await assert.rejects(
        () => defaultsManager.loadDefaults(),
        /Invalid defaults file format/
      );
    });
  });

  describe('substituteEnvironmentVariables', () => {
    it('should substitute environment variables in default values', async () => {
      const defaults = {
        '{{PROJECT_NAME}}': '${PWD##*/}',
        '{{AUTHOR_NAME}}': '${USER}',
        '{{CUSTOM_VAR}}': '${TEST_VAR}',
        '{{MIXED}}': 'prefix-${USER}-suffix'
      };

      const result = await defaultsManager.substituteEnvironmentVariables(defaults);

      assert.strictEqual(result['{{PROJECT_NAME}}'], testDir.split('/').pop() || testDir.split('\\').pop());
      assert.strictEqual(result['{{AUTHOR_NAME}}'], 'testuser');
      assert.strictEqual(result['{{CUSTOM_VAR}}'], 'test-value');
      assert.strictEqual(result['{{MIXED}}'], 'prefix-testuser-suffix');
    });

    it('should handle missing environment variables gracefully', async () => {
      const defaults = {
        '{{MISSING_VAR}}': '${NONEXISTENT_VAR}',
        '{{WITH_DEFAULT}}': '${NONEXISTENT_VAR:-default-value}'
      };

      const result = await defaultsManager.substituteEnvironmentVariables(defaults);

      assert.strictEqual(result['{{MISSING_VAR}}'], '');
      assert.strictEqual(result['{{WITH_DEFAULT}}'], 'default-value');
    });

    it('should handle complex shell parameter expansion', async () => {
      const defaults = {
        '{{DIR_NAME}}': '${PWD##*/}',
        '{{HOME_REL}}': '${PWD#${HOME}/}',
        '{{FALLBACK}}': '${MISSING_VAR:-fallback-value}'
      };

      const result = await defaultsManager.substituteEnvironmentVariables(defaults);

      assert.strictEqual(result['{{DIR_NAME}}'], testDir.split('/').pop() || testDir.split('\\').pop());
      assert.strictEqual(result['{{FALLBACK}}'], 'fallback-value');
    });

    it('should leave non-variable strings unchanged', async () => {
      const defaults = {
        '{{STATIC}}': 'static-value',
        '{{NO_VARS}}': 'just a string',
        '{{ESCAPED}}': '\\${NOT_A_VAR}'
      };

      const result = await defaultsManager.substituteEnvironmentVariables(defaults);

      assert.strictEqual(result['{{STATIC}}'], 'static-value');
      assert.strictEqual(result['{{NO_VARS}}'], 'just a string');
      assert.strictEqual(result['{{ESCAPED}}'], '${NOT_A_VAR}');
    });
  });

  describe('resolveDefaults', () => {
    it('should resolve defaults with environment variable substitution', async () => {
      const defaultsConfig = {
        version: '1.0.0',
        defaults: {
          '{{PROJECT_NAME}}': '${PWD##*/}',
          '{{AUTHOR_NAME}}': '${USER}',
          '{{STATIC_VALUE}}': 'static'
        },
        environmentVariables: true,
        promptForMissing: true
      };

      await FSUtils.writeFileAtomic('.restore-defaults.json', JSON.stringify(defaultsConfig, null, 2));

      const missingValues = ['{{PROJECT_NAME}}', '{{AUTHOR_NAME}}', '{{MISSING_VALUE}}'];
      const result = await defaultsManager.resolveDefaults(missingValues);

      assert.strictEqual(result.resolved['{{PROJECT_NAME}}'], testDir.split('/').pop() || testDir.split('\\').pop());
      assert.strictEqual(result.resolved['{{AUTHOR_NAME}}'], 'testuser');
      assert.deepStrictEqual(result.stillMissing, ['{{MISSING_VALUE}}']);
    });

    it('should skip environment substitution when disabled', async () => {
      const defaultsConfig = {
        version: '1.0.0',
        defaults: {
          '{{PROJECT_NAME}}': '${PWD##*/}',
          '{{AUTHOR_NAME}}': 'Static Name'
        },
        environmentVariables: false,
        promptForMissing: true
      };

      await FSUtils.writeFileAtomic('.restore-defaults.json', JSON.stringify(defaultsConfig, null, 2));

      const missingValues = ['{{PROJECT_NAME}}', '{{AUTHOR_NAME}}'];
      const result = await defaultsManager.resolveDefaults(missingValues);

      assert.strictEqual(result.resolved['{{PROJECT_NAME}}'], '${PWD##*/}');
      assert.strictEqual(result.resolved['{{AUTHOR_NAME}}'], 'Static Name');
      assert.deepStrictEqual(result.stillMissing, []);
    });

    it('should return all values as missing when no defaults file exists', async () => {
      const missingValues = ['{{PROJECT_NAME}}', '{{AUTHOR_NAME}}'];
      const result = await defaultsManager.resolveDefaults(missingValues);

      assert.deepStrictEqual(result.resolved, {});
      assert.deepStrictEqual(result.stillMissing, missingValues);
    });
  });

  describe('generateDefaultsFile', () => {
    it('should generate a defaults file with common placeholders', async () => {
      const placeholders = ['{{PROJECT_NAME}}', '{{AUTHOR_NAME}}', '{{AUTHOR_EMAIL}}', '{{PROJECT_DESCRIPTION}}'];
      
      await defaultsManager.generateDefaultsFile(placeholders);

      assert.ok(await FSUtils.exists('.restore-defaults.json'));
      
      const content = await FSUtils.readFile('.restore-defaults.json');
      const config = JSON.parse(content);

      assert.strictEqual(config.version, '1.0.0');
      assert.strictEqual(config.environmentVariables, true);
      assert.strictEqual(config.promptForMissing, true);
      
      // Check that common placeholders have appropriate defaults
      assert.strictEqual(config.defaults['{{PROJECT_NAME}}'], '${PWD##*/}');
      assert.strictEqual(config.defaults['{{AUTHOR_NAME}}'], '${USER}');
      assert.ok(config.defaults['{{AUTHOR_EMAIL}}'].includes('@'));
      assert.ok(config.defaults['{{PROJECT_DESCRIPTION}}']);
    });

    it('should not overwrite existing defaults file', async () => {
      const existingConfig = {
        version: '1.0.0',
        defaults: {
          '{{PROJECT_NAME}}': 'existing-project'
        }
      };

      await FSUtils.writeFileAtomic('.restore-defaults.json', JSON.stringify(existingConfig, null, 2));

      await assert.rejects(
        () => defaultsManager.generateDefaultsFile(['{{PROJECT_NAME}}']),
        /Defaults file already exists/
      );
    });

    it('should generate defaults file with force option', async () => {
      const existingConfig = {
        version: '1.0.0',
        defaults: {
          '{{PROJECT_NAME}}': 'existing-project'
        }
      };

      await FSUtils.writeFileAtomic('.restore-defaults.json', JSON.stringify(existingConfig, null, 2));

      await defaultsManager.generateDefaultsFile(['{{PROJECT_NAME}}', '{{AUTHOR_NAME}}'], { force: true });

      const content = await FSUtils.readFile('.restore-defaults.json');
      const config = JSON.parse(content);

      // Should have new defaults, not just the existing one
      assert.ok(config.defaults['{{PROJECT_NAME}}']);
      assert.ok(config.defaults['{{AUTHOR_NAME}}']);
    });
  });

  describe('validateDefaultsFile', () => {
    it('should validate a correct defaults file', async () => {
      const validConfig = {
        version: '1.0.0',
        defaults: {
          '{{PROJECT_NAME}}': 'test-project',
          '{{AUTHOR_NAME}}': 'Test Author'
        },
        environmentVariables: true,
        promptForMissing: false
      };

      const result = defaultsManager.validateDefaultsFile(validConfig);

      assert.strictEqual(result.valid, true);
      assert.deepStrictEqual(result.errors, []);
    });

    it('should detect missing required fields', async () => {
      const invalidConfig = {
        defaults: {
          '{{PROJECT_NAME}}': 'test'
        }
      };

      const result = defaultsManager.validateDefaultsFile(invalidConfig);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(error => error.includes('version')));
    });

    it('should detect invalid field types', async () => {
      const invalidConfig = {
        version: '1.0.0',
        defaults: 'not an object',
        environmentVariables: 'not a boolean',
        promptForMissing: 'not a boolean'
      };

      const result = defaultsManager.validateDefaultsFile(invalidConfig);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(error => error.includes('defaults')));
      assert.ok(result.errors.some(error => error.includes('environmentVariables')));
      assert.ok(result.errors.some(error => error.includes('promptForMissing')));
    });

    it('should detect invalid placeholder format', async () => {
      const invalidConfig = {
        version: '1.0.0',
        defaults: {
          'INVALID_PLACEHOLDER': 'value',
          '{{VALID_PLACEHOLDER}}': 'value'
        },
        environmentVariables: true,
        promptForMissing: true
      };

      const result = defaultsManager.validateDefaultsFile(invalidConfig);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(error => error.includes('INVALID_PLACEHOLDER')));
    });
  });
});