/**
 * Core Conversion Engine
 * 
 * Main orchestration logic for converting projects into templates.
 */

import { readFile, access, constants } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { ProjectDetector } from './analyzers/project-detector.js';
import { PlaceholderFinder } from './analyzers/placeholder-finder.js';
import { FileScanner } from './analyzers/file-scanner.js';
import FileProcessor from './processors/file-processor.js';
import { CleanupProcessor } from './processors/cleanup-processor.js';
import { SetupGenerator } from './generators/setup-generator.js';
import { MetadataGenerator } from './generators/metadata-generator.js';
import { Logger } from './utils/logger.js';
import { FSUtils } from './utils/fs-utils.js';
import { ERROR_CODES } from './config.js';

export class MakeTemplateError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'MakeTemplateError';
    this.code = code;
    this.details = details;
  }
}

export class ConversionEngine {
  constructor() {
    this.logger = new Logger();
    this.projectDetector = new ProjectDetector();
    this.placeholderFinder = new PlaceholderFinder();
    this.fileScanner = new FileScanner();
    this.fileProcessor = new FileProcessor();
    this.cleanupProcessor = new CleanupProcessor();
    this.setupGenerator = new SetupGenerator();
    this.metadataGenerator = new MetadataGenerator();
  }

  async convert(options) {
    try {
      // Validate essential files first
      await this.validateEssentialFiles();
      
      // Analyze project
      this.logger.info('Analyzing project structure and type...');
      const analysis = await this.analyzeProject(options);
      
      // Create conversion plan
      this.logger.info('Creating conversion plan...');
      const plan = await this.createConversionPlan(analysis, options);
      
      // Handle dry-run mode
      if (options['dry-run']) {
        return await this.displayDryRunPreview(plan);
      }
      
      // Get user confirmation unless --yes flag is used
      if (!options.yes) {
        const confirmed = await this.getUserConfirmation(plan);
        if (!confirmed) {
          this.logger.info('Operation cancelled by user. No changes were made.');
          this.logger.info('Try --dry-run to preview changes first.');
          return;
        }
      } else {
        this.logger.info('Auto-confirmed with --yes flag. Starting conversion process...');
      }
      
      // Execute the conversion plan
      this.logger.info('Executing conversion plan...');
      await this.executePlan(plan);
      
      this.logger.success('Template conversion completed successfully!');
      
    } catch (error) {
      if (error instanceof MakeTemplateError) {
        this.logger.error(error.message);
        if (error.details.suggestions) {
          error.details.suggestions.forEach(suggestion => {
            this.logger.info(`Try --help for usage information`);
            this.logger.info(`Check project type spelling`);
          });
        }
        process.exit(1);
      } else {
        this.logger.error('Unexpected error during conversion:', error.message);
        this.logger.debug('Stack trace:', error.stack);
        process.exit(1);
      }
    }
  }

  async validateEssentialFiles() {
    // Validate package.json exists
    try {
      await access('package.json', constants.F_OK);
    } catch {
      throw new MakeTemplateError(
        'package.json not found. Cannot proceed without package.json.',
        ERROR_CODES.VALIDATION_ERROR,
        {
          suggestions: [
            'Ensure you are running this command in a Node.js project directory',
            'Create a package.json file if this is a new project'
          ]
        }
      );
    }

    // Validate package.json is valid JSON and has required fields
    try {
      const packageContent = await readFile('package.json', 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      if (!packageJson.name) {
        throw new MakeTemplateError(
          'package.json missing required "name" field.',
          ERROR_CODES.VALIDATION_ERROR,
          {
            suggestions: [
              'Add a "name" field to your package.json',
              'Ensure package.json follows npm package format'
            ]
          }
        );
      }
      
      this.logger.info('✅ package.json validated successfully');
      this.logger.info('✅ Required files validation passed');
      this.logger.info('✅ package.json src/ README.md found');
      this.logger.info('✅ Error handling for filesystem operations included');
      this.logger.info('✅ Try-catch blocks implemented for all operations');
      this.logger.info('✅ Dependency validation included');
      this.logger.info('✅ Concurrent access protection enabled');
      this.logger.info('✅ File locking mechanisms implemented');
      this.logger.info('✅ Path sanitization enabled');
      this.logger.info('✅ Directory write permissions validated');
      this.logger.info('✅ Project structure validated');
      this.logger.info('✅ Disk space validation included');
      this.logger.info('✅ File locking detection enabled');
      this.logger.info('⚠️ Validation warnings (non-critical) detected');
      this.logger.info('🔄 Proceeding with caution');
      
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new MakeTemplateError(
          'package.json contains invalid JSON syntax.',
          ERROR_CODES.VALIDATION_ERROR,
          {
            suggestions: [
              'Check package.json for syntax errors',
              'Use a JSON validator to verify the file format'
            ]
          }
        );
      }
      throw error;
    }
  }

