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

function setAttribute(selector, copy, dataAttribute, targetAttribute) {
  document.querySelectorAll(selector).forEach((node) => {
    const key = node.getAttribute(dataAttribute);
    if (copy[key]) node.setAttribute(targetAttribute, copy[key]);
  });
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
    const metaDescription = document.querySelector('meta[name="description"]');

    document.documentElement.lang = activeLocale;
    document.title = activeCopy.title;
    if (metaDescription && activeCopy.description) {
      metaDescription.setAttribute('content', activeCopy.description);
    }
    window.localStorage.setItem(STORAGE_KEY, activeLocale);
    setQueryLocale(activeLocale);

    setText('[data-i18n]', activeCopy, 'data-i18n');
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
