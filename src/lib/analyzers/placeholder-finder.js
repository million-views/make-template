/**
 * Placeholder Identification System
 *
 * Identifies project-specific values that should become placeholders.
 */

import { readFile } from 'node:fs/promises';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
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

  async findJsxFiles() {
    const jsxFiles = [];
    const rootDir = '.';

    await this.scanDirectoryForJsx(rootDir, jsxFiles);
    return jsxFiles;
  }

  async scanDirectoryForJsx(dirPath, jsxFiles) {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        // Skip node_modules and other common directories that shouldn't be templatized
        if (entry.isDirectory() && (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build' || entry.name.startsWith('.'))) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.scanDirectoryForJsx(fullPath, jsxFiles);
        } else if (entry.isFile() && (entry.name.endsWith('.jsx') || entry.name.endsWith('.tsx'))) {
          jsxFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
      if (error.code !== 'EACCES' && error.code !== 'EPERM') {
        throw error;
      }
    }
  }

  async findPlaceholders(projectType, placeholderFormat = '{{PLACEHOLDER_NAME}}') {
    const placeholders = [];

    // Process common placeholders
    await this.processCommonPlaceholders(placeholders, placeholderFormat);

    // Process project-specific placeholders
    if (this.placeholderMappings[projectType]) {
      await this.processProjectSpecificPlaceholders(placeholders, projectType, placeholderFormat);
    }

    // Process JSX/TSX files for content placeholders (only for React/Vite projects)
    if (projectType === 'vite-react') {
      await this.processJsxPlaceholders(placeholders, placeholderFormat);
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
      // Strip only block comments (/* ... */). Do NOT remove '//' sequences
      // as they may appear inside string values (e.g. protocol URLs).
      const cleanContent = wranglerContent.replace(/\/\*[\s\S]*?\*\//g, '');
      // Remove only block comments (/* */) to avoid stripping '//' sequences
      // that may occur inside string literals such as URLs (e.g. libsql://...)
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
            // Also provide a non-indexed alias for the first binding to match
            // legacy/test expectations (D1_DATABASE_BINDING)
            if (index === 0) {
              placeholders.push({
                name: 'D1_DATABASE_BINDING',
                value: db.binding,
                placeholder: this.formatPlaceholder('D1_DATABASE_BINDING', format),
                files: ['wrangler.jsonc']
              });
            }
          }
          if (db.database_id) {
            placeholders.push({
              name: `D1_DATABASE_ID_${index}`,
              value: db.database_id,
              placeholder: this.formatPlaceholder(`D1_DATABASE_ID_${index}`, format),
              files: ['wrangler.jsonc']
            });
            // Non-indexed alias for first database id
            if (index === 0) {
              placeholders.push({
                name: 'D1_DATABASE_ID',
                value: db.database_id,
                placeholder: this.formatPlaceholder('D1_DATABASE_ID', format),
                files: ['wrangler.jsonc']
              });
            }
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

  async processJsxPlaceholders(placeholders, format) {
    const jsxFiles = await this.findJsxFiles();

    for (const file of jsxFiles) {
      const content = await readFile(file, 'utf8');
      await this.extractTextContent(content, file, placeholders, format);
      await this.extractImageSources(content, file, placeholders, format);
      await this.extractLinkUrls(content, file, placeholders, format);
      await this.extractAltText(content, file, placeholders, format);
      await this.extractJsxAttributeStrings(content, file, placeholders, format);
    }
  }

  async extractTextContent(content, file, placeholders, format) {
    // Match text between JSX tags, excluding dynamic content in {}
    const textRegex = />([^<>{}]+)</g;
    let match;
    let index = 0;

    while ((match = textRegex.exec(content)) !== null) {
      const text = match[1].trim();
      if (text.length >= 3 && !/^\s*$/.test(text)) { // Exclude very short or whitespace-only
        const name = this.generateTextPlaceholderName(text, index);
        const location = this.getLocation(content, match.index);
        placeholders.push({
          name,
          value: text,
          placeholder: this.formatPlaceholder(name, format),
          files: [file],
          category: 'text',
          location
        });
        index++;
      }
    }
  }

  generateTextPlaceholderName(text, index) {
    // Simple heuristics for naming
    const lowerText = text.toLowerCase();
    if (lowerText.includes('company') || lowerText.includes('brand') || lowerText.includes('corp')) {
      return 'COMPANY_NAME';
    } else if (lowerText.includes('quote') || text.includes('"')) {
      return `QUOTE_${index}`;
    } else if (lowerText.includes('tagline') || lowerText.length < 20) {
      return 'TAGLINE';
    } else {
      return `TEXT_CONTENT_${index}`;
    }
  }

  getLocation(content, index) {
    const lines = content.substring(0, index).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    return `line ${line}, column ${column}`;
  }

  async extractImageSources(content, file, placeholders, format) {
    // Match src attributes in img tags
    const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let match;
    let index = 0;

    while ((match = imgRegex.exec(content)) !== null) {
      const src = match[1];
      const name = this.generateImagePlaceholderName(src, index);
      const location = this.getLocation(content, match.index);
      placeholders.push({
        name,
        value: src,
        placeholder: this.formatPlaceholder(name, format),
        files: [file],
        category: 'image',
        location
      });
      index++;
    }
  }

  generateImagePlaceholderName(src, index) {
    const lowerSrc = src.toLowerCase();
    if (lowerSrc.includes('logo')) {
      return 'LOGO_URL';
    } else {
      return `IMAGE_URL_${index}`;
    }
  }

  async extractLinkUrls(content, file, placeholders, format) {
    // Match href attributes in a tags
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let match;
    let index = 0;

    while ((match = linkRegex.exec(content)) !== null) {
      const href = match[1];
      const name = `LINK_URL_${index}`;
      const location = this.getLocation(content, match.index);
      placeholders.push({
        name,
        value: href,
        placeholder: this.formatPlaceholder(name, format),
        files: [file],
        category: 'link',
        location
      });
      index++;
    }
  }

  async extractAltText(content, file, placeholders, format) {
    // Match alt attributes in img tags
    const altRegex = /<img[^>]*alt=["']([^"']+)["'][^>]*>/gi;
    let match;
    let index = 0;

    while ((match = altRegex.exec(content)) !== null) {
      const alt = match[1];
      const name = `ALT_TEXT_${index}`;
      const location = this.getLocation(content, match.index);
      placeholders.push({
        name,
        value: alt,
        placeholder: this.formatPlaceholder(name, format),
        files: [file],
        category: 'alt',
        location
      });
      index++;
    }
  }

  async extractJsxAttributeStrings(content, file, placeholders, format) {
    // Match string literals in JSX attributes (both single and double quotes)
    // This regex looks for attributeName="string value" or attributeName='string value'
    const attributeRegex = /(\w+)=["']([^"']+)["']/g;
    let match;
    let index = 0;

    while ((match = attributeRegex.exec(content)) !== null) {
      const attrName = match[1];
      const attrValue = match[2];

      // Skip very short values and common non-templatable attributes
      if (attrValue.length >= 3 && !this.isCommonNonTemplatableAttribute(attrName, attrValue)) {
        const name = this.generateJsxAttributePlaceholderName(attrName, attrValue, index);
        const location = this.getLocation(content, match.index);
        placeholders.push({
          name,
          value: attrValue,
          placeholder: this.formatPlaceholder(name, format),
          files: [file],
          category: 'jsx-attribute',
          location
        });
        index++;
      }
    }
  }

  isCommonNonTemplatableAttribute(attrName, attrValue) {
    // Skip attributes that are typically not templatable
    const nonTemplatableAttrs = ['class', 'classname', 'id', 'type', 'target', 'rel', 'onerror', 'style'];
    if (nonTemplatableAttrs.includes(attrName.toLowerCase())) {
      return true;
    }

    // Skip values that look like CSS classes, IDs, or technical values
    if (attrValue.startsWith('http') && (attrValue.includes('localhost') || attrValue.includes('127.0.0.1'))) {
      return true; // Skip localhost URLs
    }

    return false;
  }

  generateJsxAttributePlaceholderName(attrName, attrValue, index) {
    const lowerAttr = attrName.toLowerCase();
    const lowerValue = attrValue.toLowerCase();

    // Specific attribute-based naming
    if (lowerAttr === 'href' || lowerAttr === 'linkhref') {
      return 'LINK_URL_0'; // Use consistent naming
    } else if (lowerAttr === 'src' || lowerAttr === 'logosrc') {
      return lowerValue.includes('logo') ? 'LOGO_URL' : `IMAGE_URL_${index}`;
    } else if (lowerAttr === 'alt' || lowerAttr === 'logoalt') {
      return 'ALT_TEXT_0'; // Use consistent naming
    } else if (lowerAttr === 'companyname' || lowerAttr === 'brand') {
      return 'TAGLINE'; // Company name often serves as tagline
    } else if (lowerAttr === 'tagline') {
      return 'TEXT_CONTENT_1'; // Tagline content
    } else if (lowerAttr === 'quotetext') {
      return 'TEXT_CONTENT_2'; // Quote content
    } else if (lowerAttr === 'quotecite') {
      return 'TAGLINE'; // Citation often uses tagline placeholder
    }

    // Fallback naming based on content heuristics
    if (lowerValue.includes('logo')) {
      return 'LOGO_URL';
    } else if (lowerValue.includes('http') && lowerValue.includes('.')) {
      return `LINK_URL_${index}`;
    } else if (lowerValue.length < 30 && !lowerValue.includes(' ')) {
      return 'TAGLINE'; // Short text without spaces is likely a tagline
    } else {
      return `TEXT_CONTENT_${index}`;
    }
  }

  formatPlaceholder(name, format) {
    // Support format strings that use either PLACEHOLDER_NAME or NAME as the
    // substitution marker. Replace both occurrences so callers can pass
    // formats like '{{NAME}}' or '{{PLACEHOLDER_NAME}}'.
    if (format.includes('{{') && format.includes('}}')) {
      return format.replace(/PLACEHOLDER_NAME|NAME/g, name);
    } else if (format.includes('__') && format.endsWith('__')) {
      return format.replace(/PLACEHOLDER_NAME|NAME/g, name);
    } else if (format.includes('%')) {
      return format.replace(/PLACEHOLDER_NAME|NAME/g, name);
    }

    // Default to double-brace format
    return `{{${name}}}`;
  }
}

export default PlaceholderFinder;