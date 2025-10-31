import { main as cliMain } from '../src/bin/cli.js';
import { join } from 'path';

async function run() {
  const originalStdout = process.stdout.write;
  const originalStderr = process.stderr.write;
  let stdout = '';
  let stderr = '';
  process.stdout.write = (chunk, encoding, cb) => { stdout += chunk instanceof Buffer ? chunk.toString() : String(chunk); if (typeof cb === 'function') cb(); return true; };
  process.stderr.write = (chunk, encoding, cb) => { stderr += chunk instanceof Buffer ? chunk.toString() : String(chunk); if (typeof cb === 'function') cb(); return true; };
  const originalCwd = process.cwd();
  try {
    process.chdir(join(process.cwd(), 'test/fixtures/input-projects/generic-node-project'));
    let code = 0;
    try {
      await cliMain(['--type', 'cf-d1', '--dry-run', '--silent']);
    } catch (err) {
      code = err && err.code ? err.code : 1;
      stderr += (err && err.message) ? (`${err.message}\n`) : (`${String(err)}\n`);
    }
    console.log('EXIT:', code);
    console.log('---STDOUT---');
    console.log(stdout);
    console.log('---STDERR---');
    console.log(stderr);
    console.log('---COMBINED MATCH---');
    console.log(/(wrangler|cf-d1|cloudflare)/i.test((stdout || '') + '\n' + (stderr || '')));
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    try { process.chdir(originalCwd); } catch (e) { }
  }
}

run().catch(e => { console.error(e); process.exit(1) });
