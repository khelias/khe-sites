import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { replaceMarker, SITE, SourceError } from './architecture-sources.mjs';
import { escapeHtml } from './markdown.mjs';
import { fillCopy } from './render-architecture.mjs';
import { readPageCopy } from './site-header.mjs';
import { COPY as ARCHITECTURE_COPY } from '../src/landing/architecture/copy.js';
import { LOCALE_STORAGE_KEY, LOCALES, localePath, PAGE_LINKS, pageHref } from '../src/shared/site-locale.js';

const OG_LOCALES = { et: 'et_EE', en: 'en_US' };
const OG_IMAGES = { et: `${SITE}/og-image-et.png`, en: `${SITE}/og-image.png` };
const WEBSITE_ID = `${SITE}/#website`;
const PERSON_ID = `${SITE}/#person`;

// A page per language (khe-sites ADR-001) opens the other one when ?lang or the stored language
// differs from its own: a classic script at the top of <head>, so it leaves before the page
// loads its styles, fonts and modules. The order is createLocaleController's. It goes to the
// alternate's pathname, so a local preview stays local.
export const REDIRECT = `<script>try{const q=new URLSearchParams(location.search);const l=[q.get('lang'),q.get('locale'),localStorage.getItem('${LOCALE_STORAGE_KEY}')].find((v)=>v==='et'||v==='en');const a=l&&l!==document.documentElement.lang&&document.querySelector('link[rel="alternate"][hreflang="'+l+'"]');if(a){q.delete('locale');q.set('lang',l);location.replace(new URL(a.getAttribute('href'),location.href).pathname+'?'+q+location.hash)}}catch(e){}</script>`;

// A page's copy in each language, with its title and description: the source page's inline COPY,
// or copy.js with the page's own `<id>PageTitle` and `<id>PageDescription` over the server page's.
const inlineCopy = (source, file) => {
  const copy = readPageCopy(source, file);
  if (!copy) throw new SourceError(`${file} has no inline COPY`);
  return copy;
};
const architectureCopy = (id) => () => Object.fromEntries(LOCALES.map((locale) => {
  const values = ARCHITECTURE_COPY[locale];
  return [locale, { ...values, title: values[`${id}PageTitle`] ?? values.title, description: values[`${id}PageDescription`] ?? values.description }];
}));

const webPage = (about) => ({ url, copy, locale }) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${url}#webpage`,
  url,
  name: copy.title,
  description: copy.description,
  inLanguage: locale,
  isPartOf: { '@id': WEBSITE_ID },
  ...(about && { about }),
});

function homeGraph({ url, copy, locale }) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: `${SITE}/`,
        name: 'KHE',
        alternateName: ['KHE.ee', 'Kaido Henrik Elias'],
        inLanguage: locale,
      },
      {
        '@type': 'ProfilePage',
        '@id': `${url}#profile`,
        url,
        name: copy.title,
        description: copy.description,
        inLanguage: locale,
        isPartOf: { '@id': WEBSITE_ID },
        mainEntity: { '@id': PERSON_ID },
      },
      {
        '@type': 'Person',
        '@id': PERSON_ID,
        name: 'Kaido Henrik Elias',
        alternateName: 'Kaido Elias',
        url: `${SITE}/`,
        jobTitle: copy.role,
        image: `${SITE}/portrait.jpg`,
        address: { '@type': 'PostalAddress', addressLocality: 'Tallinn', addressCountry: 'EE' },
        sameAs: ['https://github.com/khelias', 'https://www.linkedin.com/in/kaido-henrik-elias/'],
      },
    ],
  };
}

// The khe.ee pages built once per language, from the source page at their Estonian path.
export const LANGUAGE_PAGES = [
  { id: 'home', path: PAGE_LINKS.home, type: 'profile', copy: inlineCopy, jsonLd: homeGraph },
  { id: 'privacy', path: PAGE_LINKS.privacy, copy: inlineCopy, jsonLd: webPage(), noindex: true },
  {
    id: 'architecture',
    path: PAGE_LINKS.architecture,
    copy: architectureCopy('architecture'),
    jsonLd: webPage(['Software architecture', 'Continuous delivery', 'Self-hosting', 'Cloudflare Tunnel', 'GitHub Actions', 'Docker Compose']),
  },
  {
    id: 'decisions',
    path: PAGE_LINKS.register,
    copy: architectureCopy('decisions'),
    jsonLd: webPage(['Software architecture', 'Architecture decision records', 'Self-hosting']),
  },
  {
    id: 'agents',
    path: PAGE_LINKS.agents,
    copy: architectureCopy('agents'),
    jsonLd: webPage(['Agentic software development', 'AI coding agents', 'Code review']),
  },
];

export const pageUrl = (page, locale) => `${SITE}${localePath(page.path, locale)}`;
export const pageFile = (page, locale) => join(localePath(page.path, locale).slice(1), 'index.html');

