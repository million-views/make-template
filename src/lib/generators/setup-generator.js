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
    
    // Create placeholder mapping for the setup script with proper context mapping
    const placeholderMap = {};
    placeholders.forEach(p => {
      // Map placeholders to appropriate ctx properties based on their semantic meaning
      if (p.name === 'PROJECT_NAME' || p.name === 'WORKER_NAME') {
        placeholderMap[p.placeholder] = 'ctx.projectName';
      } else if (p.name === 'PROJECT_DESCRIPTION') {
        placeholderMap[p.placeholder] = 'ctx.projectDescription || ctx.projectName';
      } else if (p.name === 'AUTHOR') {
        placeholderMap[p.placeholder] = 'ctx.author || "Your Name"';
      } else if (p.name === 'README_TITLE' || p.name === 'HTML_TITLE') {
        placeholderMap[p.placeholder] = 'ctx.projectName';
      } else if (p.name === 'CLOUDFLARE_ACCOUNT_ID') {
        placeholderMap[p.placeholder] = 'ctx.cloudflareAccountId || "your-account-id"';
      } else if (p.name === 'BASE_URL') {
        placeholderMap[p.placeholder] = 'ctx.baseUrl || "/"';
      } else if (p.name.startsWith('D1_BINDING_')) {
        placeholderMap[p.placeholder] = 'ctx.databaseBinding || "DB"';
      } else if (p.name.startsWith('D1_DATABASE_ID_')) {
        placeholderMap[p.placeholder] = 'ctx.databaseId || "your-database-id"';
      } else if (p.name === 'REPOSITORY_URL') {
        placeholderMap[p.placeholder] = 'ctx.repositoryUrl || `https://github.com/user/${ctx.projectName}`';
      } else {
        // Default fallback
        placeholderMap[p.placeholder] = 'ctx.projectName';
      }
    });
    
    // Get list of files that need placeholder replacement
    const targetFiles = [...new Set(placeholders.flatMap(p => p.files))];
    
    const setupScript = `export default async function setup({ ctx, tools }) {
  try {
    tools.logger.info(\`Setting up ${projectType} project: \${ctx.projectName}\`);
    
    // Replace placeholders using tools.placeholders.replaceAll
    await tools.placeholders.replaceAll(
      {
${Object.entries(placeholderMap).map(([placeholder, value]) => 
  `        '${placeholder}': ${value}`).join(',\n')}
      },
      ${JSON.stringify(targetFiles, null, 4).split('\n').map((line, i) => i === 0 ? line : '      ' + line).join('\n')}
    );
    
    // Apply IDE preset if specified
    if (ctx.ide) {
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
}

export default SetupGenerator;