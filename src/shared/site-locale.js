const STORAGE_KEY = 'app_locale';

// The visitor's light or dark choice over the system setting (estate ADR-017); the same key on
// khe.ee and games.khe.ee, which are separate origins and so keep separate choices.
export const THEME_STORAGE_KEY = 'khe-theme';

// The site header's strings. The build renders the header from them in the page's language
// (scripts/site-header.mjs), and every locale controller merges them under the page's copy.
export const SITE_HEADER_COPY = {
  et: {
    headerLanguage: 'Keel',
    headerHomeLanding: 'KHE avaleht',
    headerHomeKheEe: 'KHE.ee avaleht',
    headerTheme: 'Tume teema',
  },
  en: {
    headerLanguage: 'Language',
    headerHomeLanding: 'KHE home',
    headerHomeKheEe: 'KHE.ee home',
    headerTheme: 'Dark theme',
  },
};

// The site footer's strings, rendered and merged the same way.
export const SITE_FOOTER_COPY = {
  et: {
    footerLinksLabel: 'Lehe lingid',
    footer: 'Ise majutatud Eestis',
    privacyLink: 'Privaatsus',
  },
  en: {
    footerLinksLabel: 'Page links',
    footer: 'Self-hosted in Estonia',
    privacyLink: 'Privacy',
  },
};

function normalizeLocale(value, supported) {
  return supported.includes(value) ? value : null;
}

function browserLocale(supported, fallback) {
  const language = navigator.language ? navigator.language.toLowerCase() : '';
  return supported.find((locale) => language.startsWith(locale)) || fallback;
}

function queryLocale() {
  const params = new URLSearchParams(window.location.search);
  return params.get('lang') || params.get('locale');
}

function setQueryLocale(locale) {
  const url = new URL(window.location.href);
  url.searchParams.set('lang', locale);
  url.searchParams.delete('locale');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function setText(selector, copy, attribute) {
  document.querySelectorAll(selector).forEach((node) => {
    const key = node.getAttribute(attribute);
    if (copy[key]) node.textContent = copy[key];
  });
}

function setHtml(selector, copy, attribute) {
  document.querySelectorAll(selector).forEach((node) => {
    const key = node.getAttribute(attribute);
    if (copy[key]) node.innerHTML = copy[key];
  });
}

function setAttribute(selector, copy, dataAttribute, targetAttribute) {
  document.querySelectorAll(selector).forEach((node) => {
    const key = node.getAttribute(dataAttribute);
    if (copy[key]) node.setAttribute(targetAttribute, copy[key]);
  });
}

function setMetaContent(selector, content) {
  const meta = document.querySelector(selector);
  if (meta && content) meta.setAttribute('content', content);
}

export function createLocaleController({
  copy: pageCopy,
  defaultLocale = 'en',
  useBrowserDefault = false,
  links = {},
}) {
  // iOS Safari applies :active only once the page listens for touchstart.
  // Every page starts a locale controller, so the press states in site.css and site-header.css
  // hang on this.
  document.addEventListener('touchstart', () => {}, { passive: true });

  const copy = Object.fromEntries(Object.entries(pageCopy).map(([locale, values]) => [
    locale,
    {
      ...(SITE_HEADER_COPY[locale] || SITE_HEADER_COPY.en),
      ...(SITE_FOOTER_COPY[locale] || SITE_FOOTER_COPY.en),
      ...values,
    },
  ]));
  const supported = Object.keys(copy);
  const fallbackLocale = supported.includes(defaultLocale) ? defaultLocale : supported[0];

  function initialLocale() {
    return normalizeLocale(queryLocale(), supported)
      || normalizeLocale(window.localStorage.getItem(STORAGE_KEY), supported)
      || (useBrowserDefault ? browserLocale(supported, fallbackLocale) : fallbackLocale);
  }

  // The rooms menu is built in the page's language, so its module loads only once the page
  // shows another. Imported here, not at the top: scripts/site-header.mjs imports this file in
  // Node. Every switch waits on the same promise, so the menu ends in the last language chosen.
  const hasRooms = Boolean(document.querySelector('.site-header__rooms'));
  const builtLocale = document.documentElement.lang;
  let rooms = null;

  function applyLocale(locale) {
    const activeLocale = normalizeLocale(locale, supported) || fallbackLocale;
    const activeCopy = copy[activeLocale] || copy[fallbackLocale];

    if (hasRooms && (rooms || activeLocale !== builtLocale)) {
      rooms ??= import('/assets/rooms.js');
      rooms.then(({ setRoomsLocale }) => setRoomsLocale(document, activeLocale));
    }
    document.documentElement.lang = activeLocale;
    document.title = activeCopy.title;
    setMetaContent('meta[name="description"]', activeCopy.description);
    setMetaContent('meta[property="og:title"]', activeCopy.title);
    setMetaContent('meta[property="og:description"]', activeCopy.description);
    setMetaContent('meta[name="twitter:title"]', activeCopy.title);
    setMetaContent('meta[name="twitter:description"]', activeCopy.description);
    window.localStorage.setItem(STORAGE_KEY, activeLocale);
    setQueryLocale(activeLocale);

    setText('[data-i18n]', activeCopy, 'data-i18n');
    setHtml('[data-i18n-html]', activeCopy, 'data-i18n-html');
    setAttribute('[data-i18n-aria]', activeCopy, 'data-i18n-aria', 'aria-label');
    setAttribute('[data-i18n-title]', activeCopy, 'data-i18n-title', 'title');

    document.querySelectorAll('[data-lang-option]').forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        button.getAttribute('data-lang-option') === activeLocale ? 'true' : 'false',
      );
    });

    document.querySelectorAll('[data-link]').forEach((anchor) => {
      const key = anchor.getAttribute('data-link');
      const resolveHref = links[key];
      if (resolveHref) anchor.setAttribute('href', resolveHref(activeLocale));
    });
  }

  document.querySelectorAll('[data-lang-option]').forEach((button) => {
    button.addEventListener('click', () => applyLocale(button.getAttribute('data-lang-option')));
  });

  applyLocale(initialLocale());

  if (document.querySelector('.site-header__theme')) {
    import('/assets/theme.js').then(({ wireThemeToggle }) => wireThemeToggle({ storageKey: THEME_STORAGE_KEY }));
  }

  return { applyLocale };
}
