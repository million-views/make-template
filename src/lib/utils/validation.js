/**
 * Input Validation Utilities
 * 
 * Input validation utilities for CLI arguments and file formats.
 * Implements requirement 9.3: Display specific error messages with file paths when validation fails.
 * Implements requirement 9.4: Display installation instructions when required dependencies are missing.
 */

import { PROJECT_TYPES, PLACEHOLDER_FORMATS } from '../config.js';

export class ValidationUtils {
  /**
   * Validate placeholder format
   * @param {string} format - Placeholder format to validate
   * @returns {boolean} True if valid, false otherwise
   */
  static validatePlaceholderFormat(format) {
    if (!format || typeof format !== 'string') {
      return false;
    }

    // Check if format contains NAME substitution mechanism
    if (!format.includes('NAME')) {
      return false;
    }

    // Check if format matches supported patterns
    const supportedPatterns = [
      /\{\{.*NAME.*\}\}/, // {{NAME}} or {{PLACEHOLDER_NAME}}
      /__.*NAME.*__/,     // __NAME__ or __PLACEHOLDER_NAME__
      /%.*NAME.*%/        // %NAME% or %PLACEHOLDER_NAME%
    ];

    return supportedPatterns.some(pattern => pattern.test(format));
  }

  /**
   * Validate project type
   * @param {string} type - Project type to validate
   * @returns {boolean} True if valid, false otherwise
   */
  static validateProjectType(type) {
    if (!type || typeof type !== 'string') {
      return false;
    }
    return Object.keys(PROJECT_TYPES).includes(type);
  }

  /**
   * Sanitize and validate file path
   * @param {string} path - Path to sanitize
   * @returns {string} Sanitized path
   * @throws {Error} If path is invalid or contains directory traversal
   */
  static sanitizePath(path) {
    if (!path || typeof path !== 'string') {
      throw new Error('Invalid path: path must be a non-empty string');
    }

    // Prevent directory traversal
    if (path.includes('..')) {
      throw new Error(`Invalid path: directory traversal not allowed in "${path}"`);
    }

    // Prevent absolute paths (security risk)
    if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
      throw new Error(`Invalid path: absolute paths not allowed "${path}"`);
    }

    // Prevent null bytes
    if (path.includes('\0')) {
      throw new Error(`Invalid path: null bytes not allowed in "${path}"`);
    }

    return path.trim();
  }

  /**
   * Validate CLI arguments
   * @param {object} args - Parsed CLI arguments
   * @returns {string[]} Array of validation error messages
   */
  static validateCliArguments(args) {
    const errors = [];

    // Validate placeholder format if provided
    if (args['placeholder-format']) {
      if (!this.validatePlaceholderFormat(args['placeholder-format'])) {
        errors.push(
          `Invalid placeholder format: "${args['placeholder-format']}". ` +
          `Must contain NAME substitution mechanism. ` +
          `Supported formats: {{NAME}}, __NAME__, %NAME%`
        );
      }
    }

    // Validate project type if provided
    if (args.type) {
      if (!this.validateProjectType(args.type)) {
        const validTypes = Object.keys(PROJECT_TYPES).join(', ');
        errors.push(
          `Invalid project type: "${args.type}". ` +
          `Supported types: ${validTypes}`
        );
      }
    }

    // Validate boolean flags
    const booleanFlags = ['dry-run', 'yes', 'help'];
    booleanFlags.forEach(flag => {
      if (args[flag] !== undefined && typeof args[flag] !== 'boolean') {
        errors.push(`Invalid value for --${flag}: must be a boolean flag`);
      }
    });

    return errors;
  }

  /**
   * Validate project structure requirements
   * @param {string} projectType - Project type to validate requirements for
   * @returns {object} Validation result with missing dependencies and suggestions
   */
  static validateProjectRequirements(projectType) {
    const result = {
      valid: true,
      missingDependencies: [],
      suggestions: []
    };

    if (!projectType || !PROJECT_TYPES[projectType]) {
      result.valid = false;
      result.suggestions.push('Specify a valid project type using --type option');
      return result;
    }

    const typeConfig = PROJECT_TYPES[projectType];

    // Check for required files
    if (typeConfig.files && typeConfig.files.length > 0) {
      result.suggestions.push(
        `Ensure required files exist: ${typeConfig.files.join(', ')}`
      );
    }

    // Check for required dependencies
    if (typeConfig.dependencies && typeConfig.dependencies.length > 0) {
      result.missingDependencies = typeConfig.dependencies;
      result.suggestions.push(
        `Install required dependencies: npm install ${typeConfig.dependencies.join(' ')}`
      );
    }

    return result;
  }

  /**
   * Validate file format (JSON, JSONC, etc.)
   * @param {string} content - File content to validate
   * @param {string} filePath - File path for error messages
   * @param {string} expectedFormat - Expected format (json, jsonc, js, etc.)
   * @returns {object} Validation result
   */
  static validateFileFormat(content, filePath, expectedFormat) {
    const result = {
      valid: true,
      errors: [],
      suggestions: []
    };

    if (!content || typeof content !== 'string') {
      result.valid = false;
      result.errors.push(`File is empty or invalid: ${filePath}`);
      return result;
    }

    switch (expectedFormat.toLowerCase()) {
      case 'json':
      case 'jsonc':
        try {
          // For JSONC, we need to strip comments first
          let cleanContent = content;
          if (expectedFormat.toLowerCase() === 'jsonc') {
            cleanContent = content
              .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
              .replace(/\/\/.*$/gm, '');        // Remove // comments
          }
          JSON.parse(cleanContent);
        } catch (error) {
          result.valid = false;
          result.errors.push(`Invalid JSON syntax in ${filePath}: ${error.message}`);
          result.suggestions.push('Check for missing commas, quotes, or brackets');
          result.suggestions.push('Use a JSON validator to identify syntax errors');
        }
        break;

      case 'js':
      case 'mjs':
        // Basic JavaScript validation (check for obvious syntax errors)
        if (!content.trim()) {
          result.valid = false;
          result.errors.push(`JavaScript file is empty: ${filePath}`);
        }
        // Could add more sophisticated JS validation here
        break;

      default:
        // For other formats, just check if content exists
        if (!content.trim()) {
          result.valid = false;
          result.errors.push(`File is empty: ${filePath}`);
        }
    }

    return result;
  }

  /**
   * Generate installation instructions for missing dependencies
   * @param {string[]} missingDeps - Array of missing dependency names
   * @param {string} packageManager - Package manager to use (npm, yarn, pnpm)
   * @returns {string[]} Array of installation instruction strings
   */
  static generateInstallationInstructions(missingDeps, packageManager = 'npm') {
    if (!missingDeps || missingDeps.length === 0) {
      return [];
    }

    const instructions = [];
    const depsString = missingDeps.join(' ');

    switch (packageManager) {
      case 'yarn':
        instructions.push(`yarn add ${depsString}`);
        break;
      case 'pnpm':
        instructions.push(`pnpm add ${depsString}`);
        break;
      case 'npm':
      default:
        instructions.push(`npm install ${depsString}`);
        break;
    }

    instructions.push('Then run the command again');
    return instructions;
  }
}

export default ValidationUtils;