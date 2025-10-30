import { main } from '../src/bin/cli.js';
import { join } from 'node:path';

(async () => {
  const cwd = join(process.cwd(), 'test/fixtures/input-projects/generic-node-project');
  const origOut = process.stdout.write;
  const origErr = process.stderr.write;
  let out = '';
  let err = '';
  process.stdout.write = (c) => { out += c instanceof Buffer ? c.toString() : String(c); return true; };
  process.stderr.write = (c) => { err += c instanceof Buffer ? c.toString() : String(c); return true; };
  try {
    process.chdir(cwd);
    await main(['--dry-run']);
    console.log('EXIT 0');
  } catch (e) {
    console.error('THREW', e && e.stack ? e.stack : e);
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
    console.log('---STDOUT---');
    console.log(out);
    console.log('---STDERR---');
    console.log(err);
    console.log('---MATCHES---');
    console.log('.git preserved regex:', /\.git.*directory.*(?:will|would) be preserved/i.test(out));
    console.log('git history preserved regex:', /git.*history.*preserved/i.test(out));
  }
})();
