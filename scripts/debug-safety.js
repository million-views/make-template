import { main as cliMain } from '../src/bin/cli.js';
import { join } from 'path';
import { mkdtemp, writeFile } from 'fs/promises';
import { tmpdir } from 'os';

async function runCLI(args = [], options = {}) {
  const originalStdout = process.stdout.write;
  const originalStderr = process.stderr.write;
  let stdout = '';
  let stderr = '';
  process.stdout.write = (chunk, encoding, cb) => { stdout += chunk instanceof Buffer ? chunk.toString() : String(chunk); if (typeof cb === 'function') cb(); return true; };
  process.stderr.write = (chunk, encoding, cb) => { stderr += chunk instanceof Buffer ? chunk.toString() : String(chunk); if (typeof cb === 'function') cb(); return true; };
  const originalCwd = process.cwd();
  try {
    if (options.cwd) process.chdir(options.cwd);
    const runArgs = Array.isArray(args) ? [...args] : [];
    if (options.silent !== false && !runArgs.includes('--silent')) runArgs.push('--silent');
    let code = 0;
    try {
      await cliMain(runArgs);
    } catch (err) {
      code = err && err.code ? err.code : 1;
    }
    return { code, stdout: stdout.trim(), stderr: stderr.trim() };
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    try { process.chdir(originalCwd); } catch (e) { }
  }
}

async function debug() {
  console.log('Running scenario: package.json missing');
  let res = await runCLI(['--dry-run'], { cwd: join(process.cwd(), 'test/fixtures') });
  console.log(res);

  console.log('\nRunning scenario: invalid package.json');
  let temp = await mkdtemp(join(tmpdir(), 'mt-'));
  await writeFile(join(temp, 'package.json'), '{ invalid json }');
  res = await runCLI(['--dry-run'], { cwd: temp });
  console.log(res);

  console.log('\nRunning scenario: minimal package.json missing fields');
  temp = await mkdtemp(join(tmpdir(), 'mt-'));
  await writeFile(join(temp, 'package.json'), '{}');
  res = await runCLI(['--dry-run'], { cwd: temp });
  console.log(res);

  console.log('\nRunning scenario: valid package.json');
  res = await runCLI(['--dry-run'], { cwd: join(process.cwd(), 'test/fixtures/input-projects/generic-node-project') });
  console.log(res);
}

debug().catch(e => { console.error(e); process.exit(1); });
