/**
 * Cleanup Processing Operations
 * 
 * Safely removes files and directories while preserving essential template files.
 * Extended with file categorization for template restoration support.
 */

import { rm, stat, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, dirname } from 'node:path';
import { FileCategorizer } from '../utils/file-categorizer.js';

export class CleanupProcessor {
  constructor() {
    this.fileCategorizer = new FileCategorizer();
    
    this.cleanupRules = {
      // Directories to remove
      directories: [
        'node_modules',
        'dist',
        'build',
        '.next',
        '.wrangler',
        'coverage',
        '.nyc_output',
        '.cache',
        'tmp',
        'temp'
      ],
      
      // Files to remove
      files: [
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        'bun.lockb',
        '.env',
        '.env.local',
        '.env.development',
        '.env.production',
        '.dev.vars',
        '.DS_Store',
        'Thumbs.db',
        '*.log',
        '*.pid',
        '*.seed',
        '*.pid.lock'
      ],
      
      // Patterns to preserve (essential template files)
      preserve: [
        'migrations/',
        'src/',
        'public/',
        'static/',
        'assets/',
        'lib/',
        'components/',
        'pages/',
        'routes/',
        'config/',
        'scripts/',
        'docs/',
        '.git/',
        '*.md',
        '*.txt',
        'package.json',
        'wrangler.jsonc',
        'wrangler.json',
        'vite.config.*',
        'webpack.config.*',
        'rollup.config.*',
        'tsconfig.json',
        'jsconfig.json',
        '.gitignore',
        '.gitattributes',
        'LICENSE',
        'CHANGELOG.*',
        'CONTRIBUTING.*',
        'CODE_OF_CONDUCT.*',
        'SECURITY.*',
        'index.html',
        'manifest.json',
        'robots.txt',
        'sitemap.xml'
      ]
    };
  }

  /**
   * Perform cleanup operations on the project directory
   * @param {string} projectPath - Path to the project directory
   * @param {Object} options - Cleanup options
   */
  async performCleanup(projectPath = '.', options = {}) {
    const cleanupItems = [];
    const errors = [];
    
    try {
      // Scan for cleanup items
      const itemsToClean = await this.identifyCleanupItems(projectPath);
      
      // Process each item
      for (const item of itemsToClean) {
        try {
          await this.removeItem(item.path, item.type);
          cleanupItems.push(item);
        } catch (error) {
          errors.push({
            path: item.path,
            type: item.type,
            error: error.message
          });
        }
      }
      
      return {
        success: true,
        cleanedItems: cleanupItems,
        errors: errors
      };
      
    } catch (error) {
      throw new Error(`Cleanup operation failed: ${error.message}`);
    }
  }

  /**
   * Perform categorized cleanup with restoration metadata
   * @param {string} projectPath - Path to the project directory
   * @param {Object} options - Cleanup options
   * @returns {Object} Cleanup result with categorization data
   */
  async performCategorizedCleanup(projectPath = '.', options = {}) {
    const cleanupItems = [];
    const errors = [];
    const categorizedItems = {
      generated: [],
      userCreated: [],
      templateFiles: [],
      modified: []
    };
    
    try {
      // Identify cleanup items using categorization
      const itemsToClean = await this.identifyCleanupItemsWithCategories(projectPath);
      
      // Process each item based on its category
      for (const item of itemsToClean) {
        try {
          // Determine action based on category
          const shouldRemove = this.shouldRemoveBasedOnCategory(item.category, options);
          
          if (shouldRemove) {
            await this.removeItem(item.path, item.type);
            cleanupItems.push(item);
          }
          
          // Add to categorized results for undo log
          if (categorizedItems[item.category]) {
            categorizedItems[item.category].push(item);
          }
          
        } catch (error) {
          errors.push({
            path: item.path,
            type: item.type,
            category: item.category,
            error: error.message
          });
        }
      }
      
      return {
        success: true,
        cleanedItems: cleanupItems,
        categorizedItems: categorizedItems,
        errors: errors
      };
      
    } catch (error) {
      throw new Error(`Categorized cleanup operation failed: ${error.message}`);
    }
  }

