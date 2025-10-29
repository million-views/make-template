/**
 * Tests for Interactive Prompts functionality
 * 
 * Tests the interactive value prompting system for missing restoration values,
 * including validation and integration with defaults system.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { InteractivePrompter } from '../../src/lib/restoration/interactive-prompter.js';
import { FSUtils } from '../../src/lib/utils/fs-utils.js';

describe('InteractivePrompter', () => {
  let testDir;
  let prompter;
  let originalCwd;
  let mockInput;
  let mockOutput;
  let outputData;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'interactive-prompts-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    
    // Create mock streams
    mockInput = new Readable({
      read() {}
    });
    
    outputData = [];
    mockOutput = new Writable({
      write(chunk, encoding, callback) {
        outputData.push(chunk.toString());
        callback();
      }
    });
    
    prompter = new InteractivePrompter({
      input: mockInput,
      output: mockOutput
    });
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('promptForMissingValues', () => {
    it('should handle empty missing values array', async () => {
      const result = await prompter.promptForMissingValues([]);
      assert.deepStrictEqual(result, {});
    });

    // Note: Interactive tests are complex with mock streams
    // Focus on testing the core logic and validation functions
  });

  describe('getPlaceholderDescription', () => {
    it('should return appropriate descriptions for common placeholders', () => {
      assert.strictEqual(
        prompter.getPlaceholderDescription('{{PROJECT_NAME}}'),
        'The name of the project'
      );
      
      assert.strictEqual(
        prompter.getPlaceholderDescription('{{AUTHOR_NAME}}'),
        'The author or maintainer name'
      );
      
      assert.strictEqual(
        prompter.getPlaceholderDescription('{{AUTHOR_EMAIL}}'),
        'The author email address'
      );
      
      assert.strictEqual(
        prompter.getPlaceholderDescription('{{CLOUDFLARE_ACCOUNT_ID}}'),
        'Your Cloudflare account ID'
      );
    });

    it('should return generic description for unknown placeholders', () => {
      const description = prompter.getPlaceholderDescription('{{UNKNOWN_PLACEHOLDER}}');
      assert.ok(description.includes('UNKNOWN_PLACEHOLDER'));
      assert.ok(description.includes('value'));
    });
  });

  describe('validateInput', () => {
    it('should validate project names correctly', () => {
      const validator = prompter.getDefaultValidator('{{PROJECT_NAME}}');
      
      assert.strictEqual(validator('valid-project'), null);
      assert.strictEqual(validator('valid123'), null);
      assert.strictEqual(validator('valid-project-123'), null);
      
      assert.ok(validator('').includes('cannot be empty'));
      assert.ok(validator('Invalid Name').includes('lowercase letters'));
      assert.ok(validator('invalid_name').includes('lowercase letters'));
    });

    it('should validate email addresses correctly', () => {
      const validator = prompter.getDefaultValidator('{{AUTHOR_EMAIL}}');
      
      assert.strictEqual(validator('user@example.com'), null);
      assert.strictEqual(validator('test.email+tag@domain.co.uk'), null);
      
      assert.ok(validator('').includes('cannot be empty'));
      assert.ok(validator('invalid-email').includes('valid email'));
      assert.ok(validator('user@').includes('valid email'));
    });

    it('should validate Cloudflare account IDs correctly', () => {
      const validator = prompter.getDefaultValidator('{{CLOUDFLARE_ACCOUNT_ID}}');
      
      assert.strictEqual(validator('abc123def456ghi789jkl012mno345pq'), null);
      assert.strictEqual(validator('1234567890abcdef1234567890abcdef'), null);
      
      assert.ok(validator('').includes('cannot be empty'));
      assert.ok(validator('too-short').includes('32 characters'));
      assert.ok(validator('abc123def456ghi789jkl012mno345!@').includes('letters and numbers'));
    });

    it('should allow any non-empty value for generic placeholders', () => {
      const validator = prompter.getDefaultValidator('{{UNKNOWN_PLACEHOLDER}}');
      
      assert.strictEqual(validator('any value'), null);
      assert.strictEqual(validator('123'), null);
      assert.strictEqual(validator('special-chars!@#'), null);
      
      assert.ok(validator('').includes('cannot be empty'));
      assert.ok(validator('   ').includes('cannot be empty'));
    });
  });

  describe('integration with DefaultsManager', () => {
    it('should skip prompting when promptForMissing is false', async () => {
      // Create a defaults file with prompting disabled
      const defaultsConfig = {
        version: '1.0.0',
        defaults: {
          '{{PROJECT_NAME}}': 'default-project'
        },
        environmentVariables: true,
        promptForMissing: false
      };
      
      await FSUtils.writeFileAtomic('.restore-defaults.json', JSON.stringify(defaultsConfig, null, 2));
      
      const missingValues = ['{{PROJECT_NAME}}', '{{AUTHOR_EMAIL}}'];
      
      const result = await prompter.promptWithDefaults(missingValues);
      
      // Should only get values from defaults, no prompting
      assert.strictEqual(result['{{PROJECT_NAME}}'], 'default-project');
      assert.strictEqual(result['{{AUTHOR_EMAIL}}'], undefined);
    });
  });
});