// The language the visitor chose with the switcher, shared by every page on the origin.
export const LOCALE_STORAGE_KEY = 'app_locale';

// The visitor's light or dark choice over the system setting (estate ADR-014 point 6); the same key on
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
    headerDemo: 'Demo',
    headerDemoNoteHouse: 'Väljamõeldud maja, seadmed on simuleeritud.',
    headerDemoLink: 'Perele →',
  },
  en: {
    headerLanguage: 'Language',
    headerHomeLanding: 'KHE home',
    headerHomeKheEe: 'KHE.ee home',
    headerTheme: 'Dark theme',
    headerDemo: 'Demo',
    headerDemoNoteHouse: 'A made-up house with simulated devices.',
    headerDemoLink: 'For family →',
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

export const LOCALES = ['et', 'en'];

// The khe.ee pages with one static page per language (khe-sites ADR-001), by the key their links
// carry in data-link: the Estonian path, which localePath turns into the page's language.
export const PAGE_LINKS = {
  home: '/',
  privacy: '/privacy/',
  architecture: '/architecture/',
  shipping: '/architecture/#shipping',
  register: '/architecture/decisions/',
  agents: '/agents/',
  workshop: '/workshop/',
};

// A room built by its own repo keeps its own language folders (khe-sites ADR-001 point 5).
const ROOM_LOCAL_PATHS = ['/workshop/'];

export function localePath(path, locale) {
  if (locale !== 'en') return path;
  const room = ROOM_LOCAL_PATHS.find((prefix) => path.startsWith(prefix));
  return room ? `${room}en/${path.slice(room.length)}` : `/en${path}`;
}

// A link to a PAGE_LINKS page in a language, carrying it as ?lang so the asked language holds
// over a stored one.
export function pageHref(key, locale) {
  const [path, hash] = PAGE_LINKS[key].split('#');
  return `${localePath(path, locale)}?lang=${locale}${hash ? `#${hash}` : ''}`;
}

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
  alternatePages = false,
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

  // A page per language shows its own; its head script has already opened the asked one.
  function initialLocale() {
    if (alternatePages) return builtLocale;
    return normalizeLocale(queryLocale(), supported)
      || normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY), supported)
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
    if (!alternatePages) setQueryLocale(activeLocale);

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
      if (links[key]) anchor.setAttribute('href', links[key](activeLocale));
      else if (Object.hasOwn(PAGE_LINKS, key)) anchor.setAttribute('href', pageHref(key, activeLocale));
    });
  }

  // Only a press is stored: app_locale is shared with the games on the origin, and an installed
  // game opens in Estonian until a language is chosen. A ?lang shows the page in its language
  // and goes on in the links, since the build writes one into every room link.
  // A page per language (alternatePages, khe-sites ADR-001) goes to the page in the chosen language,
  // named by its <link rel="alternate" hreflang>, instead of translating this one. By pathname, so
  // a local preview stays local.
  document.querySelectorAll('[data-lang-option]').forEach((button) => {
    button.addEventListener('click', () => {
      const option = button.getAttribute('data-lang-option');
      const page = alternatePages && option !== builtLocale
        && document.querySelector(`link[rel="alternate"][hreflang="${option}"]`)?.getAttribute('href');
      if (page) {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, option);
        window.location.assign(`${new URL(page, window.location.href).pathname}?lang=${option}${window.location.hash}`);
        return;
      }
      const locale = normalizeLocale(option, supported);
      if (locale) window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      applyLocale(locale);
    });
  });

  applyLocale(initialLocale());

  if (document.querySelector('.site-header__theme')) {
    import('/assets/theme.js').then(({ wireThemeToggle }) => wireThemeToggle({ storageKey: THEME_STORAGE_KEY }));
  }

  return { applyLocale };
}
