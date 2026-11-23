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

// The decisions page lists every decision without JavaScript; with it, a search and the topic
// buttons narrow the tables, and a topic with no match is hidden.
const filter = document.querySelector('[data-register-filter]');
if (filter) {
  const search = filter.querySelector('input[type="search"]');
  const topics = [...filter.querySelectorAll('button[data-cluster]')];
  const clusters = [...document.querySelectorAll('.arch-cluster')];
  const empty = document.querySelector('[data-register-empty]');
  let topic = 'all';
  const apply = () => {
    const words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const cluster of clusters) {
      let rows = 0;
      for (const row of cluster.querySelectorAll('tbody tr')) {
        const text = row.textContent.toLocaleLowerCase();
        const hit = (topic === 'all' || cluster.dataset.cluster === topic) && words.every((word) => text.includes(word));
        row.hidden = !hit;
        if (hit) rows += 1;
      }
      cluster.hidden = rows === 0;
      cluster.querySelector('.arch-cluster__count').textContent = rows;
      shown += rows;
    }
    empty.hidden = shown > 0;
  };
  for (const button of topics) {
    button.addEventListener('click', () => {
      topic = button.dataset.cluster;
      for (const other of topics) other.setAttribute('aria-pressed', String(other === button));
      apply();
    });
  }
  search.addEventListener('input', apply);
  filter.hidden = false;
}
