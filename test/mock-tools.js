import fs from 'fs/promises';
import path from 'path';

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripComments(input) {
  // Remove /* */ comments
  let out = input.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove // comments
  out = out.replace(/(^|[^:\\])\/\/.*$/gm, '$1');
  return out;
}

function setDotPath(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i === parts.length - 1) {
      cur[p] = value;
    } else {
      if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = {};
      cur = cur[p];
    }
  }
}

export function createMockTools(workDir, capture = { logs: [], calls: [] }) {
  const safeResolve = (file) => {
    const candidate = path.resolve(workDir, file);
    if (candidate === workDir || candidate.startsWith(workDir + path.sep)) return candidate;
    throw new Error(`Refusing to operate outside of workDir: ${file}`);
  };

  const logger = {
    info: (...args) => { capture.logs.push({ level: 'info', args }); },
    warn: (...args) => { capture.logs.push({ level: 'warn', args }); },
    error: (...args) => { capture.logs.push({ level: 'error', args }); },
  };

  const placeholders = {
    async replaceAll(map = {}, files = []) {
      const result = { filesProcessed: [], replacements: 0 };
      for (const f of files) {
        const p = safeResolve(f);
        let txt = await fs.readFile(p, 'utf8');
        for (const rawKey of Object.keys(map || {})) {
          const val = map[rawKey];
          // Try a few likely key formats: raw, {{KEY}}, __KEY__, %KEY%
          const candidates = [];
          const key = String(rawKey);
          candidates.push(key);
          // if key looks like NAME (no braces), also add formatted
          const bare = key.replace(/^[{}_%_]+|[{}_%_]+$/g, '');
          candidates.push(`{{${bare}}}`);
          candidates.push(`__${bare}__`);
          candidates.push(`%${bare}%`);

          for (const pat of candidates) {
            const re = new RegExp(escapeRegExp(pat), 'g');
            const matches = txt.match(re);
            const count = (matches && matches.length) || 0;
            if (count > 0) {
              txt = txt.replace(re, String(val));
              result.replacements += count;
            }
          }
        }
        await fs.writeFile(p, txt, 'utf8');
        result.filesProcessed.push(f);
      }
      capture.calls.push({ fn: 'placeholders.replaceAll', args: [map, files], result });
      return result;
    }
  };

  const json = {
    async get(filePath) {
      const p = safeResolve(filePath);
      const raw = await fs.readFile(p, 'utf8');
      const cleaned = stripComments(raw);
      return JSON.parse(cleaned);
    },
    async set(filePath, dotPath, value) {
      const p = safeResolve(filePath);
      let obj = {};
      try { obj = await json.get(filePath); } catch (e) { /* start fresh */ }
      setDotPath(obj, dotPath, value);
      await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
      capture.calls.push({ fn: 'json.set', args: [filePath, dotPath, value] });
    }
  };

  const ide = {
    async applyPreset(preset) {
      capture.calls.push({ fn: 'ide.applyPreset', args: [preset] });
    }
  };

  return { placeholders, json, logger, ide };
}
