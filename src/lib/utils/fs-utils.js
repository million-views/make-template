/**
 * File System Utilities
 * 
 * File system utilities with proper error handling and atomic operations.
 * Implements requirement 9.3: Display specific error messages with file paths when filesystem operations fail.
 * Implements requirement 9.5: Wrap all filesystem operations in try-catch blocks for proper error handling.
 */

import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';

export class FSUtils {
  /**
   * Ensure directory exists with proper error handling
   * @param {string} dirPath - Directory path to create
   * @throws {Error} With specific error message and file path
   */
  static async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code === 'EEXIST') {
        return; // Directory already exists, this is fine
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot create directory ${resolve(dirPath)}`);
      } else if (error.code === 'ENOTDIR') {
        throw new Error(`Invalid path: ${resolve(dirPath)} - parent is not a directory`);
      } else if (error.code === 'ENOSPC') {
        throw new Error(`Insufficient disk space to create directory ${resolve(dirPath)}`);
      } else {
        throw new Error(`Failed to create directory ${resolve(dirPath)}: ${error.message}`);
      }
    }
  }

  /**
   * Write file atomically with proper error handling
   * @param {string} filePath - File path to write
   * @param {string} content - Content to write
   * @throws {Error} With specific error message and file path
   */
  static async writeFileAtomic(filePath, content) {
    const resolvedPath = resolve(filePath);
    const dir = dirname(resolvedPath);
    
    try {
      await this.ensureDir(dir);
    } catch (error) {
      throw new Error(`Cannot write file ${resolvedPath}: ${error.message}`);
    }
    
    const tempPath = `${resolvedPath}.tmp`;
    try {
      await fs.writeFile(tempPath, content, 'utf8');
      await fs.rename(tempPath, resolvedPath);
    } catch (error) {
      // Clean up temporary file
      try {
        await fs.unlink(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot write to ${resolvedPath}`);
      } else if (error.code === 'ENOSPC') {
        throw new Error(`Insufficient disk space to write file ${resolvedPath}`);
      } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
        throw new Error(`Too many open files. Please close some files and try again. File: ${resolvedPath}`);
      } else {
        throw new Error(`Failed to write file ${resolvedPath}: ${error.message}`);
      }
    }
  }

  /**
   * Check if file or directory exists
   * @param {string} path - Path to check
   * @returns {boolean} True if exists, false otherwise
   */
  static async exists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file with proper error handling
   * @param {string} filePath - File path to read
   * @returns {string} File content
   * @throws {Error} With specific error message and file path
   */
  static async readFile(filePath) {
    const resolvedPath = resolve(filePath);
    try {
      return await fs.readFile(resolvedPath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${resolvedPath}`);
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot read ${resolvedPath}`);
      } else if (error.code === 'EISDIR') {
        throw new Error(`Invalid operation: ${resolvedPath} is a directory, not a file`);
      } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
        throw new Error(`Too many open files. Please close some files and try again. File: ${resolvedPath}`);
      } else {
        throw new Error(`Failed to read file ${resolvedPath}: ${error.message}`);
      }
    }
  }

  /**
   * Remove file or directory with proper error handling
   * @param {string} path - Path to remove
   * @param {object} options - Options for removal
   * @throws {Error} With specific error message and file path
   */
  static async remove(path, options = {}) {
    const resolvedPath = resolve(path);
    try {
      await fs.rm(resolvedPath, { recursive: true, force: true, ...options });
    } catch (error) {
      if (error.code === 'ENOENT' && options.force !== false) {
        return; // File doesn't exist, but force is enabled
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot remove ${resolvedPath}`);
      } else if (error.code === 'EBUSY' || error.code === 'EMFILE') {
        throw new Error(`File is locked or in use: ${resolvedPath}`);
      } else if (error.code === 'ENOTDIR') {
        throw new Error(`Invalid path: ${resolvedPath} - parent is not a directory`);
      } else {
        throw new Error(`Failed to remove ${resolvedPath}: ${error.message}`);
      }
    }
  }

  /**
   * Copy file with proper error handling
   * @param {string} src - Source file path
   * @param {string} dest - Destination file path
   * @throws {Error} With specific error message and file paths
   */
  static async copyFile(src, dest) {
    const resolvedSrc = resolve(src);
    const resolvedDest = resolve(dest);
    
    try {
      await this.ensureDir(dirname(resolvedDest));
      await fs.copyFile(resolvedSrc, resolvedDest);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Source file not found: ${resolvedSrc}`);
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot copy from ${resolvedSrc} to ${resolvedDest}`);
      } else if (error.code === 'ENOSPC') {
        throw new Error(`Insufficient disk space to copy file to ${resolvedDest}`);
      } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
        throw new Error(`Too many open files. Please close some files and try again. Source: ${resolvedSrc}, Destination: ${resolvedDest}`);
      } else {
        throw new Error(`Failed to copy file from ${resolvedSrc} to ${resolvedDest}: ${error.message}`);
      }
    }
  }

  /**
   * Get file stats with proper error handling
   * @param {string} path - Path to get stats for
   * @returns {object} File stats
   * @throws {Error} With specific error message and file path
   */
  static async stat(path) {
    const resolvedPath = resolve(path);
    try {
      return await fs.stat(resolvedPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File or directory not found: ${resolvedPath}`);
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot access ${resolvedPath}`);
      } else {
        throw new Error(`Failed to get stats for ${resolvedPath}: ${error.message}`);
      }
    }
  }

  /**
   * List directory contents with proper error handling
   * @param {string} dirPath - Directory path to list
   * @returns {string[]} Array of file/directory names
   * @throws {Error} With specific error message and file path
   */
  static async readdir(dirPath) {
    const resolvedPath = resolve(dirPath);
    try {
      return await fs.readdir(resolvedPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Directory not found: ${resolvedPath}`);
      } else if (error.code === 'ENOTDIR') {
        throw new Error(`Not a directory: ${resolvedPath}`);
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot read directory ${resolvedPath}`);
      } else {
        throw new Error(`Failed to read directory ${resolvedPath}: ${error.message}`);
      }
    }
  }
}

export default FSUtils;