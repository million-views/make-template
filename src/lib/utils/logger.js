/**
 * Logging Utilities
 *
 * Logging utilities with appropriate verbosity levels.
 * Implements requirement 9.1: Use exit code 0 for successful operations.
 * Implements requirement 9.2: Use exit code 1 for errors and failures.
 * Implements requirement 9.4: Display installation instructions when required dependencies are missing.
 */

export class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {...any} args - Additional arguments
   */
  error(message, ...args) {
    if (this.levels[this.level] >= this.levels.error) {
      console.error('❌', message, ...this._serializeArgs(args));
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {...any} args - Additional arguments
   */
  warn(message, ...args) {
    if (this.levels[this.level] >= this.levels.warn) {
      console.warn('⚠️', message, ...this._serializeArgs(args));
    }
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {...any} args - Additional arguments
   */
  info(message, ...args) {
    if (this.levels[this.level] >= this.levels.info) {
      console.log('ℹ️', message, ...this._serializeArgs(args));
    }
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {...any} args - Additional arguments
   */
  debug(message, ...args) {
    if (this.levels[this.level] >= this.levels.debug) {
      console.log('🐛', message, ...this._serializeArgs(args));
    }
  }

  /**
   * Log success message
   * @param {string} message - Success message
   * @param {...any} args - Additional arguments
   */
  success(message, ...args) {
    if (this.levels[this.level] >= this.levels.info) {
      console.log('✅', message, ...this._serializeArgs(args));
    }
  }

  /**
   * Log fatal error and exit with code 1
   * @param {string} message - Fatal error message
   * @param {Error} [error] - Optional error object for stack trace
   */
  fatal(message, error = null) {
    this.error(message);
    if (error && this.levels[this.level] >= this.levels.debug) {
      this.debug('Stack trace:', error.stack);
    }
    process.exit(1);
  }

  /**
   * Log validation error with suggestions
   * @param {string} message - Validation error message
   * @param {string[]} suggestions - Array of suggestion strings
   */
  validationError(message, suggestions = []) {
    this.error(message);
    if (suggestions.length > 0) {
      this.info('Suggestions:');
      suggestions.forEach(suggestion => {
        this.info(`  • ${suggestion}`);
      });
    }
  }

  /**
   * Log filesystem error with file path
   * @param {string} operation - Operation that failed (read, write, delete, etc.)
   * @param {string} filePath - File path that caused the error
   * @param {Error} error - Error object
   */
  filesystemError(operation, filePath, error) {
    this.error(`Failed to ${operation} file: ${filePath}`);
    this.error(`Reason: ${error && error.message ? error.message : String(error)}`);

    // Provide helpful suggestions based on error type
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      this.info('Suggestions:');
      this.info('  • Check file permissions');
      this.info('  • Run with appropriate privileges');
      this.info('  • Ensure the file is not locked by another process');
    } else if (error.code === 'ENOSPC') {
      this.info('Suggestions:');
      this.info('  • Free up disk space');
      this.info('  • Try a different location with more space');
    } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
      this.info('Suggestions:');
      this.info('  • Close some open files');
      this.info('  • Increase system file descriptor limits');
    }
  }

  /**
   * Safely serialize arguments for logging to avoid passing non-cloneable objects
   * to the test runner via console.* which can trigger structured-clone errors.
   * @param {Array} args
   * @returns {Array}
   */
  _serializeArgs(args) {
    return args.map(a => {
      if (a === null || a === undefined) return a;
      const t = typeof a;
      if (t === 'string' || t === 'number' || t === 'boolean') return a;
      if (a instanceof Error) {
        // Include name and message, include stack only in debug level
        if (this.levels[this.level] >= this.levels.debug) {
          return `${a.name}: ${a.message}\n${a.stack}`;
        }
        return `${a.name}: ${a.message}`;
      }
      try {
        return JSON.parse(JSON.stringify(a));
      } catch (e) {
        try {
          return String(a);
        } catch (e2) {
          return '[unserializable]';
        }
      }
    });
  }

  /**
   * Log missing dependency error with installation instructions
   * @param {string[]} missingDeps - Array of missing dependency names
   * @param {string} packageManager - Package manager to use (npm, yarn, pnpm)
   */
  missingDependencies(missingDeps, packageManager = 'npm') {
    if (!missingDeps || missingDeps.length === 0) {
      return;
    }

    this.error(`Missing required dependencies: ${missingDeps.join(', ')}`);
    this.info('Installation instructions:');

    const depsString = missingDeps.join(' ');
    switch (packageManager) {
      case 'yarn':
        this.info(`  yarn add ${depsString}`);
        break;
      case 'pnpm':
        this.info(`  pnpm add ${depsString}`);
        break;
      case 'npm':
      default:
        this.info(`  npm install ${depsString}`);
        break;
    }

    this.info('Then run the command again.');
  }

  /**
   * Log operation progress with step information
   * @param {string} operation - Operation name
   * @param {number} current - Current step number
   * @param {number} total - Total number of steps
   * @param {string} description - Step description
   */
  progress(operation, current, total, description) {
    if (this.levels[this.level] >= this.levels.info) {
      const percentage = Math.round((current / total) * 100);
      console.log(`🔄 ${operation} [${current}/${total}] (${percentage}%) ${description}`);
    }
  }

  /**
   * Log completion message with exit code 0
   * @param {string} message - Completion message
   */
  complete(message) {
    this.success(message);
    // Note: Don't call process.exit(0) here as it might be called in non-terminal contexts
  }

  /**
   * Log dry-run information
   * @param {string} message - Dry-run message
   */
  dryRun(message) {
    if (this.levels[this.level] >= this.levels.info) {
      console.log('🔍', message);
    }
  }

  /**
   * Log confirmation prompt
   * @param {string} message - Confirmation message
   */
  confirm(message) {
    if (this.levels[this.level] >= this.levels.info) {
      console.log('❓', message);
    }
  }

  /**
   * Create a child logger with a prefix
   * @param {string} prefix - Prefix for all log messages
   * @returns {Logger} New logger instance with prefix
   */
  child(prefix) {
    const childLogger = new Logger(this.level);

    // Override all methods to add prefix
    const originalMethods = ['error', 'warn', 'info', 'debug', 'success', 'dryRun', 'confirm'];
    originalMethods.forEach(method => {
      const originalMethod = childLogger[method];
      childLogger[method] = (message, ...args) => {
        originalMethod.call(childLogger, `[${prefix}] ${message}`, ...args);
      };
    });

    return childLogger;
  }

  /**
   * Set log level
   * @param {string} level - Log level (error, warn, info, debug)
   */
  setLevel(level) {
    if (this.levels.hasOwnProperty(level)) {
      this.level = level;
    } else {
      this.warn(`Invalid log level: ${level}. Using current level: ${this.level}`);
    }
  }
}

export default Logger;