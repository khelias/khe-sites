import { renderSiteHeader } from '@khelias/ui/site-header';
import { renderSiteFooter } from '@khelias/ui/site-footer';
import { themeInitScript } from '@khelias/ui/theme';
import { viewInitScript } from '@khelias/ui/view';
import { SITE_FOOTER_COPY, SITE_HEADER_COPY, THEME_STORAGE_KEY } from '../src/shared/site-locale.js';

// Where the brand mark leads: the khe.ee front page, from games.khe.ee by its full address.
const HOMES = {
  landing: { href: '/', label: 'headerHomeLanding' },
  'khe.ee': { href: 'https://khe.ee/', label: 'headerHomeKheEe' },
};

// <!-- site-header home=<HOMES key> [rooms] [theme] [fixed] [demo] [product=<root>] [title=<COPY key>] -->
// on a line of its own; the header keeps the marker's indent and renders in the page's
// <html lang>. rooms shows the rooms menu with the page's <html data-room> current (estate
// ADR-021); every page but the landing has it. demo adds the demo line, product=<root> marks a
// product page with its two views (estate ADR-030), title names the app from the page's COPY.
const MARKER = /^([ \t]*)<!-- site-header ([^>]*?) -->$/gm;
const OPTIONS = ['home', 'rooms', 'theme', 'fixed', 'demo', 'product', 'title'];
// <!-- site-theme --> in <head>, before the first stylesheet: the stored theme before first paint.
const THEME_MARKER = /^([ \t]*)<!-- site-theme -->$/gm;
// <!-- site-view --> in <head>, before the first stylesheet, on a product page: its view before first paint.
const VIEW_MARKER = /^([ \t]*)<!-- site-view -->$/gm;
// <!-- site-footer --> where the page's footer goes.
const FOOTER_MARKER = /^([ \t]*)<!-- site-footer -->$/gm;

function parseOptions(text, file) {
  const options = {};
  for (const token of text.trim().split(/\s+/)) {
    const [name, value = true] = token.split('=');
    if (!OPTIONS.includes(name)) throw new Error(`${file}: site-header has an unknown option ${name}`);
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

// A page's inline `const COPY = {…};`, the shape check also reads, or null on a page without one.
export function readPageCopy(html, file) {
  const literal = html.match(/const COPY = (\{[\s\S]*?\n\s*\});/)?.[1];
  if (!literal) {
    if (html.includes('const COPY')) throw new Error(`${file}: its inline COPY is not in the shape check reads`);
    return null;
  }
  return new Function(`return ${literal}`)();
}

function renderHeader({ home, rooms, theme, fixed, demo, product, title }, locale, room, pageCopy, indent, file) {
  const copyText = copyFor(SITE_HEADER_COPY, 'site-header', locale, file);
  const target = HOMES[home];
  if (!target) throw new Error(`${file}: site-header home=${home} is not one of ${Object.keys(HOMES).join(', ')}`);
  if ((rooms || demo) && !room) throw new Error(`${file}: site-header rooms and demo need <html data-room="…">`);
  const noteKey = demo && `headerDemoNote${room[0].toUpperCase()}${room.slice(1)}`;
  const titleText = title && copyFor(pageCopy() ?? {}, 'site-header title', locale, file)(title);

  return renderSiteHeader({
    brand: { href: `${target.href}?lang=${locale}`, label: copyText(target.label) },
    rooms: rooms ? { current: room, locale } : undefined,
    context: title ? { title: titleText } : undefined,
    demo: demo ? { label: copyText('headerDemo'), note: copyText(noteKey) } : undefined,
    product: product ? { root: product } : undefined,
    themeToggle: theme ? { label: copyText('headerTheme') } : undefined,
    locales: [{ code: 'et', label: 'ET' }, { code: 'en', label: 'EN' }],
    activeLocale: locale,
    languageLabel: copyText('headerLanguage'),
    fixed: Boolean(fixed),
    indent,
    attrs: {
      brand: { 'data-link': 'home', 'data-i18n-aria': target.label },
      ...(theme && { theme: { 'data-i18n-aria': 'headerTheme' } }),
      ...(title && { title: { 'data-i18n': title } }),
      ...(demo && { demoLabel: { 'data-i18n': 'headerDemo' }, demoText: { 'data-i18n': noteKey } }),
      switcher: { 'data-i18n-aria': 'headerLanguage' },
    },
  });
}

// product pages lead back to khe.ee from the footer, shown in the product view only (estate ADR-030)
function renderFooter(locale, product, indent, file) {
  const copyText = copyFor(SITE_FOOTER_COPY, 'site-footer', locale, file);
  return renderSiteFooter({
    label: copyText('footerLinksLabel'),
    home: product ? { label: 'KHE.ee', href: `/?lang=${locale}`, attrs: { 'data-link': 'home' } } : undefined,
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

// Fills the site-header, site-theme, site-view and site-footer markers of a built page.
export function fillSiteChrome(html, file) {
  const htmlTag = html.match(/<html\b[^>]*>/)?.[0] ?? '';
  const locale = htmlTag.match(/\slang="([^"]+)"/)?.[1];
  const room = htmlTag.match(/\sdata-room="([^"]+)"/)?.[1];
  const needLocale = (marker) => {
    if (!locale) throw new Error(`${file}: a page with a ${marker} marker needs <html lang="…">`);
    return locale;
  };
  const headers = [...html.matchAll(MARKER)].map(([, , options]) => parseOptions(options, file));
  const product = headers.find((options) => options.product)?.product;
  const pageCopy = () => readPageCopy(html, file);
  let header = 0;
  return html
    .replace(MARKER, (match, indent) => renderHeader(headers[header++], needLocale('site-header'), room, pageCopy, indent, file))
    .replace(THEME_MARKER, (match, indent) => `${indent}<script>${themeInitScript(THEME_STORAGE_KEY)}</script>`)
    .replace(VIEW_MARKER, (match, indent) => {
      if (!product) throw new Error(`${file}: site-view needs a site-header with product=<root>`);
      return `${indent}<script>${viewInitScript(product)}</script>`;
    })
    .replace(FOOTER_MARKER, (match, indent) => renderFooter(needLocale('site-footer'), product, indent, file));
}
