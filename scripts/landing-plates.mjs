import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { replaceMarker, SourceError } from './architecture-sources.mjs';
import { duration, fillTemplate, findingRows, period } from './render-architecture.mjs';

// The landing's drawn plates are inlined at their `<!-- plate:<name> -->` markers, so their
// classes follow the page's theme and their data-i18n text is filled per language with the
// rest of the page. The files themselves are not published.
const TRACK = 576;
const BAR_KEYS = { step03Title: 'planReview', agentsCodeRow: 'codeReview', step06Title: 'planCheck' };

// The agent loop's numbers on the agents card (estate ADR-044), read through parseAgentLoop, which
// already refuses a missing or non-numeric key; the bars are the acted counts of the /agents/ rows.
function agentValues(loop) {
  const bars = findingRows(loop).map(({ title, counts }) => [BAR_KEYS[title], counts.acted]);
  const longest = Math.max(1, ...bars.map(([, count]) => count));
  const values = {
    period: period(loop.since, loop.until, 'tspan'),
    plans: String(loop.plans),
    reverted: String(loop.revertedPlans),
    median: loop.planToPush.count ? duration(loop.planToPush.medianMinutes) : '–',
    track: String(TRACK),
  };
  for (const [key, count] of bars) {
    values[key] = `${count} <tspan data-i18n="${count === 1 ? 'plateFix' : 'plateFixes'}"></tspan>`;
    values[`${key}Width`] = String(Math.round((TRACK * count) / longest));
  }
  return values;
}

export async function renderLandingPlates(landingDist, sources) {
  const directory = join(landingDist, 'plates');
  const pagePath = join(landingDist, 'index.html');
  let html = await readFile(pagePath, 'utf8');
  for (const name of (await readdir(directory)).filter((file) => file.endsWith('.svg'))) {
    const file = join(directory, name);
    const id = name.slice(0, -'.svg'.length);
    const svg = fillTemplate((await readFile(file, 'utf8')).trim(), id === 'agents' ? agentValues(sources.agentLoop) : {}, file);
    html = replaceMarker(html, `plate:${id}`, svg, pagePath);
  }
  if (html.includes('<!-- plate:')) throw new SourceError(`${pagePath} names a plate that src/landing/plates/ lacks`);
  await writeFile(pagePath, html);
  await rm(directory, { recursive: true });
}
