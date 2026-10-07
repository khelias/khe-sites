import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockCards, elements, productDecisionDirs, views } from './architecture-model.mjs';
import { SourceError } from './architecture-sources.mjs';
import { adrLinkRewriter, escapeHtml, renderMarkdown } from './markdown.mjs';
import { COPY } from '../src/landing/architecture/copy.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const SITE = 'https://khe.ee';
const SOURCE_BASE = 'https://github.com/khelias/khe-architecture/blob/main/';

function copyText(key) {
  const text = COPY.en[key];
  if (typeof text !== 'string') throw new SourceError(`copy.js has no COPY.en.${key}`);
  return text;
}

function i18n(key, tag = 'span', attributes = '') {
  return `<${tag}${attributes} data-i18n="${key}">${escapeHtml(copyText(key))}</${tag}>`;
}

// Fills every empty element that names a copy key, so the page reads in
// English without JS and the strings live only in copy.js.
export function fillI18n(html) {
  return html.replace(
    /<([a-z][a-z0-9]*)\b([^>]*?)\sdata-i18n(-html)?="([^"]+)"([^>]*)><\/\1>/g,
    (match, tag, before, html, key, after) => {
      const text = copyText(key);
      return `<${tag}${before} data-i18n${html || ''}="${key}"${after}>${html ? text : escapeHtml(text)}</${tag}>`;
    },
  );
}

// A deliberately wide estimate of Inter's advance (about 0.55em for lowercase
// at these weights), so a label that passes has room to spare in its box.
function textWidth(text, size, weight) {
  const factor = weight >= 500 ? 0.6 : 0.57;
  return [...text].reduce((sum, char) => sum + (/[A-ZÕÄÖÜŠŽmwMW]/.test(char) ? 1.25 : 1) * size * factor, 0);
}

function labelsOf(element) {
  if (element.name) return [{ literal: element.name }];
  return [{ key: element.label }];
}

function assertFits(id, view, width) {
  const element = elements[id];
  const lines = [
    ...labelsOf(element).map((line) => ({ ...line, size: LABEL_SIZE, weight: 500 })),
    ...(element.sub || []).map((key) => ({ key, size: SUB_SIZE, weight: 400 })),
  ];
  for (const locale of Object.keys(COPY)) {
    for (const line of lines) {
      const text = line.literal || COPY[locale][line.key];
      if (textWidth(text, line.size, line.weight) > width - 16) {
        throw new SourceError(`Diagram ${view.id}: "${text}" (${locale}) does not fit the ${width}px box of ${id}`);
      }
    }
  }
}

function svgText(line, x, y, className, anchor = 'middle') {
  const content = line.literal
    ? escapeHtml(line.literal)
    : escapeHtml(copyText(line.key));
  const i18nAttribute = line.key ? ` data-i18n="${line.key}"` : '';
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${className}"${i18nAttribute}>${content}</text>`;
}

const round = (value) => Math.round(value * 10) / 10;
const LABEL_SIZE = 15;
const SUB_SIZE = 12.5;

