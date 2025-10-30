/**
 * InteractivePrompter - Handles interactive value prompting for restoration
 *
 * Provides interactive prompts for missing restoration values with validation,
 * default value support, and integration with the defaults system.
 */

import { createInterface } from 'node:readline';
import { DefaultsManager } from './defaults-manager.js';

export class InteractivePrompter {
  constructor(options = {}) {
    this.input = options.input || process.stdin;
    this.output = options.output || process.stdout;
    this.defaultsManager = new DefaultsManager();
    // Detect silent/test/CI environments so prompting can be skipped.
    this.silent = Boolean(
      options.silent ||
      process.env.MAKE_TEMPLATE_TEST_INPUT ||
      process.env.MAKE_TEMPLATE_SILENT ||
      process.env.SILENT ||
      process.env.CI ||
      process.env.NODE_ENV === 'test'
    );
  }

  /**
   * Prompt user for missing restoration values
   * @param {string[]} missingValues - Array of missing placeholder values
   * @param {Object} validators - Optional validators for each placeholder
   * @param {Object} defaults - Optional default values for placeholders
   * @returns {Promise<Object>} Object with user-provided values
   */
  async promptForMissingValues(missingValues, validators = {}, defaults = {}) {
    if (missingValues.length === 0) {
      return {};
    }

    const rl = createInterface({
      input: this.input,
      output: this.output
    });

    const results = {};

    try {
      for (const placeholder of missingValues) {
        const value = await this.promptForSingleValue(rl, placeholder, validators[placeholder], defaults[placeholder]);
        results[placeholder] = value;
      }
    } finally {
      rl.close();
    }

    return results;
  }

  /**
   * Prompt for a single value with validation and retry logic
   * @param {Interface} rl - Readline interface
   * @param {string} placeholder - Placeholder name
   * @param {Function} validator - Optional validation function
   * @param {string} defaultValue - Optional default value
   * @returns {Promise<string>} User-provided value
   */
  async promptForSingleValue(rl, placeholder, validator, defaultValue) {
    const description = this.getPlaceholderDescription(placeholder);
    const defaultValidator = validator || this.getDefaultValidator(placeholder);

    return new Promise((resolve, reject) => {
      const askQuestion = () => {
        let prompt = `${description}`;
        if (defaultValue) {
          prompt += ` (default: ${defaultValue})`;
        }
        prompt += ': ';

        rl.question(prompt, (answer) => {
          const value = answer.trim() || defaultValue || '';

          // Validate the input
          const validationError = defaultValidator(value);
          if (validationError) {
            this.output.write(`❌ ${validationError}\n`);
            askQuestion(); // Retry
            return;
          }

          resolve(value);
        });
      };

      // Handle user cancellation
      rl.on('close', () => {
        reject(new Error('User cancelled input'));
      });

      askQuestion();
    });
  }

  /**
   * Get human-readable description for a placeholder
   * @param {string} placeholder - Placeholder name
   * @returns {string} Description text
   */
  getPlaceholderDescription(placeholder) {
    const descriptions = {
      '{{PROJECT_NAME}}': 'The name of the project',
      '{{AUTHOR_NAME}}': 'The author or maintainer name',
      '{{AUTHOR_EMAIL}}': 'The author email address',
      '{{PROJECT_DESCRIPTION}}': 'A brief description of the project',
      '{{CLOUDFLARE_ACCOUNT_ID}}': 'Your Cloudflare account ID',
      '{{WORKER_NAME}}': 'The Cloudflare Worker name',
      '{{D1_BINDING_0}}': 'The D1 database binding name',
      '{{D1_DATABASE_ID_0}}': 'The D1 database ID',
      '{{BASE_URL}}': 'The base URL for the application',
      '{{HTML_TITLE}}': 'The HTML page title',
      '{{README_TITLE}}': 'The title for the README file',
      '{{REPOSITORY_URL}}': 'The repository URL'
    };

    return descriptions[placeholder] || `Enter value for ${placeholder}`;
  }

  /**
   * Get default validator for a placeholder
   * @param {string} placeholder - Placeholder name
   * @returns {Function} Validation function
   */
  getDefaultValidator(placeholder) {
    switch (placeholder) {
      case '{{PROJECT_NAME}}':
      case '{{WORKER_NAME}}':
        return (value) => {
          if (!value || value.trim().length === 0) {
            return 'Project name cannot be empty';
          }
          if (!/^[a-z0-9-]+$/.test(value)) {
            return 'Project name must contain only lowercase letters, numbers, and hyphens';
          }
          return null;
        };

      case '{{AUTHOR_EMAIL}}':
        return (value) => {
          if (!value || value.trim().length === 0) {
            return 'Email address cannot be empty';
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
          }
          return null;
        };

      case '{{CLOUDFLARE_ACCOUNT_ID}}':
        return (value) => {
          if (!value || value.trim().length === 0) {
            return 'Cloudflare account ID cannot be empty';
          }
          if (value.length !== 32) {
            return 'Cloudflare account ID must be exactly 32 characters long';
          }
          if (!/^[a-z0-9]+$/i.test(value)) {
            return 'Cloudflare account ID must contain only letters and numbers';
          }
          return null;
        };

      case '{{D1_DATABASE_ID_0}}':
        return (value) => {
          if (!value || value.trim().length === 0) {
            return 'D1 database ID cannot be empty';
          }
          // UUID format validation
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(value)) {
            return 'D1 database ID must be in UUID format (e.g., 12345678-90ab-cdef-1234-567890abcdef)';
          }
          return null;
        };

      default:
        // Generic validator for unknown placeholders
        return (value) => {
          if (!value || value.trim().length === 0) {
            return 'Value cannot be empty';
          }
          return null;
        };
    }
  }

  /**
   * Prompt for missing values with defaults integration
   * @param {string[]} missingValues - Array of missing placeholder values
   * @param {Object} customValidators - Optional custom validators
   * @returns {Promise<Object>} Object with resolved values
   */
  async promptWithDefaults(missingValues, customValidators = {}) {
    // First, try to resolve values using defaults system
    const defaultsResult = await this.defaultsManager.resolveDefaults(missingValues);

    // If prompting is disabled by defaults system or by silent/test mode,
    // return only resolved defaults.
    if (!defaultsResult.promptForMissing || this.silent) {
      if (this.silent && defaultsResult.stillMissing && defaultsResult.stillMissing.length > 0) {
        // Log a concise message for debugging in CI/test runs
        try { this.output.write('\n🔧 Skipping interactive prompts due to silent/test mode. Using defaults where available.\n\n'); } catch (e) { }
      }
      return defaultsResult.resolved;
    }

    // If there are still missing values, prompt for them
    if (defaultsResult.stillMissing.length > 0) {
      this.output.write('\n🔧 Some values need to be provided for restoration:\n\n');

      const promptedValues = await this.promptForMissingValues(
        defaultsResult.stillMissing,
        customValidators,
        defaultsResult.resolved
      );

      // Combine resolved defaults with prompted values
      return {
        ...defaultsResult.resolved,
        ...promptedValues
      };
    }

    return defaultsResult.resolved;
  }
}