import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Thrown for a problem in a source, so build and check can print one line
// instead of a stack trace.
export class SourceError extends Error {}

export async function runReportingSourceErrors(main) {
  try {
    await main();
  } catch (error) {
    if (error instanceof SourceError || error?.name === 'MarkdownError') {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

// A khe-sites worktree under .claude/worktrees/ has no siblings at ../, so the
// sibling checkouts are found next to the main checkout, via the common git dir.
function mainCheckoutParent() {
  try {
    const commonDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return dirname(dirname(commonDir));
  } catch {
    return null;
  }
}

export function resolveSourceRoot(envName, siblingName) {
  const fromEnv = process.env[envName];
  if (fromEnv) {
    const path = resolve(fromEnv);
    if (!existsSync(path)) {
      throw new SourceError(`${envName} points at ${path}, which does not exist.`);
    }
    return path;
  }
  const parent = mainCheckoutParent();
  const sibling = parent ? join(parent, siblingName) : null;
  if (!sibling || !existsSync(sibling)) {
    throw new SourceError(
      `No ${siblingName} checkout beside khe-sites${sibling ? ` (looked for ${sibling})` : ''}. Set ${envName} to its path.`,
    );
  }
  return sibling;
}

async function readSource(path, envName) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    throw new SourceError(`Cannot read ${path}. Check ${envName}.`);
  }
}

const ESTATE_SECTIONS = {
  'Product apps': 'product',
  Foundations: 'foundation',
  'Meta layer': 'meta',
};

// Every repo table counts, whatever its heading, so a new section in
// ESTATE.md cannot slip past the model check.
export function parseEstate(text) {
  const repos = [];
  let section = null;
  let inRepoTable = false;
  for (const line of text.split('\n')) {
    const heading = line.match(/^## (.+?)\s*$/);
    if (heading) {
      section = ESTATE_SECTIONS[heading[1]] || 'other';
      inRepoTable = false;
      continue;
    }
    if (/^\|\s*Repo\s*\|/.test(line)) {
      inRepoTable = true;
      continue;
    }
    if (!line.startsWith('|')) {
      inRepoTable = false;
      continue;
    }
    if (!inRepoTable || !section) continue;
    const row = line.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]+?)\s*\|/);
    if (!row) continue;
    const [, name, url, visibilityCell] = row;
    const visibility = visibilityCell.startsWith('private') ? 'private' : 'public';
    repos.push({ name, url, visibility, fork: visibilityCell.includes('fork'), section });
  }
  if (repos.length === 0) {
    throw new SourceError('ESTATE.md has no repo tables.');
  }
  return repos;
}

function adrIdsIn(text) {
  return [...text.matchAll(/\]\((\d{3})-[^)]*\.md\)/g)].map((match) => match[1]);
}

