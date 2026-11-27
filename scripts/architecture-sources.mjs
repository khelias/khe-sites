import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

export const SITE = 'https://khe.ee';

// Thrown for a problem in a source, so build and check can print one line
// instead of a stack trace.
export class SourceError extends Error {}

export function replaceMarker(html, marker, content, file) {
  const token = `<!-- ${marker} -->`;
  const found = html.split(token).length - 1;
  if (found !== 1) throw new SourceError(`${file} has ${found} ${token} markers, expected 1`);
  return html.replace(token, () => content);
}

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

// Runs a source repo's own Python build, which writes what khe-sites then wraps in the family
// shell; returns the repo's root.
export function runSourceBuild(envName, siblingName, script, args, label) {
  const root = resolveSourceRoot(envName, siblingName);
  try {
    execFileSync('python3', ['-I', join(root, script), ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
  } catch (error) {
    throw new SourceError(`${label} in ${root} failed (${error.message.split('\n')[0]}). Check ${envName}.`);
  }
  return root;
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

// Proposed and Accepted are in force; Superseded, Moved and Deprecated leave a page that points
// onward (khe-architecture AGENTS.md Rule 3).
const IN_FORCE = new Set(['Proposed', 'Accepted']);

export function parseDecision(file, text) {
  const lines = text.split('\n');
  const title = lines[0].match(/^# ADR-(\d{3}): (.+)$/);
  if (!title) throw new SourceError(`${file}:1: first line is not "# ADR-NNN: <title>"`);
  const id = title[1];
  if (!basename(file).startsWith(`${id}-`)) {
    throw new SourceError(`${file}:1: ADR-${id} does not match the file name`);
  }

  const meta = { supersedes: [], supersededBy: [], related: [] };
  const seen = new Set();
  let index = 2;
  for (; index < lines.length && lines[index].startsWith('- **'); index += 1) {
    const bullet = lines[index].match(/^- \*\*([^:]+):\*\* (.+)$/);
    if (!bullet) throw new SourceError(`${file}:${index + 1}: unreadable header bullet`);
    const [, label, value] = bullet;
    if (seen.has(label)) throw new SourceError(`${file}:${index + 1}: a second "${label}" bullet`);
    seen.add(label);
    if (label === 'Status') {
      const status = value.match(/^(Proposed|Accepted|Superseded|Moved|Deprecated) \((\d{4}-\d{2}-\d{2})\)$/);
      if (!status) throw new SourceError(`${file}:${index + 1}: unreadable status "${value}"`);
      meta.status = status[1];
      meta.date = status[2];
    } else if (label === 'Supersedes') {
      meta.supersedes = adrIdsIn(value);
    } else if (label === 'Superseded by') {
      meta.supersededBy = adrIdsIn(value);
    } else if (label === 'Moved to') {
      meta.movedTo = value;
      meta.movedToLine = index + 1;
    } else if (label === 'Related') {
      meta.related = adrIdsIn(value);
    } else {
      throw new SourceError(`${file}:${index + 1}: unknown header bullet "${label}"`);
    }
  }
  if (!meta.status) throw new SourceError(`${file}:3: no Status bullet`);

  const body = lines.slice(index).join('\n');
  return {
    id,
    file,
    title: title[2],
    ...meta,
    inForce: IN_FORCE.has(meta.status),
    // A stub is a decision no longer in force here with nothing but its header bullets.
    stub: body.trim() === '',
    body,
    bodyStartLine: index + 1,
  };
}

// What the register as a whole must hold, apart from each file's own shape.
export function checkDecisions(decisions) {
  const ids = new Set(decisions.map((decision) => decision.id));
  if (ids.size !== decisions.length) throw new SourceError('Two decisions share an id');
  for (const decision of decisions) {
    if (decision.status === 'Superseded' && decision.supersededBy.length === 0) {
      throw new SourceError(`${decision.file}: Superseded without a "Superseded by" ADR`);
    }
    if (decision.status === 'Moved' && !decision.movedTo) {
      throw new SourceError(`${decision.file}: Moved without a "Moved to" home`);
    }
    if (decision.status === 'Deprecated' && decision.supersededBy.length === 0 && !decision.movedTo) {
      throw new SourceError(`${decision.file}: Deprecated without a "Superseded by" or "Moved to" bullet`);
    }
    if (decision.movedTo && decision.status !== 'Moved' && decision.status !== 'Deprecated') {
      throw new SourceError(`${decision.file}: a "Moved to" bullet, but the status is ${decision.status}`);
    }
    if (decision.inForce && decision.stub) {
      throw new SourceError(`${decision.file}: ${decision.status} with no sections`);
    }
    for (const other of [...decision.supersedes, ...decision.supersededBy, ...decision.related]) {
      if (!ids.has(other)) throw new SourceError(`${decision.file}: links ADR-${other}, which does not exist`);
    }
  }
  return decisions;
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

  return checkDecisions(decisions);
}

// The agent loop's counts, written weekly by the workspace agent into khe-architecture
// (estate ADR-044). The key list is in khe-workspace scripts/agent-metrics.sh,
// beside --json, and khe-architecture scripts/check.sh holds the file to it.
// The key set is exact: a renamed or new key fails the build rather than
// showing an empty or stale number.
const COUNT_KEYS = ['acted', 'dropped', 'notRun', 'pending'];
export const AGENT_LOOP_SHAPE = {
  since: 'date',
  until: 'date',
  plans: 'count',
  planReview: COUNT_KEYS,
  planCheck: COUNT_KEYS,
  codeReview: COUNT_KEYS,
  securityReview: COUNT_KEYS,
  operator: ['acted', 'notRun', 'pending'],
  push: ['unchanged', 'changed', 'discarded', 'pending'],
  pushedPlans: 'count',
  revertedPlans: 'count',
  planToPush: ['count', 'medianMinutes'],
};

function sameKeys(value, expected, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SourceError(`${where} is not an object`);
  const actual = Object.keys(value);
  const missing = expected.filter((key) => !actual.includes(key));
  const unknown = actual.filter((key) => !expected.includes(key));
  if (missing.length) throw new SourceError(`${where} lacks ${missing.join(', ')}`);
  if (unknown.length) throw new SourceError(`${where} has unknown ${unknown.join(', ')}`);
}

function assertCount(value, where) {
  if (!Number.isInteger(value) || value < 0) throw new SourceError(`${where} is not a whole count: ${JSON.stringify(value)}`);
}

export function parseAgentLoop(text, file = 'metrics/agent-loop.json') {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new SourceError(`${file}: ${error.message}`);
  }
  sameKeys(data, Object.keys(AGENT_LOOP_SHAPE), file);
  for (const [key, shape] of Object.entries(AGENT_LOOP_SHAPE)) {
    const where = `${file}: ${key}`;
    if (shape === 'date') {
      if (typeof data[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data[key])) throw new SourceError(`${where} is not a YYYY-MM-DD date`);
    } else if (shape === 'count') {
      assertCount(data[key], where);
    } else {
      sameKeys(data[key], shape, where);
      for (const inner of shape) assertCount(data[key][inner], `${where}.${inner}`);
    }
  }
  return data;
}

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

function resilienceSection(doc) {
  const section = doc.split(/^## /m).find((part) => /^Resilience\s*\n/.test(part));
  const layers = section ? section.match(/^\d+\.\s.*$/gm) : null;
  // Failing the build beats silently publishing a stale count, which is how
  // the old README service-summary parse went wrong unnoticed.
  if (!layers) {
    throw new SourceError('No numbered list under "## Resilience" in khe-homelab/ARCHITECTURE.md');
  }
  return layers;
}

export function resilienceLayerTitles(doc) {
  return resilienceSection(doc).map((line) => {
    const title = line.match(/^\d+\.\s+\*\*(.+?)\.?\*\*/);
    if (!title) throw new SourceError(`Resilience layer without a bold title in khe-homelab/ARCHITECTURE.md: ${line}`);
    return title[1].replace(/\s+—\s+/, ': ');
  });
}

function byCategory(servicesRoot, composeFiles) {
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
  const architecture = await readSource(join(homelabRoot, 'ARCHITECTURE.md'), 'HOMELAB_ROOT');
  return {
    composeFiles: composeFiles.length,
    groups: byCategory(servicesRoot, composeFiles),
    resilienceLayers: resilienceLayerTitles(architecture),
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
    agentLoop: parseAgentLoop(await readSource(join(architectureRoot, 'metrics', 'agent-loop.json'), 'ARCHITECTURE_ROOT')),
    homelab: await loadHomelab(homelabRoot),
  };
}
