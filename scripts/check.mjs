import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_LOOP_SHAPE, loadSources, parseAgentLoop, runReportingSourceErrors, SITE, SourceError } from './architecture-sources.mjs';
import { adrLinkRewriter, MarkdownError, renderMarkdown } from './markdown.mjs';
import { views } from './architecture-model.mjs';
import { ARCHITECTURE_PAGES, findingRows, modelMismatches } from './render-architecture.mjs';
import { WORKSHOP_BASE, workshopRoot } from './workshop-room.mjs';
import { LANGUAGE_PAGES, pageFile, pageUrl, REDIRECT } from './language-pages.mjs';
import { ASSET_REFERENCE, assetVersion, builtPages as listBuiltPages } from './asset-versions.mjs';
import { ROOM_IDS } from '@khelias/ui/rooms';
import { themeInitScript } from '@khelias/ui/theme';
import { readPageCopy } from './site-header.mjs';
import { COPY } from '../src/landing/architecture/copy.js';
import { LOCALES, SITE_FOOTER_COPY, SITE_HEADER_COPY, THEME_STORAGE_KEY } from '../src/shared/site-locale.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// An attribute of a page's <html> tag, or undefined.
function htmlAttribute(html, name) {
  return html.match(/<html\b[^>]*>/)?.[0].match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
}

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

// Each inline script of a page parses; a module's imports are left out, since they resolve only in
// a browser.
function parseInlineScripts(html) {
  for (const match of html.matchAll(/<script(?: type="module")?>([\s\S]*?)<\/script>/g)) {
    new Function(match[1].replace(/^\s*import\s.+;\s*$/gm, ''));
  }
}

function assertDarkPaired(sheet, name) {
  const unpaired = unpairedDarkRules(sheet);
  if (unpaired.length) throw new Error(unpaired.map((message) => `${name}: ${message}`).join('\n'));
}

