import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(src, e.name);
    const destPath = path.join(dest, e.name);
    if (e.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (e.isSymbolicLink()) {
      const link = await fs.readlink(srcPath);
      await fs.symlink(link, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

export async function copyFixtureToTemp(fixtureRelPath, tmpDirBase) {
  const root = path.resolve(tmpDirBase || process.cwd());
  const src = path.resolve(process.cwd(), fixtureRelPath);
  const dest = await fs.mkdtemp(path.join(root, 'mt-fixture-'));
  await copyDir(src, dest);
  return dest;
}
