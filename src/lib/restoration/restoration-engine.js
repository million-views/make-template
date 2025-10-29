/**
 * Restoration Engine
 * 
 * Main orchestration logic for restoring templatized projects back to working state.
 * Implements requirements 1.1, 1.2, 8.1, and 8.2 for restoration workflow orchestration.
 */

import { createInterface } from 'node:readline';
import { UndoLogManager } from './undo-log-manager.js';
import { RestorationPlanner } from './restoration-planner.js';
import { RestorationProcessor } from '../processors/restoration-processor.js';
import { InteractivePrompter } from './interactive-prompter.js';
import { Logger } from '../utils/logger.js';
import { FSUtils } from '../utils/fs-utils.js';
import { ERROR_CODES } from '../config.js';
import { RestorationError } from '../utils/errors.js';

export class RestorationEngine {
  constructor() {
    this.logger = new Logger();
    this.undoLogManager = new UndoLogManager();
    this.restorationPlanner = new RestorationPlanner();
    this.restorationProcessor = new RestorationProcessor();
  }

  /**
   * Main restoration workflow orchestration
   * @param {Object} options - Restoration options
   * @returns {Object} Restoration result
   */
  async restore(options = {}) {
    try {
      this.logger.info('🔄 Starting template restoration process...');
      
      // Step 1: Read and validate undo log
      this.logger.info('📋 Reading undo log...');
      const undoLog = await this.undoLogManager.readUndoLog(options.undoLogPath || '.template-undo.json');
      
      // Display undo log summary
      this.displayUndoLogSummary(undoLog);
      
      // Step 2: Create restoration plan
      this.logger.info('📝 Creating restoration plan...');
      const plan = await this.restorationPlanner.createRestorationPlan(undoLog, options);
      
      // Step 3: Handle missing values with interactive prompting
      if (plan.missingValues && plan.missingValues.length > 0) {
        this.logger.info('🔧 Resolving missing restoration values...');
        const interactivePrompter = new InteractivePrompter();
        const resolvedValues = await interactivePrompter.promptWithDefaults(plan.missingValues);
        
        // Update the plan with resolved values
        plan.resolvedValues = { ...plan.resolvedValues, ...resolvedValues };
        plan.missingValues = []; // Clear missing values since they're now resolved
      }
      
      // Step 4: Handle dry-run mode
      if (options['dry-run']) {
        return await this.displayRestorationPreview(plan);
      }
      
      // Step 5: Get user confirmation unless --yes flag is used
      if (!options.yes) {
        const confirmed = await this.getUserConfirmation(plan);
        if (!confirmed) {
          this.logger.info('Restoration cancelled by user. No changes were made.');
          this.logger.info('💡 Try --dry-run to preview restoration first.');
          return { success: false, cancelled: true };
        }
      } else {
        this.logger.info('Auto-confirmed with --yes flag. Starting restoration process...');
      }
      
      // Step 6: Execute restoration plan
      this.logger.info('⚡ Executing restoration plan...');
      const result = await this.executeRestorationPlan(plan);
      
      this.logger.success('✅ Template restoration completed successfully!');
      this.displayPostRestorationGuidance(plan);
      
      return { success: true, result };
      
    } catch (error) {
      if (error instanceof RestorationError) {
        this.logger.error(error.message);
        if (error.details.suggestions) {
          error.details.suggestions.forEach(suggestion => {
            this.logger.info(`💡 ${suggestion}`);
          });
        }
        process.exit(1);
      } else {
        this.logger.error('Unexpected error during restoration:', error.message);
        this.logger.debug('Stack trace:', error.stack);
        process.exit(1);
      }
    }
  }

  /**
   * Display undo log summary information
   * @param {Object} undoLog - Undo log data
   */
  displayUndoLogSummary(undoLog) {
    const summary = this.undoLogManager.getUndoLogSummary(undoLog);
    
    this.logger.info('📊 Undo log summary:');
    this.logger.info(`   • Project type: ${summary.projectType}`);
    this.logger.info(`   • Created: ${new Date(summary.timestamp).toLocaleString()}`);
    this.logger.info(`   • Placeholders: ${summary.placeholderCount}`);
    this.logger.info(`   • File operations: ${summary.fileOperations.modified + summary.fileOperations.deleted + summary.fileOperations.created}`);
    this.logger.info(`     - Modified: ${summary.fileOperations.modified}`);
    this.logger.info(`     - Deleted: ${summary.fileOperations.deleted}`);
    this.logger.info(`     - Created: ${summary.fileOperations.created}`);
    
    if (summary.sanitized) {
      this.logger.info('🔒 Undo log is sanitized for privacy');
      if (summary.sanitizationReport) {
        this.logger.info(`   • ${summary.sanitizationReport.itemsRemoved} items were sanitized`);
        this.logger.info(`   • Categories: ${summary.sanitizationReport.categoriesAffected.join(', ')}`);
      }
    }
    
    this.logger.info('');
  }

