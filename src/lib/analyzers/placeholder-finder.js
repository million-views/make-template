/**
 * Placeholder Identification System
 * 
 * Identifies project-specific values that should become placeholders.
 */

import { readFile } from 'node:fs/promises';
import { FSUtils } from '../utils/fs-utils.js';

export class PlaceholderFinder {
  constructor() {
    this.placeholderMappings = {
      common: {
        'package.json': ['name', 'description', 'author'],
        'README.md': ['title', 'description']
      },
      'cf-d1': {
        'wrangler.jsonc': ['name', 'account_id', 'd1_databases']
      },
      'cf-turso': {
        'wrangler.jsonc': ['name', 'account_id', 'TURSO_DB_URL']
      },
      'vite-react': {
        'vite.config.js': ['base'],
        'index.html': ['title']
      }
    };
  }

  async findPlaceholders(projectType, placeholderFormat = '{{PLACEHOLDER_NAME}}') {
    const placeholders = [];
    
    // Process common placeholders
    await this.processCommonPlaceholders(placeholders, placeholderFormat);
    
    // Process project-specific placeholders
    if (this.placeholderMappings[projectType]) {
      await this.processProjectSpecificPlaceholders(placeholders, projectType, placeholderFormat);
    }
    
    return placeholders;
  }

  async processCommonPlaceholders(placeholders, format) {
    // Process package.json
    if (await FSUtils.exists('package.json')) {
      const packageContent = await readFile('package.json', 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.name) {
        placeholders.push({
          name: 'PROJECT_NAME',
          value: packageJson.name,
          placeholder: this.formatPlaceholder('PROJECT_NAME', format),
          files: ['package.json']
        });
      }
      
      if (packageJson.description) {
        placeholders.push({
          name: 'PROJECT_DESCRIPTION',
          value: packageJson.description,
          placeholder: this.formatPlaceholder('PROJECT_DESCRIPTION', format),
          files: ['package.json']
        });
      }
      
      if (packageJson.author) {
        const authorValue = typeof packageJson.author === 'string' 
          ? packageJson.author 
          : packageJson.author.name || JSON.stringify(packageJson.author);
        
        placeholders.push({
          name: 'AUTHOR',
          value: authorValue,
          placeholder: this.formatPlaceholder('AUTHOR', format),
          files: ['package.json']
        });
      }
      
      if (packageJson.repository && packageJson.repository.url) {
        placeholders.push({
          name: 'REPOSITORY_URL',
          value: packageJson.repository.url,
          placeholder: this.formatPlaceholder('REPOSITORY_URL', format),
          files: ['package.json']
        });
      }
    }
    
    // Process README.md
    if (await FSUtils.exists('README.md')) {
      const readmeContent = await readFile('README.md', 'utf8');
      const lines = readmeContent.split('\n');
      
      // Find title (first # heading)
      const titleLine = lines.find(line => line.startsWith('# '));
      if (titleLine) {
        const title = titleLine.substring(2).trim();
        placeholders.push({
          name: 'README_TITLE',
          value: title,
          placeholder: this.formatPlaceholder('README_TITLE', format),
          files: ['README.md']
        });
      }
    }
  }

  async processProjectSpecificPlaceholders(placeholders, projectType, format) {
    if (projectType === 'cf-d1' || projectType === 'cf-turso') {
      await this.processCloudflareWorkerPlaceholders(placeholders, projectType, format);
    } else if (projectType === 'vite-react') {
      await this.processVitePlaceholders(placeholders, format);
    }
  }

  async processCloudflareWorkerPlaceholders(placeholders, projectType, format) {
    if (await FSUtils.exists('wrangler.jsonc')) {
      const wranglerContent = await readFile('wrangler.jsonc', 'utf8');
      // Remove comments for JSON parsing
      const cleanContent = wranglerContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      const wranglerConfig = JSON.parse(cleanContent);
      
      if (wranglerConfig.name) {
        placeholders.push({
          name: 'WORKER_NAME',
          value: wranglerConfig.name,
          placeholder: this.formatPlaceholder('WORKER_NAME', format),
          files: ['wrangler.jsonc']
        });
      }
      
      if (wranglerConfig.account_id) {
        placeholders.push({
          name: 'CLOUDFLARE_ACCOUNT_ID',
          value: wranglerConfig.account_id,
          placeholder: this.formatPlaceholder('CLOUDFLARE_ACCOUNT_ID', format),
          files: ['wrangler.jsonc']
        });
      }
      
      if (projectType === 'cf-d1' && wranglerConfig.d1_databases) {
        wranglerConfig.d1_databases.forEach((db, index) => {
          if (db.binding) {
            placeholders.push({
              name: `D1_BINDING_${index}`,
              value: db.binding,
              placeholder: this.formatPlaceholder(`D1_BINDING_${index}`, format),
              files: ['wrangler.jsonc']
            });
          }
          if (db.database_id) {
            placeholders.push({
              name: `D1_DATABASE_ID_${index}`,
              value: db.database_id,
              placeholder: this.formatPlaceholder(`D1_DATABASE_ID_${index}`, format),
              files: ['wrangler.jsonc']
            });
          }
        });
      }
      
      if (projectType === 'cf-turso' && wranglerConfig.vars) {
        if (wranglerConfig.vars.TURSO_DB_URL) {
          placeholders.push({
            name: 'TURSO_DB_URL',
            value: wranglerConfig.vars.TURSO_DB_URL,
            placeholder: this.formatPlaceholder('TURSO_DB_URL', format),
            files: ['wrangler.jsonc']
          });
        }
        
        if (wranglerConfig.vars.TURSO_DB_AUTH_TOKEN) {
          placeholders.push({
            name: 'TURSO_DB_AUTH_TOKEN',
            value: wranglerConfig.vars.TURSO_DB_AUTH_TOKEN,
            placeholder: this.formatPlaceholder('TURSO_DB_AUTH_TOKEN', format),
            files: ['wrangler.jsonc']
          });
        }
      }
    }
  }

  async processVitePlaceholders(placeholders, format) {
    // Process vite.config.js
    const viteConfigPath = await FSUtils.exists('vite.config.js') ? 'vite.config.js' : 'vite.config.ts';
    if (await FSUtils.exists(viteConfigPath)) {
      const viteContent = await readFile(viteConfigPath, 'utf8');
      
      // Simple regex to find base URL (this is basic, could be enhanced)
      const baseMatch = viteContent.match(/base:\s*['"`]([^'"`]+)['"`]/);
      if (baseMatch) {
        placeholders.push({
          name: 'BASE_URL',
          value: baseMatch[1],
          placeholder: this.formatPlaceholder('BASE_URL', format),
          files: [viteConfigPath]
        });
      }
    }
    
    // Process index.html
    if (await FSUtils.exists('index.html')) {
      const htmlContent = await readFile('index.html', 'utf8');
      
      // Find title tag
      const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        placeholders.push({
          name: 'HTML_TITLE',
          value: titleMatch[1],
          placeholder: this.formatPlaceholder('HTML_TITLE', format),
          files: ['index.html']
        });
      }
    }
  }

  formatPlaceholder(name, format) {
    if (format.includes('{{') && format.includes('}}')) {
      return format.replace('PLACEHOLDER_NAME', name);
    } else if (format.includes('__') && format.endsWith('__')) {
      return format.replace('PLACEHOLDER_NAME', name);
    } else if (format.includes('%')) {
      return format.replace('PLACEHOLDER_NAME', name);
    }
    
    // Default to double-brace format
    return `{{${name}}}`;
  }
}

export default PlaceholderFinder;