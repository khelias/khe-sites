import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const htmlFiles = [
  'src/landing/index.html',
  'src/landing/privacy/index.html',
  'src/games/index.html',
  'src/games/privacy/index.html',
];

const requiredMarkers = [
  '/assets/site-locale.js',
  '/assets/analytics-consent.js',
  '/assets/site.css',
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
  if (content.includes('<style>')) {
    throw new Error(`${relativePath} still contains inline CSS`);
  }
  if (content.includes('href="/fonts/') || content.includes("url('/fonts/")) {
    throw new Error(`${relativePath} still references root-level fonts`);
  }

  for (const match of content.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
    const script = match[1].replace(/^\s*import\s.+;\s*$/gm, '');
    new Function(script);
  }
}

const sourceFiles = [
  ...htmlFiles,
  'src/shared/analytics-consent.js',
  'src/shared/site-locale.js',
  'src/shared/site.css',
];
const bannedText = [
  'Tarkvaraarhitekt töö poolest',
  'Nokitseja loomult',
  'Ise majutatud Tallinnas',
];

for (const relativePath of sourceFiles) {
  const content = await readFile(join(root, relativePath), 'utf8');
  for (const text of bannedText) {
    if (content.includes(text)) {
      throw new Error(`${relativePath} contains stale copy: ${text}`);
    }
  }
}

await import(join(root, 'src/shared/site-locale.js'));

console.log('Static site checks passed');