  /**
   * Display restoration preview for dry-run mode
   * @param {Object} plan - Restoration plan
   * @returns {Object} Preview result
   */
  async displayRestorationPreview(plan) {
    this.logger.info('🔍 DRY RUN MODE - No changes will be made');
    this.logger.info('');
    
    this.logger.info('📋 Restoration Plan Preview:');
    this.logger.info('');
    
    // Group actions by type
    const actionsByType = this.groupActionsByType(plan.actions);
    
    // Show file restorations
    if (actionsByType['restore-file'] && actionsByType['restore-file'].length > 0) {
      this.logger.info(`📝 Files that would be restored (${actionsByType['restore-file'].length}):`);
      for (const action of actionsByType['restore-file']) {
        this.logger.info(`   • ${action.path} would be restored to original content`);
        if (action.placeholderReplacements && action.placeholderReplacements.length > 0) {
          this.logger.info(`     Placeholders: ${action.placeholderReplacements.length} replacements`);
          for (const replacement of action.placeholderReplacements.slice(0, 3)) {
            this.logger.info(`     - "${replacement.from}" → "${replacement.to}"`);
          }
          if (action.placeholderReplacements.length > 3) {
            this.logger.info(`     - ... and ${action.placeholderReplacements.length - 3} more`);
          }
        }
      }
      this.logger.info('');
    }
    
    // Show file recreations
    if (actionsByType['recreate-file'] && actionsByType['recreate-file'].length > 0) {
      this.logger.info(`📄 Files that would be recreated (${actionsByType['recreate-file'].length}):`);
      for (const action of actionsByType['recreate-file']) {
        this.logger.info(`   • ${action.path} would be recreated with original content`);
      }
      this.logger.info('');
    }
    
    // Show directory recreations
    if (actionsByType['recreate-directory'] && actionsByType['recreate-directory'].length > 0) {
      this.logger.info(`📁 Directories that would be recreated (${actionsByType['recreate-directory'].length}):`);
      for (const action of actionsByType['recreate-directory']) {
        this.logger.info(`   • ${action.path} would be recreated (empty)`);
        if (action.note) {
          this.logger.info(`     Note: ${action.note}`);
        }
      }
      this.logger.info('');
    }
    
    // Show preserved files
    if (actionsByType['preserve-file'] && actionsByType['preserve-file'].length > 0) {
      this.logger.info(`🔒 Files that would be preserved (${actionsByType['preserve-file'].length}):`);
      for (const action of actionsByType['preserve-file']) {
        this.logger.info(`   • ${action.path} would remain unchanged`);
        if (action.note) {
          this.logger.info(`     Note: ${action.note}`);
        }
      }
      this.logger.info('');
    }
    
    // Show missing values
    if (plan.missingValues && plan.missingValues.length > 0) {
      this.logger.warn(`⚠️  Missing values that would need to be provided (${plan.missingValues.length}):`);
      for (const missingValue of plan.missingValues) {
        this.logger.warn(`   • ${missingValue}`);
      }
      this.logger.info('💡 Create .restore-defaults.json or use interactive prompts');
      this.logger.info('');
    }
    
    // Show warnings
    if (plan.warnings && plan.warnings.length > 0) {
      this.logger.warn('⚠️  Restoration warnings:');
      for (const warning of plan.warnings) {
        this.logger.warn(`   • ${warning}`);
      }
      this.logger.info('');
    }
    
    this.logger.info('✅ No changes were made (dry run mode)');
    this.logger.info('');
    this.logger.info('To execute restoration:');
    this.logger.info('  • Remove --dry-run flag to proceed with restoration');
    this.logger.info('  • Add --yes flag to skip confirmation prompts');
    
    return { success: true, dryRun: true, plan };
  }

