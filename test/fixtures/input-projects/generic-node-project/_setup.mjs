export default async function setup({ ctx, tools }) {
  try {
    tools.logger.info(`Setting up generic project: ${ctx.projectName}`);

    // Replace placeholders using tools.placeholders.replaceAll
    // Placeholder mapping (token names as keys) for reference in generated script:
    //
    // PROJECT_NAME: ctx.inputs.PROJECT_NAME || ctx.projectName
    // PROJECT_DESCRIPTION: ctx.inputs.PROJECT_DESCRIPTION || ctx.projectDescription || ctx.projectName
    // AUTHOR: ctx.inputs.AUTHOR || ctx.author || "Your Name"
    // REPOSITORY_URL: ctx.inputs.REPOSITORY_URL || `https://github.com/user/${ctx.projectName}`
    // README_TITLE: ctx.inputs.README_TITLE || ctx.projectName

    // Explicit mapping object for tests and runtime
    const PLACEHOLDER_MAP = {
      'PROJECT_NAME': ctx.inputs.PROJECT_NAME || ctx.projectName,
      'PROJECT_DESCRIPTION': ctx.inputs.PROJECT_DESCRIPTION || ctx.projectDescription || ctx.projectName,
      'AUTHOR': ctx.inputs.AUTHOR || ctx.author || "Your Name",
      'REPOSITORY_URL': ctx.inputs.REPOSITORY_URL || `https://github.com/user/${ctx.projectName}`,
      'README_TITLE': ctx.inputs.README_TITLE || ctx.projectName
    };

  // Explicit target files array
  const TARGET_FILES = ['package.json', 'README.md'];

    await tools.placeholders.replaceAll(PLACEHOLDER_MAP, TARGET_FILES);

    // Apply IDE preset if specified
    if (ctx.ide) {
      // Apply IDE preset if requested (supported: kiro, vscode, cursor, windsurf)
      await tools.ide.applyPreset(ctx.ide);
    }

    // Generic Node.js project setup
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
    }

    tools.logger.info('Template conversion completed successfully!');

  } catch (error) {
    tools.logger.error('Setup failed:', error.message);
    throw error;
  }
}