  /**
   * Identify items that should be cleaned up
   * @param {string} projectPath - Path to scan
   */
  async identifyCleanupItems(projectPath) {
    const items = [];
    
    try {
      // Check directories
      for (const dir of this.cleanupRules.directories) {
        const dirPath = join(projectPath, dir);
        if (await this.exists(dirPath) && await this.isDirectory(dirPath)) {
          if (!this.shouldPreserve(dir)) {
            items.push({
              path: dirPath,
              type: 'directory',
              name: dir
            });
          }
        }
      }
      
      // Check files
      for (const file of this.cleanupRules.files) {
        if (file.includes('*')) {
          // Handle glob patterns
          const globItems = await this.findGlobMatches(projectPath, file);
          items.push(...globItems);
        } else {
          const filePath = join(projectPath, file);
          if (await this.exists(filePath) && await this.isFile(filePath)) {
            if (!this.shouldPreserve(file)) {
              items.push({
                path: filePath,
                type: 'file',
                name: file
              });
            }
          }
        }
      }
      
      return items;
      
    } catch (error) {
      throw new Error(`Failed to identify cleanup items: ${error.message}`);
    }
  }

  /**
   * Identify cleanup items with categorization for restoration
   * @param {string} projectPath - Path to scan
   * @returns {Array} Array of categorized cleanup items
   */
  async identifyCleanupItemsWithCategories(projectPath) {
    const items = [];
    const allPaths = [];
    
    try {
      // Collect all potential cleanup paths
      for (const dir of this.cleanupRules.directories) {
        const dirPath = join(projectPath, dir);
        if (await this.exists(dirPath) && await this.isDirectory(dirPath)) {
          allPaths.push(dirPath);
        }
      }
      
      for (const file of this.cleanupRules.files) {
        if (file.includes('*')) {
          const globItems = await this.findGlobMatches(projectPath, file);
          allPaths.push(...globItems.map(item => item.path));
        } else {
          const filePath = join(projectPath, file);
          if (await this.exists(filePath) && await this.isFile(filePath)) {
            allPaths.push(filePath);
          }
        }
      }
      
      // Categorize each path
      for (const path of allPaths) {
        try {
          const categorization = await this.fileCategorizer.categorizeFile(path);
          
          // Only include items that should be cleaned up based on preservation rules
          if (!this.shouldPreserve(categorization.fileName)) {
            items.push({
              path: categorization.path,
              type: categorization.isDirectory ? 'directory' : 'file',
              name: categorization.fileName,
              category: categorization.category,
              storeContent: categorization.storeContent,
              action: categorization.action,
              regenerationCommand: categorization.regenerationCommand,
              fileSize: categorization.fileSize,
              warnings: categorization.warnings
            });
          }
        } catch (categorizationError) {
          // If categorization fails, fall back to basic cleanup item
          const stats = await stat(path);
          items.push({
            path: path,
            type: stats.isDirectory() ? 'directory' : 'file',
            name: path.split('/').pop(),
            category: 'userCreated', // Default fallback
            storeContent: !stats.isDirectory(),
            action: 'restore-content',
            regenerationCommand: null,
            fileSize: stats.size,
            warnings: [`Categorization failed: ${categorizationError.message}`]
          });
        }
      }
      
      return items;
      
    } catch (error) {
      throw new Error(`Failed to identify categorized cleanup items: ${error.message}`);
    }
  }

