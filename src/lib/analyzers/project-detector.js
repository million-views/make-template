/**
 * Project Type Detection
 * 
 * Detects project type based on file presence and package.json dependencies.
 */

import { readFile } from 'node:fs/promises';
import { FSUtils } from '../utils/fs-utils.js';
import { PROJECT_TYPES } from '../config.js';

export class ProjectDetector {
  constructor() {
    // No initialization needed
  }

  async detectProjectType(forcedType = null) {
    // If type is forced via CLI option, validate and return it
    if (forcedType) {
      if (!PROJECT_TYPES[forcedType]) {
        throw new Error(`Invalid project type: ${forcedType}. Supported types: ${Object.keys(PROJECT_TYPES).join(', ')}`);
      }
      return forcedType;
    }
    
    // Auto-detect project type
    const packageJson = await this.readPackageJson();
    
    // Check for Cloudflare Worker projects
    if (await FSUtils.exists('wrangler.jsonc')) {
      const wranglerConfig = await this.readWranglerConfig();
      
      // Check for D1 database indicators
      if (wranglerConfig.d1_databases || this.hasDependency(packageJson, '@cloudflare/d1')) {
        return 'cf-d1';
      }
      
      // Check for Turso database indicators
      if (this.hasDependency(packageJson, '@libsql/client') || 
          this.hasEnvironmentVariable(wranglerConfig, 'TURSO_DB_URL')) {
        return 'cf-turso';
      }
      
      // Generic Cloudflare Worker (fallback to generic for now)
      return 'generic';
    }
    
    // Check for Vite React projects
    if (await FSUtils.exists('vite.config.js') || await FSUtils.exists('vite.config.ts')) {
      if (this.hasDependency(packageJson, 'react')) {
        return 'vite-react';
      }
    }
    
    // Default to generic Node.js project
    return 'generic';
  }

  async readPackageJson() {
    try {
      const content = await readFile('package.json', 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read package.json: ${error.message}`);
    }
  }

  async readWranglerConfig() {
    try {
      const content = await readFile('wrangler.jsonc', 'utf8');
      // Remove comments for JSON parsing
      const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      return JSON.parse(cleanContent);
    } catch (error) {
      return {}; // Return empty object if wrangler.jsonc is malformed
    }
  }

  hasDependency(packageJson, dependencyName) {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies
    };
    
    return Object.keys(deps).includes(dependencyName);
  }

  hasEnvironmentVariable(wranglerConfig, varName) {
    if (!wranglerConfig.vars) return false;
    return Object.keys(wranglerConfig.vars).includes(varName);
  }
}

export default ProjectDetector;