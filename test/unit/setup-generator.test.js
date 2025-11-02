import { test, describe } from 'node:test';
import assert from 'node:assert';
import { SetupGenerator } from '../../src/lib/generators/setup-generator.js';

describe('SetupGenerator', () => {
  let generator;

  test('should instantiate SetupGenerator', () => {
    generator = new SetupGenerator();
    assert(generator instanceof SetupGenerator);
  });

  describe('generateSetup', () => {
    test('should generate setup script with correct placeholder mapping format', async () => {
      generator = new SetupGenerator();
      const analysis = {
        projectType: 'generic',
        placeholders: [
          { name: 'PROJECT_NAME', placeholder: '{{PROJECT_NAME}}', files: ['package.json'] },
          { name: 'AUTHOR', placeholder: '{{AUTHOR}}', files: ['package.json'] }
        ]
      };
      const options = {};

      const result = await generator.generateSetup(analysis, options);

      // Should use token names as keys, not full placeholders
      assert.match(result, /'PROJECT_NAME': ctx\.inputs\.PROJECT_NAME \|\| ctx\.projectName/);
      assert.match(result, /'AUTHOR': ctx\.inputs\.AUTHOR \|\| ctx\.author \|\| "Your Name"/);

      // Should not use full placeholder syntax as keys
      assert.doesNotMatch(result, /'{{PROJECT_NAME}}':/);
      assert.doesNotMatch(result, /'{{AUTHOR}}':/);

      // Should include tools.placeholders.replaceAll call
      assert.match(result, /tools\.placeholders\.replaceAll/);
    });

    test('should generate setup script with correct fallback values', async () => {
      generator = new SetupGenerator();
      const analysis = {
        projectType: 'generic',
        placeholders: [
          { name: 'HTML_TITLE', placeholder: '{{HTML_TITLE}}', files: ['index.html'] },
          { name: 'BASE_URL', placeholder: '{{BASE_URL}}', files: ['vite.config.js'] }
        ]
      };
      const options = {};

      const result = await generator.generateSetup(analysis, options);

      // Should use correct fallbacks
      assert.match(result, /'HTML_TITLE': ctx\.inputs\.HTML_TITLE \|\| "My App"/);
      assert.match(result, /'BASE_URL': ctx\.inputs\.BASE_URL \|\| ctx\.baseUrl \|\| "\/"/);
    });

    test('should include target files array', async () => {
      generator = new SetupGenerator();
      const analysis = {
        projectType: 'generic',
        placeholders: [
          { name: 'PROJECT_NAME', placeholder: '{{PROJECT_NAME}}', files: ['package.json', 'README.md'] }
        ]
      };
      const options = {};

      const result = await generator.generateSetup(analysis, options);

      assert.match(result, /const TARGET_FILES = \['package\.json', 'README\.md'\];/);
    });

    test('should generate project-specific setup code', async () => {
      generator = new SetupGenerator();
      const analysis = {
        projectType: 'vite-react',
        placeholders: []
      };
      const options = {};

      const result = await generator.generateSetup(analysis, options);

      assert.match(result, /Vite React specific setup/);
      assert.match(result, /package\.json.*scripts\.dev/);
    });
  });

  describe('getPlaceholderFallback', () => {
    test('should return correct fallback for known tokens', () => {
      generator = new SetupGenerator();

      assert.equal(generator.getPlaceholderFallback('PROJECT_NAME'), 'ctx.projectName');
      assert.equal(generator.getPlaceholderFallback('HTML_TITLE'), '"My App"');
      assert.equal(generator.getPlaceholderFallback('AUTHOR'), 'ctx.author || "Your Name"');
      assert.equal(generator.getPlaceholderFallback('BASE_URL'), 'ctx.baseUrl || "/"');
    });

    test('should return default fallback for unknown tokens', () => {
      generator = new SetupGenerator();

      assert.equal(generator.getPlaceholderFallback('UNKNOWN_TOKEN'), 'ctx.projectName');
    });
  });
});