#!/usr/bin/env node

/**
 * @m5nv/make-template CLI Entry Point
 * 
 * Converts existing Node.js projects into reusable templates
 * compatible with @m5nv/create-scaffold.
 */

import { parseArgs } from 'node:util';
import { access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import { ConversionEngine } from '../lib/engine.js';
import { PROJECT_TYPES, PLACEHOLDER_FORMATS } from '../lib/config.js';

/**
 * CLI Options Schema for util.parseArgs
 */
const OPTIONS_SCHEMA = {
  'help': {
    type: 'boolean',
    short: 'h',
    default: false
  },
  'dry-run': {
    type: 'boolean',
    default: false
  },
  'yes': {
    type: 'boolean',
    short: 'y',
    default: false
  },
  'type': {
    type: 'string'
  },
  'placeholder-format': {
    type: 'string',
    default: '{{NAME}}'
  }
};

/**
 * Display help text and usage information
 */
function displayHelp() {
  const helpText = `
make-template - Convert existing Node.js projects into reusable templates

DESCRIPTION:
  Convert existing Node.js projects into reusable templates compatible with 
  @m5nv/create-scaffold. Analyzes project structure, identifies project types,
  replaces project-specific values with placeholders, and generates template files.

Usage:
  make-template [options]

Options:
  -h, --help                    Show this help message
      --dry-run                 Preview changes without executing them
  -y, --yes                     Skip confirmation prompts
      --type <type>             Force specific project type detection
      --placeholder-format <fmt> Specify placeholder format

SUPPORTED PROJECT TYPES:
  cf-d1        Cloudflare Worker with D1 database
  cf-turso     Cloudflare Worker with Turso database  
  vite-react   Vite-based React project
  generic      Generic Node.js project (default fallback)

SUPPORTED PLACEHOLDER FORMATS:
  {{NAME}}     Double-brace format (default)
  __NAME__     Double-underscore format
  %NAME%       Percent format

Examples:
  make-template --dry-run
    Preview conversion without making changes

  make-template --type vite-react --yes
    Convert as Vite React project, skip confirmations

  make-template --placeholder-format __NAME__ --dry-run
    Use double-underscore placeholders, preview only

REQUIREMENTS:
  - Must be run in a directory containing package.json
  - Project should be a valid Node.js project
  - Recommended to use version control before conversion

For more information, visit: https://github.com/m5nv/make-template
`;

  console.log(helpText.trim());
}

/**
 * Validate CLI arguments
 */
function validateArguments(options) {
  const errors = [];

  // Validate project type if specified
  if (options.type && !Object.keys(PROJECT_TYPES).includes(options.type)) {
    errors.push(`Invalid project type: ${options.type}. Supported types: ${Object.keys(PROJECT_TYPES).join(', ')}`);
  }

  // Validate placeholder format if specified
  if (options['placeholder-format']) {
    const format = options['placeholder-format'];
    const supportedFormats = ['{{NAME}}', '__NAME__', '%NAME%'];
    
    if (!supportedFormats.includes(format)) {
      errors.push(`Invalid placeholder format: ${format}. Supported formats: {{NAME}}, __NAME__, %NAME%`);
    }
  }

  return errors;
}

/**
 * Validate project directory and required files
 */
async function validateProjectDirectory() {
  const errors = [];

  try {
    // Check if package.json exists
    await access('package.json', constants.F_OK);
  } catch (error) {
    errors.push('package.json not found. This command must be run in a valid Node.js project directory.');
  }

  return errors;
}

/**
 * Handle CLI errors and exit appropriately
 */
function handleError(message, exitCode = 1) {
  console.error(`Error: ${message}`);
  process.exit(exitCode);
}

/**
 * Main CLI function
 */
async function main() {
  let parsedArgs;

  try {
    // Parse command line arguments
    parsedArgs = parseArgs({
      options: OPTIONS_SCHEMA,
      allowPositionals: false
    });
  } catch (error) {
    if (error.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      handleError(`Unknown option: ${error.message.split("'")[1]}`);
    } else if (error.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') {
      // Handle missing values for options
      if (error.message.includes('argument missing')) {
        const optionMatch = error.message.match(/Option '([^']+)'/);
        if (optionMatch) {
          const option = optionMatch[1];
          handleError(`Option ${option} requires a value`);
        } else {
          handleError(`Missing value for option`);
        }
      } else {
        handleError(`Invalid argument: ${error.message}`);
      }
    } else {
      handleError(`Argument parsing error: ${error.message}`);
    }
    return;
  }

  const options = parsedArgs.values;

  // Show help if requested or no arguments provided
  if (options.help) {
    displayHelp();
    process.exit(0);
  }

  // Don't show help automatically - let the conversion engine handle it

  // Validate arguments
  const argumentErrors = validateArguments(options);
  if (argumentErrors.length > 0) {
    argumentErrors.forEach(error => console.error(`Error: ${error}`));
    console.error('Try --help for usage information');
    console.error('Check project type spelling and supported options');
    process.exit(1);
  }

  // Validate project directory
  const projectErrors = await validateProjectDirectory();
  if (projectErrors.length > 0) {
    projectErrors.forEach(error => console.error(`Error: ${error}`));
    console.error('No changes were made - validation failed before execution');
    process.exit(1);
  }

  try {
    // Initialize and run conversion engine
    const engine = new ConversionEngine();
    await engine.convert(options);
  } catch (error) {
    handleError(error.message);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the CLI
main().catch((error) => {
  handleError(error.message);
});