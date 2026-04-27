const FOOTER_COPY = {
  et: {
    footerLinksLabel: 'Lehe lingid',
    footer: 'Self-hosted in Tallinn',
    privacyLink: 'Privaatsus',
  },
  en: {
    footerLinksLabel: 'Page links',
    footer: 'Self-hosted in Tallinn',
    privacyLink: 'Privacy',
  },
};

export function withSiteFooterCopy(copy) {
  return Object.fromEntries(
    Object.entries(copy).map(([locale, values]) => [
      locale,
      {
        ...(FOOTER_COPY[locale] || FOOTER_COPY.en),
        ...values,
      },
    ]),
  );
}

export function renderSiteFooter(target = '[data-site-footer]') {
  const footer = typeof target === 'string' ? document.querySelector(target) : target;
  if (!footer) return;

  footer.classList.add('site-footer');
  footer.innerHTML = `
    <nav aria-label="Page links" data-i18n-aria="footerLinksLabel">
      <a href="https://github.com/khelias">GitHub</a>
      <span class="divider">·</span>
      <a href="https://www.linkedin.com/in/kaido-henrik-elias/">LinkedIn</a>
      <span class="divider">·</span>
      <a href="/privacy?lang=en" data-i18n="privacyLink" data-link="privacy">Privacy</a>
    </nav>
    <span data-i18n="footer">Self-hosted in Tallinn</span>
  `;
}
