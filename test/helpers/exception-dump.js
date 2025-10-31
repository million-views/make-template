import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import util from 'node:util';
const dumpPath = join(tmpdir(), `make-template-exception-${Date.now()}.log`);
function dump(obj, prefix = '') {
  try { writeFileSync(dumpPath, prefix + util.inspect(obj, { depth: 10 }) + '\n', { flag: 'a' }); } catch (e) { }
}
process.on('uncaughtException', (err) => {
  dump(err, 'UNCUGHT EXCEPTION:\n');
});
process.on('unhandledRejection', (reason) => {
  dump(reason, 'UNHANDLED REJECTION:\n');
});
export default dumpPath;