const jsonScript = (value) => `<script type="application/ld+json">${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`;

// The share card of a page, with title and description already escaped; the outside rooms
// (/ha/, /workshop/) get theirs from it too.
export function shareTags({ url, locale, title, description, type }) {
  const other = LOCALES.find((value) => value !== locale);
  return [
    `<meta property="og:type" content="${type ?? 'website'}">`,
    '<meta property="og:site_name" content="KHE">',
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${OG_LOCALES[locale]}">`,
    `<meta property="og:locale:alternate" content="${OG_LOCALES[other]}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:image" content="${OG_IMAGES[locale]}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${OG_IMAGES[locale]}">`,
  ];
}

// The share card of a page another repo builds, from that page's own (escaped) title and
// description.
export function pageShareCard(html, page, url, locale) {
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1];
  if (!title || !description) throw new SourceError(`${page} has no <title> or description for its share card.`);
  return shareTags({ url, locale, title, description });
}

// The head of one language's page, in the order check holds it to: the redirect after the
// alternates it reads and before the first stylesheet.
function renderHead(page, locale, copy, indent) {
  const url = pageUrl(page, locale);
  const title = escapeHtml(copy.title);
  const description = escapeHtml(copy.description);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    ...(page.noindex ? ['<meta name="robots" content="noindex, follow">'] : []),
    `<link rel="canonical" href="${url}">`,
    ...LOCALES.map((value) => `<link rel="alternate" hreflang="${value}" href="${pageUrl(page, value)}">`),
    `<link rel="alternate" hreflang="x-default" href="${pageUrl(page, 'et')}">`,
    REDIRECT,
    ...shareTags({ url, locale, title, description, type: page.type }),
    jsonScript(page.jsonLd({ url, copy, locale })),
  ].join(`\n${indent}`);
}

const INLINE_COPY = /const COPY = \{[\s\S]*?\n\s*\};/;

function localize(html, page, locale, copy) {
  const where = `${pageFile(page, 'et')} (${locale})`;
  const text = (key) => {
    if (typeof copy[key] !== 'string') throw new SourceError(`${where} has no copy for ${key}`);
    return copy[key];
  };
  return fillCopy(html, copy, where)
    .replace(/<html\b([^>]*?)\slang="[^"]*"/, `<html$1 lang="${locale}"`)
    .replace(INLINE_COPY, () => `const COPY = ${JSON.stringify({ [locale]: copy }, null, 2).replace(/\n/g, '\n  ')};`)
    .replace(/<[a-z][^>]*\sdata-i18n-aria="([^"]+)"[^>]*>/g, (tag, key) => tag.replace(/\saria-label="[^"]*"/, ` aria-label="${escapeHtml(text(key))}"`))
    .replace(/<[a-z][^>]*\sdata-i18n-placeholder="([^"]+)"[^>]*>/g, (tag, key) => tag.replace(/\splaceholder="[^"]*"/, ` placeholder="${escapeHtml(text(key))}"`))
    .replace(/<a\b[^>]*\sdata-link="([^"]+)"[^>]*>/g, (tag, key) => (Object.hasOwn(PAGE_LINKS, key)
      ? tag.replace(/\shref="[^"]*"/, ` href="${pageHref(key, locale)}"`)
      : tag.replace(/([?&]lang=)(?:et|en)\b/, `$1${locale}`)))
    .replace(/(\sdata-analytics-privacy-url=")[^"]*"/, `$1${localePath(PAGE_LINKS.privacy, locale)}"`);
}

function sitemapEntries() {
  return LANGUAGE_PAGES.filter((page) => !page.noindex).flatMap((page) => LOCALES.map((locale) => [
    '  <url>',
    `    <loc>${pageUrl(page, locale)}</loc>`,
    ...LOCALES.map((value) => `    <xhtml:link rel="alternate" hreflang="${value}" href="${pageUrl(page, value)}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(page, 'et')}"/>`,
    '  </url>',
  ].join('\n')));
}

// Runs after the architecture build, which leaves its pages' copy for this to fill.
export async function renderLanguagePages(landingDir) {
  for (const page of LANGUAGE_PAGES) {
    const file = pageFile(page, 'et');
    const source = await readFile(join(landingDir, file), 'utf8');
    const copy = page.copy(source, file);
    const indent = source.match(/^([ \t]*)<!-- page-meta -->$/m)?.[1] ?? '';
    for (const locale of LOCALES) {
      const target = join(landingDir, pageFile(page, locale));
      const html = replaceMarker(localize(source, page, locale, copy[locale]), 'page-meta', renderHead(page, locale, copy[locale], indent), target);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, html);
    }
  }
  const sitemapPath = join(landingDir, 'sitemap.xml');
  await writeFile(sitemapPath, replaceMarker(await readFile(sitemapPath, 'utf8'), 'language-pages', sitemapEntries().join('\n'), sitemapPath));
}
