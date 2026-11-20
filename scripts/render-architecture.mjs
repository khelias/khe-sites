import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockCards, elements, keyDecisions, productDecisionDirs, views } from './architecture-model.mjs';
import { replaceMarker, SITE, SourceError } from './architecture-sources.mjs';
import { adrLinkRewriter, escapeHtml, renderMarkdown } from './markdown.mjs';
import { COPY } from '../src/landing/architecture/copy.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCE_BASE = 'https://github.com/khelias/khe-architecture/blob/main/';

function copyText(key, locale) {
  const text = COPY[locale]?.[key];
  if (typeof text !== 'string') throw new SourceError(`copy.js has no COPY.${locale}.${key}`);
  return text;
}

// An element that names a copy key; fillCopy gives it the text in the page's language.
function i18n(key, tag = 'span', attributes = '') {
  return `<${tag}${attributes} data-i18n="${key}"></${tag}>`;
}

// Fills every empty element whose attribute matches `attributes`, a regex
// alternation, with fill(attribute, name), which returns HTML.
function fillEmpty(html, attributes, fill) {
  return html.replace(
    new RegExp(`<([a-z][a-z0-9]*)\\b([^>]*?)\\s(${attributes})="([^"]+)"([^>]*)><\\/\\1>`, 'g'),
    (match, tag, before, attribute, name, after) => `<${tag}${before} ${attribute}="${name}"${after}>${fill(attribute, name)}</${tag}>`,
  );
}

// Fills every empty element that names a key of `values`, one language's copy,
// so the page reads without JS and the strings live only in their copy.
export function fillCopy(html, values, where) {
  return fillEmpty(html, 'data-i18n(?:-html)?', (attribute, key) => {
    const text = values[key];
    if (typeof text !== 'string') throw new SourceError(`${where} has no copy for ${key}`);
    return attribute === 'data-i18n-html' ? text : escapeHtml(text);
  });
}

const LOCALES = Object.keys(COPY);

const TEXT = {
  tag: { size: 11, line: 15, mono: true },
  label: { size: 15, line: 19, weight: 600 },
  sub: { size: 12.5, line: 16, weight: 400 },
  group: { size: 11, line: 14, mono: true },
  edge: { size: 12.5, line: 15, weight: 400 },
};
const PAD_X = 8;
const PAD_Y = 6;

// An estimate of Familjen Grotesk's advance. Measured against the shaped
// font it comes within 1% of the real width at worst, which the 8px box
// padding absorbs; it is not a safety margin in itself. The mono labels
// carry 0.08em letter spacing on a 0.6em advance.
function textWidth(text, style) {
  if (style.mono) return [...text].length * style.size * 0.7;
  const factor = style.weight >= 500 ? 0.53 : 0.57;
  return [...text].reduce((sum, char) => sum + (/[A-ZÕÄÖÜŠŽmwMW]/.test(char) ? 1.25 : 1) * style.size * factor, 0);
}


