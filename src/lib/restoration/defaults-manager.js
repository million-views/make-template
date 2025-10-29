/**
 * DefaultsManager - Handles restoration defaults configuration
 * 
 * Manages .restore-defaults.json configuration files, environment variable
 * substitution, and defaults file generation for template restoration.
 */

import { FSUtils } from '../utils/fs-utils.js';

export class DefaultsManager {
  constructor() {
    this.defaultsFileName = '.restore-defaults.json';
  }

  /**
   * Load defaults configuration from .restore-defaults.json
   * @returns {Promise<Object>} Defaults configuration
   */
  async loadDefaults() {
    try {
      if (!await FSUtils.exists(this.defaultsFileName)) {
        return {
          defaults: {},
          environmentVariables: true,
          promptForMissing: true
        };
      }

      const content = await FSUtils.readFile(this.defaultsFileName);
      const config = JSON.parse(content);

      // Validate the configuration
      const validation = this.validateDefaultsFile(config);
      if (!validation.valid) {
        throw new Error(`Invalid defaults file format: ${validation.errors.join(', ')}`);
      }

      return {
        defaults: config.defaults || {},
        environmentVariables: config.environmentVariables !== false,
        promptForMissing: config.promptForMissing !== false
      };
    } catch (error) {
      if (error.message.includes('Invalid JSON')) {
        throw new Error(`Invalid JSON in defaults file: ${error.message}`);
      }
      if (error.name === 'SyntaxError') {
        throw new Error(`Invalid JSON in defaults file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Substitute environment variables in default values
   * @param {Object} defaults - Default values with potential environment variables
   * @returns {Promise<Object>} Defaults with environment variables substituted
   */
  async substituteEnvironmentVariables(defaults) {
    const result = {};

    for (const [key, value] of Object.entries(defaults)) {
      if (typeof value !== 'string') {
        result[key] = value;
        continue;
      }

      // Handle escaped variables
      if (value.includes('\\${')) {
        result[key] = value.replace(/\\(\$\{[^}]+\})/g, '$1');
        continue;
      }

      // Substitute environment variables
      result[key] = this.expandShellVariables(value);
    }

    return result;
  }

  /**
   * Expand shell-style variables in a string
   * @param {string} str - String with potential variables
   * @returns {string} String with variables expanded
   */
  expandShellVariables(str) {
    // Handle ${VAR} and ${VAR:-default} patterns
    return str.replace(/\$\{([^}]+)\}/g, (match, varExpr) => {
      // Handle default value syntax: ${VAR:-default}
      const [varName, defaultValue] = varExpr.split(':-');
      
      // Handle special shell expansions
      if (varName === 'PWD##*/') {
        // Get directory name from PWD
        const pwd = process.env.PWD || process.cwd();
        return pwd.split('/').pop() || pwd.split('\\').pop() || '';
      }
      
      if (varName.startsWith('PWD#')) {
        // Handle other PWD expansions - for now just return PWD
        return process.env.PWD || process.cwd();
      }

      // Regular environment variable
      const envValue = process.env[varName];
      
      if (envValue !== undefined) {
        return envValue;
      }
      
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      
      return '';
    });
  }

  /**
   * Resolve defaults for missing restoration values
   * @param {string[]} missingValues - Array of missing placeholder values
   * @returns {Promise<Object>} Object with resolved and stillMissing arrays
   */
  async resolveDefaults(missingValues) {
    const config = await this.loadDefaults();
    const resolved = {};
    const stillMissing = [];

    // Apply environment variable substitution if enabled
    let defaults = config.defaults;
    if (config.environmentVariables) {
      defaults = await this.substituteEnvironmentVariables(defaults);
    }

    // Resolve each missing value
    for (const placeholder of missingValues) {
      if (defaults[placeholder] !== undefined) {
        resolved[placeholder] = defaults[placeholder];
      } else {
        stillMissing.push(placeholder);
      }
    }

    return {
      resolved,
      stillMissing,
      promptForMissing: config.promptForMissing
    };
  }

  /**
   * Generate a defaults file with common placeholders
   * @param {string[]} placeholders - Array of placeholder names found in template
   * @param {Object} options - Generation options
   * @returns {Promise<void>}
   */
  async generateDefaultsFile(placeholders, options = {}) {
    if (!options.force && await FSUtils.exists(this.defaultsFileName)) {
      throw new Error('Defaults file already exists. Use --force to overwrite.');
    }

    const config = {
      version: '1.0.0',
      defaults: this.generateDefaultValues(placeholders),
      environmentVariables: true,
      promptForMissing: true
    };

    await FSUtils.writeFileAtomic(
      this.defaultsFileName,
      JSON.stringify(config, null, 2)
    );
  }

  /**
   * Generate appropriate default values for common placeholders
   * @param {string[]} placeholders - Array of placeholder names
   * @returns {Object} Default values for placeholders
   */
  generateDefaultValues(placeholders) {
    const defaults = {};

    for (const placeholder of placeholders) {
      switch (placeholder) {
        case '{{PROJECT_NAME}}':
          defaults[placeholder] = '${PWD##*/}';
          break;
        case '{{AUTHOR_NAME}}':
          defaults[placeholder] = '${USER}';
          break;
        case '{{AUTHOR_EMAIL}}':
          defaults[placeholder] = 'dev@example.com';
          break;
        case '{{PROJECT_DESCRIPTION}}':
          defaults[placeholder] = 'A template-restored project';
          break;
        default:
          // For unknown placeholders, provide a generic default
          defaults[placeholder] = `default-${placeholder.replace(/[{}]/g, '').toLowerCase()}`;
      }
    }

    return defaults;
  }

  /**
   * Validate defaults file structure and content
   * @param {Object} config - Configuration object to validate
   * @returns {Object} Validation result with valid flag and errors array
   */
  validateDefaultsFile(config) {
    const errors = [];

    // Check required fields
    if (!config.version) {
      errors.push('Missing required field: version');
    }

    if (!config.defaults || typeof config.defaults !== 'object') {
      errors.push('Missing or invalid field: defaults (must be an object)');
    }

    // Check optional fields types
    if (config.environmentVariables !== undefined && typeof config.environmentVariables !== 'boolean') {
      errors.push('Invalid field type: environmentVariables (must be boolean)');
    }

    if (config.promptForMissing !== undefined && typeof config.promptForMissing !== 'boolean') {
      errors.push('Invalid field type: promptForMissing (must be boolean)');
    }

    // Validate placeholder format in defaults
    if (config.defaults && typeof config.defaults === 'object') {
      for (const key of Object.keys(config.defaults)) {
        if (!this.isValidPlaceholderFormat(key)) {
          errors.push(`Invalid placeholder format: ${key} (must be in format {{NAME}})`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a string is a valid placeholder format
   * @param {string} str - String to check
   * @returns {boolean} True if valid placeholder format
   */
  isValidPlaceholderFormat(str) {
    return /^\{\{[A-Z_][A-Z0-9_]*\}\}$/.test(str);
  }
}