  /**
   * Get user confirmation for restoration
   * @param {Object} plan - Restoration plan
   * @returns {boolean} Whether user confirmed
   */
  async getUserConfirmation(plan) {
    const actionCounts = this.getActionCounts(plan.actions);
    
    this.logger.warn('⚠️  WARNING: This operation will modify your project files!');
    this.logger.info('');
    this.logger.info('📊 Summary of restoration:');
    this.logger.info(`   • Project type: ${plan.undoLog.metadata.projectType}`);
    this.logger.info(`   • ${actionCounts.restore} files will be restored`);
    this.logger.info(`   • ${actionCounts.recreate} files/directories will be recreated`);
    this.logger.info(`   • ${actionCounts.preserve} template files will be preserved`);
    
    if (plan.missingValues && plan.missingValues.length > 0) {
      this.logger.warn(`   • ${plan.missingValues.length} values will need to be provided`);
    }
    
    this.logger.info('');
    this.logger.info('🔧 After restoration, your project will be in hybrid state:');
    this.logger.info('   ✅ Working project: Ready for testing and debugging');
    this.logger.info('   ✅ Template functionality: Still usable with create-scaffold');
    this.logger.info('   ✅ Git history: Preserved for template maintenance');
    
    if (plan.warnings && plan.warnings.length > 0) {
      this.logger.info('');
      this.logger.warn('⚠️  Please note:');
      for (const warning of plan.warnings) {
        this.logger.warn(`   • ${warning}`);
      }
    }
    
    this.logger.info('');
    
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      const askConfirmation = () => {
        rl.question('Are you sure you want to proceed with restoration? [y/N]: ', (answer) => {
          const normalized = answer.trim().toLowerCase();
          
          if (normalized === 'y' || normalized === 'yes') {
            this.logger.info('User confirmed restoration. Proceeding...');
            rl.close();
            resolve(true);
          } else if (normalized === 'n' || normalized === 'no' || normalized === '') {
            if (normalized === '') {
              this.logger.info('Restoration cancelled (default: no). No changes were made.');
            } else {
              this.logger.info('Restoration cancelled by user. No changes were made.');
            }
            this.logger.info('💡 Try --dry-run to preview restoration first');
            rl.close();
            resolve(false);
          } else {
            this.logger.warn('Invalid input. Please enter "y" or "n".');
            askConfirmation();
          }
        });
      };
      
      askConfirmation();
    });
  }

  /**
   * Execute the restoration plan
   * @param {Object} plan - Restoration plan to execute
   * @returns {Object} Execution result
   */
  async executeRestorationPlan(plan) {
    try {
      this.logger.info('📋 Restoration plan ready for execution');
      this.logger.info(`   • ${plan.actions.length} actions planned`);
      this.logger.info(`   • Mode: ${plan.mode}`);
      
      if (plan.missingValues && plan.missingValues.length > 0) {
        this.logger.warn(`   • ${plan.missingValues.length} missing values detected`);
      }

      // Execute the plan with safety features
      const result = await this.restorationProcessor.executePlanWithSafety(plan, {
        createBackups: true,
        detectConflicts: true,
        rollbackOnFailure: true
      });

      if (!result.success) {
        throw new RestorationError(
          `Restoration failed: ${result.errors.join(', ')}`,
          ERROR_CODES.PROCESSING_ERROR,
          {
            suggestions: [
              'Check file permissions and ensure files are not locked',
              'Verify the undo log is complete and not corrupted',
              'Try running with --dry-run to preview the restoration first'
            ]
          }
        );
      }

      return result;

    } catch (error) {
      if (error instanceof RestorationError) {
        throw error;
      }
      
      throw new RestorationError(
        `Failed to execute restoration plan: ${error.message}`,
        ERROR_CODES.PROCESSING_ERROR,
        {
          suggestions: [
            'Check file permissions and disk space',
            'Ensure no files are locked by other processes',
            'Try running with --dry-run to preview changes first'
          ]
        }
      );
    }
  }

  /**
   * Display post-restoration guidance
   * @param {Object} plan - Executed restoration plan
   */
  displayPostRestorationGuidance(plan) {
    this.logger.info('');
    this.logger.info('🎉 Restoration completed! Next steps:');
    
    // Check for regeneration commands
    const regenerationActions = plan.actions.filter(action => 
      action.type === 'recreate-directory' && action.regenerationCommand
    );
    
    if (regenerationActions.length > 0) {
      this.logger.info('');
      this.logger.info('📦 Run these commands to regenerate dependencies:');
      const commands = new Set();
      for (const action of regenerationActions) {
        if (action.regenerationCommand) {
          commands.add(action.regenerationCommand);
        }
      }
      for (const command of commands) {
        this.logger.info(`   ${command}`);
      }
    }
    
    // General guidance
    this.logger.info('');
    this.logger.info('🔍 Recommended next steps:');
    this.logger.info('   1. Review restored files for correctness');
    this.logger.info('   2. Test the working project functionality');
    this.logger.info('   3. Update any credentials or environment variables');
    this.logger.info('   4. Run tests to verify everything works');
    
    if (plan.undoLog.sanitized) {
      this.logger.info('   5. Review sanitized values and update as needed');
    }
    
    this.logger.info('');
    this.logger.info('💡 Your project is now in hybrid state:');
    this.logger.info('   • Use it as a working project for development');
    this.logger.info('   • Template files preserved for create-scaffold compatibility');
    this.logger.info('   • Run make-template again to update the template');
  }

  /**
   * Group actions by type for display
   * @param {Array} actions - Restoration actions
   * @returns {Object} Actions grouped by type
   */
  groupActionsByType(actions) {
    const grouped = {};
    for (const action of actions) {
      if (!grouped[action.type]) {
        grouped[action.type] = [];
      }
      grouped[action.type].push(action);
    }
    return grouped;
  }

  /**
   * Get action counts for summary
   * @param {Array} actions - Restoration actions
   * @returns {Object} Action counts
   */
  getActionCounts(actions) {
    const counts = {
      restore: 0,
      recreate: 0,
      preserve: 0,
      total: actions.length
    };
    
    for (const action of actions) {
      if (action.type === 'restore-file') {
        counts.restore++;
      } else if (action.type === 'recreate-file' || action.type === 'recreate-directory') {
        counts.recreate++;
      } else if (action.type === 'preserve-file') {
        counts.preserve++;
      }
    }
    
    return counts;
  }
}

export default RestorationEngine;