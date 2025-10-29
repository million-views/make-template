#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 Setting up your new project...');

// Install dependencies
if (existsSync('package.json')) {
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
}

console.log('✅ Setup complete!');
console.log('');
console.log('Next steps:');
console.log('  npm start    # Start the development server');
console.log('');