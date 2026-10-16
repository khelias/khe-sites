import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSourceRoot, SourceError } from './architecture-sources.mjs';

const header = join(dirname(fileURLToPath(import.meta.url)), 'templates', 'house3d-header.html');

// The 3D house demo at /house3d/: khe-home-assistant's own build writes it from its made-up
// test house, so no model and no house data pass through here. The KHE site header is added
// here, so khe.ee's branding stays out of khe-home-assistant.
export async function buildHouse3dDemo(outputDir) {
  const root = resolveSourceRoot('HOME_ASSISTANT_ROOT', 'khe-home-assistant');
  try {
    execFileSync('python3', ['-I', join(root, 'scripts', 'house3d-build.py'), '--demo', outputDir], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
  } catch (error) {
    throw new SourceError(`The 3D house demo build in ${root} failed (${error.message.split('\n')[0]}). Check HOME_ASSISTANT_ROOT.`);
  }

  const page = join(outputDir, 'index.html');
  const html = await readFile(page, 'utf8');
  if (!html.includes('</head>') || !html.includes('<body>') || !html.includes('var(--host-h)')) {
    throw new SourceError(`${page} has no </head>, <body> or --host-h offset to put the site header in. Check HOME_ASSISTANT_ROOT.`);
  }
  const markup = await readFile(header, 'utf8');
  await writeFile(page, html
    .replace('</head>', () => '<link rel="stylesheet" href="/assets/site-header.css?v=20261016a">\n</head>')
    .replace('<body>', () => `<body>\n${markup}`));
}