// Greedy word wrap at build time, per locale: Estonian and English break in
// different places, so each language gets its own lines.
function wrap(text, style, width, where) {
  const lines = [];
  for (const word of text.trim().split(/\s+/)) {
    if (textWidth(word, style) > width) throw new SourceError(`${where}: "${word}" does not fit ${Math.floor(width)}px`);
    const last = lines.at(-1);
    if (last !== undefined && textWidth(`${last} ${word}`, style) <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

const round = (value) => Math.round(value * 10) / 10;

function svgLine(text, x, y, className, anchor = 'start') {
  return `<text x="${round(x)}" y="${round(y)}" text-anchor="${anchor}" class="${className}">${escapeHtml(text)}</text>`;
}

function perLocale(render) {
  return LOCALES.map((locale) => `<g lang="${locale}">${render(locale)}</g>`).join('');
}

function nodeLines(element, locale, width, where) {
  const lines = [];
  if (element.tag) {
    const tag = copyText(element.tag, locale);
    if (textWidth(tag, TEXT.tag) > width) throw new SourceError(`${where}: tag "${tag}" (${locale}) does not fit ${width}px`);
    lines.push({ text: tag, style: TEXT.tag, className: 'arch-node-tag' });
  }
  const label = element.name || copyText(element.label, locale);
  for (const text of wrap(label, TEXT.label, width, `${where} (${locale})`)) lines.push({ text, style: TEXT.label, className: 'arch-node-label' });
  if (element.sub) {
    for (const text of wrap(copyText(element.sub, locale), TEXT.sub, width, `${where} (${locale})`)) lines.push({ text, style: TEXT.sub, className: 'arch-node-sub' });
  }
  return lines;
}

// Wraps a node's lines to its box in every locale, and throws when they
// overflow it in any of them.
function assertFits(id, box, where) {
  const [, , w, h] = box;
  return Object.fromEntries(LOCALES.map((locale) => {
    const lines = nodeLines(elements[id], locale, w - 2 * PAD_X, `${where}: ${id}`);
    const height = lines.reduce((sum, line) => sum + line.style.line, 0);
    if (height > h - 2 * PAD_Y) throw new SourceError(`${where}: ${id} needs ${height}px of text in ${locale}, its box has ${h - 2 * PAD_Y}px`);
    return [locale, { lines, height }];
  }));
}

function renderBoundary(id, box, where) {
  const element = elements[id];
  const [x, y, w, h] = box;
  const labelX = element.style === 'rule' ? x : x + 14;
  const shape = element.style === 'rule'
    ? `<line x1="${x}" y1="${y + 0.5}" x2="${x + w}" y2="${y + 0.5}"/>`
    : `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="10"/>`;
  const label = perLocale((locale) => {
    const text = copyText(element.label, locale).toLocaleUpperCase(locale);
    if (labelX - x + textWidth(text, TEXT.group) > w - 8) throw new SourceError(`${where}: boundary label "${text}" does not fit ${id}`);
    return svgLine(text, labelX, y + 22, 'arch-group-label');
  });
  return `<g class="arch-boundary arch-boundary--${element.style}">${shape}${label}</g>`;
}

function renderNode(id, box, view, where) {
  const element = elements[id];
  const [x, y, w, h] = box;
  const fitted = assertFits(id, box, where);
  const classes = ['arch-node', `arch-node--${element.kind}`];
  if (element.owner) classes.push(`arch-node--owner-${element.owner}`);
  if (view.focus === id) classes.push('arch-node--focus');
  const texts = perLocale((locale) => {
    const { lines, height } = fitted[locale];
    let top = y + (h - height) / 2;
    return lines.map((line) => {
      const baseline = top + (line.style.line + line.style.size * 0.72) / 2;
      top += line.style.line;
      return svgLine(line.text, x + PAD_X, baseline, line.className);
    }).join('');
  });
  return `<g class="${classes.join(' ')}"><rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="6"/>${texts}</g>`;
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

// The horizontal run a label sits above, so it can be wrapped to fit it.
function horizontalRun(points, y) {
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    if (y1 === y && y2 === y) return Math.abs(x2 - x1);
  }
  return 0;
}

// Edge labels are wrapped to the room they have: a label beside a vertical
// line to the layout edge, a label above a horizontal line to that line's
// length.
function renderEdgeLabel(edge, route, layout, where) {
  const { size, line } = TEXT.edge;
  return perLocale((locale) => {
    const text = copyText(edge.label, locale);
    const name = `${where}: edge ${edge.from} -> ${edge.to} (${locale})`;
    const [mx, my] = route.labelAt;
    if (route.vertical) {
      const lines = wrap(text, TEXT.edge, layout.width - mx - 12, name);
      const first = my + size * 0.36 - ((lines.length - 1) * line) / 2;
      return lines.map((part, i) => svgLine(part, mx + 8, first + i * line, 'arch-edge-label')).join('');
    }
    const lines = wrap(text, TEXT.edge, horizontalRun(route.points, my) - 8, name);
    return lines.map((part, i) => svgLine(part, mx, my - 7 - (lines.length - 1 - i) * line, 'arch-edge-label', 'middle')).join('');
  });
}

function renderEdge(edge, layout, marker, where) {
  const fromBox = layout.nodes[edge.from];
  const toBox = layout.nodes[edge.to];
  if (!fromBox || !toBox) throw new SourceError(`${where}: edge ${edge.from} -> ${edge.to} names a node it lacks`);
  const route = routeEdge(edge, fromBox, toBox);
  const points = route.points.map(([px, py]) => `${round(px)},${round(py)}`).join(' ');
  const lineSvg = `<polyline points="${points}" class="arch-edge${edge.dashed ? ' arch-edge--dashed' : ''}" marker-end="url(#${marker})"/>`;
  return { line: lineSvg, label: edge.label ? renderEdgeLabel(edge, route, layout, where) : '' };
}

function renderLayout(view, name) {
  const layout = view.layouts[name];
  const where = `Diagram ${view.id} (${name})`;
  const ids = Object.keys(layout.nodes);
  for (const id of ids) {
    if (!elements[id]) throw new SourceError(`${where}: node ${id} is not a model element`);
  }
  const marker = `arrow-${view.id}-${name}`;
  const boundaries = ids.filter((id) => elements[id].kind === 'boundary');
  const others = ids.filter((id) => elements[id].kind !== 'boundary');
  const edges = layout.edges.map((edge) => renderEdge(edge, layout, marker, where));
  return [
    `<svg class="arch-svg arch-svg--${name}" viewBox="0 0 ${layout.width} ${layout.height}" aria-hidden="true" focusable="false">`,
    `<defs><marker id="${marker}" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,1 L10,5 L0,9 z" class="arch-arrow"/></marker></defs>`,
    ...boundaries.map((id) => renderBoundary(id, layout.nodes[id], where)),
    ...edges.map((edge) => edge.line),
    ...others.map((id) => renderNode(id, layout.nodes[id], view, where)),
    ...edges.map((edge) => edge.label),
    '</svg>',
  ].join('');
}

function elementName(id) {
  const element = elements[id];
  return element.name ? `<strong>${escapeHtml(element.name)}</strong>` : i18n(element.label, 'strong');
}

function contains([gx, gy, gw, gh], [x, y, w, h]) {
  return x >= gx && y >= gy && x + w <= gx + gw && y + h <= gy + gh;
}

// Outgoing edges, boundaries included: every estate edge starts or ends on a
// group, so dropping them would leave the list without its connections.
function renderOutgoing(layout, id) {
  return layout.edges
    .filter((edge) => edge.from === id)
    .map((edge) => `<span class="arch-view-list__to" data-edge="${edge.from}:${edge.to}">&rarr; ${elementName(edge.to)}${edge.label ? ` (${i18n(edge.label)})` : ''}</span>`)
    .join('');
}

function renderViewItem(layout, id) {
  const element = elements[id];
  const tag = element.tag ? ` (${i18n(element.tag)})` : '';
  const sub = element.sub ? ` <span class="arch-view-list__sub">${i18n(element.sub)}</span>` : '';
  return `<li>${elementName(id)}${tag}${sub}${renderOutgoing(layout, id)}</li>`;
}

// Each element goes under the group whose box holds it, so the list says what
// the diagram shows rather than following the order nodes are declared in.
export function renderViewList(layout) {
  const ids = Object.keys(layout.nodes);
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
    const owner = groups.find((group) => contains(layout.nodes[group], layout.nodes[id]));
    if (owner) groupEntries.get(owner).members.push(id);
    else entries.push({ id });
  }
  const items = entries.map((entry) => {
    if (!entry.group) return renderViewItem(layout, entry.id);
    const members = entry.members.map((id) => renderViewItem(layout, id)).join('');
    return `<li class="arch-view-list__group">${i18n(elements[entry.group].label, 'strong')}${renderOutgoing(layout, entry.group)}<ol>${members}</ol></li>`;
  });
  return `<ol class="arch-view-list">${items.join('')}</ol>`;
}

// Two drawings per view, wide and narrow, which CSS swaps by width. Both are
// hidden from assistive tech; the visually hidden list is their text.
export function renderView(view) {
  const svgs = Object.keys(view.layouts).map((name) => renderLayout(view, name)).join('');
  const text = `<div class="visually-hidden">${i18n(view.title, 'p')}${i18n(view.desc, 'p')}${renderViewList(view.layouts.narrow)}</div>`;
  return `<figure class="arch-figure" data-view="${view.id}"><div class="arch-diagram">${svgs}</div>${text}</figure>`;
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

const statusKey = (status) => `status${status}`;
const decisionUrl = (id) => `/architecture/decisions/${id}/`;

// The five decisions: what each buys and costs, then a cell that counts the
// rest of the register so the number cannot go stale.
function renderKeyDecisions(decisions) {
  const byId = new Map(decisions.map((decision) => [decision.id, decision]));
  const shown = new Set();
  const cards = keyDecisions.map(({ ids, key }) => {
    for (const id of ids) {
      const decision = byId.get(id);
      if (!decision) throw new SourceError(`The key decisions name ADR-${id}, which khe-architecture lacks`);
      if (decision.status === 'Superseded') {
        throw new SourceError(`The key decisions name ADR-${id}, superseded by ADR-${decision.supersededBy.join(', ADR-')}`);
      }
      shown.add(id);
    }
    const tag = ids.map((id) => `ADR-${id}`).join(' · ');
    return `<article class="arch-pick"><p class="arch-tag">${tag}</p>${i18n(`${key}Title`, 'h3')}<p>${i18n('buysLabel', 'span', ' class="arch-tag arch-tag--buys"')}${i18n(`${key}Buys`)}</p><p>${i18n('costsLabel', 'span', ' class="arch-tag arch-tag--costs"')}${i18n(`${key}Costs`)}</p><a href="${decisionUrl(ids[0])}">${i18n('readAdr')} ADR-${ids[0]}</a></article>`;
  });
  const rest = decisions.length - shown.size;
  const more = `<a class="arch-pick arch-pick--more" href="#decisions">${i18n('registerTag', 'span', ' class="arch-tag"')}<span class="arch-pick__title">${rest} ${i18n('moreDecisions')}</span>${i18n('moreDecisionsBody')}</a>`;
  return `<div class="arch-picks">${cards.join('')}${more}</div>`;
}

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

function renderDecisionPage(template, decision, byId, rewriteLink) {
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
  return fillCopy(fillTemplate(template, {
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
      rewriteLink,
    }),
    sourceUrl: `${SOURCE_BASE}${decision.file}`,
  }), COPY.en, 'copy.js COPY.en');
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The snapshot's period in each language, shown by html[lang]:
// 22.10.–19.11.2026 and 22 Oct – 19 Nov 2026.
function period(since, until) {
  const [sy, sm, sd] = since.split('-');
  const [uy, um, ud] = until.split('-');
  const sameYear = sy === uy;
  const et = `${sd}.${sm}.${sameYear ? '' : sy}–${ud}.${um}.${uy}`;
  const en = `${Number(sd)} ${MONTHS_EN[sm - 1]}${sameYear ? '' : ` ${sy}`} – ${Number(ud)} ${MONTHS_EN[um - 1]} ${uy}`;
  return `<span lang="et">${et}</span><span lang="en">${en}</span>`;
}

function duration(minutes) {
  const hours = Math.floor(minutes / 60);
  if (!hours) return `${minutes} min`;
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
}

// The findings rows on /agents/: what each check acted on and dropped, with
// code and security review as one row, the bars scaled to the longest.
export function findingRows(loop) {
  const sum = (a, b) => Object.fromEntries(Object.keys(a).map((key) => [key, a[key] + b[key]]));
  return [
    { title: 'step03Title', who: 'whoSeparate', counts: loop.planReview },
    { title: 'step06Title', who: 'whoSeparate', counts: loop.planCheck },
    { title: 'agentsCodeRow', who: 'whoAgent', counts: sum(loop.codeReview, loop.securityReview) },
  ];
}

// Every value a data-metric element on /agents/ can name, as HTML.
function agentLoopMetrics(loop) {
  const looked = loop.plans - loop.operator.notRun - loop.operator.pending;
  return {
    period: period(loop.since, loop.until),
    plans: String(loop.plans),
    median: loop.planToPush.count ? duration(loop.planToPush.medianMinutes) : '–',
    reverted: `${loop.revertedPlans} / ${loop.pushedPlans}`,
    looked: `${looked} / ${loop.plans}`,
  };
}

function renderFindings(loop) {
  const rows = findingRows(loop);
  const longest = Math.max(1, ...rows.map(({ counts }) => counts.acted + counts.dropped));
  const width = (count) => `${round((100 * count) / longest)}%`;
  const items = rows.map(({ title, who, counts }) => {
    const dropped = counts.dropped > 0;
    const bar = `<span class="arch-bar" aria-hidden="true"><span class="arch-bar__acted" style="width: ${width(counts.acted)}"></span>${dropped ? `<span class="arch-bar__dropped" style="width: ${width(counts.dropped)}"></span>` : ''}</span>`;
    const acted = `<strong>${counts.acted} <span data-i18n="${counts.acted === 1 ? 'agentsFix' : 'agentsFixes'}"></span></strong>`;
    const droppedText = dropped ? `, ${counts.dropped} <span data-i18n="agentsDroppedCount"></span>` : '';
    return `<li class="arch-found"><p class="arch-found__name"><span class="arch-found__title" data-i18n="${title}"></span><span class="arch-found__who" data-i18n="${who}"></span></p><div class="arch-found__data">${bar}<p class="arch-found__count">${acted}${droppedText}</p></div></li>`;
  });
  return `<ul class="arch-found-list">${items.join('')}</ul>`;
}

// Fills every empty data-metric element; a name the values lack fails the build.
function fillMetrics(html, values, file) {
  return fillEmpty(html, 'data-metric', (attribute, name) => {
    if (!(name in values)) throw new SourceError(`${file} names the metric ${name}, which the snapshot does not give`);
    return values[name];
  });
}

// The pages the build fills: each gets the views whose `page` it is, then its
// own markers.
export const ARCHITECTURE_PAGES = [
  { path: 'architecture/index.html', page: 'architecture', markers: (sources) => ({ blocks: renderBlocks(sources) }) },
  {
    path: 'architecture/decisions/index.html',
    page: 'decisions',
    markers: (sources) => ({
      'key-decisions': renderKeyDecisions(sources.decisions),
      register: renderRegister(sources.decisions),
      'product-decisions': renderProductDecisions(),
    }),
  },
  {
    path: 'agents/index.html',
    page: 'agents',
    markers: (sources) => ({ 'agents-findings': renderFindings(sources.agentLoop) }),
    metrics: (sources) => agentLoopMetrics(sources.agentLoop),
  },
];

export async function renderArchitecture(landingDist, sources) {
  const problems = modelMismatches(sources);
  if (problems.length) throw new SourceError(problems.join('\n'));
  for (const view of views) {
    if (!ARCHITECTURE_PAGES.some(({ page }) => page === view.page)) throw new SourceError(`Diagram ${view.id} is on the page ${view.page}, which the build does not fill`);
  }

  for (const { path, page, markers, metrics } of ARCHITECTURE_PAGES) {
    const pagePath = join(landingDist, path);
    let html = await readFile(pagePath, 'utf8');
    for (const view of views.filter((view) => view.page === page)) html = replaceMarker(html, `view:${view.id}`, renderView(view), pagePath);
    for (const [marker, content] of Object.entries(markers(sources))) html = replaceMarker(html, marker, content, pagePath);
    if (metrics) html = fillMetrics(html, metrics(sources), pagePath);
    // renderLanguagePages fills its copy, once per language (estate ADR-048).
    await writeFile(pagePath, html);
  }

  const template = await readFile(join(root, 'scripts', 'templates', 'decision.html'), 'utf8');
  const byId = new Map(sources.decisions.map((decision) => [decision.id, decision]));
  const privateRepoUrls = sources.repos.filter((repo) => repo.visibility === 'private').map((repo) => repo.url);
  const rewriteLink = adrLinkRewriter(new Set(byId.keys()), privateRepoUrls);
  for (const decision of sources.decisions) {
    const directory = join(landingDist, 'architecture', 'decisions', decision.id);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'index.html'), renderDecisionPage(template, decision, byId, rewriteLink));
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
