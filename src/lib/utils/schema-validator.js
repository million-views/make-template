/**
 * Schema Validator
 *
 * Validates template.json against the canonical schema from @m5nv/create-scaffold.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemaPath = join(__dirname, '../../../node_modules/@m5nv/create-scaffold/schema/template.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

export class SchemaValidator {
  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    this.validate = this.ajv.compile(schema);
  }

  /**
   * Validate template metadata against the schema
   * @param {Object} metadata - The template.json metadata object
   * @returns {Object} - { valid: boolean, errors: Array }
   */
  validateTemplate(metadata) {
    const valid = this.validate(metadata);
    return {
      valid,
      errors: this.validate.errors || []
    };
  }
}