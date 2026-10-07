import { createLocaleController } from '/assets/site-locale.js?v=20260427e';
import { renderSiteFooter, withSiteFooterCopy } from '/assets/site-footer.js?v=20260427e';
import { COPY } from '/architecture/copy.js?v=20261007b';

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

// Marks the section being read in the contents rail: the last one whose top
// has passed a line a third of the way down the viewport.
const railLinks = [...document.querySelectorAll('.arch-rail a[href^="#"]')]
  .map((link) => ({ link, section: document.getElementById(link.getAttribute('href').slice(1)) }))
  .filter(({ section }) => section);
let railFrame = 0;
function markCurrentSection() {
  railFrame = 0;
  const line = window.innerHeight / 3;
  let current = null;
  for (const entry of railLinks) {
    if (entry.section.getBoundingClientRect().top <= line) current = entry;
  }
  for (const entry of railLinks) entry.link.setAttribute('aria-current', entry === current ? 'true' : 'false');
}
if (railLinks.length) {
  window.addEventListener('scroll', () => {
    if (!railFrame) railFrame = window.requestAnimationFrame(markCurrentSection);
  }, { passive: true });
  markCurrentSection();
}
