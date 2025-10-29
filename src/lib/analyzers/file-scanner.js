/**
 * File System Scanner
 * 
 * Scans project files and identifies target files and cleanup items.
 */

import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { FSUtils } from '../utils/fs-utils.js';
import { CLEANUP_RULES } from '../config.js';

export class FileScanner {
  constructor() {
    this.targetFiles = new Set();
    this.cleanupItems = new Set();
  }

  async scanFiles(projectType) {
    this.targetFiles.clear();
    this.cleanupItems.clear();
    
    // Identify target files based on project type
    await this.identifyTargetFiles(projectType);
    
    // Identify cleanup items
    await this.identifyCleanupItems();
    
    return {
      targetFiles: Array.from(this.targetFiles),
      cleanupItems: Array.from(this.cleanupItems)
    };
  }

  async identifyTargetFiles(projectType) {
    // Common target files
    const commonFiles = ['package.json', 'README.md'];
    
    for (const file of commonFiles) {
      if (await FSUtils.exists(file)) {
        this.targetFiles.add(file);
      }
    }
    
    // Project-specific target files
    if (projectType === 'cf-d1' || projectType === 'cf-turso') {
      if (await FSUtils.exists('wrangler.jsonc')) {
        this.targetFiles.add('wrangler.jsonc');
      }
    }
    
    if (projectType === 'vite-react') {
      if (await FSUtils.exists('vite.config.js')) {
        this.targetFiles.add('vite.config.js');
      } else if (await FSUtils.exists('vite.config.ts')) {
        this.targetFiles.add('vite.config.ts');
      }
      
      if (await FSUtils.exists('index.html')) {
        this.targetFiles.add('index.html');
      }
    }
  }

  async identifyCleanupItems() {
    // Check for directories to clean up
    for (const dir of CLEANUP_RULES.directories) {
      if (await FSUtils.exists(dir)) {
        const stats = await stat(dir);
        if (stats.isDirectory()) {
          this.cleanupItems.add(dir);
        }
      }
    }
    
    // Check for files to clean up
    for (const file of CLEANUP_RULES.files) {
      if (await FSUtils.exists(file)) {
        const stats = await stat(file);
        if (stats.isFile()) {
          this.cleanupItems.add(file);
        }
      }
    }
    
    // Scan for additional cleanup items in current directory
    await this.scanForAdditionalCleanupItems('.');
  }

  async scanForAdditionalCleanupItems(dirPath) {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Check if directory matches cleanup patterns
          if (this.shouldCleanupDirectory(entry.name)) {
            this.cleanupItems.add(fullPath);
          }
        } else if (entry.isFile()) {
          // Check if file matches cleanup patterns
          if (this.shouldCleanupFile(entry.name)) {
            this.cleanupItems.add(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore permission errors during scanning
      if (error.code !== 'EACCES' && error.code !== 'EPERM') {
        throw error;
      }
    }
  }

  shouldCleanupDirectory(dirName) {
    const cleanupPatterns = [
      'node_modules',
      'dist',
      'build',
      '.next',
      '.wrangler',
      'coverage',
      '.nyc_output',
      '.cache'
    ];
    
    return cleanupPatterns.includes(dirName);
  }

  shouldCleanupFile(fileName) {
    const cleanupPatterns = [
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '.env',
      '.env.local',
      '.env.development',
      '.env.production',
      '.dev.vars',
      '.DS_Store',
      'Thumbs.db'
    ];
    
    return cleanupPatterns.includes(fileName) || fileName.startsWith('.env.');
  }

  shouldPreserveItem(itemPath) {
    const preservePatterns = CLEANUP_RULES.preserve;
    
    return preservePatterns.some(pattern => {
      if (pattern.endsWith('/')) {
        return itemPath.startsWith(pattern);
      } else if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(itemPath);
      } else {
        return itemPath === pattern;
      }
    });
  }
}

export default FileScanner;