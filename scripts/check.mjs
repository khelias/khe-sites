import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const htmlFiles = [
  'src/landing/index.html',
  'src/games/index.html',
];

const requiredMarkers = [
  '/assets/site-locale.js',
  'data-lang-option="et"',
  'data-lang-option="en"',
];

for (const relativePath of htmlFiles) {
  const content = await readFile(join(root, relativePath), 'utf8');
  for (const marker of requiredMarkers) {
    if (!content.includes(marker)) {
      throw new Error(`${relativePath} is missing ${marker}`);
    }
  }
}

await import(join(root, 'src/shared/site-locale.js'));

console.log('Static site checks passed');
