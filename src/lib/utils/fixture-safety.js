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
    { rx: /\bexec(Sync)?\s*\(/, msg: 'Uses exec or execSync (possible shell command at import-time)' },
    { rx: /\bspawn(Sync)?\s*\(/, msg: 'Uses spawn or spawnSync (possible child process at import-time)' },
    { rx: /\brequire\s*\(\s*['\"]child_process['\"]\s*\)/, msg: 'Requires child_process' },
    { rx: /\bfrom\s+['\"]child_process['\"]/, msg: 'Imports child_process' }
  ];

  for (const p of patterns) {
    // Strip block and line comments first to avoid matching commented-out
    // examples in generated scripts.
    let sanitized = sourceText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    // Remove quoted string contents (single, double and template) so
    // patterns inside string literals do not trigger false positives.
    sanitized = sanitized.replace(/(['"`])(?:(?!\1)[\\\s\S])*\1/g, '');
    // Additionally, only flag occurrences that appear at top-level. We do a
    // conservative check: ensure the matched token is not on the same line as
    // a function declaration or an arrow function (which suggests it's inside
    // a function body) and not within our placeholder mapping comment blocks.
    const lines = sanitized.split(/\r?\n/);
    for (const line of lines) {
      if (p.rx.test(line)) {
        // ignore lines that contain 'function' or '=>' before the match
        const idx = line.search(p.rx);
        const prefix = line.slice(0, idx);
        if (/function\b/.test(prefix) || /=>/.test(prefix)) continue;
        // ignore placeholder mapping comment blocks often included in
        // generated _setup.mjs files which show example placeholders or
        // direct references to tools.placeholders.replaceAll which may
        // include example exec/spawn strings inside comments.
        if (/placeholder mapping/i.test(line) || /PLACEHOLDER_MAP/.test(line) || /tools\.placeholders/.test(line)) continue;
        warnings.push(p.msg);
        break;
      }
    }
  }

  if (warnings.length > 0) {
    // Debug: surface matched warnings to aid triage
    try { console.warn('fixture-safety: matched warnings ->', warnings); } catch (e) { }
    return warnings;
  }
  // No suspicious patterns detected. Return falsy (null) so callers and
  // tests that expect a falsy value can treat this as 'no warnings'.
  return null;
}

// Extract a minimal signature check: look for "export default async function setup"
export function hasSetupExport(sourceText) {
  if (!sourceText) return false;
  return /export\s+default\s+async\s+function\s+setup\s*\(/.test(sourceText);
}
