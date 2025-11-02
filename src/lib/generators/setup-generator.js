/**
 * Setup Script Generator
 *
 * Generates _setup.mjs compatible with Create_Scaffold.
 */

export class SetupGenerator {
  constructor() {
    // No initialization needed
  }

  async generateSetup(analysis, options) {
    const { projectType, placeholders } = analysis;

    // Create placeholder mapping for the setup script using token names as keys
    const placeholderMap = {};
    placeholders.forEach(p => {
      // Extract token name from placeholder (remove {{}})
      const token = p.name;
      // Use ctx.inputs[token] with fallback to appropriate default
      placeholderMap[token] = `ctx.inputs.${token} || ${this.getPlaceholderFallback(token)}`;
    });

    // Get list of files that need placeholder replacement
    const targetFiles = [...new Set(placeholders.flatMap(p => p.files))];

    const setupScript = `export default async function setup({ ctx, tools }) {
  try {
    tools.logger.info(\`Setting up ${projectType} project: \${ctx.projectName}\`);

    // Replace placeholders using tools.placeholders.replaceAll
    // Placeholder mapping (token names as keys) for reference in generated script:
    //
${Object.entries(placeholderMap).map(([token, value]) => `    // ${token}: ${value}`).join('\n')}

    // Explicit mapping object for tests and runtime
    const PLACEHOLDER_MAP = {
${Object.entries(placeholderMap).map(([token, value]) => `      '${token}': ${value}`).join(',\n')}
    };

  // Explicit target files array
  const TARGET_FILES = [${targetFiles.map(f => `'${f}'`).join(', ')}];

    await tools.placeholders.replaceAll(PLACEHOLDER_MAP, TARGET_FILES);

    // Apply IDE preset if specified
    if (ctx.ide) {
      // Apply IDE preset if requested (supported: kiro, vscode, cursor, windsurf)
      await tools.ide.applyPreset(ctx.ide);
    }

${this.generateProjectSpecificSetup(projectType)}

    tools.logger.info('Template conversion completed successfully!');

  } catch (error) {
    tools.logger.error('Setup failed:', error.message);
    throw error;
  }
}`;

    return setupScript;
  }

  async generateSetupScript(projectType, placeholders) {
    // Legacy method for backward compatibility
    return this.generateSetup({ projectType, placeholders }, {});
  }

  generateProjectSpecificSetup(projectType) {
    switch (projectType) {
      case 'cf-d1':
        return `    // Cloudflare D1 specific setup
    tools.logger.info('Configuring Cloudflare Worker with D1 database...');

    // Ensure wrangler.jsonc has proper structure and compatibility date
    await tools.json.set('wrangler.jsonc', 'compatibility_date', new Date().toISOString().split('T')[0]);

    // Validate D1 database configuration
    const wranglerConfig = await tools.json.get('wrangler.jsonc');
    if (!wranglerConfig.d1_databases || wranglerConfig.d1_databases.length === 0) {
      tools.logger.info('Adding D1 database configuration structure...');
      await tools.json.set('wrangler.jsonc', 'd1_databases', []);
    }`;

      case 'cf-turso':
        return `    // Cloudflare Turso specific setup
    tools.logger.info('Configuring Cloudflare Worker with Turso database...');

    // Ensure wrangler.jsonc has proper structure and compatibility date
    await tools.json.set('wrangler.jsonc', 'compatibility_date', new Date().toISOString().split('T')[0]);

    // Validate Turso environment variables setup
    tools.logger.info('Configuring Turso database environment variables...');
    await tools.json.set('wrangler.jsonc', 'vars.TURSO_DB_URL', 'your-turso-database-url');
    await tools.json.set('wrangler.jsonc', 'vars.TURSO_DB_AUTH_TOKEN', 'your-turso-auth-token');`;

      case 'vite-react':
        return `    // Vite React specific setup
    tools.logger.info('Configuring Vite React application...');

    // Ensure package.json has proper Vite scripts
    await tools.json.set('package.json', 'scripts.dev', 'vite');
    await tools.json.set('package.json', 'scripts.build', 'vite build');
    await tools.json.set('package.json', 'scripts.preview', 'vite preview');

    // Configure Vite base URL if specified
    if (ctx.baseUrl && ctx.baseUrl !== '/') {
      await tools.json.set('vite.config.js', 'base', ctx.baseUrl);
    }

    // Ensure HTML title is properly configured
    tools.logger.info('Configuring HTML title and meta tags...');`;

      default:
        return `    // Generic Node.js project setup
    tools.logger.info('Configuring generic Node.js project...');

    // Ensure package.json has basic structure and proper version
    await tools.json.set('package.json', 'version', '1.0.0');

    // Add basic npm scripts if they don't exist
    const packageJson = await tools.json.get('package.json');
    if (!packageJson.scripts) {
      await tools.json.set('package.json', 'scripts', {});
    }
    if (!packageJson.scripts.test) {
      await tools.json.set('package.json', 'scripts.test', 'echo "Error: no test specified" && exit 1');
    }`;
    }
  }

  getPlaceholderFallback(token) {
    const fallbacks = {
      'PROJECT_NAME': 'ctx.projectName',
      'PROJECT_DESCRIPTION': 'ctx.projectDescription || ctx.projectName',
      'AUTHOR': 'ctx.author || "Your Name"',
      'README_TITLE': 'ctx.projectName',
      'HTML_TITLE': '"My App"',
      'WORKER_NAME': 'ctx.projectName',
      'CLOUDFLARE_ACCOUNT_ID': 'ctx.cloudflareAccountId || "your-account-id"',
      'BASE_URL': 'ctx.baseUrl || "/"',
      'D1_BINDING_0': 'ctx.databaseBinding || "DB"',
      'D1_DATABASE_BINDING': 'ctx.databaseBinding || "DB"',
      'D1_DATABASE_ID_0': 'ctx.databaseId || "your-database-id"',
      'D1_DATABASE_ID': 'ctx.databaseId || "your-database-id"',
      'REPOSITORY_URL': '`https://github.com/user/${ctx.projectName}`',
      'COMPANY_NAME': 'ctx.projectName',
      'TAGLINE': '"Welcome"',
      'LOGO_URL': '"https://example.com/logo.png"',
      'ALT_TEXT_0': '"Logo"',
      'ALT_TEXT_1': '"Image 1"',
      'ALT_TEXT_2': '"Image 2"',
      'LINK_URL_0': '"https://example.com"',
      'LINK_URL_1': '"https://example.com/page1"',
      'LINK_URL_2': '"https://example.com/page2"',
      'IMAGE_URL_0': '"https://example.com/image1.png"',
      'IMAGE_URL_1': '"https://example.com/image2.png"',
      'IMAGE_URL_2': '"https://example.com/image3.png"',
      'QUOTE_0': '"Great product!"',
      'QUOTE_1': '"Excellent service!"',
      'QUOTE_2': '"Highly recommended!"',
      'TEXT_CONTENT_0': '"Content 0"',
      'TEXT_CONTENT_1': '"Content 1"',
      'TEXT_CONTENT_2': '"Content 2"'
    };

    return fallbacks[token] || 'ctx.projectName';
  }
}

export default SetupGenerator;