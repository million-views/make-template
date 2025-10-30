export default async function setup({ ctx, tools }) {
  try {
    tools.logger.info(`Setting up cf-d1 project: ${ctx.projectName}`);

    // Replace placeholders using tools.placeholders.replaceAll
    // Placeholder mapping (human-friendly) for reference in generated script:
    // NOTE: These lines are for readability and testing assertions. The actual
    // replacement map used by tools.placeholders.replaceAll uses the full
    // placeholder tokens (e.g. '{{PROJECT_NAME}}') as keys.
    //
    // PROJECT_NAME: ctx.projectName
    // PROJECT_DESCRIPTION: ctx.projectDescription || ctx.projectName
    // AUTHOR: ctx.author || "Your Name"
    // README_TITLE: ctx.projectName
    // WORKER_NAME: ctx.projectName
    // CLOUDFLARE_ACCOUNT_ID: ctx.cloudflareAccountId || "your-account-id"
    // D1_BINDING_0: ctx.databaseBinding || "DB"
    // D1_DATABASE_BINDING: ctx.databaseBinding || "DB"
    // D1_DATABASE_ID_0: ctx.databaseId || "your-database-id"
    // D1_DATABASE_ID: ctx.databaseId || "your-database-id"

    // Explicit mapping object for tests and runtime
    const PLACEHOLDER_MAP = {
      '{{PROJECT_NAME}}': ctx.projectName,
      '{{PROJECT_DESCRIPTION}}': ctx.projectDescription || ctx.projectName,
      '{{AUTHOR}}': ctx.author || "Your Name",
      '{{README_TITLE}}': ctx.projectName,
      '{{WORKER_NAME}}': ctx.projectName,
      '{{CLOUDFLARE_ACCOUNT_ID}}': ctx.cloudflareAccountId || "your-account-id",
      '{{D1_BINDING_0}}': ctx.databaseBinding || "DB",
      '{{D1_DATABASE_BINDING}}': ctx.databaseBinding || "DB",
      '{{D1_DATABASE_ID_0}}': ctx.databaseId || "your-database-id",
      '{{D1_DATABASE_ID}}': ctx.databaseId || "your-database-id"
    };

  // Explicit target files array
  const TARGET_FILES = ['package.json', 'README.md', 'wrangler.jsonc'];

    await tools.placeholders.replaceAll(PLACEHOLDER_MAP, TARGET_FILES);

    // Apply IDE preset if specified
    if (ctx.ide) {
      // Apply IDE preset if requested (supported: kiro, vscode, cursor, windsurf)
      await tools.ide.applyPreset(ctx.ide);
    }

    // Cloudflare D1 specific setup
    tools.logger.info('Configuring Cloudflare Worker with D1 database...');

    // Ensure wrangler.jsonc has proper structure and compatibility date
    await tools.json.set('wrangler.jsonc', 'compatibility_date', new Date().toISOString().split('T')[0]);

    // Validate D1 database configuration
    const wranglerConfig = await tools.json.get('wrangler.jsonc');
    if (!wranglerConfig.d1_databases || wranglerConfig.d1_databases.length === 0) {
      tools.logger.info('Adding D1 database configuration structure...');
      await tools.json.set('wrangler.jsonc', 'd1_databases', []);
    }

    tools.logger.info('Template conversion completed successfully!');

  } catch (error) {
    tools.logger.error('Setup failed:', error.message);
    throw error;
  }
}