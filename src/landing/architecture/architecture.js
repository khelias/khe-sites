import { createLocaleController } from '/assets/site-locale.js';
import { COPY } from '/architecture/copy.js';

// A page with its own `<page>PageTitle` in COPY uses it, the server page
// COPY's `title`. An ADR page keeps its English title in both languages; only
// the chrome around the decision is localised.
const page = document.body.dataset.page;
const pageMeta = (values) => {
  if (page === 'decision') {
    return {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
    };
  }
  return {
    title: values[`${page}PageTitle`] ?? values.title,
    description: values[`${page}PageDescription`] ?? values.description,
  };
};
const copy = Object.fromEntries(
  Object.entries(COPY).map(([locale, values]) => [locale, { ...values, ...pageMeta(values) }]),
);

// The three pages are one page per language (khe-sites ADR-001); an ADR page is English and
// translates its chrome in place.
createLocaleController({
  copy,
  defaultLocale: document.documentElement.lang,
  alternatePages: page !== 'decision',
});