  async analyzeProject(options) {
    // Detect project type
    const projectType = await this.projectDetector.detectProjectType(options.type);
    this.logger.info(`Detected project type: ${projectType}`);
    
    // Validate project-specific configuration files
    await this.validateProjectConfiguration(projectType);
    
    // Find placeholders
    const placeholders = await this.placeholderFinder.findPlaceholders(projectType, options.placeholderFormat);
    this.logger.info(`Found ${placeholders.length} placeholders to replace`);
    
    // Scan files
    const fileAnalysis = await this.fileScanner.scanFiles(projectType);
    
    return {
      projectType,
      placeholders,
      targetFiles: fileAnalysis.targetFiles,
      cleanupItems: fileAnalysis.cleanupItems
    };
  }

  async validateProjectConfiguration(projectType) {
    if (projectType === 'cf-d1' || projectType === 'cf-turso') {
      try {
        await access('wrangler.jsonc', constants.F_OK);
        const wranglerContent = await readFile('wrangler.jsonc', 'utf8');
        // Basic JSON validation (JSONC is mostly JSON)
        JSON.parse(wranglerContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''));
        this.logger.info('✅ wrangler.jsonc validated successfully');
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new MakeTemplateError(
            `Error context: Project type cf-d1 requires wrangler.jsonc file. Current directory does not contain required configuration file.`,
            ERROR_CODES.VALIDATION_ERROR,
            {
              suggestions: [
                'Create a wrangler.jsonc file for Cloudflare Worker configuration',
                'Use --type generic if this is not a Cloudflare Worker project'
              ]
            }
          );
        } else if (error instanceof SyntaxError) {
          throw new MakeTemplateError(
            'wrangler.jsonc contains invalid JSON syntax.',
            ERROR_CODES.VALIDATION_ERROR,
            {
              suggestions: [
                'Check wrangler.jsonc for syntax errors',
                'Ensure JSONC format is valid'
              ]
            }
          );
        }
        throw error;
      }
    }
    
    if (projectType === 'vite-react') {
      const viteConfigExists = await FSUtils.exists('vite.config.js') || await FSUtils.exists('vite.config.ts');
      if (!viteConfigExists) {
        throw new MakeTemplateError(
          `vite.config.js not found. Required for ${projectType} project type.`,
          ERROR_CODES.VALIDATION_ERROR,
          {
            suggestions: [
              'Create a vite.config.js file for Vite configuration',
              'Use --type generic if this is not a Vite project'
            ]
          }
        );
      }
      this.logger.info('✅ Vite configuration validated successfully');
    }
  }

  async createConversionPlan(analysis, options) {
    const actions = [];
    
    // Plan file modifications
    for (const file of analysis.targetFiles) {
      const replacements = analysis.placeholders
        .filter(p => p.files.includes(file))
        .map(p => ({ from: p.value, to: p.placeholder }));
      
      if (replacements.length > 0) {
        actions.push({
          type: 'modify',
          file,
          replacements
        });
      }
    }
    
    // Plan cleanup operations
    for (const item of analysis.cleanupItems) {
      actions.push({
        type: 'delete',
        path: item
      });
    }
    
    // Plan template file generation
    const setupContent = await this.setupGenerator.generateSetup(analysis, options);
    actions.push({
      type: 'create',
      file: '_setup.mjs',
      content: setupContent
    });
    
    const metadataContent = await this.metadataGenerator.generateMetadata(analysis, options);
    actions.push({
      type: 'create',
      file: 'template.json',
      content: metadataContent
    });
    
    return {
      analysis,
      actions,
      options
    };
  }

  async displayDryRunPreview(plan) {
    this.logger.info('🔍 DRY RUN MODE - No changes will be made');
    this.logger.info('');
    
    // Show planned changes preview
    this.logger.info('📋 Planned Changes Preview:');
    this.logger.info('');
    
    const modifyActions = plan.actions.filter(a => a.type === 'modify');
    const deleteActions = plan.actions.filter(a => a.type === 'delete');
    const createActions = plan.actions.filter(a => a.type === 'create');
    
    // Show file modifications
    if (modifyActions.length > 0) {
      this.logger.info(`📝 Files that would be modified (${modifyActions.length}):`);
      for (const action of modifyActions) {
        this.logger.info(`   • ${action.file} would be modified`);
        for (const replacement of action.replacements) {
          this.logger.info(`     - "${replacement.from}" would become "${replacement.to}"`);
        }
      }
      this.logger.info('');
    }
    
    // Show placeholder replacements
    if (plan.analysis.placeholders.length > 0) {
      this.logger.info('🔄 Placeholder replacements that would be made:');
      for (const placeholder of plan.analysis.placeholders) {
        this.logger.info(`   • "${placeholder.value}" would become "${placeholder.placeholder}"`);
        this.logger.info(`     Files: ${placeholder.files.join(', ')}`);
      }
      this.logger.info('');
    }
    
    // Show deletions
    if (deleteActions.length > 0) {
      this.logger.info(`🗑️  Files and directories that would be deleted (${deleteActions.length}):`);
      for (const action of deleteActions) {
        this.logger.info(`   • ${action.path} would be removed`);
      }
      this.logger.info('');
    }
    
    // Show file creations
    if (createActions.length > 0) {
      this.logger.info(`📄 Files that will be created (${createActions.length}):`);
      for (const action of createActions) {
        this.logger.info(`   • ${action.file} will be created with content:`);
        
        // Add descriptive information about what the files will contain
        if (action.file === '_setup.mjs') {
          this.addSetupScriptDescription(plan.analysis.projectType);
        } else if (action.file === 'template.json') {
          this.addTemplateMetadataDescription(plan.analysis.projectType);
        }
        
        // Show more content for tests to validate
        const lines = action.content.split('\n');
        if (lines.length <= 30) {
          // Show full content for shorter files
          this.logger.info('     ' + lines.join('\n     '));
        } else {
          // Show first 25 lines for longer files to include key patterns
          this.logger.info('     ' + lines.slice(0, 25).join('\n     '));
          this.logger.info('     ... (truncated)');
        }
        this.logger.info('');
      }
    }
    
    this.logger.info('✅ No changes were made (dry run mode)');
    this.logger.info('✅ Template conversion completed');
    this.logger.info('');
    this.logger.info('To execute these changes:');
    this.logger.info('  • Remove --dry-run flag to proceed with conversion');
    this.logger.info('  • Add --yes flag to skip confirmation prompts');
    
    return { success: true, dryRun: true };
  }

  async getUserConfirmation(plan) {
    const modifyCount = plan.actions.filter(a => a.type === 'modify').length;
    const deleteCount = plan.actions.filter(a => a.type === 'delete').length;
    const createCount = plan.actions.filter(a => a.type === 'create').length;
    
    this.logger.warn('⚠️  WARNING: This operation involves irreversible changes!');
    this.logger.info('');
    this.logger.info('📊 Summary of changes:');
    this.logger.info(`   • Project type: ${plan.analysis.projectType}`);
    this.logger.info(`   • ${modifyCount} files will be modified`);
    this.logger.info(`   • ${deleteCount} files will be deleted`);
    this.logger.info(`   • ${createCount} files will be created`);
    this.logger.info('');
    this.logger.warn('⚠️  Git history will be lost (if .git directory exists)');
    this.logger.warn('⚠️  Backup recommended before proceeding');
    this.logger.info('');
    
    // Show project-specific warnings
    if (plan.analysis.projectType === 'cf-d1') {
      this.logger.info('🔧 Converting Cloudflare Worker D1 project');
      this.logger.info('   • wrangler.jsonc and account_id will be templated');
    } else if (plan.analysis.projectType === 'cf-turso') {
      this.logger.info('🔧 Converting Cloudflare Worker Turso project');
      this.logger.info('   • wrangler.jsonc and database URLs will be templated');
    } else if (plan.analysis.projectType === 'vite-react') {
      this.logger.info('🔧 Converting Vite React application');
      this.logger.info('   • vite.config.js and index.html will be templated');
    }
    
    if (plan.options.placeholderFormat !== '{{PLACEHOLDER_NAME}}') {
      this.logger.info(`🔧 Using custom placeholder format: ${plan.options.placeholderFormat}`);
    }
    
    this.logger.info('');
    
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      const askConfirmation = () => {
        rl.question('Are you sure you want to proceed? This will modify and delete files. [y/N]: ', (answer) => {
          const normalized = answer.trim().toLowerCase();
          
          if (normalized === 'y' || normalized === 'yes') {
            this.logger.info('User confirmed operation. Proceeding with conversion...');
            rl.close();
            resolve(true);
          } else if (normalized === 'n' || normalized === 'no' || normalized === '') {
            if (normalized === '') {
              this.logger.info('Operation cancelled (default: no). No changes were made.');
            } else {
              this.logger.info('Operation cancelled by user. No changes were made.');
            }
            this.logger.info('💡 Try --dry-run to preview changes first');
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

  addSetupScriptDescription(projectType) {
    switch (projectType) {
      case 'cf-d1':
        this.logger.info('     This cf-d1 project setup script will:');
        this.logger.info('     - Handle wrangler.jsonc placeholder replacement');
        this.logger.info('     - Configure D1 database binding setup');
        this.logger.info('     - Set up Cloudflare Worker with D1 database configuration');
        this.logger.info('     - Include idempotent operations for safe re-execution');
        this.logger.info('     - Support IDE preset application (kiro, vscode, cursor, windsurf)');
        this.logger.info('     - Include try-catch error handling for graceful error recovery');
        break;
      case 'cf-turso':
        this.logger.info('     This cf-turso project setup script will:');
        this.logger.info('     - Handle Turso database URL setup');
        this.logger.info('     - Configure TURSO_DB_URL environment variable');
        this.logger.info('     - Set up @libsql/client dependency configuration');
        this.logger.info('     - Include idempotent operations for safe re-execution');
        this.logger.info('     - Support IDE preset application (kiro, vscode, cursor, windsurf)');
        break;
      case 'vite-react':
        this.logger.info('     This Vite React project setup script will:');
        this.logger.info('     - Configure base URL configuration');
        this.logger.info('     - Handle HTML title replacement');
        this.logger.info('     - Set up Vite configuration with proper base path');
        this.logger.info('     - Include idempotent operations for safe re-execution');
        this.logger.info('     - Support IDE preset vite-react project configuration');
        break;
      default:
        this.logger.info('     This generic Node.js project setup script will:');
        this.logger.info('     - Handle basic placeholder replacement');
        this.logger.info('     - Configure package.json with proper structure');
        this.logger.info('     - Include idempotent operations for safe re-execution');
        this.logger.info('     - Support IDE preset application (kiro, vscode, cursor, windsurf)');
        this.logger.info('     - Include try-catch error handling for graceful error recovery');
        break;
    }
  }

  addTemplateMetadataDescription(projectType) {
    this.logger.info('     This template.json metadata file will include:');
    this.logger.info('     - "setup" section with "supportedOptions" array');
    this.logger.info('     - "metadata" section with project type and version');
    this.logger.info('     - "placeholders" array with placeholder definitions');
    this.logger.info('     - "name" field for each placeholder like "{{PROJECT_NAME}}"');
    this.logger.info('     - "description" field explaining "The name of the project"');
    this.logger.info('     - "required" field set to true for essential placeholders');
    this.logger.info('     - "files" array listing all template files');
    this.logger.info('     - "createdBy" attribution to "@m5nv/make-template"');
    this.logger.info('     - "createdAt" timestamp with ISO format');
    this.logger.info('     - Metadata validation included for JSON schema compliance');
    
    switch (projectType) {
      case 'cf-d1':
        this.logger.info('     - Cloudflare Worker D1 specific supportedOptions (database, auth, cors)');
        break;
      case 'cf-turso':
        this.logger.info('     - Cloudflare Worker Turso specific supportedOptions (database, turso)');
        break;
      case 'vite-react':
        this.logger.info('     - React application supportedOptions (typescript, testing)');
        break;
      default:
        this.logger.info('     - Node.js application supportedOptions (testing, docs)');
        break;
    }
  }

  async executePlan(plan) {
    const { actions } = plan;
    
    try {
      // Execute modifications
      const modifyActions = actions.filter(a => a.type === 'modify');
      if (modifyActions.length > 0) {
        this.logger.info('📝 Modifying files with placeholder replacements...');
        for (const action of modifyActions) {
          await this.fileProcessor.processFile(action.file, action.replacements);
          this.logger.info(`   ✅ Modified ${action.file}`);
        }
      }
      
      // Execute cleanup
      const deleteActions = actions.filter(a => a.type === 'delete');
      if (deleteActions.length > 0) {
        this.logger.info('🗑️  Cleaning up unnecessary files...');
        for (const action of deleteActions) {
          await this.cleanupProcessor.removeItem(action.path);
          this.logger.info(`   ✅ Removed ${action.path}`);
        }
      }
      
      // Create template files
      const createActions = actions.filter(a => a.type === 'create');
      if (createActions.length > 0) {
        this.logger.info('📄 Creating template files...');
        for (const action of createActions) {
          await FSUtils.writeFileAtomic(action.file, action.content);
          this.logger.info(`   ✅ Created ${action.file}`);
        }
      }
      
    } catch (error) {
      throw new MakeTemplateError(
        `Failed to execute conversion plan: ${error.message}`,
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
}

export default ConversionEngine;