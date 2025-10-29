/**
 * Configuration and Constants
 * 
 * Central configuration for the make-template CLI tool.
 */

export const PROJECT_TYPES = {
  'cf-d1': {
    files: ['wrangler.jsonc'],
    dependencies: ['@cloudflare/workers-types'],
    indicators: ['d1_databases']
  },
  'cf-turso': {
    files: ['wrangler.jsonc'],
    dependencies: ['@libsql/client'],
    indicators: ['TURSO_DB_URL']
  },
  'vite-react': {
    files: ['vite.config.js', 'vite.config.ts'],
    dependencies: ['vite', 'react']
  },
  'generic': {
    files: ['package.json'],
    dependencies: [],
    indicators: []
  }
};

export const PLACEHOLDER_FORMATS = {
  'double-brace': '{{PLACEHOLDER_NAME}}',
  'double-underscore': '__PLACEHOLDER_NAME__',
  'percent': '%PLACEHOLDER_NAME%'
};

export const CLEANUP_RULES = {
  directories: [
    'node_modules',
    'dist',
    'build',
    '.next',
    '.wrangler',
    'coverage'
  ],
  files: [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.env',
    '.env.local',
    '.dev.vars'
  ],
  preserve: [
    'migrations/',
    'src/',
    'public/',
    '.git/',
    '*.md',
    'package.json',
    'wrangler.jsonc',
    'vite.config.*'
  ]
};

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILESYSTEM_ERROR: 'FILESYSTEM_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  USER_CANCELLED: 'USER_CANCELLED',
  // Restoration-specific error codes
  UNDO_LOG_NOT_FOUND: 'UNDO_LOG_NOT_FOUND',
  UNDO_LOG_CORRUPTED: 'UNDO_LOG_CORRUPTED',
  UNDO_LOG_VERSION_MISMATCH: 'UNDO_LOG_VERSION_MISMATCH',
  RESTORATION_CONFLICT: 'RESTORATION_CONFLICT',
  MISSING_RESTORATION_VALUES: 'MISSING_RESTORATION_VALUES',
  RESTORATION_PARTIAL_FAILURE: 'RESTORATION_PARTIAL_FAILURE'
};