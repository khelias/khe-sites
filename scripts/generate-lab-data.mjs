import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const homelabRoot = join(root, '..', 'khe-homelab');
const servicesRoot = join(homelabRoot, 'services');
const outputPath = join(root, 'src', 'landing', 'lab', 'lab-data.json');

async function findComposeFiles(directory) {
  const found = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...await findComposeFiles(fullPath));
    } else if (entry.isFile() && entry.name === 'docker-compose.yml') {
      found.push(fullPath);
    }
  }

  return found.sort();
}

function extractServiceNames(composeText) {
  const names = [];
  let inServices = false;

  for (const line of composeText.split('\n')) {
    if (/^services:\s*$/.test(line)) {
      inServices = true;
      continue;
    }

    if (inServices && /^[A-Za-z0-9_-]+:\s*$/.test(line)) {
      break;
    }

    const match = line.match(/^  ([A-Za-z0-9._-]+):\s*$/);
    if (inServices && match) {
      names.push(match[1]);
    }
  }

  return names;
}

function extractReadmeMetrics(readme) {
  const serviceSummary = readme.match(/(\d+)\s+services\s+·\s+(\d+)\s+containers/i);
  return {
    routerPorts: 0,
    services: serviceSummary ? Number(serviceSummary[1]) : null,
    containers: serviceSummary ? Number(serviceSummary[2]) : null,
    recoveryLayers: 4,
  };
}

function byCategory(composeFiles) {
  return composeFiles.reduce((acc, file) => {
    const parts = relative(servicesRoot, file).split('/');
    const category = parts[0] || 'other';
    const stack = parts[1] || 'unknown';
    if (!acc[category]) acc[category] = [];
    if (!acc[category].includes(stack)) acc[category].push(stack);
    return acc;
  }, {});
}

const composeFiles = await findComposeFiles(servicesRoot);
let composeServiceDefinitions = 0;

for (const file of composeFiles) {
  const text = await readFile(file, 'utf8');
  const serviceNames = extractServiceNames(text);
  composeServiceDefinitions += serviceNames.length;
}

const readme = await readFile(join(homelabRoot, 'README.md'), 'utf8');
const metrics = extractReadmeMetrics(readme);
const categories = byCategory(composeFiles);

const snapshot = {
  generatedAt: new Date().toISOString(),
  source: {
    repo: 'khe-homelab',
    composeFiles: composeFiles.length,
    composeServiceDefinitions,
    publicMetrics: 'khe-homelab/README.md service summary',
  },
  metrics: {
    routerPorts: metrics.routerPorts,
    services: metrics.services ?? composeFiles.length,
    containers: metrics.containers ?? composeServiceDefinitions,
    recoveryLayers: metrics.recoveryLayers,
  },
  categories,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);

console.log(
  `Generated lab-data.json from ${composeFiles.length} compose files and ${composeServiceDefinitions} service definitions`,
);
