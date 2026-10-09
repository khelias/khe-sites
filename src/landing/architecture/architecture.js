import { createLocaleController } from '/assets/site-locale.js?v=20261009a';
import { renderSiteFooter, withSiteFooterCopy } from '/assets/site-footer.js?v=20261008a';
import { COPY } from '/architecture/copy.js?v=20261008a';

renderSiteFooter();

// An ADR page keeps its English title in both languages; only the chrome
// around the decision is localised.
let copy = COPY;
if (document.body.dataset.page === 'decision') {
  const title = document.title;
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content');
  copy = Object.fromEntries(
    Object.entries(COPY).map(([locale, values]) => [locale, { ...values, title, description }]),
  );
}

createLocaleController({
  copy: withSiteFooterCopy(copy),
  defaultLocale: 'en',
  links: {
    home: (locale) => `/?lang=${locale}`,
    privacy: (locale) => `/privacy?lang=${locale}`,
    architecture: (locale) => `/architecture/?lang=${locale}`,
    register: (locale) => `/architecture/?lang=${locale}#decisions`,
  },
});
