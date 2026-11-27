import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSourceBuild, SITE, SourceError } from './architecture-sources.mjs';
import { pageShareCard } from './language-pages.mjs';

const templates = join(dirname(fileURLToPath(import.meta.url)), 'templates');
const header = join(templates, 'house3d-header.html');
const frame = join(templates, 'house3d-frame.html');

// The 3D house demo at /ha/demo/, shown in a window on the /ha/ page (ADR-001 point 5):
// khe-home-assistant's own build writes it from the made-up demo house, so no model and no
// house data pass through here. The KHE site header is added here, so khe.ee's branding stays
// out of khe-home-assistant; inside the window the header hides itself.
export async function buildHouse3dDemo(haDir) {
  const outputDir = join(haDir, 'demo');
  runSourceBuild('HOME_ASSISTANT_ROOT', 'khe-home-assistant', 'scripts/house3d-build.py', ['--demo', outputDir], 'The 3D house demo build');

  const page = join(outputDir, 'index.html');
  const html = await readFile(page, 'utf8');
  if (!html.includes('</head>') || !html.includes('<body>') || !html.includes('var(--host-h)') || !/<html\b/.test(html)) {
    throw new SourceError(`${page} has no <html>, </head>, <body> or --host-h offset to put the site header in. Check HOME_ASSISTANT_ROOT.`);
  }
  if (/<html\b[^>]*\sdata-(room|theme)=/.test(html)) {
    throw new SourceError(`${page} already sets data-room or data-theme on <html>, which the build sets. Check HOME_ASSISTANT_ROOT.`);
  }
  const markup = await readFile(header, 'utf8');
  // Both pages are built in Estonian, so their share card is the Estonian one; the demo's points at
  // /ha/, the page a visitor shares. The demo is noindex without a canonical, which would carry
  // the noindex over to /ha/.
  const share = pageShareCard(html, page, `${SITE}/ha/`, 'et');
  // The house view has no light theme yet, so the page and its header stay dark.
  await writeFile(page, html
    .replace(/<html\b/, '<html data-room="house" data-theme="dark"')
    .replace('</head>', () => [
      '<meta name="robots" content="noindex">',
      '<link rel="icon" href="/logo.svg" type="image/svg+xml" sizes="any">', ...share,
      '<link rel="stylesheet" href="/assets/site-header.css">', '</head>'].join('\n'))
    .replace('<body>', () => `<body>\n${markup}`));

  const head = [html.match(/<title>[^<]*<\/title>/)[0], html.match(/<meta name="description" content="[^"]*">/)[0], `<link rel="canonical" href="${SITE}/ha/">`, ...share];
  const framePage = await readFile(frame, 'utf8');
  await writeFile(join(haDir, 'index.html'), framePage.replace('<!-- house3d-frame-head -->', () => head.join('\n  ')));
}
