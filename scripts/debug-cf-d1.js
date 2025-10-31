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
    let code = 0;
    try {
      await cliMain(args);
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
  const res = await runCLI(['--type', 'cf-d1', '--dry-run'], { cwd });
  console.log('EXIT:', res.code);
  console.log('STDOUT:\n', res.stdout);
  console.log('STDERR:\n', res.stderr);
})();