export function parseDecision(file, text) {
  const lines = text.split('\n');
  const title = lines[0].match(/^# ADR-(\d{3}): (.+)$/);
  if (!title) throw new SourceError(`${file}:1: first line is not "# ADR-NNN: <title>"`);
  const id = title[1];
  if (!basename(file).startsWith(`${id}-`)) {
    throw new SourceError(`${file}:1: ADR-${id} does not match the file name`);
  }

  const meta = { supersedes: [], supersededBy: [], related: [] };
  let index = 2;
  for (; index < lines.length && lines[index].startsWith('- **'); index += 1) {
    const bullet = lines[index].match(/^- \*\*([^:]+):\*\* (.+)$/);
    if (!bullet) throw new SourceError(`${file}:${index + 1}: unreadable header bullet`);
    const [, label, value] = bullet;
    if (label === 'Status') {
      const status = value.match(/^(Proposed|Accepted|Superseded|Deprecated) \((\d{4}-\d{2}-\d{2})\)$/);
      if (!status) throw new SourceError(`${file}:${index + 1}: unreadable status "${value}"`);
      meta.status = status[1];
      meta.date = status[2];
    } else if (label === 'Supersedes') {
      meta.supersedes = adrIdsIn(value);
    } else if (label === 'Superseded by') {
      meta.supersededBy = adrIdsIn(value);
    } else if (label === 'Related') {
      meta.related = adrIdsIn(value);
    } else {
      throw new SourceError(`${file}:${index + 1}: unknown header bullet "${label}"`);
    }
  }
  if (!meta.status) throw new SourceError(`${file}:3: no Status bullet`);

  return {
    id,
    file,
    title: title[2],
    ...meta,
    body: lines.slice(index).join('\n'),
    bodyStartLine: index + 1,
  };
}

export async function loadDecisions(architectureRoot) {
  const directory = join(architectureRoot, 'decisions');
  let names;
  try {
    names = (await readdir(directory)).filter((name) => /^\d{3}-.+\.md$/.test(name)).sort();
  } catch {
    throw new SourceError(`Cannot read ${directory}. Check ARCHITECTURE_ROOT.`);
  }
  if (names.length === 0) throw new SourceError(`No decisions in ${directory}.`);

  const decisions = [];
  for (const name of names) {
    const text = await readSource(join(directory, name), 'ARCHITECTURE_ROOT');
    decisions.push(parseDecision(`decisions/${name}`, text));
  }

  const ids = new Set(decisions.map((decision) => decision.id));
  for (const decision of decisions) {
    if (decision.status === 'Superseded' && decision.supersededBy.length === 0) {
      throw new SourceError(`${decision.file}: Superseded without a "Superseded by" ADR`);
    }
    for (const other of [...decision.supersedes, ...decision.supersededBy, ...decision.related]) {
      if (!ids.has(other)) throw new SourceError(`${decision.file}: links ADR-${other}, which does not exist`);
    }
  }
  return decisions;
}

export async function findComposeFiles(directory) {
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

export function extractServiceNames(composeText) {
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

function resilienceSection(readme) {
  const section = readme.split(/^## /m).find((part) => /^Resilience\s*\n/.test(part));
  const layers = section ? section.match(/^\d+\.\s.*$/gm) : null;
  // Failing the build beats silently publishing a stale count, which is how
  // the old README service-summary parse went wrong unnoticed.
  if (!layers) {
    throw new SourceError('No numbered list under "## Resilience" in khe-homelab/README.md');
  }
  return layers;
}

export function countResilienceLayers(readme) {
  return resilienceSection(readme).length;
}

export function resilienceLayerTitles(readme) {
  return resilienceSection(readme).map((line) => {
    const title = line.match(/^\d+\.\s+\*\*(.+?)\.?\*\*/);
    if (!title) throw new SourceError(`Resilience layer without a bold title in khe-homelab/README.md: ${line}`);
    return title[1].replace(/\s+—\s+/, ': ');
  });
}

export function byCategory(servicesRoot, composeFiles) {
  return composeFiles.reduce((acc, file) => {
    const parts = relative(servicesRoot, file).split('/');
    const category = parts[0] || 'other';
    const stack = parts[1] || 'unknown';
    if (!acc[category]) acc[category] = [];
    if (!acc[category].includes(stack)) acc[category].push(stack);
    return acc;
  }, {});
}

export async function loadHomelab(homelabRoot) {
  const servicesRoot = join(homelabRoot, 'services');
  if (!existsSync(servicesRoot)) {
    throw new SourceError(`No services directory at ${servicesRoot}. Check HOMELAB_ROOT.`);
  }
  const composeFiles = await findComposeFiles(servicesRoot);
  let containers = 0;
  for (const file of composeFiles) {
    containers += extractServiceNames(await readFile(file, 'utf8')).length;
  }
  const readme = await readSource(join(homelabRoot, 'README.md'), 'HOMELAB_ROOT');
  return {
    composeFiles: composeFiles.length,
    containers,
    groups: byCategory(servicesRoot, composeFiles),
    resilienceLayers: resilienceLayerTitles(readme),
  };
}

export async function loadSources() {
  const architectureRoot = resolveSourceRoot('ARCHITECTURE_ROOT', 'khe-architecture');
  const homelabRoot = resolveSourceRoot('HOMELAB_ROOT', 'khe-homelab');
  const estate = await readSource(join(architectureRoot, 'ESTATE.md'), 'ARCHITECTURE_ROOT');
  return {
    architectureRoot,
    homelabRoot,
    repos: parseEstate(estate),
    decisions: await loadDecisions(architectureRoot),
    homelab: await loadHomelab(homelabRoot),
  };
}