  /**
   * Find files matching glob patterns
   * @param {string} basePath - Base directory to search
   * @param {string} pattern - Glob pattern
   */
  async findGlobMatches(basePath, pattern) {
    const items = [];
    
    try {
      // Simple glob matching for common patterns like *.log
      if (pattern.startsWith('*.')) {
        const extension = pattern.slice(2);
        const { readdir } = await import('node:fs/promises');
        
        try {
          const files = await readdir(basePath);
          for (const file of files) {
            if (file.endsWith(`.${extension}`)) {
              const filePath = join(basePath, file);
              if (await this.isFile(filePath) && !this.shouldPreserve(file)) {
                items.push({
                  path: filePath,
                  type: 'file',
                  name: file
                });
              }
            }
          }
        } catch (readdirError) {
          // Directory might not exist or be readable, skip silently
        }
      }
      
      return items;
      
    } catch (error) {
      console.warn(`Failed to process glob pattern ${pattern}: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if a path should be preserved
   * @param {string} path - Path to check
   */
  shouldPreserve(path) {
    return this.cleanupRules.preserve.some(pattern => {
      if (pattern.endsWith('/')) {
        // Directory pattern
        return path.startsWith(pattern.slice(0, -1));
      } else if (pattern.includes('*')) {
        // Glob pattern
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(path);
      } else {
        // Exact match
        return path === pattern || path.endsWith(`/${pattern}`);
      }
    });
  }

  /**
   * Safely remove a file or directory
   * @param {string} itemPath - Path to remove
   * @param {string} type - Type of item ('file' or 'directory')
   */
  async removeItem(itemPath, type) {
    try {
      // Check if item still exists
      if (!await this.exists(itemPath)) {
        return;
      }
      
      // Handle permission issues gracefully
      try {
        await access(itemPath, constants.W_OK);
      } catch (permissionError) {
        throw new Error(`Permission denied: Cannot remove ${itemPath}`);
      }
      
      // Remove the item
      if (type === 'directory') {
        await rm(itemPath, { recursive: true, force: true });
      } else {
        await rm(itemPath, { force: true });
      }
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Item already doesn't exist, that's fine
        return;
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: ${itemPath}`);
      } else if (error.code === 'EBUSY' || error.code === 'EMFILE') {
        throw new Error(`File is locked or in use: ${itemPath}`);
      } else {
        throw new Error(`Failed to remove ${itemPath}: ${error.message}`);
      }
    }
  }

  /**
   * Check if a path exists
   * @param {string} path - Path to check
   */
  async exists(path) {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a path is a directory
   * @param {string} path - Path to check
   */
  async isDirectory(path) {
    try {
      const stats = await stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if a path is a file
   * @param {string} path - Path to check
   */
  async isFile(path) {
    try {
      const stats = await stat(path);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Get cleanup preview without actually removing files
   * @param {string} projectPath - Path to scan
   */
  async getCleanupPreview(projectPath = '.') {
    try {
      const items = await this.identifyCleanupItems(projectPath);
      
      return {
        directories: items.filter(item => item.type === 'directory'),
        files: items.filter(item => item.type === 'file'),
        totalItems: items.length
      };
      
    } catch (error) {
      throw new Error(`Failed to generate cleanup preview: ${error.message}`);
    }
  }

  /**
   * Determine if an item should be removed based on its category
   * @param {string} category - File category
   * @param {Object} options - Cleanup options
   * @returns {boolean} Whether the item should be removed
   */
  shouldRemoveBasedOnCategory(category, options = {}) {
    // Template files should never be removed during cleanup
    if (category === 'templateFiles') {
      return false;
    }
    
    // Modified files should not be removed (they get placeholder replacement instead)
    if (category === 'modified') {
      return false;
    }
    
    // Generated files can be safely removed (they can be regenerated)
    if (category === 'generated') {
      return true;
    }
    
    // User-created files removal depends on options
    if (category === 'userCreated') {
      // By default, remove user-created files during cleanup
      // But allow override via options
      return options.preserveUserFiles !== true;
    }
    
    // Default to removing unknown categories
    return true;
  }

  /**
   * Get cleanup preview with categorization
   * @param {string} projectPath - Path to scan
   * @returns {Object} Categorized cleanup preview
   */
  async getCategorizedCleanupPreview(projectPath = '.') {
    try {
      const items = await this.identifyCleanupItemsWithCategories(projectPath);
      
      const preview = {
        generated: items.filter(item => item.category === 'generated'),
        userCreated: items.filter(item => item.category === 'userCreated'),
        templateFiles: items.filter(item => item.category === 'templateFiles'),
        modified: items.filter(item => item.category === 'modified'),
        totalItems: items.length,
        totalSize: items.reduce((sum, item) => sum + (item.fileSize || 0), 0),
        contentStorageSize: items
          .filter(item => item.storeContent)
          .reduce((sum, item) => sum + (item.fileSize || 0), 0)
      };
      
      return preview;
      
    } catch (error) {
      throw new Error(`Failed to generate categorized cleanup preview: ${error.message}`);
    }
  }

  /**
   * Add custom cleanup rules
   * @param {Object} customRules - Custom rules to add
   */
  addCustomRules(customRules) {
    if (customRules.directories) {
      this.cleanupRules.directories.push(...customRules.directories);
    }
    
    if (customRules.files) {
      this.cleanupRules.files.push(...customRules.files);
    }
    
    if (customRules.preserve) {
      this.cleanupRules.preserve.push(...customRules.preserve);
    }
  }

  /**
   * Get restoration metadata for cleanup items
   * @param {string} projectPath - Path to scan
   * @returns {Object} Restoration metadata for all cleanup items
   */
  async getRestorationMetadata(projectPath = '.') {
    try {
      const items = await this.identifyCleanupItemsWithCategories(projectPath);
      const metadata = {
        fileOperations: [],
        summary: {
          totalFiles: items.length,
          contentStorageSize: 0,
          regenerationCommands: new Set()
        }
      };
      
      for (const item of items) {
        const operation = {
          type: 'deleted',
          path: item.path,
          category: item.category,
          restorationAction: item.action,
          regenerationCommand: item.regenerationCommand,
          originalContent: null, // Will be populated if content should be stored
          backupPath: null,
          fileSize: item.fileSize,
          warnings: item.warnings
        };
        
        // Store content for restoration if needed
        if (item.storeContent && !item.isDirectory) {
          try {
            const { readFile } = await import('node:fs/promises');
            operation.originalContent = await readFile(item.path, 'utf8');
            metadata.summary.contentStorageSize += item.fileSize;
          } catch (readError) {
            operation.warnings = operation.warnings || [];
            operation.warnings.push(`Could not read content: ${readError.message}`);
          }
        }
        
        if (item.regenerationCommand) {
          metadata.summary.regenerationCommands.add(item.regenerationCommand);
        }
        
        metadata.fileOperations.push(operation);
      }
      
      // Convert Set to Array for JSON serialization
      metadata.summary.regenerationCommands = Array.from(metadata.summary.regenerationCommands);
      
      return metadata;
      
    } catch (error) {
      throw new Error(`Failed to generate restoration metadata: ${error.message}`);
    }
  }

  /**
   * Validate cleanup operation safety
   * @param {string} projectPath - Path to validate
   */
  async validateCleanupSafety(projectPath) {
    const issues = [];
    
    try {
      // Check if essential files exist
      const essentialFiles = ['package.json'];
      for (const file of essentialFiles) {
        const filePath = join(projectPath, file);
        if (!await this.exists(filePath)) {
          issues.push(`Essential file missing: ${file}`);
        }
      }
      
      // Check if we're in a git repository root
      const gitPath = join(projectPath, '.git');
      if (await this.exists(gitPath)) {
        // .git directory is now preserved - no warning needed
      }
      
      // Check for uncommitted changes (if git exists)
      // This would require spawning git commands, which we'll skip for now
      
      return {
        safe: issues.length === 0,
        issues: issues
      };
      
    } catch (error) {
      return {
        safe: false,
        issues: [`Validation failed: ${error.message}`]
      };
    }
  }
}

export default CleanupProcessor;