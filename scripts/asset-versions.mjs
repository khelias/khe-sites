import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// A root-relative .css or .js URL in an attribute, an import or a url(), with any ?v= it has.
export const ASSET_REFERENCE = /(?<=["'(])(\/[\w./-]+\.(?:css|js))(?:\?v=(\w*))?(?=["')])/g;

export function assetVersion(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 10);
}

export async function builtPages(siteDist) {
  return (await readdir(siteDist, { recursive: true }))
    .filter((name) => name.endsWith('.html'))
    .map((name) => join(siteDist, name));
}

// Returns stamp(content, from), which gives every .css and .js URL in content ?v=<hash of the
// built file>. A stylesheet or script that links further assets is stamped first, so its hash
// covers theirs; each asset is stamped and rewritten once.
export function createAssetStamper(siteDist) {
  const versions = new Map();

  async function version(path, from) {
    if (versions.has(path)) {
      if (versions.get(path) === null) throw new Error(`${from} links ${path}, which links back to it`);
      return versions.get(path);
    }
    const file = join(siteDist, path);
    if (!existsSync(file)) throw new Error(`${from} links ${path}, which the build did not write`);
    versions.set(path, null);
    const content = await stamp(await readFile(file, 'utf8'), file);
    await writeFile(file, content);
    versions.set(path, assetVersion(content));
    return versions.get(path);
  }

  async function stamp(content, from) {
    const resolved = new Map();
    for (const [, path] of content.matchAll(ASSET_REFERENCE)) {
      if (!resolved.has(path)) resolved.set(path, await version(path, from));
    }
    return content.replace(ASSET_REFERENCE, (match, path) => `${path}?v=${resolved.get(path)}`);
  }

  return stamp;
}
