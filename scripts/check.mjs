import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSources, runReportingSourceErrors } from './architecture-sources.mjs';
import { adrLinkRewriter, MarkdownError, renderMarkdown } from './markdown.mjs';
import { views } from './architecture-model.mjs';
import { modelMismatches } from './render-architecture.mjs';
import { COPY } from '../src/landing/architecture/copy.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

await runReportingSourceErrors(async () => {
  const htmlFiles = [
    'src/landing/index.html',
    'src/landing/architecture/index.html',
    'scripts/templates/decision.html',
    'src/landing/privacy/index.html',
    'src/games/index.html',
    'src/games/privacy/index.html',
  ];

  const requiredMarkers = [
    '/assets/site-locale.js',
    '/assets/analytics-consent.js',
    '/assets/site.css',
    'data-lang-option="et"',
    'data-lang-option="en"',
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
    'src/shared/site-footer.js',
    'src/shared/site-locale.js',
    'src/shared/site.css',
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

  for (const relativePath of sourceFiles) {
    const content = await readFile(join(root, relativePath), 'utf8');
    for (const text of bannedText) {
      if (content.includes(text)) {
        throw new Error(`${relativePath} contains stale copy: ${text}`);
      }
    }
  }

  await import(join(root, 'src/shared/site-locale.js'));
  await import(join(root, 'src/shared/site-footer.js'));

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

  for (const locale of Object.keys(COPY)) {
    for (const key of Object.keys(COPY.en)) {
      if (typeof COPY[locale][key] !== 'string') throw new Error(`copy.js: COPY.${locale} has no ${key}`);
    }
    for (const key of Object.keys(COPY[locale])) {
      if (!(key in COPY.en)) throw new Error(`copy.js: COPY.${locale}.${key} has no COPY.en counterpart`);
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
  // The section turns off the shared header's shadow; any other shadow is out.
  const archCss = css.slice(css.indexOf('/* Architecture */'), css.indexOf('/* End architecture */')).replace(/box-shadow: none;/g, '');
  if (!archCss || css.indexOf('/* End architecture */') < 0) throw new Error('site.css has no Architecture section markers');
  for (const banned of ['animation', 'drop-shadow', 'box-shadow', 'gradient']) {
    if (archCss.includes(banned)) throw new Error(`site.css Architecture section uses ${banned}`);
  }
  for (const match of css.matchAll(/url\(\s*['"]?\/assets\/fonts\/([^'")\s]+)['"]?\s*\)/g)) {
    if (!existsSync(join(root, 'src/shared/fonts', match[1]))) throw new Error(`site.css loads /assets/fonts/${match[1]}, which src/shared/fonts lacks`);
  }

  // The rest checks the build output; npm run check builds first.
  const landing = join(root, 'dist/landing');
  const builtPages = [
    'architecture/index.html',
    ...sources.decisions.map((decision) => `architecture/decisions/${decision.id}/index.html`),
  ];
  const footerKeys = new Set(['footerLinksLabel', 'footer', 'privacyLink']);
  for (const page of builtPages) {
    if (!existsSync(join(landing, page))) throw new Error(`dist/landing/${page} was not built`);
    const html = await readFile(join(landing, page), 'utf8');
    const ipv4 = html.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    if (ipv4) throw new Error(`dist/landing/${page} contains an IPv4 address: ${ipv4[0]}`);
    const hostPort = html.match(/\b(?:localhost|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}):\d{2,5}\b/i);
    if (hostPort) throw new Error(`dist/landing/${page} contains a host:port: ${hostPort[0]}`);
    const empty = html.match(/<([a-z][a-z0-9]*)\b[^>]*\sdata-i18n(?:-html)?="([^"]+)"[^>]*><\/\1>/);
    if (empty) throw new Error(`dist/landing/${page} leaves ${empty[2]} empty`);
    for (const match of html.matchAll(/data-i18n(?:-html|-aria)?="([^"]+)"/g)) {
      if (!(match[1] in COPY.en) && !footerKeys.has(match[1])) throw new Error(`dist/landing/${page} uses ${match[1]}, which copy.js lacks`);
    }
    for (const match of html.matchAll(/href="\/architecture\/decisions\/(\d{3})\//g)) {
      if (!existsSync(join(landing, 'architecture/decisions', match[1], 'index.html'))) {
        throw new Error(`dist/landing/${page} links ADR-${match[1]}, which has no page`);
      }
    }
  }
  const mainPage = await readFile(join(landing, 'architecture/index.html'), 'utf8');
  const svgCount = (mainPage.match(/<svg\b/g) || []).length;
  if (svgCount !== 2 * views.length) throw new Error(`architecture page has ${svgCount} <svg>, expected ${2 * views.length}`);
  if (mainPage.includes('<!--')) throw new Error('architecture page still has an unfilled placeholder');
  for (const view of views) {
    const start = mainPage.indexOf(`<figure class="arch-figure" data-view="${view.id}"`);
    const figure = start < 0 ? '' : mainPage.slice(start, mainPage.indexOf('</figure>', start));
    const textStart = figure.indexOf('class="visually-hidden"');
    const text = textStart < 0 ? '' : figure.slice(textStart);
    if (!text) throw new Error(`architecture page has no text list for the ${view.id} diagram`);
    for (const edge of view.layouts.narrow.edges) {
      if (!text.includes(`data-edge="${edge.from}:${edge.to}"`)) throw new Error(`The ${view.id} text list lacks the edge ${edge.from} -> ${edge.to}`);
    }
  }
  const uptime = mainPage.slice(mainPage.indexOf('id="uptime"'), mainPage.indexOf('</section>', mainPage.indexOf('id="uptime"')));
  const layerList = uptime.match(/<ol class="arch-layers">([\s\S]*?)<\/ol>/);
  const layerRows = layerList ? (layerList[1].match(/<li\b/g) || []).length : 0;
  const readmeLayers = sources.homelab.resilienceLayers.length;
  if (layerRows !== readmeLayers) {
    throw new Error(`#uptime lists ${layerRows} resilience layers, the khe-homelab README has ${readmeLayers}`);
  }
  const sitemap = await readFile(join(landing, 'sitemap.xml'), 'utf8');
  for (const decision of sources.decisions) {
    if (!sitemap.includes(`<loc>https://khe.ee/architecture/decisions/${decision.id}/</loc>`)) {
      throw new Error(`sitemap.xml does not list ADR-${decision.id}`);
    }
  }

  console.log(`Static site checks passed (${sources.decisions.length} decisions, ${sources.repos.length} repos)`);
});
