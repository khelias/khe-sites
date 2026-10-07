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

const KIND_LEGEND = {
  person: 'kindPerson',
  system: 'kindSystem',
  product: 'kindProduct',
  platform: 'kindPlatform',
  external: 'kindExternal',
  repo: 'kindRepo',
  step: 'kindStep',
};

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

// Inter is narrower than this on average; the margin keeps an Estonian label
// from touching its border when the estimate is off.
function textWidth(text, size, weight) {
  const factor = weight >= 500 ? 0.56 : 0.53;
  return [...text].reduce((sum, char) => sum + (/[A-ZÕÄÖÜŠŽ]/.test(char) ? 1.2 : 1) * size * factor, 0);
}

function labelsOf(element) {
  if (element.name) return [{ literal: element.name }];
  return [{ key: element.label }];
}

function assertFits(id, view, width) {
  const element = elements[id];
  const lines = [
    ...labelsOf(element).map((line) => ({ ...line, size: 13, weight: 500 })),
    ...(element.sub || []).map((key) => ({ key, size: 11, weight: 400 })),
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

function center([x, y, w, h]) {
  return [x + w / 2, y + h / 2];
}

// Where the segment from the box centre towards `target` leaves the box.
function borderPoint(box, target) {
  const [cx, cy] = center(box);
  const dx = target[0] - cx;
  const dy = target[1] - cy;
  const scale = Math.min(
    dx === 0 ? Infinity : box[2] / 2 / Math.abs(dx),
    dy === 0 ? Infinity : box[3] / 2 / Math.abs(dy),
  );
  return [cx + dx * scale, cy + dy * scale];
}

const round = (value) => Math.round(value * 10) / 10;

function renderNode(id, box, view) {
  const element = elements[id];
  const [x, y, w, h] = box;
  if (element.kind === 'boundary') {
    return `<g class="arch-node arch-node--boundary"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>${svgText({ key: element.label }, x + 14, y + 22, 'arch-group-label', 'start')}</g>`;
  }
  assertFits(id, view, w);
  const focus = view.focus === id ? ' arch-node--focus' : '';
  const radius = element.kind === 'person' ? 18 : 6;
  const subs = element.sub || [];
  const blockHeight = 16 + subs.length * 15;
  const top = y + (h - blockHeight) / 2 + 12;
  const cx = x + w / 2;
  const texts = [
    ...labelsOf(element).map((line) => svgText(line, cx, top, 'arch-node-label')),
    ...subs.map((key, index) => svgText({ key }, cx, top + 17 + index * 15, 'arch-node-sub')),
  ];
  return `<g class="arch-node arch-node--${element.kind}${focus}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}"/>${texts.join('')}</g>`;
}

function renderEdge(edge, view) {
  const fromBox = view.nodes[edge.from];
  const toBox = view.nodes[edge.to];
  if (!fromBox || !toBox) throw new SourceError(`Diagram ${view.id}: edge ${edge.from} -> ${edge.to} names a node it lacks`);
  const [x1, y1] = edge.points ? edge.points[0] : borderPoint(fromBox, center(toBox));
  const [x2, y2] = edge.points ? edge.points[1] : borderPoint(toBox, center(fromBox));
  const dashed = edge.dashed ? ' arch-edge--dashed' : '';
  const line = `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" class="arch-edge${dashed}" marker-end="url(#arrow-${view.id})"/>`;
  if (!edge.label) return { line, label: '' };
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const vertical = Math.abs(x2 - x1) < Math.abs(y2 - y1);
  const label = vertical
    ? svgText({ key: edge.label }, round(mx + 8), round(my + 4), 'arch-edge-label', 'start')
    : svgText({ key: edge.label }, round(mx), round(my - 7), 'arch-edge-label');
  return { line, label };
}

function elementName(id) {
  const element = elements[id];
  return element.name ? `<strong>${escapeHtml(element.name)}</strong>` : i18n(element.label, 'strong');
}

function renderViewList(view) {
  const items = Object.keys(view.nodes).map((id) => {
    const element = elements[id];
    if (element.kind === 'boundary') return `<li class="arch-view-list__group">${i18n(element.label, 'strong')}</li>`;
    const subs = (element.sub || []).map((key) => i18n(key)).join(' ');
    const outgoing = view.edges
      .filter((edge) => edge.from === id && elements[edge.to].kind !== 'boundary')
      .map((edge) => `<span class="arch-view-list__to">&rarr; ${elementName(edge.to)}${edge.label ? ` (${i18n(edge.label)})` : ''}</span>`)
      .join('');
    return `<li>${elementName(id)} <span class="arch-view-list__sub">${subs}</span>${outgoing}</li>`;
  });
  return `<ol class="arch-view-list">${items.join('')}</ol>`;
}

function renderLegend(view) {
  const kinds = new Set();
  for (const id of Object.keys(view.nodes)) {
    const { kind } = elements[id];
    if (kind !== 'boundary' && id !== view.focus) kinds.add(kind);
  }
  const items = [...kinds].map((kind) => `<li><span class="arch-swatch arch-swatch--${kind}" aria-hidden="true"></span>${i18n(KIND_LEGEND[kind])}</li>`);
  if (view.focus) items.push(`<li><span class="arch-swatch arch-swatch--focus" aria-hidden="true"></span>${i18n('kindSystem')}</li>`);
  return `<ul class="arch-legend" aria-label="${escapeHtml(copyText('legendLabel'))}" data-i18n-aria="legendLabel">${items.join('')}</ul>`;
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
    `<defs><marker id="arrow-${view.id}" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0.8 L7.5,4 L0,7.2 z" class="arch-arrow"/></marker></defs>`,
    ...boundaries.map((id) => renderNode(id, view.nodes[id], view)),
    ...edges.map((edge) => edge.line),
    ...others.map((id) => renderNode(id, view.nodes[id], view)),
    ...edges.map((edge) => edge.label),
    '</svg>',
  ].join('');
  return `<figure class="arch-figure" data-view="${view.id}"><div class="arch-diagram">${svg}</div>${renderViewList(view)}<figcaption>${renderLegend(view)}</figcaption></figure>`;
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
    const cards = group.ids.map((id) => {
      const element = elements[id];
      const lines = [];
      if (element.repo) lines.push(`<p class="arch-card__meta">${repoLink(repoByName.get(element.repo))}</p>`);
      const stacks = (element.groups || []).flatMap((name) => sources.homelab.groups[name] || []);
      if (stacks.length) {
        lines.push(`<p class="arch-card__meta">${i18n('stacksLabel')}: ${stacks.map((stack) => `<code>${escapeHtml(stack)}</code>`).join(' ')}</p>`);
      }
      return `<li class="arch-card"><h4>${element.name ? escapeHtml(element.name) : i18n(element.label)}</h4>${i18n(purposeKey(id), 'p')}${lines.join('')}</li>`;
    });
    const repo = group.repo ? ` <span class="arch-block-group__repo">${repoLink(repoByName.get(group.repo))}</span>` : '';
    return `<div class="arch-block-group"><h3>${i18n(group.group)}${repo}</h3><ul class="arch-cards">${cards.join('')}</ul></div>`;
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
