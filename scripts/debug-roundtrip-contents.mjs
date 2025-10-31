import path from 'node:path';
import fs from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { copyFile } from 'node:fs/promises';
import { main as cliMain } from '../src/bin/cli.js';

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) await copyDir(s, d); else await fs.copyFile(s, d);
  }
}

(async () => {
  const fixture = 'test/fixtures/input-projects/cf-d1-project';
  const temp = await mkdtemp(path.join(tmpdir(), 'mt-debug-'));
  const work = path.join(temp, 'work');
  await copyDir(fixture, work);
  console.log('Workdir:', work);
  process.chdir(work);

  console.log('\n--- Before conversion: package.json ---');
  console.log(await fs.readFile('package.json', 'utf8'));

  console.log('\nRunning conversion');
  try { await cliMain(['--yes', '--silent']); } catch (e) { console.error('convert err', e); }

  console.log('\n--- After conversion (working): package.json ---');
  console.log(await fs.readFile('package.json', 'utf8'));

  const undo = await fs.readFile('.template-undo.json', 'utf8');
  console.log('\n--- .template-undo.json ---');
  console.log(undo);

  // copy working to template
  const templateDir = path.join(temp, 'template');
  await copyDir(work, templateDir);
  process.chdir(templateDir);

  console.log('\n--- Template dir package.json (before restore) ---');
  console.log(await fs.readFile('package.json', 'utf8'));

  console.log('\nRunning restore');
  try { await cliMain(['--restore', '--yes', '--silent']); } catch (e) { console.error('restore err', e); }

  console.log('\n--- After restore (template dir): package.json ---');
  console.log(await fs.readFile('package.json', 'utf8'));

  console.log('\nTemplate _setup.mjs preview head:');
  console.log(await fs.readFile('_setup.mjs', 'utf8')).slice(0, 1000);

})();
