const STORAGE_KEY = 'app_locale';

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
  copy,
  defaultLocale = 'en',
  useBrowserDefault = false,
  links = {},
}) {
  const supported = Object.keys(copy);
  const fallbackLocale = supported.includes(defaultLocale) ? defaultLocale : supported[0];

  function initialLocale() {
    return normalizeLocale(queryLocale(), supported)
      || normalizeLocale(window.localStorage.getItem(STORAGE_KEY), supported)
      || (useBrowserDefault ? browserLocale(supported, fallbackLocale) : fallbackLocale);
  }

  function applyLocale(locale) {
    const activeLocale = normalizeLocale(locale, supported) || fallbackLocale;
    const activeCopy = copy[activeLocale] || copy[fallbackLocale];

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

  return { applyLocale };
}
