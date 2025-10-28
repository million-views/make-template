/**
 * Cleanup Processing Operations
 * 
 * Safely removes files and directories while preserving essential template files.
 */

import { rm, stat, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, dirname } from 'node:path';

export class CleanupProcessor {
  constructor() {
    this.cleanupRules = {
      // Directories to remove
      directories: [
        'node_modules',
        '.git',
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
        issues.push('Warning: .git directory will be removed');
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