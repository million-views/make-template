/**
 * Undo Log Manager
 *
 * Manages creation, reading, and validation of undo logs for template restoration.
 * Implements requirements 2.1, 2.2, and 6.1 for undo log generation and management.
 */

import { readFile, writeFile, access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { FileCategorizer } from '../utils/file-categorizer.js';
import { FSUtils } from '../utils/fs-utils.js';
import { Logger } from '../utils/logger.js';
import { RestorationError } from '../utils/errors.js';

export class UndoLogManager {
  constructor() {
    this.fileCategorizer = new FileCategorizer();
    this.logger = new Logger();

    // Undo log schema version for compatibility checking
    this.currentVersion = '1.0.0';

    // Sanitization patterns for removing sensitive information
    // Order matters - more specific patterns should come first
    this.sanitizationRules = {
      apiKeys: {
        patterns: [
          /sk-[a-zA-Z0-9]{48}/g, // OpenAI API keys
          /xoxb-[0-9]+-[0-9]+-[0-9]+-[a-f0-9]{32}/g, // Slack bot tokens
          /ghp_[a-zA-Z0-9]{36}/g, // GitHub personal access tokens
          /AIza[0-9A-Za-z-_]{35}/g // Google API keys
        ],
        replacement: '{{SANITIZED_API_KEY}}'
      },
      personalInfo: {
        patterns: [
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
          /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // full names
          /\/Users\/[^\/]+/g, // macOS user paths
          /C:\\Users\\[^\\]+/g, // Windows user paths
          /\/home\/[^\/]+/g // Linux user paths
        ],
        replacement: '{{SANITIZED_VALUE}}'
      },
      cloudflareIds: {
        patterns: [
          /[a-f0-9]{32}/g, // account IDs (but not API keys)
          /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g // UUIDs
        ],
        replacement: '{{SANITIZED_ID}}'
      }
    };
  }

  /**
   * Create comprehensive undo log during template conversion
   * @param {Object} conversionPlan - The conversion plan from ConversionEngine
   * @param {Object} options - Conversion options
   * @returns {Object} Generated undo log data
   */
  async createUndoLog(conversionPlan, options = {}) {
    try {
      const { analysis, actions } = conversionPlan;

      // Initialize undo log structure
      const undoLog = {
        version: this.currentVersion,
        metadata: {
          makeTemplateVersion: await this.getMakeTemplateVersion(),
          projectType: analysis.projectType,
          timestamp: new Date().toISOString(),
          placeholderFormat: options.placeholderFormat || '{{PLACEHOLDER_NAME}}'
        },
        originalValues: {},
        fileOperations: [],
        sanitized: false,
        sanitizationMap: {}
      };

      // Capture original placeholder values
      for (const placeholder of analysis.placeholders) {
        undoLog.originalValues[placeholder.placeholder] = placeholder.value;
      }

      // Process file operations with categorization
      await this.processFileOperations(undoLog, actions, options);

      // Apply sanitization if requested
      if (options['sanitize-undo']) {
        await this.sanitizeUndoLog(undoLog, options);
      }

      return undoLog;

    } catch (error) {
      throw new Error(`Failed to create undo log: ${error.message}`);
    }
  }

  /**
   * Process file operations and categorize them for restoration
   * @param {Object} undoLog - Undo log being built
   * @param {Array} actions - Conversion actions from plan
   * @param {Object} options - Options
   */
  async processFileOperations(undoLog, actions, options = {}) {
    for (const action of actions) {
      try {
        if (action.type === 'modify') {
          // Handle file modifications (placeholder replacements)
          await this.processModifiedFile(undoLog, action, options);
        } else if (action.type === 'delete') {
          // Handle file/directory deletions
          await this.processDeletedItem(undoLog, action, options);
        } else if (action.type === 'create') {
          // Handle template file creation
          await this.processCreatedFile(undoLog, action, options);
        }
      } catch (error) {
        this.logger.warn(`Failed to process file operation for ${action.file || action.path}: ${error.message}`);
        // Continue processing other operations
      }
    }
  }

  /**
   * Process a modified file for undo log
   * @param {Object} undoLog - Undo log being built
   * @param {Object} action - Modify action
   * @param {Object} options - Options
   */
  async processModifiedFile(undoLog, action, options = {}) {
    try {
      // Read original content before modification
      const originalContent = await readFile(action.file, 'utf8');

      // Categorize the file (only if it exists)
      let categorization;
      try {
        categorization = await this.fileCategorizer.categorizeFile(action.file);
      } catch (error) {
        // If categorization fails, use default
        categorization = {
          category: 'modified',
          action: 'restore-content'
        };
      }

      const fileOperation = {
        type: 'modified',
        path: action.file,
        originalContent: originalContent,
        backupPath: null,
        restorationAction: 'restore-content',
        category: categorization.category,
        fileSize: originalContent.length,
        placeholderReplacements: action.replacements || []
      };

      undoLog.fileOperations.push(fileOperation);

    } catch (error) {
      throw new Error(`Failed to process modified file ${action.file}: ${error.message}`);
    }
  }

  /**
   * Process a deleted item for undo log
   * @param {Object} undoLog - Undo log being built
   * @param {Object} action - Delete action
   * @param {Object} options - Options
   */
  async processDeletedItem(undoLog, action, options = {}) {
    try {
      const itemPath = action.path;

      // Check if item exists
      if (!await this.exists(itemPath)) {
        return; // Item doesn't exist, skip
      }

      // Get item stats
      const stats = await stat(itemPath);
      const isDirectory = stats.isDirectory();

      // Categorize the item
      const categorization = await this.fileCategorizer.categorizeFile(itemPath);

      const fileOperation = {
        type: 'deleted',
        path: itemPath,
        originalContent: null,
        backupPath: null,
        restorationAction: categorization.action,
        category: categorization.category,
        fileSize: isDirectory ? 0 : stats.size,
        regenerationCommand: categorization.regenerationCommand
      };

      // Store content for user-created files and modified files
      if (categorization.storeContent && !isDirectory) {
        try {
          fileOperation.originalContent = await readFile(itemPath, 'utf8');
        } catch (readError) {
          this.logger.warn(`Could not read content for ${itemPath}: ${readError.message}`);
          fileOperation.originalContent = null;
          fileOperation.warnings = [`Content could not be read: ${readError.message}`];
        }
      }

      undoLog.fileOperations.push(fileOperation);

    } catch (error) {
      throw new Error(`Failed to process deleted item ${action.path}: ${error.message}`);
    }
  }

  /**
   * Process a created file for undo log
   * @param {Object} undoLog - Undo log being built
   * @param {Object} action - Create action
   * @param {Object} options - Options
   */
  async processCreatedFile(undoLog, action, options = {}) {
    try {
      // For created files, we don't need to categorize since they don't exist yet
      // We know they will be template files
      const fileOperation = {
        type: 'created',
        path: action.file,
        originalContent: null,
        backupPath: null,
        restorationAction: 'preserve', // Template files should be preserved
        category: 'templateFiles',
        fileSize: action.content ? action.content.length : 0
      };

      undoLog.fileOperations.push(fileOperation);

    } catch (error) {
      throw new Error(`Failed to process created file ${action.file}: ${error.message}`);
    }
  }

  /**
   * Read and validate existing undo log with comprehensive error handling
   * @param {string} filePath - Path to undo log file
   * @returns {Object} Parsed and validated undo log
   */
  async readUndoLog(filePath = '.template-undo.json') {
    try {
      // Check if undo log exists
      if (!await this.exists(filePath)) {
        throw RestorationError.undoLogNotFound(filePath);
      }

      // Check file permissions and readability
      try {
        await access(filePath, constants.R_OK);
      } catch (accessError) {
        throw RestorationError.undoLogCorrupted(
          `Cannot read undo log file: ${accessError.message}`,
          { filePath, accessError: accessError.message }
        );
      }

      // Read file content
      let content;
      try {
        content = await readFile(filePath, 'utf8');
      } catch (readError) {
        throw RestorationError.undoLogCorrupted(
          `Failed to read undo log file: ${readError.message}`,
          { filePath, readError: readError.message }
        );
      }

      // Check for empty or truncated file
      if (!content || content.trim().length === 0) {
        throw RestorationError.undoLogCorrupted(
          'Undo log file is empty or truncated',
          { filePath, contentLength: content?.length || 0 }
        );
      }

      // Parse JSON with detailed error handling
      let undoLog;
      try {
        undoLog = JSON.parse(content);
      } catch (parseError) {
        throw RestorationError.undoLogCorrupted(
          `Undo log contains invalid JSON: ${parseError.message}`,
          {
            filePath,
            parseError: parseError.message,
            contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
          }
        );
      }

      // Validate undo log structure and version with enhanced error handling
      try {
        await this.validateUndoLog(undoLog);
      } catch (validationError) {
        // Check if it's a version mismatch specifically
        if (validationError.message.includes('not compatible with current version')) {
          const versionDetails = this.getVersionCompatibilityDetails(undoLog);
          throw RestorationError.versionMismatch(
            versionDetails.undoLogVersion,
            versionDetails.currentVersion
          );
        }

        // Otherwise, it's corruption
        throw RestorationError.undoLogCorrupted(
          validationError.message,
          { filePath, validationDetails: validationError.message }
        );
      }

      this.logger.info(`✅ Undo log validated successfully: ${filePath}`);
      return undoLog;

    } catch (error) {
      // Re-throw RestorationError instances as-is
      if (error instanceof RestorationError) {
        throw error;
      }

      // Wrap other errors
      throw RestorationError.undoLogCorrupted(
        `Unexpected error reading undo log: ${error.message}`,
        { filePath, originalError: error.message }
      );
    }
  }

  /**
   * Validate undo log structure and content with comprehensive corruption detection
   * @param {Object} undoLog - Undo log to validate
   */
  async validateUndoLog(undoLog) {
    try {
      // Check if undoLog is a valid object
      if (!undoLog || typeof undoLog !== 'object') {
        throw new Error('Undo log is not a valid object');
      }

      // Check required fields
      const requiredFields = ['version', 'metadata', 'originalValues', 'fileOperations'];
      for (const field of requiredFields) {
        if (!undoLog[field]) {
          throw new Error(`Undo log missing required field: ${field}`);
        }
      }

      // Validate version compatibility
      if (!this.validateUndoLogVersion(undoLog)) {
        throw new Error(`Undo log version ${undoLog.version} is not compatible with current version ${this.currentVersion}`);
      }

      // Validate metadata structure with corruption detection
      await this.validateMetadata(undoLog.metadata);

      // Validate file operations structure with corruption detection
      await this.validateFileOperations(undoLog.fileOperations);

      // Validate original values structure
      await this.validateOriginalValues(undoLog.originalValues);

      // Perform integrity checks
      const integrityResult = this.validateUndoLogIntegrity(undoLog);
      if (!integrityResult.valid) {
        throw new Error(`Undo log integrity check failed: ${integrityResult.issues.join(', ')}`);
      }

      // Log warnings if any
      if (integrityResult.warnings.length > 0) {
        this.logger.warn('Undo log validation warnings:');
        integrityResult.warnings.forEach(warning => this.logger.warn(`  - ${warning}`));
      }

    } catch (error) {
      // Wrap validation errors with more context
      throw new Error(`Undo log validation failed: ${error.message}`);
    }
  }

  /**
   * Validate metadata structure and detect corruption
   * @param {Object} metadata - Metadata to validate
   */
  async validateMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Metadata is not a valid object');
    }

    const requiredMetadataFields = ['makeTemplateVersion', 'projectType', 'timestamp', 'placeholderFormat'];
    for (const field of requiredMetadataFields) {
      if (!metadata[field]) {
        throw new Error(`Metadata missing required field: ${field}`);
      }
    }

    // Validate timestamp format
    const timestamp = new Date(metadata.timestamp);
    if (isNaN(timestamp.getTime())) {
      throw new Error('Metadata contains invalid timestamp format');
    }

    // Validate project type
    const validProjectTypes = ['cf-d1', 'cf-turso', 'vite-react', 'generic'];
    if (!validProjectTypes.includes(metadata.projectType)) {
      throw new Error(`Invalid project type in metadata: ${metadata.projectType}`);
    }

    // Validate placeholder format
    if (typeof metadata.placeholderFormat !== 'string' || metadata.placeholderFormat.length === 0) {
      throw new Error('Invalid placeholder format in metadata');
    }
  }

  /**
   * Validate file operations and detect corruption
   * @param {Array} fileOperations - File operations to validate
   */
  async validateFileOperations(fileOperations) {
    if (!Array.isArray(fileOperations)) {
      throw new Error('File operations must be an array');
    }

    const validOperationTypes = ['modified', 'deleted', 'created'];
    // Include 'modified' category produced by FileCategorizer
    const validCategories = ['userCreated', 'generated', 'templateFiles', 'modified'];
    const validActions = ['restore-content', 'regenerate', 'preserve'];

    for (let i = 0; i < fileOperations.length; i++) {
      const operation = fileOperations[i];

      if (!operation || typeof operation !== 'object') {
        throw new Error(`File operation ${i} is not a valid object`);
      }

      // Check required fields
      if (!operation.type || !operation.path) {
        throw new Error(`File operation ${i} missing required fields (type, path)`);
      }

      // Validate operation type
      if (!validOperationTypes.includes(operation.type)) {
        throw new Error(`File operation ${i} has invalid type: ${operation.type}`);
      }

      // Validate path
      if (typeof operation.path !== 'string' || operation.path.length === 0) {
        throw new Error(`File operation ${i} has invalid path`);
      }

      // Validate category if present
      if (operation.category && !validCategories.includes(operation.category)) {
        throw new Error(`File operation ${i} has invalid category: ${operation.category}`);
      }

      // Validate restoration action if present
      if (operation.restorationAction && !validActions.includes(operation.restorationAction)) {
        throw new Error(`File operation ${i} has invalid restoration action: ${operation.restorationAction}`);
      }

      // Validate content consistency
      if (operation.type === 'deleted' && operation.category === 'userCreated') {
        if (!operation.originalContent) {
          throw new Error(`File operation ${i}: user-created deleted file missing original content`);
        }
      }
    }
  }

  /**
   * Validate original values structure
   * @param {Object} originalValues - Original values to validate
   */
  async validateOriginalValues(originalValues) {
    if (!originalValues || typeof originalValues !== 'object') {
      throw new Error('Original values is not a valid object');
    }

    // Check that all keys are valid placeholder format
    for (const [placeholder, value] of Object.entries(originalValues)) {
      if (typeof placeholder !== 'string' || placeholder.length === 0) {
        throw new Error('Invalid placeholder key in original values');
      }

      // Basic placeholder format validation (should contain braces or underscores)
      if (!placeholder.includes('{{') && !placeholder.includes('__') && !placeholder.includes('%')) {
        throw new Error(`Invalid placeholder format: ${placeholder}`);
      }

      if (typeof value !== 'string') {
        throw new Error(`Invalid value type for placeholder ${placeholder}: expected string`);
      }
    }
  }

  /**
   * Check version compatibility with semantic versioning support
   * @param {Object} undoLog - Undo log to check
   * @returns {boolean} Whether versions are compatible
   */
  validateUndoLogVersion(undoLog) {
    const undoLogVersion = undoLog.version;
    const currentVersion = this.currentVersion;

    if (!undoLogVersion || !currentVersion) {
      return false;
    }

    // Parse semantic versions
    const parseVersion = (version) => {
      const parts = version.split('.').map(Number);
      return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0
      };
    };

    try {
      const undoVersion = parseVersion(undoLogVersion);
      const currentVer = parseVersion(currentVersion);

      // Major version must match (breaking changes)
      if (undoVersion.major !== currentVer.major) {
        return false;
      }

      // Minor version compatibility: current version should be >= undo log version
      // This allows newer versions to read older undo logs within the same major version
      if (currentVer.minor < undoVersion.minor) {
        return false;
      }

      // If minor versions match, patch version should be compatible
      if (currentVer.minor === undoVersion.minor && currentVer.patch < undoVersion.patch) {
        return false;
      }

      return true;

    } catch (error) {
      // If version parsing fails, fall back to exact match
      this.logger.warn(`Version parsing failed, using exact match: ${error.message}`);
      return undoLogVersion === currentVersion;
    }
  }

  /**
   * Get detailed version compatibility information
   * @param {Object} undoLog - Undo log to check
   * @returns {Object} Compatibility details
   */
  getVersionCompatibilityDetails(undoLog) {
    const undoLogVersion = undoLog.version;
    const currentVersion = this.currentVersion;
    const isCompatible = this.validateUndoLogVersion(undoLog);

    return {
      compatible: isCompatible,
      undoLogVersion,
      currentVersion,
      reason: isCompatible
        ? 'Versions are compatible'
        : `Undo log version ${undoLogVersion} is not compatible with current version ${currentVersion}`,
      suggestions: isCompatible ? [] : [
        'Update make-template to a compatible version',
        'Regenerate the template with the current version',
        'Check the changelog for breaking changes'
      ]
    };
  }

  /**
   * Sanitize undo log by removing sensitive information
   * @param {Object} undoLog - Undo log to sanitize
   * @param {Object} options - Sanitization options
   * @returns {Object} Sanitized undo log
   */
  async sanitizeUndoLog(undoLog, options = {}) {
    try {
      const sanitizationMap = {};
      let itemsRemoved = 0;

      // Sanitize original values
      for (const [placeholder, value] of Object.entries(undoLog.originalValues)) {
        const sanitizedValue = this.sanitizeValue(value, sanitizationMap);
        if (sanitizedValue !== value) {
          undoLog.originalValues[placeholder] = sanitizedValue;
          itemsRemoved++;
        }
      }

      // Sanitize file operations
      for (const operation of undoLog.fileOperations) {
        if (operation.originalContent) {
          const sanitizedContent = this.sanitizeValue(operation.originalContent, sanitizationMap);
          if (sanitizedContent !== operation.originalContent) {
            operation.originalContent = sanitizedContent;
            itemsRemoved++;
          }
        }

        // Sanitize file paths if they contain user directories
        const sanitizedPath = this.sanitizeValue(operation.path, sanitizationMap);
        if (sanitizedPath !== operation.path) {
          operation.path = sanitizedPath;
          itemsRemoved++;
        }
      }

      // Mark as sanitized and store sanitization metadata
      undoLog.sanitized = true;
      undoLog.sanitizationMap = sanitizationMap;
      undoLog.sanitizationReport = {
        itemsRemoved,
        categoriesAffected: Object.keys(sanitizationMap),
        timestamp: new Date().toISOString()
      };

      return undoLog;

    } catch (error) {
      throw new Error(`Failed to sanitize undo log: ${error.message}`);
    }
  }

  /**
   * Sanitize a single value using configured rules
   * @param {string} value - Value to sanitize
   * @param {Object} sanitizationMap - Map to track sanitized values
   * @returns {string} Sanitized value
   */
  sanitizeValue(value, sanitizationMap) {
    if (typeof value !== 'string') {
      return value;
    }

    let sanitizedValue = value;

    // Apply each sanitization rule
    for (const [category, rule] of Object.entries(this.sanitizationRules)) {
      for (const pattern of rule.patterns) {
        const matches = sanitizedValue.match(pattern);
        if (matches) {
          for (const match of matches) {
            // Track what was sanitized
            if (!sanitizationMap[category]) {
              sanitizationMap[category] = [];
            }
            if (!sanitizationMap[category].includes(match)) {
              sanitizationMap[category].push(match);
            }

            // Replace the specific match with sanitized placeholder
            sanitizedValue = sanitizedValue.replace(match, rule.replacement);
          }
        }
      }
    }

    return sanitizedValue;
  }

  /**
   * Get make-template version from package.json
   * @returns {string} Version string
   */
  async getMakeTemplateVersion() {
    try {
      // Try to read package.json from project root
      const packageContent = await readFile('package.json', 'utf8');
      const packageJson = JSON.parse(packageContent);
      return packageJson.version || '1.0.0';
    } catch (error) {
      this.logger.warn(`Could not determine make-template version: ${error.message}`);
      return '1.0.0';
    }
  }

  /**
   * Save undo log to file atomically
   * @param {Object} undoLog - Undo log to save
   * @param {string} filePath - Path to save to
   */
  async saveUndoLog(undoLog, filePath = '.template-undo.json') {
    try {
      const content = JSON.stringify(undoLog, null, 2);
      await FSUtils.writeFileAtomic(filePath, content);
    } catch (error) {
      throw new Error(`Failed to save undo log: ${error.message}`);
    }
  }

  /**
   * Check if a file exists
   * @param {string} filePath - Path to check
   * @returns {boolean} Whether file exists
   */
  async exists(filePath) {
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get undo log summary for display
   * @param {Object} undoLog - Undo log to summarize
   * @returns {Object} Summary information
   */
  getUndoLogSummary(undoLog) {
    const summary = {
      version: undoLog.version,
      projectType: undoLog.metadata.projectType,
      timestamp: undoLog.metadata.timestamp,
      placeholderCount: Object.keys(undoLog.originalValues).length,
      fileOperations: {
        modified: undoLog.fileOperations.filter(op => op.type === 'modified').length,
        deleted: undoLog.fileOperations.filter(op => op.type === 'deleted').length,
        created: undoLog.fileOperations.filter(op => op.type === 'created').length
      },
      sanitized: undoLog.sanitized || false,
      totalSize: undoLog.fileOperations.reduce((sum, op) => sum + (op.fileSize || 0), 0)
    };

    if (undoLog.sanitized && undoLog.sanitizationReport) {
      summary.sanitizationReport = undoLog.sanitizationReport;
    }

    return summary;
  }

  /**
   * Validate undo log integrity
   * @param {Object} undoLog - Undo log to validate
   * @returns {Object} Validation result
   */
  validateUndoLogIntegrity(undoLog) {
    const issues = [];
    const warnings = [];

    try {
      // Check for missing original values
      const placeholderCount = Object.keys(undoLog.originalValues).length;
      if (placeholderCount === 0) {
        warnings.push('No placeholder values found in undo log');
      }

      // Check file operations
      const operations = undoLog.fileOperations;
      if (operations.length === 0) {
        warnings.push('No file operations found in undo log');
      }

      // Check for operations without content where content should be stored
      const missingContent = operations.filter(op =>
        op.type === 'deleted' &&
        op.category === 'userCreated' &&
        !op.originalContent
      );

      if (missingContent.length > 0) {
        warnings.push(`${missingContent.length} user-created files missing content for restoration`);
      }

      // Check for template files
      const templateFiles = operations.filter(op => op.category === 'templateFiles');
      if (templateFiles.length === 0) {
        warnings.push('No template files found in operations');
      }

      return {
        valid: issues.length === 0,
        issues,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        issues: [`Validation failed: ${error.message}`],
        warnings: []
      };
    }
  }
}

export default UndoLogManager;