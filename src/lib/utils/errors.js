/**
 * Error Classes
 * 
 * Centralized error handling for the make-template CLI tool.
 */

import { ERROR_CODES } from '../config.js';

/**
 * Base error class for make-template operations
 */
export class MakeTemplateError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'MakeTemplateError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Restoration-specific error class extending MakeTemplateError
 */
export class RestorationError extends MakeTemplateError {
  constructor(message, code, details = {}) {
    super(message, code, details);
    this.name = 'RestorationError';
  }

  /**
   * Create error for missing undo log
   * @param {string} path - Path where undo log was expected
   * @returns {RestorationError}
   */
  static undoLogNotFound(path = '.template-undo.json') {
    return new RestorationError(
      `Undo log not found at ${path}. This directory may not be a converted template.`,
      ERROR_CODES.UNDO_LOG_NOT_FOUND,
      {
        path,
        suggestions: [
          'Ensure you are in a directory that was converted with make-template',
          'Check if the .template-undo.json file exists',
          'Try running make-template first to create a template'
        ]
      }
    );
  }

  /**
   * Create error for corrupted undo log
   * @param {string} reason - Specific corruption reason
   * @param {Object} details - Additional details about the corruption
   * @returns {RestorationError}
   */
  static undoLogCorrupted(reason, details = {}) {
    return new RestorationError(
      `Undo log is corrupted: ${reason}`,
      ERROR_CODES.UNDO_LOG_CORRUPTED,
      {
        reason,
        ...details,
        suggestions: [
          'Check if the .template-undo.json file was manually modified',
          'Try regenerating the template with make-template',
          'Restore from backup if available'
        ]
      }
    );
  }

  /**
   * Create error for version mismatch
   * @param {string} undoLogVersion - Version in the undo log
   * @param {string} currentVersion - Current make-template version
   * @returns {RestorationError}
   */
  static versionMismatch(undoLogVersion, currentVersion) {
    return new RestorationError(
      `Undo log version ${undoLogVersion} is not compatible with current version ${currentVersion}`,
      ERROR_CODES.UNDO_LOG_VERSION_MISMATCH,
      {
        undoLogVersion,
        currentVersion,
        suggestions: [
          'Update make-template to a compatible version',
          'Regenerate the template with the current version',
          'Check the changelog for breaking changes'
        ]
      }
    );
  }

  /**
   * Create error for restoration conflicts
   * @param {Array} conflicts - List of conflicting files
   * @returns {RestorationError}
   */
  static restorationConflict(conflicts) {
    const fileList = conflicts.map(c => `  - ${c.path}: ${c.reason}`).join('\n');
    return new RestorationError(
      `Restoration conflicts detected:\n${fileList}`,
      ERROR_CODES.RESTORATION_CONFLICT,
      {
        conflicts,
        suggestions: [
          'Use --backup to create backups of conflicting files',
          'Use --force to overwrite existing files',
          'Manually resolve conflicts and try again'
        ]
      }
    );
  }

  /**
   * Create error for missing restoration values
   * @param {Array} missingValues - List of missing placeholder values
   * @returns {RestorationError}
   */
  static missingValues(missingValues) {
    const valueList = missingValues.join(', ');
    return new RestorationError(
      `Missing restoration values: ${valueList}`,
      ERROR_CODES.MISSING_RESTORATION_VALUES,
      {
        missingValues,
        suggestions: [
          'Create a .restore-defaults.json file with default values',
          'Use interactive mode to provide values',
          'Check if the undo log was sanitized'
        ]
      }
    );
  }

  /**
   * Create error for partial restoration failure
   * @param {Array} failures - List of failed operations
   * @param {Array} successes - List of successful operations
   * @returns {RestorationError}
   */
  static partialFailure(failures, successes) {
    const failureList = failures.map(f => `  - ${f.operation}: ${f.error}`).join('\n');
    return new RestorationError(
      `Restoration partially failed. ${successes.length} operations succeeded, ${failures.length} failed:\n${failureList}`,
      ERROR_CODES.RESTORATION_PARTIAL_FAILURE,
      {
        failures,
        successes,
        suggestions: [
          'Review failed operations and fix underlying issues',
          'Try restoration again for failed operations only',
          'Check file permissions and disk space'
        ]
      }
    );
  }
}