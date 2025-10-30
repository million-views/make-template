import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { main } = await import('../src/bin/cli.js');
try {
  process.chdir(path.join(__dirname, '../test/fixtures/input-projects/cf-turso-project'));
  await main(['--dry-run']);
  console.log('CLI completed successfully');
} catch (err) {
  console.error('CLI threw error:', err && err.code ? err.code : 'no-code', err && err.stack ? err.stack : err);
}
