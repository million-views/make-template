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
    return { code, stdout, stderr };
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    try { process.chdir(originalCwd); } catch (e) { }
  }
}

(async () => {
  const cwd = join(process.cwd(), 'test/fixtures/input-projects/generic-node-project');
  const res = await runCLI(['--type', 'vite-react', '--dry-run'], { cwd });
  console.log('EXIT CODE:', res.code);
  console.log('STDERR RAW:\n', res.stderr);
  const r1 = /vite\.config\.js.*not found.*vite-react.*project/i;
  const r2 = /Required.*Vite.*configuration.*missing/i;
  console.log('MATCH 1:', r1.test(res.stderr));
  console.log('MATCH 2:', r2.test(res.stderr));
})();
