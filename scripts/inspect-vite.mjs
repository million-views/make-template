import path from 'node:path';
import fs from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { copyFile, mkdir } from 'node:fs/promises';
import { main as cliMain } from '../src/bin/cli.js';
import { join } from 'node:path';

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
  const fixture = 'test/fixtures/input-projects/vite-react-project';
  const temp = await mkdtemp(join(tmpdir(), 'mt-inspect-vite-'));
  const work = join(temp, 'work');
  await copyDir(fixture, work);
  process.chdir(work);
  console.log('Converting in', work);
  try {
    await cliMain(['--yes', '--silent']);
  } catch (e) { console.error('convert err', e); }

  const undoPath = join(work, '.template-undo.json');
  try {
    const content = await fs.readFile(undoPath, 'utf8');
    console.log('UNDO LOG:\n', content);
  } catch (e) {
    console.error('Cannot read undo log', e.message);
  }

  // Run restore
  try {
    process.chdir(work);
    await cliMain(['--restore', '--yes', '--silent']);
  } catch (e) { console.error('restore err', e); }

  try {
    const pkg = JSON.parse(await fs.readFile(join(work, 'package.json'), 'utf8'));
    console.log('restored package.json:', pkg);
  } catch (e) { console.error('Cannot read restored package.json', e.message); }

  console.log('Preserving temp dir:', temp);
})();
