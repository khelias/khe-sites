import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const apps = ['landing', 'games'];

async function copyDirectory(from, to) {
  await mkdir(to, { recursive: true });

  const entries = await readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(source, target);
    } else if (entry.isFile()) {
      await copyFile(source, target);
    }
  }
}

await import('./generate-lab-data.mjs');
await rm(dist, { recursive: true, force: true });

for (const app of apps) {
  const outputDir = join(dist, app);
  await mkdir(join(outputDir, 'assets'), { recursive: true });
  await copyDirectory(join(root, 'src', app), outputDir);
  await copyFile(join(root, 'src', 'shared', 'site-locale.js'), join(outputDir, 'assets', 'site-locale.js'));
  await copyFile(join(root, 'src', 'shared', 'analytics-consent.js'), join(outputDir, 'assets', 'analytics-consent.js'));
  await copyFile(join(root, 'src', 'shared', 'site.css'), join(outputDir, 'assets', 'site.css'));
  await copyDirectory(join(root, 'src', 'shared', 'fonts'), join(outputDir, 'assets', 'fonts'));
}

console.log(`Built ${apps.join(' and ')} sites into dist/`);
