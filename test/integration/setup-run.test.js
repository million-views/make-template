import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'path';
import url from 'url';
import fs from 'fs/promises';
import os from 'os';

import { createMockTools } from '../mock-tools.js';
import { copyFixtureToTemp } from '../helpers/temp-fixture.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

test('run generated _setup.mjs in temp fixture copy', async () => {
  const fixtureRel = path.join('test', 'fixtures', 'input-projects', 'generic-node-project');
  const tmpBase = os.tmpdir();
  const tmp = await copyFixtureToTemp(fixtureRel, tmpBase);
  try {
    const capture = { logs: [], calls: [] };
    const tools = createMockTools(tmp, capture);

    const ctx = {
      projectName: 'temp-project',
      env: {},
      baseUrl: '/tmp/',
      inputs: {
        PROJECT_NAME: 'temp-project',
        AUTHOR: 'Test Author'
      }
    };

    const setupPath = path.join(tmp, '_setup.mjs');
    // Ensure setup exists
    await fs.access(setupPath);

    const m = await import(url.pathToFileURL(setupPath).href);
    await m.default({ ctx, tools });

    // Verify that package.json version was set by the generated setup (generator sets to 1.0.0)
    const pkgPath = path.join(tmp, 'package.json');
    const pkgTxt = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgTxt);
    assert.equal(pkg.version, '1.0.0');

    // ensure placeholder replacement was invoked at least once
    assert.ok(capture.calls.some(c => c.fn === 'placeholders.replaceAll'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