// Each khe.ee page built once per language (estate ADR-048): its own language, canonical,
// alternates (every one of them built, since the loop reads both), share image and structured
// data, the redirect where it reads the alternates, and a sitemap that lists exactly the indexed
// pages with no ?lang anywhere.
async function checkLanguagePages(landing, sitemap, sources) {
  const metas = (html, attribute, name) => [...html.matchAll(new RegExp(`<meta ${attribute}="${name}" content="([^"]*)">`, 'g'))].map((match) => match[1]);
  const links = (html, rel) => [...html.matchAll(new RegExp(`<link rel="${rel}"(?: hreflang="([^"]+)")? href="([^"]+)">`, 'g'))];
  for (const page of LANGUAGE_PAGES) {
    const texts = {};
    for (const locale of LOCALES) {
      const url = pageUrl(page, locale);
      const name = `dist/landing/${pageFile(page, locale)}`;
      const html = await readFile(join(landing, pageFile(page, locale)), 'utf8');
      const fail = (problem) => { throw new Error(`${name} ${problem}`); };
      if (htmlAttribute(html, 'lang') !== locale) fail(`is not <html lang="${locale}">`);
      const empty = html.match(/<([a-z][a-z0-9]*)\b[^>]*\sdata-i18n(?:-html)?="([^"]+)"[^>]*><\/\1>/);
      if (empty) fail(`leaves ${empty[2]} empty`);
      const canonical = links(html, 'canonical').map((match) => match[2]);
      if (canonical.length !== 1 || canonical[0] !== url) fail(`has canonical ${JSON.stringify(canonical)}, expected ["${url}"]`);
      if (metas(html, 'property', 'og:url').join() !== url) fail(`has og:url ${metas(html, 'property', 'og:url')}, expected ${url}`);
      const alternates = Object.fromEntries(links(html, 'alternate').map(([, lang, href]) => [lang, href]));
      const expected = { et: pageUrl(page, 'et'), en: pageUrl(page, 'en'), 'x-default': pageUrl(page, 'et') };
      if (JSON.stringify(alternates) !== JSON.stringify(expected)) fail(`has hreflang ${JSON.stringify(alternates)}, expected ${JSON.stringify(expected)}`);
      const head = html.slice(0, html.indexOf('</head>'));
      const redirect = head.indexOf(REDIRECT);
      const lastAlternate = head.lastIndexOf('<link rel="alternate"');
      const firstStylesheet = head.indexOf('<link rel="stylesheet"');
      if (redirect < 0 || redirect < lastAlternate || (firstStylesheet >= 0 && redirect > firstStylesheet)) fail('does not have the language redirect after its alternates and before its first stylesheet');
      if (metas(html, 'property', 'og:locale').join() !== { et: 'et_EE', en: 'en_US' }[locale]) fail(`has og:locale ${metas(html, 'property', 'og:locale')}`);
      const image = metas(html, 'property', 'og:image');
      const imageName = locale === 'et' ? 'og-image-et.png' : 'og-image.png';
      if (image.join() !== `${SITE}/${imageName}`) fail(`has og:image ${image}, expected ${SITE}/${imageName}`);
      if (!existsSync(join(landing, imageName))) fail(`shares ${imageName}, which was not built`);
      if (metas(html, 'name', 'twitter:card').join() !== 'summary_large_image') fail('is not twitter:card summary_large_image');
      if (Boolean(page.noindex) !== metas(html, 'name', 'robots').some((value) => value.includes('noindex'))) fail(page.noindex ? 'is not noindex' : 'is noindex');
      const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      if (scripts.length !== 1) fail(`has ${scripts.length} JSON-LD scripts, expected 1`);
      let jsonLd;
      try {
        jsonLd = JSON.parse(scripts[0][1]);
      } catch (error) {
        fail(`has JSON-LD that does not parse: ${error.message}`);
      }
      const nodes = jsonLd['@graph'] ?? [jsonLd];
      const languages = nodes.filter((node) => 'inLanguage' in node).map((node) => node.inLanguage);
      if (!languages.length || languages.some((value) => value !== locale)) fail(`has JSON-LD inLanguage ${JSON.stringify(languages)}, expected ${locale}`);
      const website = nodes.find((node) => node['@type'] === 'WebSite');
      if (page.id === 'home' && website?.name !== 'KHE') fail(`names its WebSite ${website?.name}, expected KHE`);
      texts[locale] = { title: html.match(/<title>([^<]*)<\/title>/)?.[1], description: metas(html, 'name', 'description').join() };
    }
    for (const key of ['title', 'description']) {
      if (!texts.et[key] || texts.et[key] === texts.en[key]) throw new Error(`${page.file} has the same ${key} in Estonian and English: ${texts.et[key]}`);
    }
  }

  // The ADR pages are English only: their own canonical and no alternates. An ADR's text may
  // name hreflang, so only the attribute counts.
  for (const decision of sources.decisions) {
    const html = await readFile(join(landing, 'architecture/decisions', decision.id, 'index.html'), 'utf8');
    if (/\shreflang=/.test(html)) throw new Error(`dist/landing/architecture/decisions/${decision.id}/index.html has hreflang; an ADR page is English only`);
  }

  // The sitemap lists exactly the indexed pages: the language pages, the ADR pages, the workshop
  // pages and /ha/, plus /stories/, which khe-stories serves from its own mount, never from dist.
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (sitemap.includes('?lang')) throw new Error('sitemap.xml carries a ?lang address');
  const expected = new Set([
    ...LANGUAGE_PAGES.filter((page) => !page.noindex).flatMap((page) => LOCALES.map((locale) => pageUrl(page, locale))),
    ...sources.decisions.map((decision) => `${SITE}/architecture/decisions/${decision.id}/`),
    ...(await listBuiltPages(join(landing, WORKSHOP_BASE))).map((file) => `${SITE}${file.slice(landing.length).replace(/index\.html$/, '')}`),
    `${SITE}/ha/`,
    `${SITE}/stories/`,
  ]);
  const listed = new Set(locs);
  if (listed.size !== locs.length) throw new Error('sitemap.xml lists an address twice');
  const missing = [...expected].filter((url) => !listed.has(url));
  const extra = locs.filter((url) => !expected.has(url));
  if (missing.length || extra.length) throw new Error(`sitemap.xml misses ${JSON.stringify(missing)} and lists ${JSON.stringify(extra)} beyond the built pages`);
}