function renderNode(id, box, view) {
  const element = elements[id];
  const [x, y, w, h] = box;
  if (element.kind === 'boundary') {
    return `<g class="arch-node arch-node--boundary"><rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="8"/>${svgText({ key: element.label }, x + 14, element.labelBelow ? y + h - 12 : y + 22, 'arch-group-label', 'start')}</g>`;
  }
  assertFits(id, view, w);
  const focus = view.focus === id ? ' arch-node--focus' : '';
  const subs = element.sub || [];
  const blockHeight = LABEL_SIZE + 3 + subs.length * (SUB_SIZE + 4);
  const top = y + (h - blockHeight) / 2 + LABEL_SIZE - 2;
  const cx = x + w / 2;
  const texts = [
    ...labelsOf(element).map((line) => svgText(line, cx, round(top), 'arch-node-label')),
    ...subs.map((key, index) => svgText({ key }, cx, round(top + LABEL_SIZE + 4 + index * (SUB_SIZE + 4)), 'arch-node-sub')),
  ];
  return `<g class="arch-node arch-node--${element.kind}${focus}"><rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="5"/>${texts.join('')}</g>`;
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function span(start, size) {
  return [start, start + size];
}

// The point on the shared stretch of two ranges where a straight connector
// runs: the source's centre if it lies inside the target, and so on.
function sharedAxis([a1, a2], [b1, b2]) {
  const lo = Math.max(a1, b1);
  const hi = Math.min(a2, b2);
  if (hi - lo < 24) return null;
  if (a1 >= b1 && a2 <= b2) return (a1 + a2) / 2;
  if (b1 >= a1 && b2 <= a2) return (b1 + b2) / 2;
  return (lo + hi) / 2;
}

// Orthogonal routing: a straight line where the boxes face each other,
// otherwise one elbow pair through the gap between them.
function routeEdge(edge, a, b) {
  const [ax, ay, aw, ah] = a;
  const [bx, by, bw, bh] = b;
  const below = by + bh / 2 > ay + ah / 2;
  const right = bx + bw / 2 > ax + aw / 2;
  if (edge.route === 'tree') {
    const sx = ax + aw / 2;
    const ex = bx + bw / 2;
    const sy = below ? ay + ah : ay;
    const ey = below ? by : by + bh;
    const mid = (sy + ey) / 2;
    return { points: [[sx, sy], [sx, mid], [ex, mid], [ex, ey]], labelAt: [sx, mid], vertical: true };
  }
  const x = sharedAxis(span(ax, aw), span(bx, bw));
  if (x !== null) {
    const sy = below ? ay + ah : ay;
    const ey = below ? by : by + bh;
    return { points: [[x, sy], [x, ey]], labelAt: [x, (sy + ey) / 2], vertical: true };
  }
  const y = sharedAxis(span(ay, ah), span(by, bh));
  if (y !== null) {
    const sx = right ? ax + aw : ax;
    const ex = right ? bx : bx + bw;
    return { points: [[sx, y], [ex, y]], labelAt: [(sx + ex) / 2, y], vertical: false };
  }
  const acx = ax + aw / 2;
  const acy = ay + ah / 2;
  const bcx = bx + bw / 2;
  const bcy = by + bh / 2;
  if (Math.abs(bcx - acx) >= Math.abs(bcy - acy)) {
    const sx = right ? ax + aw : ax;
    const ex = right ? bx : bx + bw;
    const mid = (sx + ex) / 2;
    return { points: [[sx, acy], [mid, acy], [mid, bcy], [ex, bcy]], labelAt: [mid, (acy + bcy) / 2], vertical: true };
  }
  const sy = below ? ay + ah : ay;
  const ey = below ? by : by + bh;
  const mid = (sy + ey) / 2;
  const sx = clamp(bcx, ax + 16, ax + aw - 16);
  return { points: [[sx, sy], [sx, mid], [bcx, mid], [bcx, ey]], labelAt: [(sx + bcx) / 2, mid], vertical: false };
}

function renderEdge(edge, view) {
  const fromBox = view.nodes[edge.from];
  const toBox = view.nodes[edge.to];
  if (!fromBox || !toBox) throw new SourceError(`Diagram ${view.id}: edge ${edge.from} -> ${edge.to} names a node it lacks`);
  const route = routeEdge(edge, fromBox, toBox);
  const dashed = edge.dashed ? ' arch-edge--dashed' : '';
  const points = route.points.map(([px, py]) => `${round(px)},${round(py)}`).join(' ');
  const line = `<polyline points="${points}" class="arch-edge${dashed}" marker-end="url(#arrow-${view.id})"/>`;
  if (!edge.label) return { line, label: '' };
  const [mx, my] = route.labelAt;
  const label = route.vertical
    ? svgText({ key: edge.label }, round(mx + 8), round(my + 4), 'arch-edge-label', 'start')
    : svgText({ key: edge.label }, round(mx), round(my - 8), 'arch-edge-label');
  return { line, label };
}

function elementName(id) {
  const element = elements[id];
  return element.name ? `<strong>${escapeHtml(element.name)}</strong>` : i18n(element.label, 'strong');
}

function contains([gx, gy, gw, gh], [x, y, w, h]) {
  return x >= gx && y >= gy && x + w <= gx + gw && y + h <= gy + gh;
}

function renderViewItem(view, id) {
  const element = elements[id];
  const subs = (element.sub || []).map((key) => i18n(key)).join(' ');
  const outgoing = view.edges
    .filter((edge) => edge.from === id && elements[edge.to].kind !== 'boundary')
    .map((edge) => `<span class="arch-view-list__to">&rarr; ${elementName(edge.to)}${edge.label ? ` (${i18n(edge.label)})` : ''}</span>`)
    .join('');
  return `<li>${elementName(id)} <span class="arch-view-list__sub">${subs}</span>${outgoing}</li>`;
}

// Each element goes under the group whose box holds it, so the list says what
// the diagram shows rather than following the order nodes are declared in.
function renderViewList(view) {
  const ids = Object.keys(view.nodes);
  const groups = ids.filter((id) => elements[id].kind === 'boundary');
  const entries = [];
  const groupEntries = new Map();
  for (const id of ids) {
    if (elements[id].kind === 'boundary') {
      const entry = { group: id, members: [] };
      groupEntries.set(id, entry);
      entries.push(entry);
      continue;
    }
    const owner = groups.find((group) => contains(view.nodes[group], view.nodes[id]));
    if (owner) groupEntries.get(owner).members.push(id);
    else entries.push({ id });
  }
  const items = entries.map((entry) => {
    if (!entry.group) return renderViewItem(view, entry.id);
    const members = entry.members.map((id) => renderViewItem(view, id)).join('');
    return `<li class="arch-view-list__group">${i18n(elements[entry.group].label, 'strong')}<ol>${members}</ol></li>`;
  });
  return `<ol class="arch-view-list">${items.join('')}</ol>`;
}

export function renderView(view) {
  const ids = Object.keys(view.nodes);
  for (const id of ids) {
    if (!elements[id]) throw new SourceError(`Diagram ${view.id}: node ${id} is not a model element`);
  }
  const boundaries = ids.filter((id) => elements[id].kind === 'boundary');
  const others = ids.filter((id) => elements[id].kind !== 'boundary');
  const edges = view.edges.map((edge) => renderEdge(edge, view));
  const titleId = `view-${view.id}-title`;
  const descId = `view-${view.id}-desc`;
  const svg = [
    `<svg class="arch-svg" viewBox="0 0 ${view.width} ${view.height}" role="img" aria-labelledby="${titleId} ${descId}">`,
    `<title id="${titleId}" data-i18n="${view.title}">${escapeHtml(copyText(view.title))}</title>`,
    `<desc id="${descId}" data-i18n="${view.desc}">${escapeHtml(copyText(view.desc))}</desc>`,
    `<defs><marker id="arrow-${view.id}" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,1 L10,5 L0,9 z" class="arch-arrow"/></marker></defs>`,
    ...boundaries.map((id) => renderNode(id, view.nodes[id], view)),
    ...edges.map((edge) => edge.line),
    ...others.map((id) => renderNode(id, view.nodes[id], view)),
    ...edges.map((edge) => edge.label),
    '</svg>',
  ].join('');
  return `<figure class="arch-figure" data-view="${view.id}"><div class="arch-diagram">${svg}</div>${renderViewList(view)}</figure>`;
}

export function modelMismatches(sources) {
  const problems = [];
  const modelRepos = new Set(Object.values(elements).filter((element) => element.repo).map((element) => element.repo));
  const sourceRepos = new Set(sources.repos.map((repo) => repo.name));
  for (const name of sourceRepos) if (!modelRepos.has(name)) problems.push(`ESTATE.md lists ${name}, which the architecture model lacks`);
  for (const name of modelRepos) if (!sourceRepos.has(name)) problems.push(`The architecture model names ${name}, which ESTATE.md lacks`);
  const modelGroups = new Set(Object.values(elements).flatMap((element) => element.groups || []));
  const sourceGroups = new Set(Object.keys(sources.homelab.groups));
  for (const group of sourceGroups) if (!modelGroups.has(group)) problems.push(`khe-homelab has the service group ${group}, which the architecture model lacks`);
  for (const group of modelGroups) if (!sourceGroups.has(group)) problems.push(`The architecture model names the service group ${group}, which khe-homelab lacks`);
  return problems;
}

function renderFacts(sources) {
  const facts = [
    [sources.repos.length, 'factRepos'],
    [sources.repos.filter((repo) => repo.section === 'product').length, 'factProducts'],
    [sources.homelab.composeFiles, 'factServices'],
    [sources.decisions.length, 'factDecisions'],
    [0, 'factPorts'],
  ];
  const items = facts.map(([value, key]) => `<div>${i18n(key, 'dt')}<dd>${value}</dd></div>`).join('');
  return `<dl class="arch-facts" aria-label="${escapeHtml(copyText('factsLabel'))}" data-i18n-aria="factsLabel">${items}</dl>${i18n('factsNote', 'p', ' class="arch-facts-note"')}`;
}

const purposeKey = (id) => `purpose${id.replace(/(^|-)([a-z])/g, (match, dash, char) => char.toUpperCase())}`;

function repoLink(repo) {
  return repo.visibility === 'public'
    ? `<a href="${escapeHtml(repo.url)}">${escapeHtml(repo.url.replace('https://', ''))}</a>`
    : i18n('privateLabel', 'span', ' class="arch-private"');
}

function renderBlocks(sources) {
  const repoByName = new Map(sources.repos.map((repo) => [repo.name, repo]));
  const groups = blockCards.map((group) => {
    const rows = group.ids.map((id) => {
      const element = elements[id];
      const meta = [];
      if (element.repo) meta.push(repoLink(repoByName.get(element.repo)));
      const stacks = (element.groups || []).flatMap((name) => sources.homelab.groups[name] || []);
      if (stacks.length) meta.push(`${i18n('stacksLabel')}: <span class="arch-stacks">${stacks.map(escapeHtml).join(', ')}</span>`);
      const metaLine = meta.length ? `<p class="arch-row__meta">${meta.join('<span class="arch-row__sep" aria-hidden="true"> · </span>')}</p>` : '';
      return `<li class="arch-row"><h4>${element.name ? escapeHtml(element.name) : i18n(element.label)}</h4><div>${i18n(purposeKey(id), 'p')}${metaLine}</div></li>`;
    });
    const repo = group.repo ? ` <span class="arch-block-group__repo">${repoLink(repoByName.get(group.repo))}</span>` : '';
    return `<div class="arch-block-group"><h3>${i18n(group.group)}${repo}</h3><ul class="arch-rows">${rows.join('')}</ul></div>`;
  });
  return groups.join('');
}

function renderResilience(sources) {
  return `<ol class="arch-layers" lang="en">${sources.homelab.resilienceLayers.map((title) => `<li>${escapeHtml(title)}</li>`).join('')}</ol>`;
}

const statusKey = (status) => `status${status}`;
const decisionUrl = (id) => `/architecture/decisions/${id}/`;

function renderRegister(decisions) {
  const byId = new Map(decisions.map((decision) => [decision.id, decision]));
  const rows = decisions.map((decision) => {
    const successor = decision.supersededBy
      .map((id) => ` <span class="arch-successor">&rarr; <a href="${decisionUrl(id)}">ADR-${id}</a></span>`)
      .join('');
    return `<tr><td><a href="${decisionUrl(decision.id)}">ADR-${decision.id}</a></td><td lang="en"><a href="${decisionUrl(decision.id)}">${escapeHtml(decision.title)}</a></td><td>${i18n(statusKey(decision.status), 'span', ` class="arch-status arch-status--${decision.status.toLowerCase()}"`)}${successor}</td><td><time datetime="${decision.date}">${decision.date}</time></td></tr>`;
  });
  if (rows.length !== byId.size) throw new SourceError('Two decisions share an id');
  return `<div class="arch-table-wrap"><table class="arch-table arch-register"><thead><tr><th scope="col">ADR</th>${i18n('regTitle', 'th', ' scope="col"')}${i18n('regStatus', 'th', ' scope="col"')}${i18n('regDate', 'th', ' scope="col"')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

function renderProductDecisions() {
  const links = productDecisionDirs.map((dir) => `<li><a href="${dir.url}">${escapeHtml(dir.repo)}</a></li>`).join('');
  return `${i18n('productDecisions', 'p', ' class="arch-prose"')}<ul class="arch-inline-list">${links}</ul>`;
}

function fillTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    if (!(name in values)) throw new SourceError(`decision.html uses {{${name}}}, which the renderer does not fill`);
    return values[name];
  });
}

function decisionLinks(ids, byId) {
  return ids.map((id) => `<a href="${decisionUrl(id)}" lang="en">ADR-${id}: ${escapeHtml(byId.get(id).title)}</a>`).join('<br>');
}

function renderDecisionPage(template, decision, byId, knownIds) {
  const url = `${SITE}${decisionUrl(decision.id)}`;
  const meta = [
    `<div>${i18n('metaStatus', 'dt')}<dd>${i18n(statusKey(decision.status))}</dd></div>`,
    `<div>${i18n('metaDate', 'dt')}<dd><time datetime="${decision.date}">${decision.date}</time></dd></div>`,
  ];
  if (decision.supersedes.length) meta.push(`<div>${i18n('metaSupersedes', 'dt')}<dd>${decisionLinks(decision.supersedes, byId)}</dd></div>`);
  if (decision.supersededBy.length) meta.push(`<div>${i18n('metaSupersededBy', 'dt')}<dd>${decisionLinks(decision.supersededBy, byId)}</dd></div>`);
  if (decision.related.length) meta.push(`<div>${i18n('metaRelated', 'dt')}<dd>${decisionLinks(decision.related, byId)}</dd></div>`);
  const notice = decision.status === 'Superseded'
    ? `  <p class="arch-notice">${i18n('supersededNotice')} ${decisionLinks(decision.supersededBy, byId)}.</p>`
    : '';
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': `${url}#article`,
    url,
    headline: `ADR-${decision.id}: ${decision.title}`,
    datePublished: decision.date,
    inLanguage: 'en',
    isPartOf: { '@id': `${SITE}/#website` },
  }).replace(/</g, '\\u003c');
  return fillI18n(fillTemplate(template, {
    pageTitle: escapeHtml(`ADR-${decision.id}: ${decision.title} | KHE`),
    description: escapeHtml(decision.title),
    url,
    jsonLd,
    id: decision.id,
    title: escapeHtml(decision.title),
    meta: meta.map((line) => `    ${line}`).join('\n'),
    notice,
    body: renderMarkdown(decision.body, {
      file: decision.file,
      firstLine: decision.bodyStartLine,
      rewriteLink: adrLinkRewriter(knownIds),
    }),
    sourceUrl: `${SOURCE_BASE}${decision.file}`,
  }));
}

