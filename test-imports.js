#!/usr/bin/env node

// Test that all main modules can be imported correctly
import { ConversionEngine } from './src/lib/engine.js';
import { PROJECT_TYPES, PLACEHOLDER_FORMATS } from './src/lib/config.js';
import { FSUtils } from './src/lib/utils/fs-utils.js';
import { ValidationUtils } from './src/lib/utils/validation.js';
import { Logger } from './src/lib/utils/logger.js';

console.log('✅ All core modules import successfully');
console.log('✅ ConversionEngine class available');
console.log('✅ Configuration constants loaded');
console.log('✅ Utility classes available');

// Clean up
import { unlink } from 'fs/promises';
await unlink('./test-imports.js');