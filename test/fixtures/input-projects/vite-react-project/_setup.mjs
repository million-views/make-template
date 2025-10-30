export default async function setup({ ctx, tools }) {
  try {
    tools.logger.info(`Setting up vite-react project: ${ctx.projectName}`);

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
    // BASE_URL: ctx.baseUrl || "/"
    // HTML_TITLE: ctx.projectName

    // Explicit mapping object for tests and runtime
    const PLACEHOLDER_MAP = {
      '{{PROJECT_NAME}}': ctx.projectName,
      '{{PROJECT_DESCRIPTION}}': ctx.projectDescription || ctx.projectName,
      '{{AUTHOR}}': ctx.author || "Your Name",
      '{{README_TITLE}}': ctx.projectName,
      '{{BASE_URL}}': ctx.baseUrl || "/",
      '{{HTML_TITLE}}': ctx.projectName
    };

  // Explicit target files array
  const TARGET_FILES = ['package.json', 'README.md', 'vite.config.js', 'index.html'];

    await tools.placeholders.replaceAll(PLACEHOLDER_MAP, TARGET_FILES);

    // Apply IDE preset if specified
    if (ctx.ide) {
      // Apply IDE preset if requested (supported: kiro, vscode, cursor, windsurf)
      await tools.ide.applyPreset(ctx.ide);
    }

    // Vite React specific setup
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
    tools.logger.info('Configuring HTML title and meta tags...');

    tools.logger.info('Template conversion completed successfully!');

  } catch (error) {
    tools.logger.error('Setup failed:', error.message);
    throw error;
  }
}