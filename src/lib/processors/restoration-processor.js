/**
 * Restoration Processor
 * 
 * Executes restoration plans to restore templatized projects back to working state.
 * Implements requirements 1.1, 1.2, 1.3, 8.1, 8.2, and 8.3 for restoration execution.
 */

import { FSUtils } from '../utils/fs-utils.js';
import { Logger } from '../utils/logger.js';
import FileProcessor from './file-processor.js';
import { ERROR_CODES } from '../config.js';
import { RestorationError } from '../utils/errors.js';

export class RestorationProcessor {
  constructor() {
    this.logger = new Logger();
    this.fileProcessor = new FileProcessor();
  }

  /**
   * Execute restoration plan with proper error handling and progress reporting
   * @param {Object} plan - Restoration plan to execute
   * @returns {Object} Execution result with success status and details
   */
  async executePlan(plan) {
    try {
      this.logger.info('⚡ Starting restoration plan execution...');
      
      const result = {
        success: true,
        actionsExecuted: 0,
        actionResults: [],
        errors: [],
        warnings: [],
        startTime: new Date().toISOString()
      };

      // Validate plan structure
      this.validatePlan(plan);

      // Execute actions in order
      for (let i = 0; i < plan.actions.length; i++) {
        const action = plan.actions[i];
        
        try {
          this.logger.info(`📋 Executing action ${i + 1}/${plan.actions.length}: ${action.type} ${action.path || ''}`);
          
          const actionResult = await this.executeAction(action);
          
          result.actionResults.push({
            ...actionResult,
            actionIndex: i,
            type: action.type,
            path: action.path
          });
          
          if (actionResult.success) {
            result.actionsExecuted++;
          } else {
            result.success = false;
            result.errors.push(actionResult.error || `Failed to execute ${action.type} for ${action.path}`);
          }
          
        } catch (error) {
          this.logger.error(`❌ Failed to execute action ${i + 1}: ${error.message}`);
          
          result.success = false;
          result.errors.push(`Action ${i + 1} (${action.type}): ${error.message}`);
          result.actionResults.push({
            success: false,
            error: error.message,
            actionIndex: i,
            type: action.type,
            path: action.path
          });
          
          // Continue with remaining actions even if one fails
          continue;
        }
      }

      result.endTime = new Date().toISOString();
      result.duration = new Date(result.endTime) - new Date(result.startTime);

      // Handle partial failures
      if (!result.success && result.actionsExecuted > 0) {
        // Partial failure - some actions succeeded, some failed
        const failedActions = result.actionResults.filter(r => !r.success);
        const succeededActions = result.actionResults.filter(r => r.success);
        
        this.logger.warn(`⚠️  Partial restoration failure: ${succeededActions.length} succeeded, ${failedActions.length} failed`);
        
        // Offer cleanup guidance
        result.cleanupGuidance = this.generateCleanupGuidance(succeededActions, failedActions);
        result.partialFailure = true;
        
        // Log detailed results
        this.logger.info('✅ Successful actions:');
        succeededActions.forEach(action => {
          this.logger.info(`   • ${action.type}: ${action.path || 'N/A'}`);
        });
        
        this.logger.error('❌ Failed actions:');
        failedActions.forEach(action => {
          this.logger.error(`   • ${action.type}: ${action.path || 'N/A'} - ${action.error}`);
        });
        
        if (result.cleanupGuidance.length > 0) {
          this.logger.info('🔧 Cleanup guidance:');
          result.cleanupGuidance.forEach(guidance => {
            this.logger.info(`   • ${guidance}`);
          });
        }
        
      } else if (result.success) {
        this.logger.success(`✅ Restoration completed successfully! ${result.actionsExecuted} actions executed.`);
      } else {
        this.logger.error(`❌ Restoration failed completely. No actions were executed successfully.`);
        result.errors.forEach(error => this.logger.error(`   • ${error}`));
      }

      return result;

    } catch (error) {
      this.logger.error(`❌ Restoration plan execution failed: ${error.message}`);
      
      return {
        success: false,
        actionsExecuted: 0,
        actionResults: [],
        errors: [error.message],
        warnings: [],
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 0
      };
    }
  }