function replaceMarker(html, marker, content, file) {
  const token = `<!-- ${marker} -->`;
  if (!html.includes(token)) throw new SourceError(`${file} has no ${token} marker`);
  return html.replace(token, content);
}

export async function renderArchitecture(landingDist, sources) {
  const problems = modelMismatches(sources);
  if (problems.length) throw new SourceError(problems.join('\n'));

  const pagePath = join(landingDist, 'architecture', 'index.html');
  let page = await readFile(pagePath, 'utf8');
  for (const view of views) page = replaceMarker(page, `view:${view.id}`, renderView(view), pagePath);
  page = replaceMarker(page, 'facts', renderFacts(sources), pagePath);
  page = replaceMarker(page, 'blocks', renderBlocks(sources), pagePath);
  page = replaceMarker(page, 'resilience', renderResilience(sources), pagePath);
  page = replaceMarker(page, 'register', renderRegister(sources.decisions), pagePath);
  page = replaceMarker(page, 'product-decisions', renderProductDecisions(), pagePath);
  await writeFile(pagePath, fillI18n(page));

  const template = await readFile(join(root, 'scripts', 'templates', 'decision.html'), 'utf8');
  const byId = new Map(sources.decisions.map((decision) => [decision.id, decision]));
  const knownIds = new Set(byId.keys());
  for (const decision of sources.decisions) {
    const directory = join(landingDist, 'architecture', 'decisions', decision.id);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'index.html'), renderDecisionPage(template, decision, byId, knownIds));
  }

  const sitemapPath = join(landingDist, 'sitemap.xml');
  const entries = sources.decisions.map((decision) => [
    '  <url>',
    `    <loc>${SITE}${decisionUrl(decision.id)}</loc>`,
    '  </url>',
  ].join('\n'));
  const sitemap = await readFile(sitemapPath, 'utf8');
  await writeFile(sitemapPath, replaceMarker(sitemap, 'decisions', entries.join('\n'), sitemapPath));
}
