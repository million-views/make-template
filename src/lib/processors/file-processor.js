/**
 * File Processing Operations
 * 
 * Performs format-aware placeholder replacements in target files.
 */

import { readFile, writeFile } from 'node:fs/promises';

class FileProcessor {
  constructor() {
    this.supportedFormats = ['json', 'jsonc', 'js', 'ts', 'mjs', 'html', 'htm', 'md', 'txt'];
  }

  /**
   * Process a file with placeholder replacements
   * @param {string} filePath - Path to the file to process
   * @param {Array} replacements - Array of {from, to} replacement objects
   * @param {string} placeholderFormat - Format for placeholders (e.g., '{{NAME}}')
   */
  async processFile(filePath, replacements, placeholderFormat = '{{PLACEHOLDER_NAME}}') {
    try {
      const content = await readFile(filePath, 'utf8');
      let processedContent = content;
      
      // Apply all replacements with format-aware processing
      for (const replacement of replacements) {
        processedContent = this.replaceInContent(
          processedContent, 
          replacement.from, 
          replacement.to, 
          filePath,
          placeholderFormat
        );
      }
      
      // Write back the processed content
      await writeFile(filePath, processedContent, 'utf8');
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      } else if (error.code === 'EACCES') {
        throw new Error(`Permission denied: ${filePath}`);
      } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
        throw new Error(`Too many open files. Please close some files and try again.`);
      } else {
        throw new Error(`Failed to process file ${filePath}: ${error.message}`);
      }
    }
  }

  /**
   * Replace content based on file format
   */
  replaceInContent(content, from, to, filePath, placeholderFormat) {
    const extension = this.getFileExtension(filePath);
    
    try {
      switch (extension) {
        case 'json':
        case 'jsonc':
          return this.replaceInJson(content, from, to, extension === 'jsonc');
        case 'js':
        case 'ts':
        case 'mjs':
          return this.replaceInJavaScript(content, from, to);
        case 'html':
        case 'htm':
          return this.replaceInHtml(content, from, to);
        case 'md':
          return this.replaceInMarkdown(content, from, to);
        default:
          return this.replaceInText(content, from, to);
      }
    } catch (error) {
      // If format-specific replacement fails, fall back to text replacement
      console.warn(`Format-specific replacement failed for ${filePath}, falling back to text replacement: ${error.message}`);
      return this.replaceInText(content, from, to);
    }
  }

  /**
   * Replace in JSON/JSONC files while preserving structure
   */
  replaceInJson(content, from, to, allowComments = false) {
    try {
      // Handle JSONC comments if needed
      let workingContent = content;
      let comments = [];
      
      if (allowComments) {
        // Extract comments to preserve them
        const commentRegex = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;
        workingContent = content.replace(commentRegex, (match, offset) => {
          comments.push({ match, offset });
          return `__COMMENT_${comments.length - 1}__`;
        });
      }
      
      // Parse and validate JSON structure
      let parsed;
      try {
        parsed = JSON.parse(workingContent);
      } catch (parseError) {
        // If parsing fails, fall back to string replacement
        return this.replaceInText(content, from, to);
      }
      
      // Perform replacement in the JSON string
      const jsonString = JSON.stringify(parsed, null, 2);
      const replacedJson = this.replaceJsonValues(jsonString, from, to);
      
      // Restore comments if JSONC
      let result = replacedJson;
      if (allowComments && comments.length > 0) {
        comments.forEach((comment, index) => {
          result = result.replace(`"__COMMENT_${index}__"`, comment.match);
        });
      }
      
      return result;
    } catch (error) {
      // Fall back to text replacement if JSON processing fails
      return this.replaceInText(content, from, to);
    }
  }

  /**
   * Replace values in JSON string while preserving structure
   */
  replaceJsonValues(jsonString, from, to) {
    // Replace quoted string values
    const quotedFrom = JSON.stringify(from);
    const quotedTo = JSON.stringify(to);
    
    // Remove outer quotes for the replacement pattern
    const fromPattern = quotedFrom.slice(1, -1);
    const toPattern = quotedTo.slice(1, -1);
    
    // Replace the value while preserving quotes
    return jsonString.replace(
      new RegExp(`"${this.escapeRegex(fromPattern)}"`, 'g'), 
      `"${toPattern}"`
    );
  }

  /**
   * Replace in JavaScript/TypeScript files
   */
  replaceInJavaScript(content, from, to) {
    let result = content;
    
    // Replace in double-quoted strings
    result = result.replace(
      new RegExp(`"${this.escapeRegex(from)}"`, 'g'), 
      `"${to}"`
    );
    
    // Replace in single-quoted strings
    result = result.replace(
      new RegExp(`'${this.escapeRegex(from)}'`, 'g'), 
      `'${to}'`
    );
    
    // Replace in template literals
    result = result.replace(
      new RegExp(`\`${this.escapeRegex(from)}\``, 'g'), 
      `\`${to}\``
    );
    
    // Replace in object property values (handle colon-separated values)
    result = result.replace(
      new RegExp(`(:\\s*['"\`])${this.escapeRegex(from)}(['"\`])`, 'g'),
      `$1${to}$2`
    );
    
    return result;
  }

  /**
   * Replace in HTML files
   */
  replaceInHtml(content, from, to) {
    let result = content;
    
    // Replace in text content between tags
    result = result.replace(
      new RegExp(`(>)([^<]*?)${this.escapeRegex(from)}([^<]*?)(<)`, 'g'),
      `$1$2${to}$3$4`
    );
    
    // Replace in attribute values
    result = result.replace(
      new RegExp(`(=\\s*["'])([^"']*?)${this.escapeRegex(from)}([^"']*?)(["'])`, 'g'),
      `$1$2${to}$3$4`
    );
    
    // Replace in title tags specifically
    result = result.replace(
      new RegExp(`(<title[^>]*>)([^<]*?)${this.escapeRegex(from)}([^<]*?)(</title>)`, 'gi'),
      `$1$2${to}$3$4`
    );
    
    return result;
  }

  /**
   * Replace in Markdown files
   */
  replaceInMarkdown(content, from, to) {
    let result = content;
    
    // Replace in headings
    result = result.replace(
      new RegExp(`^(#{1,6}\\s+)(.*)${this.escapeRegex(from)}(.*)$`, 'gm'),
      `$1$2${to}$3`
    );
    
    // Replace in regular text
    result = result.replace(
      new RegExp(this.escapeRegex(from), 'g'),
      to
    );
    
    return result;
  }

  /**
   * Replace in plain text files
   */
  replaceInText(content, from, to) {
    return content.replace(new RegExp(this.escapeRegex(from), 'g'), to);
  }

  /**
   * Get file extension from path
   */
  getFileExtension(filePath) {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Validate placeholder format
   */
  validatePlaceholderFormat(format) {
    if (!format || typeof format !== 'string') {
      return false;
    }
    
    // Check if format contains NAME substitution mechanism
    const validFormats = [
      /\{\{.*NAME.*\}\}/,  // {{NAME}} or {{PLACEHOLDER_NAME}}
      /__.*NAME.*__/,      // __NAME__ or __PLACEHOLDER_NAME__
      /%.*NAME.*%/         // %NAME% or %PLACEHOLDER_NAME%
    ];
    
    return validFormats.some(pattern => pattern.test(format));
  }

  /**
   * Handle edge cases and malformed files gracefully
   */
  async processFileWithValidation(filePath, replacements, placeholderFormat) {
    try {
      // Validate placeholder format
      if (!this.validatePlaceholderFormat(placeholderFormat)) {
        throw new Error(`Invalid placeholder format: ${placeholderFormat}. Must contain NAME substitution mechanism.`);
      }
      
      // Check if file exists and is readable
      const content = await readFile(filePath, 'utf8');
      
      // Validate file is not empty
      if (content.trim().length === 0) {
        console.warn(`File ${filePath} is empty, skipping processing`);
        return;
      }
      
      // Process the file
      await this.processFile(filePath, replacements, placeholderFormat);
      
    } catch (error) {
      throw new Error(`File processing validation failed for ${filePath}: ${error.message}`);
    }
  }
}

export default FileProcessor;