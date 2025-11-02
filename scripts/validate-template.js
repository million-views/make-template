#!/usr/bin/env node

/**
 * Template Validation Script
 *
 * Validates template.json files for compatibility with create-scaffold
 * and make-template naming conventions.
 */

import { readFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Validate template.json structure and naming conventions
 */
async function validateTemplate(templatePath) {
  const errors = [];
  const warnings = [];

  try {
    const content = await readFile(templatePath, 'utf8');
    const template = JSON.parse(content);

    // Required fields
    if (!template.name) {
      errors.push('Missing required field: name');
    }
    if (!template.handle) {
      errors.push('Missing required field: handle');
    }

    // Handle validation
    if (template.handle) {
      const kebabCaseRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
      if (!kebabCaseRegex.test(template.handle)) {
        errors.push(`Handle "${template.handle}" is not valid kebab-case`);
      }
    }

    // Display name vs handle consistency check
    if (template.name && template.handle) {
      const expectedHandle = template.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      if (template.handle !== expectedHandle) {
        warnings.push(`Handle "${template.handle}" doesn't match expected "${expectedHandle}" for display name "${template.name}"`);
      }
    }

    // Metadata validation
    if (!template.metadata) {
      errors.push('Missing required field: metadata');
    } else {
      if (!template.metadata.type) {
        errors.push('Missing required field: metadata.type');
      }
      if (!template.metadata.placeholders) {
        errors.push('Missing required field: metadata.placeholders');
      }
    }

    // Placeholder validation
    if (template.metadata?.placeholders) {
      template.metadata.placeholders.forEach((placeholder, index) => {
        if (!placeholder.name) {
          errors.push(`Placeholder ${index}: missing name field`);
        }
        if (!placeholder.description) {
          warnings.push(`Placeholder ${index}: missing description field`);
        }
      });
    }

    return { errors, warnings };

  } catch (error) {
    if (error.code === 'ENOENT') {
      errors.push(`Template file not found: ${templatePath}`);
    } else if (error instanceof SyntaxError) {
      errors.push(`Invalid JSON in template file: ${error.message}`);
    } else {
      errors.push(`Error reading template: ${error.message}`);
    }
    return { errors, warnings };
  }
}

/**
 * Validate directory name for template creation
 */
function validateDirectoryName(dirPath) {
  const errors = [];
  const dirName = basename(dirPath);

  const kebabCaseRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!kebabCaseRegex.test(dirName)) {
    errors.push(`Directory name "${dirName}" is not valid kebab-case. Template directory names must be lowercase with hyphens only.`);
  }

  return errors;
}

/**
 * Main CLI
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: validate-template <template.json> [directory]');
    console.log('');
    console.log('Examples:');
    console.log('  validate-template template.json');
    console.log('  validate-template template.json /path/to/template/dir');
    process.exit(1);
  }

  const templatePath = args[0];
  const dirPath = args[1] || (templatePath === 'template.json' ? process.cwd() : dirname(templatePath));

  console.log(`🔍 Validating template: ${templatePath}`);

  // Validate template.json
  const { errors: templateErrors, warnings: templateWarnings } = await validateTemplate(templatePath);

  // Validate directory name
  const dirErrors = validateDirectoryName(dirPath);

  // Report results
  const allErrors = [...templateErrors, ...dirErrors];

  if (allErrors.length > 0) {
    console.log('\n❌ Validation Errors:');
    allErrors.forEach(error => console.log(`  • ${error}`));
  }

  if (templateWarnings.length > 0) {
    console.log('\n⚠️  Validation Warnings:');
    templateWarnings.forEach(warning => console.log(`  • ${warning}`));
  }

  if (allErrors.length === 0) {
    console.log('\n✅ Template validation passed!');
  }

  process.exit(allErrors.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});