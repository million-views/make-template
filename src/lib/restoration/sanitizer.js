/**
 * Sanitizer Component
 * 
 * Handles sanitization of sensitive information from undo logs and other data.
 * Implements requirements 3.1, 3.2, and 3.3 for sanitization functionality.
 */

import { Logger } from '../utils/logger.js';

export class Sanitizer {
  constructor(options = {}) {
    this.logger = new Logger();
    
    // Configurable sanitization rules
    // Order matters - more specific patterns should come first
    this.sanitizationRules = {
      apiKeys: {
        patterns: [
          /sk-[a-zA-Z0-9]{48}/g, // OpenAI API keys
          /xoxb-[0-9]+-[0-9]+-[0-9]+-[a-f0-9]{32}/g, // Slack bot tokens
          /ghp_[a-zA-Z0-9]{36}/g, // GitHub personal access tokens
          /gho_[a-zA-Z0-9]{36}/g, // GitHub OAuth tokens
          /ghu_[a-zA-Z0-9]{36}/g, // GitHub user tokens
          /ghs_[a-zA-Z0-9]{36}/g, // GitHub server tokens
          /glpat-[a-zA-Z0-9_\-]{20}/g, // GitLab personal access tokens
          /AIza[0-9A-Za-z-_]{35}/g, // Google API keys
          /ya29\.[0-9A-Za-z\-_]+/g, // Google OAuth2 access tokens
          /AKIA[0-9A-Z]{16}/g, // AWS access key IDs
          /[0-9a-zA-Z/+]{40}/g, // AWS secret access keys (base64-like)
          /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g // JWT tokens
        ],
        replacement: '{{SANITIZED_API_KEY}}',
        description: 'API keys and authentication tokens'
      },
      personalInfo: {
        patterns: [
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // email addresses
          /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // full names (First Last)
          /\b[A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+\b/g, // names with middle initial
          /\b[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/g // three-part names
        ],
        replacement: '{{SANITIZED_NAME}}',
        description: 'Personal names and email addresses'
      },
      filePaths: {
        patterns: [
          /\/Users\/[^\/\s]+/g, // macOS user paths
          /C:\\Users\\[^\\\/\s]+/g, // Windows user paths
          /\/home\/[^\/\s]+/g, // Linux user paths
          /\/Users\/[^\/\s]+\/[^\/\s]+/g, // deeper macOS paths
          /C:\\Users\\[^\\\/\s]+\\[^\\\/\s]+/g, // deeper Windows paths
          /\/home\/[^\/\s]+\/[^\/\s]+/g // deeper Linux paths
        ],
        replacement: '{{SANITIZED_PATH}}',
        description: 'User-specific file paths'
      },
      cloudflareIds: {
        patterns: [
          /[a-f0-9]{32}/g, // Cloudflare account IDs (32 hex chars)
          /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g // UUIDs
        ],
        replacement: '{{SANITIZED_ID}}',
        description: 'Cloudflare account IDs and UUIDs'
      },
      ipAddresses: {
        patterns: [
          /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, // IPv4 addresses
          /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g // IPv6 addresses (simplified)
        ],
        replacement: '{{SANITIZED_IP}}',
        description: 'IP addresses'
      },
      databaseUrls: {
        patterns: [
          /postgres:\/\/[^@]+@[^\/]+\/[^\s]+/g, // PostgreSQL URLs
          /mysql:\/\/[^@]+@[^\/]+\/[^\s]+/g, // MySQL URLs
          /mongodb:\/\/[^@]+@[^\/]+\/[^\s]+/g, // MongoDB URLs
          /redis:\/\/[^@]+@[^\/]+\/[^\s]*/g // Redis URLs
        ],
        replacement: '{{SANITIZED_DATABASE_URL}}',
        description: 'Database connection URLs'
      }
    };

    // Allow custom rules to be added
    if (options.customRules) {
      this.sanitizationRules = { ...this.sanitizationRules, ...options.customRules };
    }

    // Allow specific rules to be disabled
    if (options.disabledRules) {
      options.disabledRules.forEach(ruleName => {
        delete this.sanitizationRules[ruleName];
      });
    }
  }

  /**
   * Sanitize undo log by removing sensitive information
   * @param {Object} undoLog - Undo log to sanitize
   * @param {Object} options - Sanitization options
   * @returns {Object} Sanitized undo log with report
   */
  async sanitizeUndoLog(undoLog, options = {}) {
    try {
      // Create a deep copy to avoid modifying the original
      const sanitizedUndoLog = JSON.parse(JSON.stringify(undoLog));
      const sanitizationMap = {};
      let itemsRemoved = 0;
      const categoriesAffected = new Set();

      // Sanitize original values (placeholder mappings)
      for (const [placeholder, value] of Object.entries(sanitizedUndoLog.originalValues)) {
        const sanitizationResult = this.sanitizeValue(value, sanitizationMap);
        if (sanitizationResult.sanitized) {
          sanitizedUndoLog.originalValues[placeholder] = sanitizationResult.value;
          itemsRemoved++;
          sanitizationResult.categories.forEach(cat => categoriesAffected.add(cat));
        }
      }

      // Sanitize file operations
      for (const operation of sanitizedUndoLog.fileOperations) {
        // Sanitize file content
        if (operation.originalContent) {
          const contentResult = this.sanitizeValue(operation.originalContent, sanitizationMap);
          if (contentResult.sanitized) {
            operation.originalContent = contentResult.value;
            itemsRemoved++;
            contentResult.categories.forEach(cat => categoriesAffected.add(cat));
          }
        }

        // Sanitize file paths
        const pathResult = this.sanitizeValue(operation.path, sanitizationMap);
        if (pathResult.sanitized) {
          operation.path = pathResult.value;
          itemsRemoved++;
          pathResult.categories.forEach(cat => categoriesAffected.add(cat));
        }

        // Sanitize regeneration commands if they exist
        if (operation.regenerationCommand) {
          const commandResult = this.sanitizeValue(operation.regenerationCommand, sanitizationMap);
          if (commandResult.sanitized) {
            operation.regenerationCommand = commandResult.value;
            itemsRemoved++;
            commandResult.categories.forEach(cat => categoriesAffected.add(cat));
          }
        }
      }

      // Sanitize metadata if it contains sensitive information
      if (sanitizedUndoLog.metadata) {
        for (const [key, value] of Object.entries(sanitizedUndoLog.metadata)) {
          if (typeof value === 'string') {
            const metadataResult = this.sanitizeValue(value, sanitizationMap);
            if (metadataResult.sanitized) {
              sanitizedUndoLog.metadata[key] = metadataResult.value;
              itemsRemoved++;
              metadataResult.categories.forEach(cat => categoriesAffected.add(cat));
            }
          }
        }
      }

      // Mark as sanitized and add sanitization metadata
      sanitizedUndoLog.sanitized = true;
      sanitizedUndoLog.sanitizationMap = sanitizationMap;
      
      // Generate sanitization report
      const report = this.generateSanitizationReport({
        itemsRemoved,
        categoriesAffected: Array.from(categoriesAffected),
        sanitizationMap,
        originalSize: JSON.stringify(undoLog).length,
        sanitizedSize: JSON.stringify(sanitizedUndoLog).length
      });

      sanitizedUndoLog.sanitizationReport = report;

      return {
        sanitizedUndoLog,
        report
      };

    } catch (error) {
      throw new Error(`Failed to sanitize undo log: ${error.message}`);
    }
  }

  /**
   * Sanitize a single value using configured rules
   * @param {string} value - Value to sanitize
   * @param {Object} sanitizationMap - Map to track sanitized values
   * @returns {Object} Sanitization result with value and metadata
   */
  sanitizeValue(value, sanitizationMap = {}) {
    if (typeof value !== 'string' || !value) {
      return {
        value,
        sanitized: false,
        categories: []
      };
    }

    let sanitizedValue = value;
    let wasSanitized = false;
    const categoriesUsed = [];

    // Apply each sanitization rule
    for (const [category, rule] of Object.entries(this.sanitizationRules)) {
      let categoryUsed = false;
      
      for (const pattern of rule.patterns) {
        const matches = sanitizedValue.match(pattern);
        if (matches) {
          for (const match of matches) {
            // Track what was sanitized
            if (!sanitizationMap[category]) {
              sanitizationMap[category] = [];
            }
            
            // Only add unique matches to avoid duplicates
            if (!sanitizationMap[category].some(item => item.original === match)) {
              sanitizationMap[category].push({
                original: match,
                replacement: rule.replacement,
                description: rule.description
              });
            }
            
            // Replace the specific match with sanitized placeholder
            sanitizedValue = sanitizedValue.replace(new RegExp(this.escapeRegExp(match), 'g'), rule.replacement);
            wasSanitized = true;
            categoryUsed = true;
          }
        }
      }
      
      if (categoryUsed) {
        categoriesUsed.push(category);
      }
    }

    return {
      value: sanitizedValue,
      sanitized: wasSanitized,
      categories: categoriesUsed
    };
  }

  /**
   * Generate a comprehensive sanitization report
   * @param {Object} data - Report data
   * @returns {Object} Sanitization report
   */
  generateSanitizationReport(data) {
    const {
      itemsRemoved,
      categoriesAffected,
      sanitizationMap,
      originalSize,
      sanitizedSize
    } = data;

    const report = {
      timestamp: new Date().toISOString(),
      itemsRemoved,
      categoriesAffected,
      functionalityPreserved: true,
      sizeReduction: {
        originalSize,
        sanitizedSize,
        reductionBytes: originalSize - sanitizedSize,
        reductionPercent: Math.round(((originalSize - sanitizedSize) / originalSize) * 100)
      },
      details: {},
      recommendations: []
    };

    // Add detailed breakdown by category
    for (const [category, items] of Object.entries(sanitizationMap)) {
      report.details[category] = {
        description: this.sanitizationRules[category]?.description || 'Unknown category',
        itemCount: items.length,
        items: items.map(item => ({
          replacement: item.replacement,
          // Don't include original values in report for security
          description: item.description
        }))
      };
    }

    // Generate recommendations
    if (itemsRemoved > 0) {
      report.recommendations.push('Review sanitized values before committing to version control');
      report.recommendations.push('Create .restore-defaults.json for automated restoration');
      
      if (categoriesAffected.includes('personalInfo')) {
        report.recommendations.push('Consider using generic names in templates');
      }
      
      if (categoriesAffected.includes('apiKeys')) {
        report.recommendations.push('Use environment variables for API keys in templates');
      }
      
      if (categoriesAffected.includes('filePaths')) {
        report.recommendations.push('Use relative paths instead of absolute paths');
      }
    } else {
      report.recommendations.push('No sensitive data detected - undo log appears safe for sharing');
    }

    return report;
  }

  /**
   * Preview sanitization without applying changes
   * @param {Object} undoLog - Undo log to preview sanitization for
   * @returns {Object} Preview report
   */
  async previewSanitization(undoLog) {
    try {
      const previewMap = {};
      let potentialItemsToRemove = 0;
      const categoriesAffected = new Set();

      // Check original values
      for (const [placeholder, value] of Object.entries(undoLog.originalValues)) {
        const result = this.sanitizeValue(value, previewMap);
        if (result.sanitized) {
          potentialItemsToRemove++;
          result.categories.forEach(cat => categoriesAffected.add(cat));
        }
      }

      // Check file operations
      for (const operation of undoLog.fileOperations) {
        if (operation.originalContent) {
          const contentResult = this.sanitizeValue(operation.originalContent, previewMap);
          if (contentResult.sanitized) {
            potentialItemsToRemove++;
            contentResult.categories.forEach(cat => categoriesAffected.add(cat));
          }
        }

        const pathResult = this.sanitizeValue(operation.path, previewMap);
        if (pathResult.sanitized) {
          potentialItemsToRemove++;
          pathResult.categories.forEach(cat => categoriesAffected.add(cat));
        }
      }

      return {
        potentialItemsToRemove,
        categoriesAffected: Array.from(categoriesAffected),
        previewMap,
        wouldSanitize: potentialItemsToRemove > 0,
        details: this.generatePreviewDetails(previewMap)
      };

    } catch (error) {
      throw new Error(`Failed to preview sanitization: ${error.message}`);
    }
  }

  /**
   * Generate preview details for display
   * @param {Object} previewMap - Preview sanitization map
   * @returns {Object} Preview details
   */
  generatePreviewDetails(previewMap) {
    const details = {};

    for (const [category, items] of Object.entries(previewMap)) {
      details[category] = {
        description: this.sanitizationRules[category]?.description || 'Unknown category',
        itemCount: items.length,
        examples: items.slice(0, 3).map(item => ({
          type: item.replacement,
          description: item.description
        })),
        hasMore: items.length > 3
      };
    }

    return details;
  }

  /**
   * Add custom sanitization rule
   * @param {string} name - Rule name
   * @param {Object} rule - Rule configuration
   */
  addCustomRule(name, rule) {
    if (!rule.patterns || !Array.isArray(rule.patterns)) {
      throw new Error('Custom rule must have patterns array');
    }
    
    if (!rule.replacement || typeof rule.replacement !== 'string') {
      throw new Error('Custom rule must have replacement string');
    }

    this.sanitizationRules[name] = {
      patterns: rule.patterns,
      replacement: rule.replacement,
      description: rule.description || `Custom rule: ${name}`
    };
  }

  /**
   * Remove sanitization rule
   * @param {string} name - Rule name to remove
   */
  removeRule(name) {
    delete this.sanitizationRules[name];
  }

  /**
   * Get available sanitization rules
   * @returns {Object} Available rules with descriptions
   */
  getAvailableRules() {
    const rules = {};
    for (const [name, rule] of Object.entries(this.sanitizationRules)) {
      rules[name] = {
        description: rule.description,
        replacement: rule.replacement,
        patternCount: rule.patterns.length
      };
    }
    return rules;
  }

  /**
   * Escape special regex characters
   * @param {string} string - String to escape
   * @returns {string} Escaped string
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Validate sanitization configuration
   * @returns {Object} Validation result
   */
  validateConfiguration() {
    const issues = [];
    const warnings = [];

    // Check each rule
    for (const [name, rule] of Object.entries(this.sanitizationRules)) {
      if (!rule.patterns || !Array.isArray(rule.patterns)) {
        issues.push(`Rule '${name}' missing or invalid patterns array`);
        continue;
      }

      if (!rule.replacement || typeof rule.replacement !== 'string') {
        issues.push(`Rule '${name}' missing or invalid replacement string`);
        continue;
      }

      // Test each pattern
      for (let i = 0; i < rule.patterns.length; i++) {
        const pattern = rule.patterns[i];
        if (!(pattern instanceof RegExp)) {
          issues.push(`Rule '${name}' pattern ${i} is not a RegExp`);
          continue;
        }

        // Check if pattern has global flag
        if (!pattern.global) {
          warnings.push(`Rule '${name}' pattern ${i} should have global flag for complete sanitization`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      ruleCount: Object.keys(this.sanitizationRules).length
    };
  }
}

export default Sanitizer;