  /**
   * Detect conflicts before executing restoration plan
   * @param {Object} plan - Restoration plan to check
   * @returns {Array} Array of conflicts found
   */
  async detectConflicts(plan) {
    const conflicts = [];
    
    for (const action of plan.actions) {
      if (action.type === 'restore-file' || action.type === 'recreate-file') {
        const conflict = await this.checkFileConflict(action);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Check if a single action would cause a conflict
   * @param {Object} action - Action to check
   * @returns {Object|null} Conflict details or null if no conflict
   */
  async checkFileConflict(action) {
    const filePath = action.path;
    
    try {
      // Check if file exists
      const exists = await FSUtils.exists(filePath);
      if (!exists) {
        return null; // No conflict if file doesn't exist
      }

      // Check if file is different from what we want to restore
      if (action.content) {
        const currentContent = await FSUtils.readFile(filePath);
        if (currentContent === action.content) {
          return null; // No conflict if content is identical
        }
      }

      // Check file permissions
      const stats = await FSUtils.stat(filePath);
      if (!stats.isFile()) {
        return {
          path: filePath,
          type: 'not-a-file',
          reason: 'Path exists but is not a file',
          action: action.type
        };
      }

      return {
        path: filePath,
        type: 'content-conflict',
        reason: 'File exists with different content',
        action: action.type,
        currentSize: stats.size,
        lastModified: stats.mtime
      };

    } catch (error) {
      return {
        path: filePath,
        type: 'access-error',
        reason: `Cannot access file: ${error.message}`,
        action: action.type,
        error: error.message
      };
    }
  }

  /**
   * Create backup of conflicting files
   * @param {Array} conflicts - Array of conflicts to backup
   * @param {Object} options - Backup options
   * @returns {Object} Backup result
   */
  async createBackups(conflicts, options = {}) {
    const backupResults = {
      success: true,
      backups: [],
      errors: []
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSuffix = options.backupSuffix || `.backup-${timestamp}`;

    for (const conflict of conflicts) {
      try {
        const backupPath = `${conflict.path}${backupSuffix}`;
        
        // Ensure backup path doesn't already exist
        let finalBackupPath = backupPath;
        let counter = 1;
        while (await FSUtils.exists(finalBackupPath)) {
          finalBackupPath = `${backupPath}.${counter}`;
          counter++;
        }

        // Create backup
        await FSUtils.copyFile(conflict.path, finalBackupPath);
        
        backupResults.backups.push({
          originalPath: conflict.path,
          backupPath: finalBackupPath,
          conflict: conflict
        });

        this.logger.info(`📦 Created backup: ${conflict.path} → ${finalBackupPath}`);

      } catch (error) {
        backupResults.success = false;
        backupResults.errors.push({
          path: conflict.path,
          error: error.message
        });
        
        this.logger.error(`❌ Failed to create backup for ${conflict.path}: ${error.message}`);
      }
    }

    return backupResults;
  }

  /**
   * Handle restoration conflicts based on resolution strategy
   * @param {Array} conflicts - Array of conflicts
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution result
   */
  async resolveConflicts(conflicts, options = {}) {
    const { strategy = 'prompt', backup = true, force = false } = options;
    
    if (conflicts.length === 0) {
      return { resolved: true, conflicts: [], backups: [] };
    }

    // If force is enabled, skip conflict resolution
    if (force) {
      this.logger.warn(`⚠️  Force mode enabled, overwriting ${conflicts.length} conflicting files`);
      return { resolved: true, conflicts, backups: [] };
    }

    // Create backups if requested
    let backupResult = { success: true, backups: [], errors: [] };
    if (backup) {
      backupResult = await this.createBackups(conflicts, options);
      if (!backupResult.success) {
        throw RestorationError.restorationConflict([
          ...conflicts,
          ...backupResult.errors.map(e => ({ path: e.path, reason: `Backup failed: ${e.error}` }))
        ]);
      }
    }

    // For now, we'll assume conflicts are resolved if backups were created successfully
    // In a full implementation, this would include user prompts for interactive resolution
    return {
      resolved: true,
      conflicts,
      backups: backupResult.backups
    };
  }

  /**
   * Execute restoration plan with conflict detection and resolution
   * @param {Object} plan - Restoration plan to execute
   * @param {Object} options - Execution options
   * @returns {Object} Execution result with conflict resolution details
   */
  async executeWithConflictResolution(plan, options = {}) {
    try {
      // Detect conflicts first
      const conflicts = await this.detectConflicts(plan);
      
      if (conflicts.length > 0) {
        this.logger.warn(`⚠️  Detected ${conflicts.length} potential conflicts`);
        
        // Resolve conflicts
        const resolution = await this.resolveConflicts(conflicts, options);
        if (!resolution.resolved) {
          throw RestorationError.restorationConflict(conflicts);
        }
        
        // Add conflict resolution info to result
        const result = await this.executePlan(plan);
        result.conflicts = conflicts;
        result.conflictResolution = resolution;
        
        return result;
      }
      
      // No conflicts, execute normally
      return await this.executePlan(plan);
      
    } catch (error) {
      if (error instanceof RestorationError) {
        throw error;
      }
      
      throw new RestorationError(
        `Conflict resolution failed: ${error.message}`,
        ERROR_CODES.RESTORATION_CONFLICT,
        { originalError: error.message }
      );
    }
  }

  /**
   * Execute a single restoration action
   * @param {Object} action - Action to execute
   * @returns {Object} Action execution result
   */
  async executeAction(action) {
    switch (action.type) {
      case 'restore-file':
        return await this.restoreFile(action);
        
      case 'recreate-file':
        return await this.recreateFile(action);
        
      case 'recreate-directory':
        return await this.recreateDirectory(action);
        
      case 'preserve-file':
        return await this.preserveFile(action);
        
      case 'use-default-value':
      case 'restore-placeholders-only':
      case 'selective-note':
        // These are informational actions that don't require file operations
        return { success: true, message: action.note || 'Informational action completed' };
        
      default:
        throw new RestorationError(
          `Unknown action type: ${action.type}`,
          ERROR_CODES.PROCESSING_ERROR
        );
    }
  }

  /**
   * Restore a file with placeholder replacement
   * @param {Object} action - Restore file action
   * @returns {Object} Action result
   */
  async restoreFile(action) {
    try {
      const { path, content, placeholderReplacements = [] } = action;
      
      // Check if file exists
      if (!(await FSUtils.exists(path))) {
        throw new Error(`File not found: ${path}`);
      }

      // If we have original content, restore it directly
      if (content !== null && content !== undefined) {
        await FSUtils.writeFileAtomic(path, content);
        this.logger.info(`   ✅ Restored ${path} with original content`);
        
        return {
          success: true,
          message: `File ${path} restored with original content`,
          operation: 'restore-content'
        };
      }

      // If we have placeholder replacements, apply them to current content
      if (placeholderReplacements.length > 0) {
        await this.fileProcessor.processFile(path, placeholderReplacements);
        this.logger.info(`   ✅ Restored ${path} with ${placeholderReplacements.length} placeholder replacements`);
        
        return {
          success: true,
          message: `File ${path} restored with placeholder replacements`,
          operation: 'restore-placeholders',
          replacements: placeholderReplacements.length
        };
      }

      // No content or replacements provided
      this.logger.warn(`   ⚠️  No restoration data available for ${path}`);
      return {
        success: true,
        message: `No restoration data available for ${path}`,
        operation: 'no-operation'
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to restore file ${action.path}: ${error.message}`,
        operation: 'restore-file-failed'
      };
    }
  }

  /**
   * Recreate a deleted file with original content
   * @param {Object} action - Recreate file action
   * @returns {Object} Action result
   */
  async recreateFile(action) {
    try {
      const { path, content } = action;
      
      // Check if file already exists
      if (await FSUtils.exists(path)) {
        this.logger.warn(`   ⚠️  File ${path} already exists, skipping recreation`);
        return {
          success: true,
          message: `File ${path} already exists, skipped recreation`,
          operation: 'skip-existing'
        };
      }

      // Recreate file with original content
      if (content !== null && content !== undefined) {
        await FSUtils.writeFileAtomic(path, content);
        this.logger.info(`   ✅ Recreated ${path} with original content`);
        
        return {
          success: true,
          message: `File ${path} recreated with original content`,
          operation: 'recreate-content'
        };
      } else {
        throw new Error(`No content available to recreate ${path}`);
      }

    } catch (error) {
      return {
        success: false,
        error: `Failed to recreate file ${action.path}: ${error.message}`,
        operation: 'recreate-file-failed'
      };
    }
  }

  /**
   * Recreate a deleted directory (empty)
   * @param {Object} action - Recreate directory action
   * @returns {Object} Action result
   */
  async recreateDirectory(action) {
    try {
      const { path, regenerationCommand } = action;
      
      // Check if directory already exists
      if (await FSUtils.exists(path)) {
        this.logger.warn(`   ⚠️  Directory ${path} already exists, skipping recreation`);
        return {
          success: true,
          message: `Directory ${path} already exists, skipped recreation`,
          operation: 'skip-existing'
        };
      }

      // Create empty directory
      await FSUtils.ensureDir(path);
      this.logger.info(`   ✅ Recreated directory ${path} (empty)`);
      
      if (regenerationCommand) {
        this.logger.info(`   💡 Run '${regenerationCommand}' to regenerate content`);
      }

      return {
        success: true,
        message: `Directory ${path} recreated (empty)`,
        operation: 'recreate-directory',
        regenerationCommand
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to recreate directory ${action.path}: ${error.message}`,
        operation: 'recreate-directory-failed'
      };
    }
  }

  /**
   * Preserve a file (no-op, just log)
   * @param {Object} action - Preserve file action
   * @returns {Object} Action result
   */
  async preserveFile(action) {
    try {
      const { path, note } = action;
      
      // Check if file exists
      if (await FSUtils.exists(path)) {
        this.logger.info(`   🔒 Preserved ${path} - ${note || 'template file maintained'}`);
        
        return {
          success: true,
          message: `File ${path} preserved`,
          operation: 'preserve',
          note
        };
      } else {
        this.logger.warn(`   ⚠️  File ${path} marked for preservation but not found`);
        
        return {
          success: true,
          message: `File ${path} marked for preservation but not found`,
          operation: 'preserve-missing'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Failed to check preservation status for ${action.path}: ${error.message}`,
        operation: 'preserve-failed'
      };
    }
  }

  /**
   * Validate restoration plan structure
   * @param {Object} plan - Plan to validate
   * @throws {RestorationError} If plan is invalid
   */
  validatePlan(plan) {
    if (!plan) {
      throw new RestorationError(
        'Restoration plan is required',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (!Array.isArray(plan.actions)) {
      throw new RestorationError(
        'Restoration plan must have actions array',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate each action has required fields
    for (let i = 0; i < plan.actions.length; i++) {
      const action = plan.actions[i];
      
      if (!action.type) {
        throw new RestorationError(
          `Action ${i} missing required 'type' field`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Validate action-specific requirements
      switch (action.type) {
        case 'restore-file':
        case 'recreate-file':
        case 'recreate-directory':
        case 'preserve-file':
          if (!action.path) {
            throw new RestorationError(
              `Action ${i} (${action.type}) missing required 'path' field`,
              ERROR_CODES.VALIDATION_ERROR
            );
          }
          break;
      }
    }
  }

  /**
   * Check for file conflicts before restoration
   * @param {Object} plan - Restoration plan
   * @returns {Array} Array of potential conflicts
   */
  async detectConflicts(plan) {
    const conflicts = [];
    
    for (const action of plan.actions) {
      if (action.type === 'recreate-file' && action.path) {
        if (await FSUtils.exists(action.path)) {
          conflicts.push({
            type: 'file-exists',
            path: action.path,
            action: action.type,
            message: `File ${action.path} already exists and would be overwritten`
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Create backup of existing files before restoration
   * @param {Array} filePaths - Paths to backup
   * @returns {Object} Backup result with backup paths
   */
  async createBackups(filePaths) {
    const backups = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    for (const filePath of filePaths) {
      try {
        if (await FSUtils.exists(filePath)) {
          const backupPath = `${filePath}.backup-${timestamp}`;
          await FSUtils.copyFile(filePath, backupPath);
          backups.push({ original: filePath, backup: backupPath });
          this.logger.info(`   💾 Created backup: ${backupPath}`);
        }
      } catch (error) {
        this.logger.warn(`   ⚠️  Failed to backup ${filePath}: ${error.message}`);
      }
    }
    
    return { backups, timestamp };
  }

  /**
   * Rollback restoration on failure
   * @param {Object} result - Partial restoration result
   * @param {Object} backups - Backup information
   * @returns {Object} Rollback result
   */
  async rollbackRestoration(result, backups) {
    this.logger.info('🔄 Rolling back restoration due to failure...');
    
    const rollbackResult = {
      success: true,
      restoredFiles: 0,
      errors: []
    };
    
    if (backups && backups.backups) {
      for (const backup of backups.backups) {
        try {
          await FSUtils.copyFile(backup.backup, backup.original);
          await FSUtils.remove(backup.backup);
          rollbackResult.restoredFiles++;
          this.logger.info(`   ✅ Restored ${backup.original} from backup`);
        } catch (error) {
          rollbackResult.success = false;
          rollbackResult.errors.push(`Failed to restore ${backup.original}: ${error.message}`);
          this.logger.error(`   ❌ Failed to restore ${backup.original}: ${error.message}`);
        }
      }
    }
    
    return rollbackResult;
  }

  /**
   * Execute restoration plan with safety features
   * @param {Object} plan - Restoration plan to execute
   * @param {Object} options - Safety options
   * @returns {Object} Execution result with safety information
   */
  async executePlanWithSafety(plan, options = {}) {
    try {
      this.logger.info('⚡ Starting restoration plan execution with safety features...');
      
      // Validate plan first
      this.validatePlan(plan);
      
      const safetyOptions = {
        createBackups: true,
        detectConflicts: true,
        rollbackOnFailure: true,
        ...options
      };
      
      const result = {
        success: true,
        actionsExecuted: 0,
        actionResults: [],
        errors: [],
        warnings: [],
        startTime: new Date().toISOString(),
        conflicts: [],
        backupInfo: null,
        rollbackInfo: null
      };

      // Detect conflicts if requested
      if (safetyOptions.detectConflicts) {
        result.conflicts = await this.detectConflicts(plan);
        if (result.conflicts.length > 0) {
          this.logger.warn(`⚠️  Detected ${result.conflicts.length} potential conflicts`);
          for (const conflict of result.conflicts) {
            this.logger.warn(`   • ${conflict.message}`);
          }
        }
      }

      // Create backups if requested
      if (safetyOptions.createBackups) {
        const filesToBackup = this.getFilesToBackup(plan);
        if (filesToBackup.length > 0) {
          this.logger.info(`💾 Creating backups for ${filesToBackup.length} files...`);
          result.backupInfo = await this.createBackups(filesToBackup);
        }
      } else {
        // Remove backupInfo from result if not creating backups
        delete result.backupInfo;
      }

      // Execute the plan
      const executionResult = await this.executePlan(plan);
      
      // Merge execution results
      result.success = executionResult.success;
      result.actionsExecuted = executionResult.actionsExecuted;
      result.actionResults = executionResult.actionResults;
      result.errors = executionResult.errors;
      result.warnings = executionResult.warnings;
      result.endTime = executionResult.endTime;
      result.duration = executionResult.duration;

      // Handle rollback on failure
      if (!result.success && safetyOptions.rollbackOnFailure && result.backupInfo) {
        this.logger.warn('⚠️  Restoration failed, initiating rollback...');
        result.rollbackInfo = await this.rollbackRestoration(result, result.backupInfo);
        
        if (result.rollbackInfo.success) {
          this.logger.info('✅ Rollback completed successfully');
        } else {
          this.logger.error('❌ Rollback failed');
          result.errors.push(...result.rollbackInfo.errors);
        }
      }

      return result;

    } catch (error) {
      this.logger.error(`❌ Restoration plan execution with safety failed: ${error.message}`);
      
      return {
        success: false,
        actionsExecuted: 0,
        actionResults: [],
        errors: [error.message],
        warnings: [],
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 0,
        conflicts: [],
        backupInfo: null,
        rollbackInfo: null
      };
    }
  }

  /**
   * Get files that need to be backed up from the plan
   * @param {Object} plan - Restoration plan
   * @returns {Array} Array of file paths to backup
   */
  getFilesToBackup(plan) {
    const filesToBackup = [];
    
    for (const action of plan.actions) {
      if (action.path && (action.type === 'restore-file' || action.type === 'recreate-file')) {
        filesToBackup.push(action.path);
      }
    }
    
    return filesToBackup;
  }

  /**
   * Get restoration statistics
   * @param {Object} result - Restoration result
   * @returns {Object} Statistics summary
   */
  getRestorationStats(result) {
    const stats = {
      total: result.actionResults.length,
      successful: result.actionResults.filter(r => r.success).length,
      failed: result.actionResults.filter(r => !r.success).length,
      operations: {}
    };
    
    // Count operations by type
    for (const actionResult of result.actionResults) {
      const op = actionResult.operation || 'unknown';
      stats.operations[op] = (stats.operations[op] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Generate cleanup guidance for partial failures
   * @param {Array} succeededActions - Actions that succeeded
   * @param {Array} failedActions - Actions that failed
   * @returns {Array} Array of cleanup guidance strings
   */
  generateCleanupGuidance(succeededActions, failedActions) {
    const guidance = [];
    
    // Check for file restoration failures
    const failedFileRestorations = failedActions.filter(a => 
      a.type === 'restore-file' || a.type === 'recreate-file'
    );
    
    if (failedFileRestorations.length > 0) {
      guidance.push(`${failedFileRestorations.length} file restoration(s) failed - check file permissions and disk space`);
      
      // Specific guidance for common failure types
      const permissionFailures = failedFileRestorations.filter(a => 
        a.error && a.error.includes('permission')
      );
      if (permissionFailures.length > 0) {
        guidance.push('Some failures appear to be permission-related - check file/directory permissions');
      }
      
      const spaceFailures = failedFileRestorations.filter(a => 
        a.error && (a.error.includes('ENOSPC') || a.error.includes('disk'))
      );
      if (spaceFailures.length > 0) {
        guidance.push('Some failures appear to be disk space-related - check available disk space');
      }
    }
    
    // Check for successful file restorations that might need regeneration
    const succeededFileRestorations = succeededActions.filter(a => 
      a.type === 'restore-file' && a.path && (
        a.path.includes('package.json') || 
        a.path.includes('wrangler.jsonc')
      )
    );
    
    if (succeededFileRestorations.length > 0) {
      guidance.push('Run "npm install" to regenerate dependencies after package.json restoration');
    }
    
    // Check for directory recreations
    const recreatedDirs = succeededActions.filter(a => a.type === 'recreate-directory');
    if (recreatedDirs.length > 0) {
      guidance.push('Some directories were recreated empty - run build/install commands to populate them');
    }
    
    // Guidance for retry
    if (failedActions.length > 0) {
      guidance.push('Fix the underlying issues and retry restoration for failed operations only');
    }
    
    return guidance;
  }

  /**
   * Perform cleanup after partial restoration failure
   * @param {Object} result - Restoration result with partial failure
   * @param {Object} options - Cleanup options
   * @returns {Object} Cleanup result
   */
  async performPartialFailureCleanup(result, options = {}) {
    const { removePartialFiles = false, createFailureReport = true } = options;
    
    const cleanupResult = {
      success: true,
      actions: [],
      errors: []
    };
    
    try {
      // Create failure report if requested
      if (createFailureReport) {
        const reportPath = '.restoration-failure-report.json';
        const report = {
          timestamp: new Date().toISOString(),
          totalActions: result.actionResults.length,
          succeededActions: result.actionResults.filter(r => r.success).length,
          failedActions: result.actionResults.filter(r => !r.success).length,
          failures: result.actionResults.filter(r => !r.success).map(r => ({
            type: r.type,
            path: r.path,
            error: r.error
          })),
          cleanupGuidance: result.cleanupGuidance || []
        };
        
        await FSUtils.writeFile(reportPath, JSON.stringify(report, null, 2));
        cleanupResult.actions.push(`Created failure report: ${reportPath}`);
        this.logger.info(`📋 Created restoration failure report: ${reportPath}`);
      }
      
      // Remove partially restored files if requested
      if (removePartialFiles) {
        const partialFiles = result.actionResults
          .filter(r => r.success && (r.type === 'restore-file' || r.type === 'recreate-file'))
          .map(r => r.path);
          
        for (const filePath of partialFiles) {
          try {
            if (await FSUtils.exists(filePath)) {
              await FSUtils.deleteFile(filePath);
              cleanupResult.actions.push(`Removed partial file: ${filePath}`);
              this.logger.info(`🗑️  Removed partial restoration: ${filePath}`);
            }
          } catch (error) {
            cleanupResult.errors.push(`Failed to remove ${filePath}: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      cleanupResult.success = false;
      cleanupResult.errors.push(`Cleanup failed: ${error.message}`);
    }
    
    return cleanupResult;
  }
}

export default RestorationProcessor;