import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { ConversionEngine } from '../src/lib/engine.js';
import { detectTopLevelSideEffects, hasSetupExport } from '../src/lib/utils/fixture-safety.js';
import { tmpdir } from 'node:os';
import { mkdtemp, writeFile } from 'node:fs/promises';

const fixtures = [
  'test/fixtures/input-projects/cf-d1-project',
  'test/fixtures/input-projects/vite-react-project'
];

async function run() {
  const engine = new ConversionEngine();

  for (const f of fixtures) {
    console.log('---');
    console.log('Fixture:', f);
    try {
      // Change into fixture directory so engine file reads resolve correctly
      const absCwd = join(process.cwd(), f);
      const prevCwd = process.cwd();
      process.chdir(absCwd);
      // Run analyze and plan generation in dry-run mode
      const analysis = await engine.analyzeProject({});
      const plan = await engine.createConversionPlan(analysis, { 'dry-run': true });
      // Restore cwd after plan generation
      process.chdir(prevCwd);

      const createAction = plan.actions.find(a => a.type === 'create' && a.file === '_setup.mjs');
      if (!createAction) {
        console.log('_setup.mjs not generated for', f);
        continue;
      }

      // Save to temp file for inspection
      const tempDir = await mkdtemp(join(tmpdir(), 'mt-diag-'));
      const outPath = join(tempDir, '_setup.mjs');
      await writeFile(outPath, createAction.content, 'utf8');
      console.log('Generated _setup.mjs saved to', outPath);

      // Run detector on the generated content
      const content = createAction.content;
      const warnings = detectTopLevelSideEffects(content);
      const hasExport = hasSetupExport(content);
      console.log('detector warnings:', warnings.length ? warnings : '[]');
      console.log('has setup export:', hasExport);

      // Print first 100 lines for quick review
      const lines = content.split('\n').slice(0, 200);
      console.log('\n--- _setup.mjs preview (first 200 lines) ---');
      console.log(lines.join('\n'));

    } catch (err) {
      console.error('Error processing fixture', f, err);
    }
  }
}

run().catch(e => { console.error(e); process.exit(1); });
