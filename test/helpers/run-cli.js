import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function runCLI(args = [], options = {}) {
  const cwd = options.cwd || process.cwd();
  const runArgs = Array.isArray(args) ? [...args] : [];
  if (options.silent !== false && !runArgs.includes('--silent')) runArgs.push('--silent');

  const cliPath = path.resolve(__dirname, '../../src/bin/cli.js');

  const result = spawnSync(process.execPath, [cliPath, ...runArgs], {
    cwd,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return {
    code: typeof result.status === 'number' ? result.status : 1,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim()
  };
}
