// Minimal fixture safety utilities — do not execute fixture code.
// Purpose: read _setup.mjs and other template files as text and perform
// lightweight static checks to detect obvious import-time side-effects.
// Keep implementation dependency-free and conservative.

import { readFile } from 'node:fs/promises';

export async function readFileAsText(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    return { ok: true, content };
  } catch (err) {
    return { ok: false, error: err };
  }
}

// Detect simple suspicious patterns that indicate import-time side-effects.
// This is intentionally conservative — we only look for common sync exec calls
// or child_process usage. Do NOT attempt to be a full JS parser here.
export function detectTopLevelSideEffects(sourceText) {
  if (!sourceText) return [];
  const warnings = [];

  const patterns = [
    { rx: /exec(Sync)?\s*\(/, msg: 'Uses exec or execSync (possible shell command at import-time)' },
    { rx: /spawn(Sync)?\s*\(/, msg: 'Uses spawn or spawnSync (possible child process at import-time)' },
    { rx: /require\s*\(\s*['\"]child_process['\"]\s*\)/, msg: 'Requires child_process' },
    { rx: /from\s+['\"]child_process['\"]/, msg: 'Imports child_process' }
  ];

  for (const p of patterns) {
    if (p.rx.test(sourceText)) warnings.push(p.msg);
  }

  // Detect top-level await (rough signal of top-level async evaluation)
  if (/^\s*await\s+/m.test(sourceText)) {
    warnings.push('Top-level await detected (may perform runtime actions)');
  }

  // Detect direct npm invocation strings (heuristic)
  if (/npm\s+install/.test(sourceText)) {
    warnings.push('Contains "npm install" invocation text');
  }

  return warnings;
}

// Extract a minimal signature check: look for "export default async function setup"
export function hasSetupExport(sourceText) {
  if (!sourceText) return false;
  return /export\s+default\s+async\s+function\s+setup\s*\(/.test(sourceText);
}