await runReportingSourceErrors(async () => {
  const htmlFiles = [
    'src/landing/index.html',
    ...ARCHITECTURE_PAGES.map(({ path }) => `src/landing/${path}`),
    'scripts/templates/decision.html',
    'src/landing/privacy/index.html',
    'src/landing/404.html',
    'src/games/index.html',
    'src/games/privacy/index.html',
    'src/games/404.html',
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

    parseInlineScripts(content);
  }

  const sourceFiles = [
    ...htmlFiles,
    'src/shared/analytics-consent.js',
    'src/shared/site-locale.js',
    'src/shared/site-header.css',
    'src/shared/site.css',
    'scripts/templates/house3d-header.html',
    'scripts/house3d-demo.mjs',
    'scripts/templates/workshop-header.html',
    'scripts/workshop-room.mjs',
    'src/landing/architecture/architecture.js',
    'src/landing/architecture/copy.js',
  ];
  const bannedText = [
    'Tarkvaraarhitekt töö poolest',
    'Nokitseja loomult',
    'Ise majutatud Tallinnas',
    'Self-hosted in Tallinn',
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
  // It floats like the rooms list, so it carries the same shadow.
  const menuShadow = tokenCss.match(/--khe-header-menu-shadow:\s*([^;]+);/)?.[1];
  const consentShadow = consentCss.match(/box-shadow:\s*([^;]+);/)?.[1];
  if (!menuShadow || consentShadow !== menuShadow) {
    throw new Error(`${consentName}: box-shadow ${consentShadow} is not site-header.css's --khe-header-menu-shadow ${menuShadow}`);
  }
  assertDarkPaired(consentCss, consentName);
  // The rooms list's dots are @khelias/ui's values (estate ADR-021); each room's light and dark
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

  // A page committed to one theme (estate ADR-021 point 2) has that theme's paper alone, in its
  // theme-color and in its web app manifest, if it has one.
  const papers = { light: light.paper, dark: forcedDark.paper };
  for (const relativePath of htmlFiles) {
    const content = await readFile(join(root, relativePath), 'utf8');
    const theme = htmlAttribute(content, 'data-theme');
    if (theme) {
      const paper = papers[theme];
      if (!paper || (content.match(/<meta name="theme-color"/g) || []).length !== 1 || !content.includes(`<meta name="theme-color" content="${paper}">`)) {
        throw new Error(`${relativePath} is committed to ${theme} but lacks the one theme-color of its paper`);
      }
      const manifestHref = content.match(/<link rel="manifest" href="([^"]+)"/)?.[1];
      if (manifestHref) {
        const siteRoot = relativePath.split('/').slice(0, 2).join('/');
        const manifest = JSON.parse(await readFile(join(root, siteRoot, manifestHref), 'utf8'));
        if (manifest.background_color !== paper || manifest.theme_color !== paper) {
          throw new Error(`${relativePath}: its manifest's background_color and theme_color are not the ${theme} paper ${paper}`);
        }
      }
      continue;
    }
    for (const [scheme, paper] of Object.entries(papers)) {
      if (!content.includes(`<meta name="theme-color" content="${paper}" media="(prefers-color-scheme: ${scheme})">`)) {
        throw new Error(`${relativePath}: the ${scheme} theme-color is not the ${scheme} paper token ${paper}`);
      }
    }
  }

  // Every data-i18n key of a page with an inline COPY is in both of its languages. The source
  // page, not the built one: the header and footer keys live in SITE_HEADER_COPY and SITE_FOOTER_COPY.
  for (const relativePath of htmlFiles) {
    const html = await readFile(join(root, relativePath), 'utf8');
    const pageCopy = readPageCopy(html, relativePath);
    if (!pageCopy) continue;
    for (const [, key] of html.matchAll(/data-i18n(?:-html|-aria)?="([^"]+)"/g)) {
      for (const locale of ['et', 'en']) {
        if (typeof pageCopy[locale]?.[key] !== 'string') throw new Error(`${relativePath} uses ${key}, which its COPY.${locale} lacks`);
      }
    }
  }

  await import(join(root, 'src/shared/site-locale.js'));

  function expectRender(name, source, expected, privateRepoUrls = []) {
    const html = renderMarkdown(source, { file: name, rewriteLink: adrLinkRewriter(new Set(['008']), privateRepoUrls) });
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
  expectRender('private repo link', 'In [`khe-x`](https://github.com/khelias/khe-x/blob/main/a.md), not [khe-x-y](https://github.com/khelias/khe-x-y).', 'In <code>khe-x</code>, not <a href="https://github.com/khelias/khe-x-y">', ['https://github.com/khelias/khe-x']);
  expectThrow('table', 'Text\n\n| a | b |', 'table');
  expectThrow('fence', '```\ncode\n```', 'fenced block');
  expectThrow('deep nesting', '- a\n  - b\n    - c', 'nested two levels');
  expectThrow('relative link', 'See [doc](../README.md).', 'relative link');
  expectThrow('unknown ADR', 'See [ADR-099](099-nothing.md).', 'ADR-099');
  expectThrow('raw HTML', 'A <b>bold</b> claim.', 'raw HTML');
  expectThrow('line number', 'one\n\n> quote', 'line number:12');
  expectThrow('inline line number', 'one\ntwo <b>three</b>', 'inline line number:11');

  // The agent-loop snapshot's reader refuses a missing, unknown or fractional count (estate ADR-044).
  const loopFixture = Object.fromEntries(Object.entries(AGENT_LOOP_SHAPE).map(([key, shape]) => {
    if (shape === 'date') return [key, '2026-10-22'];
    if (shape === 'count') return [key, 1];
    return [key, Object.fromEntries(shape.map((inner) => [inner, 1]))];
  }));
  parseAgentLoop(JSON.stringify(loopFixture));
  const expectLoopThrow = (name, mutate, fragment) => {
    const data = structuredClone(loopFixture);
    mutate(data);
    try {
      parseAgentLoop(JSON.stringify(data));
    } catch (error) {
      if (error instanceof SourceError && error.message.includes(fragment)) return;
      throw error;
    }
    throw new Error(`parseAgentLoop accepted a snapshot with ${name}`);
  };
  expectLoopThrow('a key removed', (data) => delete data.plans, 'lacks plans');
  expectLoopThrow('an unknown key', (data) => { data.extra = 1; }, 'unknown extra');
  expectLoopThrow('an inner key removed', (data) => delete data.planReview.dropped, 'planReview lacks dropped');
  expectLoopThrow('a fractional count', (data) => { data.planCheck.acted = 1.5; }, 'planCheck.acted is not a whole count');
  expectLoopThrow('a bad date', (data) => { data.until = '19.11.2026'; }, 'until is not a YYYY-MM-DD date');

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
  for (const script of sourceFiles.filter((path) => path.endsWith('.js'))) {
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
    assertDarkPaired(sheet, name);
    for (const match of sheet.matchAll(/url\(\s*['"]?\/assets\/fonts\/([^'")\s]+)['"]?\s*\)/g)) {
      if (!existsSync(join(root, 'src/shared/fonts', match[1]))) throw new Error(`${name} loads /assets/fonts/${match[1]}, which src/shared/fonts lacks`);
    }
  }

  // The rest checks the build output; npm run check builds first.
  const landing = join(root, 'dist/landing');
  const builtPages = [
    ...ARCHITECTURE_PAGES.flatMap(({ path }) => [path, `en/${path}`]),
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
    const empty = html.match(/<([a-z][a-z0-9]*)\b[^>]*\s(?:data-i18n(?:-html)?|data-metric)="([^"]+)"[^>]*><\/\1>/);
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
  // Each page, in both languages, draws two SVGs and a text list per view whose `page` it is, and
  // no other diagram.
  for (const prefix of ['', 'en/']) {
    const filled = {};
    for (const { page, path: sourcePath } of ARCHITECTURE_PAGES) {
      const path = `${prefix}${sourcePath}`;
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
    // /agents/ shows the snapshot's numbers (every page's empty-element check above covers
    // data-metric), and every findings row has its bar.
    if (!filled.agents.includes(' data-metric="')) throw new Error(`dist/landing/${prefix}agents/index.html shows no data-metric number`);
    const rowCount = findingRows(sources.agentLoop).length;
    const foundRows = (filled.agents.match(/<li class="arch-found">/g) || []).length;
    const bars = (filled.agents.match(/class="arch-bar__acted" style="width: /g) || []).length;
    if (foundRows !== rowCount || bars !== rowCount) throw new Error(`dist/landing/${prefix}agents/index.html has ${foundRows} findings rows and ${bars} bars, expected ${rowCount} of each`);
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
      throw new Error(`dist/landing/${prefix}architecture/decisions/index.html has no register under id="decisions"`);
    }
    for (const page of ['architecture', 'agents']) {
      if (filled[page].includes('arch-register')) throw new Error(`the ${page} page carries the register, which belongs on /architecture/decisions/`);
    }
  }
  const sitemap = await readFile(join(landing, 'sitemap.xml'), 'utf8');
  await checkLanguagePages(landing, sitemap, sources);

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
  for (const marker of ['/assets/site-header.css', 'class="site-header site-header--fixed"', 'data-lang-option="et"', 'data-lang-option="en"', '/assets/analytics-consent.js']) {
    if (!demoPage.includes(marker)) throw new Error(`dist/landing/ha/index.html is missing ${marker}`);
  }

  // Töökoda, built from khe-workshop: the index and each published part in both languages,
  // every page in the sitemap, every data file the pages link, three.js under one stamped URL so
  // a 30-day cache never mixes two versions, and room.css's tokens the family's.
  const workshop = join(landing, WORKSHOP_BASE);
  const workshopSource = workshopRoot();
  const published = [];
  for (const entry of await readdir(join(workshopSource, 'parts'), { withFileTypes: true })) {
    const partFile = join(workshopSource, 'parts', entry.name, 'part.json');
    if (entry.isDirectory() && existsSync(partFile) && JSON.parse(await readFile(partFile, 'utf8')).published) published.push(entry.name);
  }
  if (!published.length) throw new Error('khe-workshop has no published part, so /workshop/ would be empty');
  const three = new Set();
  for (const lang of ['', 'en/']) {
    for (const path of ['', ...published.map((id) => `${id}/`)]) {
      const page = `${WORKSHOP_BASE}${lang}${path}`;
      const file = join(landing, page, 'index.html');
      if (!existsSync(file)) throw new Error(`dist/landing${page}index.html was not built`);
      if (!sitemap.includes(`<loc>https://khe.ee${page}</loc>`)) throw new Error(`sitemap.xml does not list ${page}`);
      const html = await readFile(file, 'utf8');
      for (const [, url] of html.matchAll(/"(\/workshop\/data\/[^"?]+)/g)) {
        if (!existsSync(join(landing, url))) throw new Error(`dist/landing${page}index.html links ${url}, which was not built`);
      }
    }
  }
  for (const name of await readdir(workshop, { recursive: true })) {
    if (!/\.(?:js|html)$/.test(name) || /three\.(?:core|module)\.js$/.test(name)) continue;
    for (const [url] of (await readFile(join(workshop, name), 'utf8')).matchAll(/[\w./-]*three\.module\.js(?:\?v=\w+)?/g)) three.add(url);
  }
  if (three.size !== 1 || ![...three][0].includes('?v=')) {
    throw new Error(`dist/landing${WORKSHOP_BASE} imports three.module.js as ${[...three].join(', ') || 'nothing'}, not under one stamped URL`);
  }
  const roomCss = await readFile(join(workshopSource, 'web', 'src', 'room.css'), 'utf8');
  for (const [selector, family] of [[':root', light], [':root[data-theme="dark"]', forcedDark]]) {
    for (const [name, value] of Object.entries(tokenBlock(selector, roomCss, 'room.css'))) {
      if (family[name] !== value) throw new Error(`khe-workshop room.css sets --${name}: ${value} under ${selector}, DESIGN.md's family value is ${family[name]}`);
    }
  }
  assertDarkPaired(roomCss, 'khe-workshop room.css');

  // Every built page carries the filled site header, and every asset it links
  // carries the hash of the built file. Every page but /ha/ has the theme toggle, the
  // pre-paint theme script in <head> before the first stylesheet, and the footer; /ha/, dark
  // until the house view has a light theme, has none of them. A page committed to one theme on
  // its <html data-theme> (estate ADR-021 point 2) has the footer but neither toggle nor script.
  for (const site of ['landing', 'games']) {
    const siteDist = join(root, 'dist', site);
    const versions = new Map();
    for (const file of await listBuiltPages(siteDist)) {
      const page = file.slice(siteDist.length + 1);
      const html = await readFile(file, 'utf8');
      const privateRepo = sources.repos.find((repo) => repo.visibility === 'private' && new RegExp(`href="${repo.url}["/#]`).test(html));
      if (privateRepo) throw new Error(`dist/${site}/${page} links the private repo ${privateRepo.name}`);
      const headers = (html.match(/<header class="site-header[ "]/g) || []).length;
      if (headers !== 1) throw new Error(`dist/${site}/${page} has ${headers} site headers, expected 1`);
      if (!html.includes('data-lang-option="et"') || !html.includes('data-lang-option="en"')) {
        throw new Error(`dist/${site}/${page} has no ET/EN language switcher`);
      }
      for (const marker of ['site-header', 'site-theme', 'site-view', 'site-footer', 'khe:']) {
        if (html.includes(`<!-- ${marker}`)) throw new Error(`dist/${site}/${page} has an unfilled ${marker} marker`);
      }
      const house = site === 'landing' && page === 'ha/index.html';
      const theme = htmlAttribute(html, 'data-theme');
      const toggles = (html.match(/<button class="site-header__theme"/g) || []).length;
      const footers = (html.match(/<footer class="site-footer"/g) || []).length;
      const head = html.slice(0, html.indexOf('</head>'));
      const initAt = head.indexOf(`<script>${themeInitScript(THEME_STORAGE_KEY)}</script>`);
      const firstStylesheet = head.search(/<link rel="stylesheet"/);
      const expectedFooters = house ? 0 : 1;
      if (footers !== expectedFooters) throw new Error(`dist/${site}/${page} has ${footers} site footers, expected ${expectedFooters}`);
      parseInlineScripts(html);
      if (theme) {
        if (toggles || html.includes(THEME_STORAGE_KEY)) throw new Error(`dist/${site}/${page} is committed to one theme but has the theme toggle or the theme script`);
      } else {
        if (toggles !== 1) throw new Error(`dist/${site}/${page} has ${toggles} theme toggles, expected 1`);
        if (initAt < 0 || firstStylesheet < 0 || initAt > firstStylesheet) throw new Error(`dist/${site}/${page} lacks the theme script in <head> before the first stylesheet`);
        for (const [scheme, paper] of Object.entries(papers)) {
          if (!head.includes(`<meta name="theme-color" content="${paper}" media="(prefers-color-scheme: ${scheme})">`)) {
            throw new Error(`dist/${site}/${page}: the ${scheme} theme-color is not the ${scheme} paper token ${paper}`);
          }
        }
      }
      const room = htmlAttribute(html, 'data-room');
      if (!ROOM_IDS.includes(room)) throw new Error(`dist/${site}/${page} has no data-room on <html> from ${ROOM_IDS.join(', ')}`);
      // The rooms menu (estate ADR-021): every page but the khe.ee landing, with its own room current.
      const roomButtons = [...html.matchAll(/<button class="site-header__rooms"[^>]*\sdata-khe-room="([^"]*)"/g)].map((match) => match[1]);
      const expectedButtons = site === 'landing' && LOCALES.some((locale) => page === pageFile(LANGUAGE_PAGES[0], locale)) ? [] : [room];
      if (JSON.stringify(roomButtons) !== JSON.stringify(expectedButtons)) {
        throw new Error(`dist/${site}/${page} has rooms buttons for ${JSON.stringify(roomButtons)}, expected ${JSON.stringify(expectedButtons)}`);
      }
      // No page here is a product page (estate ADR-030) since the stories moved to khe-stories
      // (estate ADR-031), so none has the view script or the footer's KHE.ee link.
      if (head.includes('khe-view:') || (html.match(/class="site-footer__home"/g) || []).length) {
        throw new Error(`dist/${site}/${page} has the product view script or the footer KHE.ee link`);
      }
      const demoLines = (html.match(/<p class="site-header__demo"/g) || []).length;
      const expectedDemoLines = site === 'landing' && page === 'ha/index.html' ? 1 : 0;
      if (demoLines !== expectedDemoLines) throw new Error(`dist/${site}/${page} has ${demoLines} demo lines, expected ${expectedDemoLines}`);
      // The demo's one link to the real site (estate ADR-034).
      const demoLinks = [...html.matchAll(/<a class="site-header__demo-link" href="([^"]*)"/g)].map((match) => match[1]);
      const expectedDemoLinks = expectedDemoLines ? ['https://home.khe.ee/'] : [];
      if (JSON.stringify(demoLinks) !== JSON.stringify(expectedDemoLinks)) {
        throw new Error(`dist/${site}/${page} has demo links ${JSON.stringify(demoLinks)}, expected ${JSON.stringify(expectedDemoLinks)}`);
      }
      if (house && theme !== 'dark') {
        throw new Error('dist/landing/ha/index.html is not data-theme="dark"; the house view has no light theme');
      }
      for (const [reference, path, version] of html.matchAll(ASSET_REFERENCE)) {
        if (!versions.has(path)) {
          const asset = join(siteDist, path);
          versions.set(path, existsSync(asset) ? assetVersion(await readFile(asset)) : 'missing');
        }
        if (version !== versions.get(path)) {
          throw new Error(`dist/${site}/${page} links ${reference}, but the built file's hash is ${versions.get(path)}`);
        }
      }
    }
  }

  console.log(`Static site checks passed (${sources.decisions.length} decisions, ${sources.repos.length} repos)`);
});
