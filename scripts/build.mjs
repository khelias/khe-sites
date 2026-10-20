import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSources, runReportingSourceErrors } from './architecture-sources.mjs';
import { renderArchitecture } from './render-architecture.mjs';
import { buildHouse3dDemo } from './house3d-demo.mjs';
import { fillSiteHeader } from './site-header.mjs';
import { builtPages, createAssetStamper } from './asset-versions.mjs';

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

await runReportingSourceErrors(async () => {
  await rm(dist, { recursive: true, force: true });

  // The package's header, then khe-sites' fonts and the values it sets on it.
  const siteHeaderCss = [
    await readFile(fileURLToPath(import.meta.resolve('@khelias/ui/site-header.css')), 'utf8'),
    await readFile(join(root, 'src', 'shared', 'site-header.css'), 'utf8'),
  ].join('\n');

  for (const app of apps) {
    const outputDir = join(dist, app);
    await mkdir(join(outputDir, 'assets'), { recursive: true });
    await copyDirectory(join(root, 'src', app), outputDir);
    await copyFile(join(root, 'src', 'shared', 'site-locale.js'), join(outputDir, 'assets', 'site-locale.js'));
    await copyFile(join(root, 'src', 'shared', 'site-footer.js'), join(outputDir, 'assets', 'site-footer.js'));
    await copyFile(join(root, 'src', 'shared', 'analytics-consent.js'), join(outputDir, 'assets', 'analytics-consent.js'));
    await writeFile(join(outputDir, 'assets', 'site-header.css'), siteHeaderCss);
    await copyFile(join(root, 'src', 'shared', 'site.css'), join(outputDir, 'assets', 'site.css'));
    await copyDirectory(join(root, 'src', 'shared', 'fonts'), join(outputDir, 'assets', 'fonts'));
  }

  await renderArchitecture(join(dist, 'landing'), await loadSources());
  await buildHouse3dDemo(join(dist, 'landing', 'ha'));

  for (const app of apps) {
    const outputDir = join(dist, app);
    const stamp = createAssetStamper(outputDir);
    for (const page of await builtPages(outputDir)) {
      await writeFile(page, await stamp(fillSiteHeader(await readFile(page, 'utf8'), page), page));
    }
  }

  console.log(`Built ${apps.join(' and ')} sites into dist/`);
});
