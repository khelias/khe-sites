import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSourceBuild, SITE, SourceError } from './architecture-sources.mjs';
import { pageShareCard } from './language-pages.mjs';

const header = join(dirname(fileURLToPath(import.meta.url)), 'templates', 'house3d-header.html');

// The 3D house demo at /ha/: khe-home-assistant's own build writes it from the made-up
// demo house, so no model and no house data pass through here. The KHE site header is added
// here, so khe.ee's branding stays out of khe-home-assistant.
export async function buildHouse3dDemo(outputDir) {
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
  // The page opens in Estonian, so its share card is the Estonian one.
  const share = ['<link rel="icon" href="/logo.svg" type="image/svg+xml" sizes="any">',
    ...pageShareCard(html, page, `${SITE}/ha/`, 'et')].join('\n');
  // The house view has no light theme yet, so the page and its header stay dark.
  await writeFile(page, html
    .replace(/<html\b/, '<html data-room="house" data-theme="dark"')
    .replace('</head>', () => `${share}\n<link rel="stylesheet" href="/assets/site-header.css">\n</head>`)
    .replace('<body>', () => `<body>\n${markup}`));
}
