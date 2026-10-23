import { renderSiteHeader } from '@khelias/ui/site-header';
import { renderSiteFooter } from '@khelias/ui/site-footer';
import { themeInitScript } from '@khelias/ui/theme';
import { SITE_FOOTER_COPY, SITE_HEADER_COPY, THEME_STORAGE_KEY } from '../src/shared/site-locale.js';

// Where the brand mark leads: the khe.ee front page, from games.khe.ee by its full address.
const HOMES = {
  landing: { href: '/', label: 'headerHomeLanding' },
  'khe.ee': { href: 'https://khe.ee/', label: 'headerHomeKheEe' },
};

// <!-- site-header home=<HOMES key> [rooms] [theme] [fixed] --> on a line of its own; the header
// keeps the marker's indent and renders in the page's <html lang>. rooms shows the rooms menu
// with the page's <html data-room> current (estate ADR-021); every page but the landing has it.
const MARKER = /^([ \t]*)<!-- site-header ([^>]*?) -->$/gm;
// <!-- site-theme --> in <head>, before the first stylesheet: the stored theme before first paint.
const THEME_MARKER = /^([ \t]*)<!-- site-theme -->$/gm;
// <!-- site-footer --> where the page's footer goes.
const FOOTER_MARKER = /^([ \t]*)<!-- site-footer -->$/gm;

function parseOptions(text, file) {
  const options = {};
  for (const token of text.trim().split(/\s+/)) {
    const [name, value = true] = token.split('=');
    if (!['home', 'rooms', 'theme', 'fixed'].includes(name)) throw new Error(`${file}: site-header has an unknown option ${name}`);
    options[name] = value;
  }
  return options;
}

function copyFor(source, name, locale, file) {
  const copy = source[locale];
  if (!copy) throw new Error(`${file}: ${name} has no copy for <html lang="${locale}">`);
  return (key) => {
    if (typeof copy[key] !== 'string') throw new Error(`${file}: ${name} uses ${key}, which its copy for ${locale} lacks`);
    return copy[key];
  };
}

function renderHeader({ home, rooms, theme, fixed }, locale, room, indent, file) {
  const copyText = copyFor(SITE_HEADER_COPY, 'site-header', locale, file);
  const target = HOMES[home];
  if (!target) throw new Error(`${file}: site-header home=${home} is not one of ${Object.keys(HOMES).join(', ')}`);
  if (rooms && !room) throw new Error(`${file}: site-header rooms needs <html data-room="…">`);

  return renderSiteHeader({
    brand: { href: `${target.href}?lang=${locale}`, label: copyText(target.label) },
    rooms: rooms ? { current: room, locale } : undefined,
    themeToggle: theme ? { label: copyText('headerTheme') } : undefined,
    locales: [{ code: 'et', label: 'ET' }, { code: 'en', label: 'EN' }],
    activeLocale: locale,
    languageLabel: copyText('headerLanguage'),
    fixed: Boolean(fixed),
    indent,
    attrs: {
      brand: { 'data-link': 'home', 'data-i18n-aria': target.label },
      ...(theme && { theme: { 'data-i18n-aria': 'headerTheme' } }),
      switcher: { 'data-i18n-aria': 'headerLanguage' },
    },
  });
}

function renderFooter(locale, indent, file) {
  const copyText = copyFor(SITE_FOOTER_COPY, 'site-footer', locale, file);
  return renderSiteFooter({
    label: copyText('footerLinksLabel'),
    links: [
      { label: 'GitHub', href: 'https://github.com/khelias', icon: 'github' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kaido-henrik-elias/', icon: 'linkedin' },
      {
        label: copyText('privacyLink'),
        href: `/privacy?lang=${locale}`,
        attrs: { 'data-link': 'privacy', 'data-i18n': 'privacyLink' },
      },
    ],
    lines: [{ text: copyText('footer'), attrs: { 'data-i18n': 'footer' } }],
    attrs: { nav: { 'data-i18n-aria': 'footerLinksLabel' } },
    indent,
  });
}

// Fills the site-header, site-theme and site-footer markers of a built page.
export function fillSiteChrome(html, file) {
  const htmlTag = html.match(/<html\b[^>]*>/)?.[0] ?? '';
  const locale = htmlTag.match(/\slang="([^"]+)"/)?.[1];
  const room = htmlTag.match(/\sdata-room="([^"]+)"/)?.[1];
  const needLocale = (marker) => {
    if (!locale) throw new Error(`${file}: a page with a ${marker} marker needs <html lang="…">`);
    return locale;
  };
  return html
    .replace(MARKER, (match, indent, options) => renderHeader(parseOptions(options, file), needLocale('site-header'), room, indent, file))
    .replace(THEME_MARKER, (match, indent) => `${indent}<script>${themeInitScript(THEME_STORAGE_KEY)}</script>`)
    .replace(FOOTER_MARKER, (match, indent) => renderFooter(needLocale('site-footer'), indent, file));
}
