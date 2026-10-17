import { escapeHtml } from './markdown.mjs';
import { SITE_HEADER_COPY } from '../src/shared/site-locale.js';

// Where the brand mark leads: its own site's home, or khe.ee from the games site.
const HOMES = {
  landing: { href: '/', label: 'headerHomeLanding' },
  games: { href: '/', label: 'headerHomeGames' },
  'khe.ee': { href: 'https://khe.ee/', label: 'headerHomeKheEe' },
};

// The kicker above the title names the page's parent; the ADR pages link it, with data-link
// set to the parent's key.
const PARENTS = {
  architecture: { title: 'headerArchitecture', href: '/architecture/' },
  games: { title: 'headerKheGames' },
};

// <!-- site-header home=<HOMES key> title=<copy key> [parent=<PARENTS key>] [fixed] -->
// on a line of its own; the header keeps the marker's indent and renders in the page's <html lang>.
const MARKER = /^([ \t]*)<!-- site-header ([^>]*?) -->$/gm;

function parseOptions(text, file) {
  const options = {};
  for (const token of text.trim().split(/\s+/)) {
    const [name, value = true] = token.split('=');
    if (!['home', 'title', 'parent', 'fixed'].includes(name)) throw new Error(`${file}: site-header has an unknown option ${name}`);
    options[name] = value;
  }
  return options;
}

function renderHeader({ home, title, parent, fixed }, locale, file) {
  const copy = SITE_HEADER_COPY[locale];
  const target = HOMES[home];
  const kicker = parent && PARENTS[parent];
  if (!copy) throw new Error(`${file}: site-header has no copy for <html lang="${locale}">`);
  if (!target) throw new Error(`${file}: site-header home=${home} is not one of ${Object.keys(HOMES).join(', ')}`);
  if (parent && !kicker) throw new Error(`${file}: site-header parent=${parent} is not one of ${Object.keys(PARENTS).join(', ')}`);
  const text = (key) => {
    if (typeof copy[key] !== 'string') throw new Error(`${file}: site-header uses ${key}, which SITE_HEADER_COPY.${locale} lacks`);
    return escapeHtml(copy[key]);
  };
  const contextTag = kicker?.href ? 'a' : 'div';
  const contextLink = kicker?.href ? ` href="${kicker.href}?lang=${locale}" data-link="${parent}"` : '';
  const pressed = (option) => (option === locale ? 'true' : 'false');

  return [
    `<header class="site-header${fixed ? ' site-header--fixed' : ''}">`,
    '  <div class="site-header__inner">',
    `    <a class="site-header__brand brand-mark" href="${target.href}?lang=${locale}" data-link="home" data-i18n-aria="${target.label}" aria-label="${text(target.label)}">`,
    '      <span>KHE</span><span class="brand-mark__suffix">.ee</span>',
    '    </a>',
    `    <${contextTag} class="site-header__context"${contextLink}>`,
    ...(kicker ? [`      <span data-i18n="${kicker.title}">${text(kicker.title)}</span>`] : []),
    `      <strong data-i18n="${title}">${text(title)}</strong>`,
    `    </${contextTag}>`,
    '    <div class="site-header__actions">',
    `      <div class="language-switcher" role="group" aria-label="${text('headerLanguage')}" data-i18n-aria="headerLanguage">`,
    `        <button type="button" data-lang-option="et" aria-pressed="${pressed('et')}">ET</button>`,
    `        <button type="button" data-lang-option="en" aria-pressed="${pressed('en')}">EN</button>`,
    '      </div>',
    '    </div>',
    '  </div>',
    '</header>',
  ];
}

export function fillSiteHeader(html, file) {
  const locale = html.match(/<html\b[^>]*\slang="([^"]+)"/)?.[1];
  return html.replace(MARKER, (match, indent, options) => {
    if (!locale) throw new Error(`${file}: a page with a site-header marker needs <html lang="…">`);
    return renderHeader(parseOptions(options, file), locale, file)
      .map((line) => `${indent}${line}`)
      .join('\n');
  });
}
