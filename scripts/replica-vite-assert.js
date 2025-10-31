import assert from 'node:assert';
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
    return { code, stdout: stdout.trim(), stderr: stderr.trim() };
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    try { process.chdir(originalCwd); } catch (e) { }
  }
}

(async () => {
  const cwd = join(process.cwd(), 'test/fixtures/input-projects/generic-node-project');
  const res = await runCLI(['--type', 'vite-react', '--dry-run'], { cwd });
  console.log('=== RESULT ===');
  console.log('code:', res.code);
  console.log('stderr:', JSON.stringify(res.stderr));
  try {
    assert.strictEqual(res.code, 1, 'Should exit with error when vite.config.js missing for vite-react');
    console.log('exit code assertion passed');
  } catch (e) { console.error('Exit code assertion failed:', e.message); }
  try {
    assert.match(res.stderr, /vite\.config\.js.*not found.*vite-react.*project/i, 'Should show vite.config.js missing error');
    console.log('match 1 passed');
  } catch (e) { console.error('match 1 failed:', e.message); }
  try {
    assert.match(res.stderr, /Required.*Vite.*configuration.*missing/i, 'Should explain Vite config requirement');
    console.log('match 2 passed');
  } catch (e) { console.error('match 2 failed:', e.message); }
})();
