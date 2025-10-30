import { main } from '../src/bin/cli.js';
import { join } from 'node:path';

async function runDryRun(cwd) {
  const origOut = process.stdout.write;
  const origErr = process.stderr.write;
  let out = '';
  let err = '';
  process.stdout.write = (c) => { out += c instanceof Buffer ? c.toString() : String(c); return true; };
  process.stderr.write = (c) => { err += c instanceof Buffer ? c.toString() : String(c); return true; };
  try {
    process.chdir(cwd);
    await main(['--dry-run']);
    return { code: 0, stdout: out, stderr: err };
  } catch (e) {
    return { code: 1, stdout: out, stderr: (e && e.stack) ? e.stack : String(e) };
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
}

function testRegex(out, rx) {
  const r = new RegExp(rx, 'i');
  return r.test(out);
}

(async () => {
  const fixtures = {
    generic: join(process.cwd(), 'test/fixtures/input-projects/generic-node-project'),
    cf1: join(process.cwd(), 'test/fixtures/input-projects/cf-d1-project'),
    vite: join(process.cwd(), 'test/fixtures/input-projects/vite-react-project')
  };

  const checks = [
    { cwd: 'generic', desc: 'node_modules removal', rx: 'node_modules[\\s\\S]*?(?:will|would) be removed' },
    { cwd: 'cf1', desc: 'package-lock removal', rx: 'package-lock\\.json[\\s\\S]*?(?:will|would) be removed' },
    { cwd: 'vite', desc: 'yarn.lock removal', rx: 'yarn\\.lock[\\s\\S]*?(?:will|would) be removed' },
    { cwd: 'vite', desc: 'dist directory removal', rx: 'dist[\\s\\S]*?directory[\\s\\S]*?(?:will|would) be removed' },
    { cwd: 'cf1', desc: '.wrangler removal', rx: '\\.(?:wrangler)[\\s\\S]*?directory[\\s\\S]*?(?:will|would) be removed' },
    { cwd: 'generic', desc: 'pnpm-lock mention', rx: 'pnpm-lock\\.yaml.*cleanup.*rule' },
    { cwd: 'generic', desc: '.git preserved', rx: '\\.(?:git)[\\s\\S]*?(?:will|would) be preserved' },
    { cwd: 'cf1', desc: '.env removal', rx: '\\.env.*(?:will|would) be removed' }
  ];

  for (const key of Object.keys(fixtures)) {
    console.log('\n=== Fixture:', key, '===');
    const res = await runDryRun(fixtures[key]);
    console.log('Exit code:', res.code, 'stdout length:', res.stdout.length);
    // print short snippet
    console.log('Snippet:\n', res.stdout.slice(0, 800));
    for (const c of checks.filter(x => x.cwd === key)) {
      const ok = testRegex(res.stdout, c.rx);
      console.log(`${c.desc}: ${ok ? 'PASS' : 'FAIL'}`);
    }
  }
})();
