import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { main as cliMain } from '../src/bin/cli.js';
import { readFileAsText, detectTopLevelSideEffects, hasSetupExport } from '../src/lib/utils/fixture-safety.js';

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const ent of entries) {
    const srcPath = path.join(src, ent.name);
    const destPath = path.join(dest, ent.name);
    if (ent.isDirectory()) await copyDir(srcPath, destPath);
    else await fs.copyFile(srcPath, destPath);
  }
}

async function run() {
  const fixturesRoot = path.join(__dirname, '../test/fixtures/input-projects');
  const fixture = path.join(fixturesRoot, 'cf-d1-project');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'inspect-setup-'));
  const working = path.join(tmp, 'working');
  console.log('copying fixture to', working);
  await copyDir(fixture, working);

  console.log('running CLI --yes in', working);
  try {
    await cliMain(['--silent', '--yes']);
  } catch (err) {
    // CLI may throw for non-zero exit; ignore for diagnostic
    console.error('CLI error (ignored):', err && err.message);
  }

  const setupPath = path.join(working, '_setup.mjs');
  const read = await readFileAsText(setupPath);
  if (!read.ok) {
    console.error('Failed to read generated _setup.mjs:', read.error);
    process.exit(2);
  }

  console.log('\n=== _setup.mjs content preview ===\n');
  console.log(read.content.slice(0, 2000));

  const warnings = detectTopLevelSideEffects(read.content);
  console.log('\n=== Detector warnings ===\n', warnings);
  console.log('\nHas setup export?', hasSetupExport(read.content));

  // Now simulate restoration: copy working to template dir and run --restore
  const templateDir = path.join(tmp, 'template');
  await copyDir(working, templateDir);
  console.log('\nRunning restore in template dir:', templateDir);
  try {
    await cliMain(['--silent', '--restore', '--yes'], { argv: [], cwd: templateDir });
  } catch (err) {
    console.error('Restore CLI error (ignored):', err && err.message);
  }

  const restoredSetupPath = path.join(templateDir, '_setup.mjs');
  const read2 = await readFileAsText(restoredSetupPath);
  console.log('\n=== Restored _setup.mjs preview ===\n');
  if (read2.ok) {
    console.log(read2.content.slice(0, 2000));
    console.log('\n=== Restored detector warnings ===\n', detectTopLevelSideEffects(read2.content));
    console.log('Has setup export?', hasSetupExport(read2.content));
  } else {
    console.error('Could not read restored _setup.mjs:', read2.error);
  }

  // cleanup
  // await fs.rm(tmp, { recursive: true, force: true });
}

run().catch(err => { console.error(err); process.exit(1); });
