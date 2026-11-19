import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { replaceMarker, resolveSourceRoot, runSourceBuild, SITE, SourceError } from './architecture-sources.mjs';
import { builtPages } from './asset-versions.mjs';
import { LOCALE_STORAGE_KEY } from '../src/shared/site-locale.js';

const header = join(dirname(fileURLToPath(import.meta.url)), 'templates', 'workshop-header.html');
export const WORKSHOP_BASE = '/workshop/';
const ANALYTICS_TOKEN = '58734ed4ae1e4b4e8a8f8f7d50ff74f2';

export const workshopRoot = () => resolveSourceRoot('WORKSHOP_ROOT', 'khe-workshop');

// The room has one page per language, so a ?lang or a stored language other than the page's
// opens the other page. A classic script at the top of <head>, so it leaves before the page
// loads its styles, fonts and three.js. The order is createLocaleController's.
const REDIRECT = `<script>try{const q=new URLSearchParams(location.search);const l=[q.get('lang'),q.get('locale'),localStorage.getItem('${LOCALE_STORAGE_KEY}')].find((v)=>v==='et'||v==='en');const a=l&&l!==document.documentElement.lang&&document.querySelector('link[rel="alternate"][hreflang="'+l+'"]');if(a)location.replace(a.getAttribute('href')+'?lang='+l+location.hash)}catch(e){}</script>`;

function shell(markup, lang) {
  return {
    'khe:head': [
      REDIRECT,
      '<link rel="icon" href="/logo.svg" type="image/svg+xml" sizes="any">',
      '<meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)">',
      '<meta name="theme-color" content="#0b0d0d" media="(prefers-color-scheme: dark)">',
      '<!-- site-theme -->',
      '<link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>',
      '<link rel="preload" href="/assets/fonts/inter-600.woff2" as="font" type="font/woff2" crossorigin>',
      '<link rel="preload" href="/assets/fonts/source-serif-4-600-latin.woff2" as="font" type="font/woff2" crossorigin>',
      '<link rel="modulepreload" href="/assets/theme.js">',
      '<link rel="stylesheet" href="/assets/site-header.css">',
    ].join('\n'),
    'khe:header': markup.trimEnd(),
    'khe:footer': '<!-- site-footer -->',
    'khe:consent': `<script defer src="/assets/analytics-consent.js" data-analytics-token="${ANALYTICS_TOKEN}" data-analytics-privacy-url="/privacy?lang=${lang}"></script>`,
  };
}

// Töökoda at /workshop/ (estate ADR-043): khe-workshop's own build writes the pages, one per
// language, the family shell goes in at its four khe: markers, and every page goes in the
// sitemap in both languages.
export async function buildWorkshopRoom(landingDir) {
  const outputDir = join(landingDir, WORKSHOP_BASE);
  runSourceBuild('WORKSHOP_ROOT', 'khe-workshop', 'scripts/site_build.py', [outputDir, '--base', WORKSHOP_BASE], 'The workshop room build');

  const markup = await readFile(header, 'utf8');
  const pages = [];
  for (const page of await builtPages(outputDir)) {
    let html = await readFile(page, 'utf8');
    const lang = html.match(/<html\b[^>]*\slang="(et|en)"/)?.[1];
    if (!lang || !/<html\b[^>]*\sdata-room="workshop"/.test(html)) {
      throw new SourceError(`${page} has no <html lang="et|en" data-room="workshop">. Check WORKSHOP_ROOT.`);
    }
    for (const [marker, content] of Object.entries(shell(markup, lang))) html = replaceMarker(html, marker, content, page);
    await writeFile(page, html);
    if (lang === 'et') pages.push(page.slice(outputDir.length).replace(/index\.html$/, ''));
  }

  const url = (lang, path) => `${SITE}${WORKSHOP_BASE}${lang === 'en' ? 'en/' : ''}${path}`;
  const entries = pages.sort().flatMap((path) => ['et', 'en'].map((lang) => [
    '  <url>',
    `    <loc>${url(lang, path)}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="et" href="${url('et', path)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${url('en', path)}"/>`,
    '  </url>',
  ].join('\n')));
  const sitemapPath = join(landingDir, 'sitemap.xml');
  await writeFile(sitemapPath, replaceMarker(await readFile(sitemapPath, 'utf8'), 'workshop', entries.join('\n'), sitemapPath));
}
