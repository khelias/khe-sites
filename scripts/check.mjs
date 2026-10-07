import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSources, runReportingSourceErrors } from './architecture-sources.mjs';
import { adrLinkRewriter, MarkdownError, renderMarkdown } from './markdown.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

await runReportingSourceErrors(async () => {
  const htmlFiles = [
    'src/landing/index.html',
    'src/landing/lab/index.html',
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

  const sources = await loadSources();
  const knownIds = new Set(sources.decisions.map((decision) => decision.id));
  for (const decision of sources.decisions) {
    renderMarkdown(decision.body, {
      file: decision.file,
      firstLine: decision.bodyStartLine,
      rewriteLink: adrLinkRewriter(knownIds),
    });
  }

  console.log(`Static site checks passed (${sources.decisions.length} decisions, ${sources.repos.length} repos)`);
});
