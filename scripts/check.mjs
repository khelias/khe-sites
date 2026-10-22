import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSources, runReportingSourceErrors } from './architecture-sources.mjs';
import { adrLinkRewriter, MarkdownError, renderMarkdown } from './markdown.mjs';
import { views } from './architecture-model.mjs';
import { ARCHITECTURE_PAGES, modelMismatches } from './render-architecture.mjs';
import { ASSET_REFERENCE, assetVersion, builtPages as listBuiltPages } from './asset-versions.mjs';
import { ROOM_IDS } from '@khelias/ui/rooms';
import { themeInitScript } from '@khelias/ui/theme';
import { COPY } from '../src/landing/architecture/copy.js';
import { SITE_FOOTER_COPY, SITE_HEADER_COPY, THEME_STORAGE_KEY } from '../src/shared/site-locale.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// A dark rule follows the family pattern (DESIGN.md Themes): under the media query on
// :root:not([data-theme="light"]), and the same declarations again on :root[data-theme="dark"],
// so a stored choice reaches it. Returns what breaks the pattern.
function unpairedDarkRules(sheet) {
  const SYSTEM = ':root:not([data-theme="light"])';
  const FORCED = ':root[data-theme="dark"]';
  sheet = sheet.replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations = (body) => body.split(';').map((line) => line.trim()).filter((line) => line && !line.startsWith('color-scheme')).sort().join(';');
  const topLevel = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < sheet.length; i += 1) {
    if (sheet[i] === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (sheet[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        const selector = sheet.slice(sheet.lastIndexOf('}', start) + 1, start).trim();
        topLevel.push([selector, sheet.slice(start + 1, i)]);
      }
    }
  }
  const forcedRules = new Map(topLevel.filter(([selector]) => selector.startsWith(FORCED)));
  const problems = [];
  for (const [selector, body] of topLevel) {
    if (!selector.includes('prefers-color-scheme')) continue;
    if (selector !== '@media (prefers-color-scheme: dark)') {
      problems.push(`${selector} is not the family's dark pattern`);
      continue;
    }
    for (const [, inner, rule] of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const name = inner.trim();
      if (!name.startsWith(SYSTEM)) {
        problems.push(`${name} under prefers-color-scheme does not start with ${SYSTEM}`);
        continue;
      }
      const forced = FORCED + name.slice(SYSTEM.length);
      if (!forcedRules.has(forced)) problems.push(`${name} has no ${forced} twin`);
      else if (declarations(forcedRules.get(forced)) !== declarations(rule)) problems.push(`${name} and ${forced} differ`);
    }
  }
  const topLevelQueries = topLevel.filter(([selector]) => selector.includes('prefers-color-scheme')).length;
  if ((sheet.match(/prefers-color-scheme/g) || []).length > topLevelQueries) {
    problems.push('a prefers-color-scheme query sits inside another rule');
  }
  return problems;
}

