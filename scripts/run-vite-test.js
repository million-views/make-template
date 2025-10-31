import { main as cliMain } from '../src/bin/cli.js';
import { join } from 'path';

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
    // persist to files for inspection
    const { writeFile } = await import('fs/promises');
    const outPath = new URL('../test-output/vite-forced-out.txt', import.meta.url);
    const errPath = new URL('../test-output/vite-forced-err.txt', import.meta.url);
    await writeFile(outPath, stdout || '');
    await writeFile(errPath, stderr || '');
    return { code, stdout, stderr };
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    try { process.chdir(originalCwd); } catch (e) { }
  }
}

(async () => {
  const cwd = join(process.cwd(), 'test/fixtures/input-projects/generic-node-project');
  await runCLI(['--type', 'vite-react', '--dry-run'], { cwd });
})().catch(e => { console.error(e); process.exit(1); });
