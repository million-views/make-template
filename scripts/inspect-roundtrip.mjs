import path from 'node:path';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { main as cliMain } from '../src/bin/cli.js';
import { detectTopLevelSideEffects, hasSetupExport, readFileAsText } from '../src/lib/utils/fixture-safety.js';

const fixtures = [
  'test/fixtures/input-projects/cf-d1-project',
  'test/fixtures/input-projects/vite-react-project'
];

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function runFixture(fixture) {
  console.log('===', fixture);
  const tempDir = await mkdtemp(path.join(tmpdir(), 'mt-rt-'));
  const working = path.join(tempDir, 'working');
  const template = path.join(tempDir, 'template');

  await copyDirectory(fixture, working);

  // Run convert
  try {
    const originalCwd = process.cwd();
    process.chdir(working);
    console.log('Running conversion...');
    await cliMain(['--yes', '--silent']);
  } catch (e) {
    console.error('Conversion error', e);
  }

  // Copy working to template
  await fs.mkdir(template, { recursive: true });
  await copyDirectory(working, template);

  // Run restore
  try {
    process.chdir(template);
    console.log('Running restore...');
    await cliMain(['--restore', '--yes', '--silent']);
  } catch (e) {
    console.error('Restore error', e);
  }

  // Read restored files
  const setupPath = path.join(template, '_setup.mjs');
  const packagePath = path.join(template, 'package.json');
  try {
    const setupRead = await readFileAsText(setupPath);
    console.log('_setup.mjs exists:', setupRead.ok);
    if (setupRead.ok) {
      const warnings = detectTopLevelSideEffects(setupRead.content) || [];
      console.log('detector warnings count:', warnings.length);
      if (warnings.length) console.log('warnings:', warnings);
      console.log('has export:', hasSetupExport(setupRead.content));
      console.log('--- _setup.mjs head ---');
      console.log(setupRead.content.split('\n').slice(0, 200).join('\n'));
    }
  } catch (e) {
    console.error('Error reading _setup.mjs', e);
  }

  try {
    const pkg = JSON.parse(await fs.readFile(packagePath, 'utf8'));
    console.log('restored package.name:', pkg.name);
    console.log('restored package.description:', pkg.description);
  } catch (e) {
    console.error('Error reading package.json', e);
  }

  // Preserve tempDir for inspection and restore original cwd before exit
  try { process.chdir(originalCwd); } catch (e) { }
  console.log('Preserved temp dir for inspection:', tempDir);
}

(async () => {
  for (const f of fixtures) {
    const abs = path.join(process.cwd(), f);
    const exists = await fs.access(abs).then(() => true).catch(() => false);
    if (!exists) {
      console.log('fixture missing', abs);
      continue;
    }
    await runFixture(abs);
  }
})();