await runReportingSourceErrors(async () => {
  const htmlFiles = [
    'src/landing/index.html',
    ...ARCHITECTURE_PAGES.map(({ path }) => `src/landing/${path}`),
    'scripts/templates/decision.html',
    'src/landing/privacy/index.html',
    'src/games/index.html',
    'src/games/privacy/index.html',
  ];

  const requiredMarkers = [
    '/assets/site-locale.js',
    '/assets/analytics-consent.js',
    '/assets/site-header.css',
    '/assets/site.css',
  ];

  for (const relativePath of htmlFiles) {
    const content = await readFile(join(root, relativePath), 'utf8');
    for (const marker of requiredMarkers) {
      if (!content.includes(marker)) {
        throw new Error(`${relativePath} is missing ${marker}`);
      }
    }
    if (content.includes('<style>')) {
      throw new Error(`${relativePath} still contains inline CSS`);
    }
    if (content.includes('href="/fonts/') || content.includes("url('/fonts/")) {
      throw new Error(`${relativePath} still references root-level fonts`);
    }

    for (const match of content.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
      const script = match[1].replace(/^\s*import\s.+;\s*$/gm, '');
      new Function(script);
    }
  }

  const sourceFiles = [
    ...htmlFiles,
    'src/shared/analytics-consent.js',
    'src/shared/site-locale.js',
    'src/shared/site-header.css',
    'src/shared/site.css',
    'scripts/templates/house3d-header.html',
    'scripts/house3d-demo.mjs',
    'src/landing/architecture/architecture.js',
    'src/landing/architecture/copy.js',
  ];
  const bannedText = [
    'Tarkvaraarhitekt töö poolest',
    'Nokitseja loomult',
    'Ise majutatud Tallinnas',
    'Self-hosted in Tallinn',
    'Software architect in Tallinn',
  ];

  // The pre-family tokens are gone from khe-sites' own sources. dist is not checked: /ha/'s
  // house3d-card.js from khe-home-assistant defines --bg and friends in its shadow DOM.
  const oldToken = /(?<![\w-])--(bg|text|text-dim|text-muted|text-faint|border|border-hover|card-bg|accent|accent-bright|accent-deep|accent-warm|accent-cool|accent-border|display-font)(?![\w-])/;
  for (const relativePath of sourceFiles) {
    const content = await readFile(join(root, relativePath), 'utf8');
    const oldUse = content.match(oldToken);
    if (oldUse) throw new Error(`${relativePath} still uses ${oldUse[0]}; the family tokens replace it (DESIGN.md)`);
    const versioned = [...content.matchAll(ASSET_REFERENCE)].find((match) => match[2] !== undefined);
    if (versioned) throw new Error(`${relativePath} hand-versions ${versioned[0]}; the build stamps ?v= from the file's hash`);
    for (const text of bannedText) {
      if (content.includes(text)) {
        throw new Error(`${relativePath} contains stale copy: ${text}`);
      }
    }
  }

  // DESIGN.md's frontmatter colours are the light :root tokens of site-header.css, and the dark
  // block names the same tokens (unpairedDarkRules below keeps the two dark blocks equal).
  const tokenCss = await readFile(join(root, 'src/shared/site-header.css'), 'utf8');
  const tokenBlock = (selector, css = tokenCss, name = 'site-header.css') => {
    const start = css.search(new RegExp(`^\\s*${selector.replace(/[[\]().*+?^$|\\]/g, '\\$&')} \\{`, 'm'));
    if (start < 0) throw new Error(`${name} has no ${selector} block`);
    const body = css.slice(start, css.indexOf('}', start));
    return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,8})\s*;/gi)].map(([, name, value]) => [name, value.toLowerCase()]));
  };
  const design = await readFile(join(root, 'DESIGN.md'), 'utf8');
  const designColours = design.match(/^colors:\n((?: {2}.+\n)+)/m)?.[1] ?? '';
  const frontmatter = Object.fromEntries([...designColours.matchAll(/^ {2}([\w-]+): "(#[0-9a-f]{3,8})"$/gim)].map(([, name, value]) => [name, value.toLowerCase()]));
  const { primary, ...familyColours } = frontmatter;
  const light = tokenBlock(':root');
  const sameTokens = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  if (!Object.keys(light).length || !sameTokens(familyColours, light)) {
    throw new Error(`DESIGN.md colours ${JSON.stringify(familyColours)} differ from the light :root tokens ${JSON.stringify(light)} in site-header.css`);
  }
  if (primary !== light.ink) throw new Error('DESIGN.md primary is not the ink token');
  const forcedDark = tokenBlock(':root[data-theme="dark"]');
  if (Object.keys(light).sort().join() !== Object.keys(forcedDark).sort().join()) {
    throw new Error('site-header.css: :root[data-theme="dark"] names other tokens than the light :root');
  }
  // The consent banner renders on game pages without the family tokens, so it reads only its own
  // --khe-consent-* copy of them, equal to site-header.css in each theme (estate ADR-019).
  const consentName = 'analytics-consent.js';
  const consentCss = (await readFile(join(root, 'src/shared', consentName), 'utf8')).match(/style\.textContent = `([^`]*)`/)?.[1];
  if (!consentCss) throw new Error(`${consentName} has no style.textContent template`);
  const foreignVar = consentCss.match(/var\((--(?!khe-consent-)[\w-]+)/);
  if (foreignVar) throw new Error(`${consentName} reads ${foreignVar[1]}; the banner uses only its own --khe-consent-* values`);
  const consentLight = tokenBlock('.khe-analytics-consent', consentCss, consentName);
  const consentDark = tokenBlock(':root[data-theme="dark"] .khe-analytics-consent', consentCss, consentName);
  const consentNames = Object.keys(consentLight);
  if (!consentNames.length || consentNames.some((name) => !name.startsWith('khe-consent-'))) {
    throw new Error(`${consentName}: .khe-analytics-consent sets ${consentNames.join(', ') || 'nothing'}, not only --khe-consent-* values`);
  }
  for (const [theme, own, family] of [['light', consentLight, light], ['dark', consentDark, forcedDark]]) {
    const expected = Object.fromEntries(consentNames.map((name) => [name, family[name.slice('khe-consent-'.length)]]));
    if (!sameTokens(own, expected)) {
      throw new Error(`${consentName}: the ${theme} values ${JSON.stringify(own)} are not site-header.css's ${JSON.stringify(expected)}`);
    }
  }
  const consentUnpaired = unpairedDarkRules(consentCss);
  if (consentUnpaired.length) throw new Error(consentUnpaired.map((message) => `${consentName}: ${message}`).join('\n'));
  // The rooms list's dots are @khelias/ui's values (estate ADR-018); each room's light and dark
  // value is its accent in DESIGN.md's Colors table.
  const packageCss = await readFile(fileURLToPath(import.meta.resolve('@khelias/ui/site-header.css')), 'utf8');
  const packageDots = (selector) => tokenBlock(selector, packageCss, "@khelias/ui's site-header.css");
  const designTable = Object.fromEntries([...design.matchAll(/^\| ([\w-]+) \| (#[0-9a-f]{6}) \| (#[0-9a-f]{6}) \|/gim)]
    .map(([, name, lightValue, darkValue]) => [name, [lightValue.toLowerCase(), darkValue.toLowerCase()]]));
  const dots = [packageDots(':where(.site-header, .language-switcher:not(.site-header *))'), packageDots(':where(:root[data-theme="dark"] .site-header)')];
  for (const id of ROOM_IDS) {
    const expected = designTable[id];
    if (!expected) throw new Error(`DESIGN.md's Colors table has no row for the room ${id}`);
    dots.forEach((values, theme) => {
      const value = values[`khe-header-room-${id}`];
      if (value !== expected[theme]) {
        throw new Error(`@khelias/ui's ${theme ? 'dark' : 'light'} dot for ${id} is ${value}, DESIGN.md says ${expected[theme]}`);
      }
    });
  }

  for (const relativePath of htmlFiles) {
    const content = await readFile(join(root, relativePath), 'utf8');
    for (const [scheme, paper] of [['light', light.paper], ['dark', forcedDark.paper]]) {
      if (!content.includes(`<meta name="theme-color" content="${paper}" media="(prefers-color-scheme: ${scheme})">`)) {
        throw new Error(`${relativePath}: the ${scheme} theme-color is not the ${scheme} paper token ${paper}`);
      }
    }
  }

  // Every data-i18n key of a page with an inline COPY is in both of its languages. The source
  // page, not the built one: the header and footer keys live in SITE_HEADER_COPY and SITE_FOOTER_COPY.
  for (const relativePath of ['src/landing/index.html', 'src/games/index.html', 'src/landing/privacy/index.html', 'src/games/privacy/index.html']) {
    const html = await readFile(join(root, relativePath), 'utf8');
    const literal = html.match(/const COPY = (\{[\s\S]*?\n\s*\});/)?.[1];
    if (!literal) throw new Error(`${relativePath} has no inline COPY`);
    const pageCopy = new Function(`return ${literal}`)();
    for (const [, key] of html.matchAll(/data-i18n(?:-html|-aria)?="([^"]+)"/g)) {
      for (const locale of ['et', 'en']) {
        if (typeof pageCopy[locale]?.[key] !== 'string') throw new Error(`${relativePath} uses ${key}, which its COPY.${locale} lacks`);
      }
    }
  }

  await import(join(root, 'src/shared/site-locale.js'));

  function expectRender(name, source, expected) {
    const html = renderMarkdown(source, { file: name, rewriteLink: adrLinkRewriter(new Set(['008'])) });
    if (!html.includes(expected)) {
      throw new Error(`Markdown fixture "${name}": expected ${expected} in\n${html}`);
    }
  }

  function expectThrow(name, source, expected) {
    try {
      renderMarkdown(source, { file: name, firstLine: 10, rewriteLink: adrLinkRewriter(new Set(['008'])) });
    } catch (error) {
      if (error instanceof MarkdownError && error.message.includes(expected)) return;
      throw new Error(`Markdown fixture "${name}": wrong error ${error.message}`);
    }
    throw new Error(`Markdown fixture "${name}": rendered instead of failing`);
  }

  expectRender('escaping', 'Pin `image: <name>:main@sha256:<digest>` & go.', '<code>image: &lt;name&gt;:main@sha256:&lt;digest&gt;</code> &amp; go.');
  expectRender('nested list', '- top\n  - inner one\n    continued\n  - inner two', '<ul><li>top<ul><li>inner one continued</li><li>inner two</li></ul></li></ul>');
  expectRender('two-digit ordered item', '10. **Ten.**\n    still ten', '<ol start="10"><li><strong>Ten.</strong> still ten</li></ol>');
  expectRender('start across a heading', '### A\n\n1. one\n\n### B\n\n5. five', '<h3 id="b">B</h3>\n<ol start="5"><li>five</li></ol>');
  expectRender('blank-separated items', '1. one\n\n2. two\n\nAfter.', '<ol start="1"><li>one</li><li>two</li></ol>\n<p>After.</p>');
  expectRender('code in link text', 'See [`khe-homelab`](https://github.com/khelias/khe-homelab).', '<a href="https://github.com/khelias/khe-homelab"><code>khe-homelab</code></a>');
  expectRender('bold in a list item', '- **Visibility.** Per repo, *really*.', '<li><strong>Visibility.</strong> Per repo, <em>really</em>.</li>');
  expectRender('ADR link rewrite', 'As [ADR-008](008-container-images.md) says.', '<a href="/architecture/decisions/008/">ADR-008</a>');
  expectThrow('table', 'Text\n\n| a | b |', 'table');
  expectThrow('fence', '```\ncode\n```', 'fenced block');
  expectThrow('deep nesting', '- a\n  - b\n    - c', 'nested two levels');
  expectThrow('relative link', 'See [doc](../README.md).', 'relative link');
  expectThrow('unknown ADR', 'See [ADR-099](099-nothing.md).', 'ADR-099');
  expectThrow('raw HTML', 'A <b>bold</b> claim.', 'raw HTML');
  expectThrow('line number', 'one\n\n> quote', 'line number:12');
  expectThrow('inline line number', 'one\ntwo <b>three</b>', 'inline line number:11');

  const sources = await loadSources();
  const knownIds = new Set(sources.decisions.map((decision) => decision.id));
  for (const decision of sources.decisions) {
    renderMarkdown(decision.body, {
      file: decision.file,
      firstLine: decision.bodyStartLine,
      rewriteLink: adrLinkRewriter(knownIds),
    });
  }

  const mismatches = modelMismatches(sources);
  if (mismatches.length) throw new Error(mismatches.join('\n'));

  for (const [name, copy] of [
    ['copy.js: COPY', COPY],
    ['site-locale.js: SITE_HEADER_COPY', SITE_HEADER_COPY],
    ['site-locale.js: SITE_FOOTER_COPY', SITE_FOOTER_COPY],
  ]) {
    for (const locale of Object.keys(copy)) {
      for (const key of Object.keys(copy.en)) {
        if (typeof copy[locale][key] !== 'string') throw new Error(`${name}.${locale} has no ${key}`);
      }
      for (const key of Object.keys(copy[locale])) {
        if (!(key in copy.en)) throw new Error(`${name}.${locale}.${key} has no ${name}.en counterpart`);
      }
    }
  }
  for (const script of ['src/landing/architecture/architecture.js', 'src/landing/architecture/copy.js']) {
    execFileSync(process.execPath, ['--check', join(root, script)], { stdio: 'inherit' });
  }

  for (const view of views) {
    const [wide, narrow] = ['wide', 'narrow'].map((name) => view.layouts[name]);
    const wideIds = Object.keys(wide.nodes).sort().join(' ');
    const narrowIds = Object.keys(narrow.nodes).sort().join(' ');
    if (wideIds !== narrowIds) throw new Error(`Diagram ${view.id}: the wide layout names ${wideIds}, the narrow one ${narrowIds}`);
    for (const [name, layout] of Object.entries(view.layouts)) {
      for (const [id, [x, y, w, h]] of Object.entries(layout.nodes)) {
        if (x < 0 || y < 0 || x + w > layout.width || y + h > layout.height) {
          throw new Error(`Diagram ${view.id} (${name}): ${id} at [${x}, ${y}, ${w}, ${h}] leaves the ${layout.width}x${layout.height} layout`);
        }
      }
    }
  }

  const css = await readFile(join(root, 'src/shared/site.css'), 'utf8');
  const archCss = css.slice(css.indexOf('/* Architecture */'), css.indexOf('/* End architecture */'));
  if (!archCss || css.indexOf('/* End architecture */') < 0) throw new Error('site.css has no Architecture section markers');
  for (const banned of ['animation', 'drop-shadow', 'box-shadow', 'gradient']) {
    if (archCss.includes(banned)) throw new Error(`site.css Architecture section uses ${banned}`);
  }
  for (const name of ['site-header.css', 'site.css']) {
    const sheet = await readFile(join(root, 'src/shared', name), 'utf8');
    const unpaired = unpairedDarkRules(sheet);
    if (unpaired.length) throw new Error(unpaired.map((message) => `${name}: ${message}`).join('\n'));
    for (const match of sheet.matchAll(/url\(\s*['"]?\/assets\/fonts\/([^'")\s]+)['"]?\s*\)/g)) {
      if (!existsSync(join(root, 'src/shared/fonts', match[1]))) throw new Error(`${name} loads /assets/fonts/${match[1]}, which src/shared/fonts lacks`);
    }
  }

  // The rest checks the build output; npm run check builds first.
  const landing = join(root, 'dist/landing');
  const builtPages = [
    ...ARCHITECTURE_PAGES.map(({ path }) => path),
    ...sources.decisions.map((decision) => `architecture/decisions/${decision.id}/index.html`),
  ];
  for (const page of builtPages) {
    if (!existsSync(join(landing, page))) throw new Error(`dist/landing/${page} was not built`);
    const html = await readFile(join(landing, page), 'utf8');
    // SVG path data (the footer's GitHub mark) reads like an address, so it is left out.
    const ipv4 = html.replace(/\sd="[^"]*"/g, '').match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    if (ipv4) throw new Error(`dist/landing/${page} contains an IPv4 address: ${ipv4[0]}`);
    const hostPort = html.match(/\b(?:localhost|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}):\d{2,5}\b/i);
    if (hostPort) throw new Error(`dist/landing/${page} contains a host:port: ${hostPort[0]}`);
    const empty = html.match(/<([a-z][a-z0-9]*)\b[^>]*\sdata-i18n(?:-html)?="([^"]+)"[^>]*><\/\1>/);
    if (empty) throw new Error(`dist/landing/${page} leaves ${empty[2]} empty`);
    for (const match of html.matchAll(/data-i18n(?:-html|-aria)?="([^"]+)"/g)) {
      if (!(match[1] in COPY.en) && !(match[1] in SITE_HEADER_COPY.en) && !(match[1] in SITE_FOOTER_COPY.en)) {
        throw new Error(`dist/landing/${page} uses ${match[1]}, which copy.js, SITE_HEADER_COPY and SITE_FOOTER_COPY lack`);
      }
    }
    for (const match of html.matchAll(/href="\/architecture\/decisions\/(\d{3})\//g)) {
      if (!existsSync(join(landing, 'architecture/decisions', match[1], 'index.html'))) {
        throw new Error(`dist/landing/${page} links ADR-${match[1]}, which has no page`);
      }
    }
  }
  // Each page draws two SVGs and a text list per view whose `page` it is, and no other diagram.
  const filled = {};
  for (const { path, page } of ARCHITECTURE_PAGES) {
    const html = await readFile(join(landing, path), 'utf8');
    filled[page] = html;
    const pageViews = views.filter((view) => view.page === page);
    const svgCount = (html.match(/<svg class="arch-svg\b/g) || []).length;
    if (svgCount !== 2 * pageViews.length) throw new Error(`dist/landing/${path} has ${svgCount} diagram <svg>, expected ${2 * pageViews.length}`);
    if (html.includes('<!--')) throw new Error(`dist/landing/${path} still has an unfilled placeholder`);
    for (const view of pageViews) {
      const start = html.indexOf(`<figure class="arch-figure" data-view="${view.id}"`);
      const figure = start < 0 ? '' : html.slice(start, html.indexOf('</figure>', start));
      const textStart = figure.indexOf('class="visually-hidden"');
      const text = textStart < 0 ? '' : figure.slice(textStart);
      if (!text) throw new Error(`dist/landing/${path} has no text list for the ${view.id} diagram`);
      for (const edge of view.layouts.narrow.edges) {
        if (!text.includes(`data-edge="${edge.from}:${edge.to}"`)) throw new Error(`The ${view.id} text list lacks the edge ${edge.from} -> ${edge.to}`);
      }
    }
  }
  const mainPage = filled.architecture;
  const uptime = mainPage.slice(mainPage.indexOf('id="uptime"'), mainPage.indexOf('</section>', mainPage.indexOf('id="uptime"')));
  const layerList = uptime.match(/<ol class="arch-layers">([\s\S]*?)<\/ol>/);
  const layerRows = layerList ? (layerList[1].match(/<li\b/g) || []).length : 0;
  const readmeLayers = sources.homelab.resilienceLayers.length;
  if (layerRows !== readmeLayers) {
    throw new Error(`#uptime lists ${layerRows} resilience layers, the khe-homelab README has ${readmeLayers}`);
  }
  // The register lives on /architecture/decisions/ at id="decisions", where the ADR pages and the
  // key decisions' last cell link it.
  if (!/id="decisions"[\s\S]*<table class="arch-table arch-register">/.test(filled.decisions)) {
    throw new Error('dist/landing/architecture/decisions/index.html has no register under id="decisions"');
  }
  for (const page of ['architecture', 'agents']) {
    if (filled[page].includes('arch-register')) throw new Error(`the ${page} page carries the register, which belongs on /architecture/decisions/`);
  }
  const sitemap = await readFile(join(landing, 'sitemap.xml'), 'utf8');
  for (const { path } of ARCHITECTURE_PAGES) {
    const url = `/${path.replace(/index\.html$/, '')}`;
    if (!sitemap.includes(`<loc>https://khe.ee${url}</loc>`)) throw new Error(`sitemap.xml does not list ${url}`);
  }
  for (const decision of sources.decisions) {
    if (!sitemap.includes(`<loc>https://khe.ee/architecture/decisions/${decision.id}/</loc>`)) {
      throw new Error(`sitemap.xml does not list ADR-${decision.id}`);
    }
  }

  // the house demo, built from khe-home-assistant's test house; its dashboard is either the
  // hand-written dashboard.js of the old demo or the generated dashboard.json of the new one
  const demo = join(landing, 'ha');
  for (const file of ['index.html', 'demo.js', 'cards.js', 'house3d-card.js', 'model.json']) {
    if (!existsSync(join(demo, file))) throw new Error(`dist/landing/ha/${file} was not built`);
  }
  const dashboardJson = join(demo, 'dashboard.json');
  if (existsSync(dashboardJson)) {
    const dashboard = JSON.parse(await readFile(dashboardJson, 'utf8'));
    if (!Array.isArray(dashboard.views) || !dashboard.views.length) throw new Error('dist/landing/ha/dashboard.json has no views');
    // the same demo in English, which the page loads with ?lang=en, and the scenarios in both
    for (const file of ['dashboard.en.json', 'states.en.json', 'series.en.json', 'model.en.json', 'scenarios.json', 'scenarios.en.json']) {
      if (!existsSync(join(demo, file))) throw new Error(`dist/landing/ha/${file} was not built`);
    }
    const dashboardEn = JSON.parse(await readFile(join(demo, 'dashboard.en.json'), 'utf8'));
    if (!Array.isArray(dashboardEn.views) || !dashboardEn.views.length) throw new Error('dist/landing/ha/dashboard.en.json has no views');
  } else if (!existsSync(join(demo, 'dashboard.js'))) {
    throw new Error('dist/landing/ha has neither dashboard.json nor dashboard.js');
  }
  const demoModel = JSON.parse(await readFile(join(demo, 'model.json'), 'utf8'));
  if (!Array.isArray(demoModel.walls) || !demoModel.walls.length) throw new Error('dist/landing/ha/model.json has no walls');
  if (!sitemap.includes('<loc>https://khe.ee/ha/</loc>')) throw new Error('sitemap.xml does not list /ha/');
  const demoPage = await readFile(join(demo, 'index.html'), 'utf8');
  for (const marker of ['/assets/site-header.css', 'class="site-header site-header--fixed"', 'data-lang-option="et"', 'data-lang-option="en"']) {
    if (!demoPage.includes(marker)) throw new Error(`dist/landing/ha/index.html is missing ${marker}`);
  }
  for (const match of demoPage.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
    new Function(match[1].replace(/^\s*import\s.+;\s*$/gm, ''));
  }

  // Every built page carries the filled site header, and every .css and .js
  // it links carries the hash of the built file. Every page but /ha/ has the theme toggle, the
  // pre-paint theme script in <head> before the first stylesheet, and the footer; /ha/, dark
  // until the house view has a light theme, has none of them.
  for (const site of ['landing', 'games']) {
    const siteDist = join(root, 'dist', site);
    const versions = new Map();
    for (const file of await listBuiltPages(siteDist)) {
      const page = file.slice(siteDist.length + 1);
      const html = await readFile(file, 'utf8');
      const headers = (html.match(/<header class="site-header[ "]/g) || []).length;
      if (headers !== 1) throw new Error(`dist/${site}/${page} has ${headers} site headers, expected 1`);
      if (!html.includes('data-lang-option="et"') || !html.includes('data-lang-option="en"')) {
        throw new Error(`dist/${site}/${page} has no ET/EN language switcher`);
      }
      for (const marker of ['site-header', 'site-theme', 'site-footer']) {
        if (html.includes(`<!-- ${marker}`)) throw new Error(`dist/${site}/${page} has an unfilled ${marker} marker`);
      }
      const house = site === 'landing' && page === 'ha/index.html';
      const toggles = (html.match(/<button class="site-header__theme"/g) || []).length;
      const footers = (html.match(/<footer class="site-footer"/g) || []).length;
      const head = html.slice(0, html.indexOf('</head>'));
      const initAt = head.indexOf(`<script>${themeInitScript(THEME_STORAGE_KEY)}</script>`);
      const firstStylesheet = head.search(/<link rel="stylesheet"/);
      if (house) {
        if (toggles || footers || html.includes(THEME_STORAGE_KEY)) throw new Error('dist/landing/ha/index.html has a theme toggle, the theme script or a footer; the house view stays dark');
      } else {
        if (toggles !== 1) throw new Error(`dist/${site}/${page} has ${toggles} theme toggles, expected 1`);
        if (footers !== 1) throw new Error(`dist/${site}/${page} has ${footers} site footers, expected 1`);
        if (initAt < 0 || firstStylesheet < 0 || initAt > firstStylesheet) throw new Error(`dist/${site}/${page} lacks the theme script in <head> before the first stylesheet`);
      }
      const htmlTag = html.match(/<html\b[^>]*>/)?.[0] ?? '';
      const room = htmlTag.match(/\sdata-room="([^"]*)"/)?.[1];
      if (!ROOM_IDS.includes(room)) throw new Error(`dist/${site}/${page} has no data-room on <html> from ${ROOM_IDS.join(', ')}`);
      // The rooms menu (estate ADR-018): every page but the khe.ee landing, with its own room current.
      const roomButtons = [...html.matchAll(/<button class="site-header__rooms"[^>]*\sdata-khe-room="([^"]*)"/g)].map((match) => match[1]);
      const expectedButtons = site === 'landing' && page === 'index.html' ? [] : [room];
      if (JSON.stringify(roomButtons) !== JSON.stringify(expectedButtons)) {
        throw new Error(`dist/${site}/${page} has rooms buttons for ${JSON.stringify(roomButtons)}, expected ${JSON.stringify(expectedButtons)}`);
      }
      if (house && !htmlTag.includes('data-theme="dark"')) {
        throw new Error('dist/landing/ha/index.html is not data-theme="dark"; the house view has no light theme');
      }
      for (const [reference, path, version] of html.matchAll(ASSET_REFERENCE)) {
        if (!versions.has(path)) {
          const asset = join(siteDist, path);
          versions.set(path, existsSync(asset) ? assetVersion(await readFile(asset, 'utf8')) : 'missing');
        }
        if (version !== versions.get(path)) {
          throw new Error(`dist/${site}/${page} links ${reference}, but the built file's hash is ${versions.get(path)}`);
        }
      }
    }
  }

  console.log(`Static site checks passed (${sources.decisions.length} decisions, ${sources.repos.length} repos)`);
});
