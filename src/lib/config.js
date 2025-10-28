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
    '.git',
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
  USER_CANCELLED: 'USER_CANCELLED'
};