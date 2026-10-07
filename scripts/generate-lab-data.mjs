import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadHomelab, resolveSourceRoot } from './architecture-sources.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(root, 'src', 'landing', 'lab', 'lab-data.json');

const homelab = await loadHomelab(resolveSourceRoot('HOMELAB_ROOT', 'khe-homelab'));

const snapshot = {
  generatedAt: new Date().toISOString(),
  source: {
    repo: 'khe-homelab',
    composeFiles: homelab.composeFiles,
    composeServiceDefinitions: homelab.containers,
  },
  metrics: {
    routerPorts: 0,
    services: homelab.composeFiles,
    containers: homelab.containers,
    recoveryLayers: homelab.resilienceLayers.length,
  },
  categories: homelab.groups,
};

// check builds too, so rewriting only a fresh timestamp would leave the
// tracked file modified after every gate run.
const withoutTimestamp = ({ generatedAt, ...rest }) => JSON.stringify(rest);
let previous = null;
try {
  previous = JSON.parse(await readFile(outputPath, 'utf8'));
} catch {
  previous = null;
}

if (previous && withoutTimestamp(previous) === withoutTimestamp(snapshot)) {
  console.log('lab-data.json is current');
} else {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    `Generated lab-data.json from ${homelab.composeFiles} compose files and ${homelab.containers} service definitions`,
  );
}
