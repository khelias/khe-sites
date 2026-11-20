(function () {
  const script = document.currentScript;
  const token = script?.dataset.analyticsToken || '';
  const privacyUrl = script?.dataset.analyticsPrivacyUrl || '/privacy';
  const storageKey = 'khe.analyticsConsent.v1';
  const configured = token && !token.startsWith('__');

  function currentLocale() {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    const fromHtml = document.documentElement.lang;
    let fromStorage = '';
    try {
      fromStorage = window.localStorage.getItem('app_locale') || '';
    } catch {
      // Ignore storage errors.
    }

    const value = (fromUrl || fromStorage || fromHtml || 'en').toLowerCase();
    return value.startsWith('et') ? 'et' : 'en';
  }

  const copy = {
    en: { question: 'Allow statistics?', allow: 'Allow', deny: 'Decline' },
    et: { question: 'Kas lubad statistika?', allow: 'Luba', deny: 'Keeldu' },
  };

  function currentCopy() {
    return copy[currentLocale()];
  }

  function localizedPrivacyUrl() {
    const locale = currentLocale();

    try {
      const url = new URL(privacyUrl, window.location.origin);
      url.searchParams.set('lang', locale);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return `/privacy?lang=${locale}`;
    }
  }

  function readChoice() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
      return parsed && typeof parsed.value === 'string' ? parsed.value : null;
    } catch {
      return null;
    }
  }

  function writeChoice(value) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ value, updatedAt: new Date().toISOString() }));
    } catch {
      // If localStorage is blocked, apply the current page choice without persistence.
    }
  }

  function loadBeacon() {
    if (!configured || document.querySelector('script[data-cf-beacon]')) return;

    const beacon = document.createElement('script');
    beacon.defer = true;
    beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    beacon.setAttribute('data-cf-beacon', JSON.stringify({ token }));
    document.head.appendChild(beacon);
  }

  function injectStyles() {
    if (document.getElementById('khe-analytics-consent-style')) return;

    const style = document.createElement('style');
    style.id = 'khe-analytics-consent-style';
    style.textContent = `
      .khe-analytics-consent {
        --khe-consent-paper: #fafafa;
        --khe-consent-surface: #ffffff;
        --khe-consent-ink: #121415;
        --khe-consent-rule-strong: #c3c7c7;
        box-sizing: border-box;
        position: fixed;
        left: 50%;
        bottom: max(1rem, env(safe-area-inset-bottom));
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        max-width: calc(100vw - 2rem);
        padding: 0.25rem 0.25rem 0.25rem 1rem;
        border: 1px solid var(--khe-consent-rule-strong);
        border-radius: 999px;
        background: var(--khe-consent-surface);
        box-shadow: 0 12px 32px rgb(0 0 0 / 0.14); /* design-lint-allow shadow: a floating layer, like the rooms list */
        color: var(--khe-consent-ink);
        font: 400 0.875rem/1.4 'Familjen Grotesk', system-ui, sans-serif;
        transform: translateX(-50%);
        white-space: nowrap;
      }
      :root[data-theme="dark"] .khe-analytics-consent {
        --khe-consent-paper: #0b0d0d;
        --khe-consent-surface: #121615;
        --khe-consent-ink: #eef1f0;
        --khe-consent-rule-strong: #3a413f;
      }
      @media (prefers-color-scheme: dark) {
        :root:not([data-theme="light"]) .khe-analytics-consent {
          --khe-consent-paper: #0b0d0d;
          --khe-consent-surface: #121615;
          --khe-consent-ink: #eef1f0;
          --khe-consent-rule-strong: #3a413f;
        }
      }
      .khe-analytics-consent a {
        margin-right: 0.5rem;
        color: var(--khe-consent-ink);
        text-decoration: underline;
        text-decoration-color: var(--khe-consent-rule-strong);
        text-underline-offset: 3px;
      }
      .khe-analytics-consent button {
        box-sizing: border-box;
        min-width: 4.5rem;
        min-height: 2.75rem;
        padding: 0 0.875rem;
        border: 1px solid var(--khe-consent-rule-strong);
        border-radius: 999px;
        background: var(--khe-consent-paper);
        color: var(--khe-consent-ink);
        cursor: pointer;
        font: 600 0.8125rem/1 'Familjen Grotesk', system-ui, sans-serif;
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
        transition: transform 0.1s ease-out;
      }
      @media (prefers-reduced-motion: no-preference) {
        .khe-analytics-consent button:active {
          transform: scale(0.97);
        }
      }
      .khe-analytics-consent :focus-visible {
        outline: 2px solid var(--khe-consent-ink);
        outline-offset: 2px;
      }
      .khe-analytics-consent a:focus-visible {
        border-radius: 4px;
      }
      @media (max-width: 359px) {
        .khe-analytics-consent {
          flex-wrap: wrap;
          width: calc(100vw - 2rem);
          padding: 0.75rem;
          gap: 0.5rem;
          border-radius: 12px;
          white-space: normal;
        }
        .khe-analytics-consent a {
          flex-basis: 100%;
          margin: 0 0 0 0.25rem;
        }
        .khe-analytics-consent button {
          flex: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function closeBanner() {
    document.querySelector('[data-analytics-consent-panel]')?.remove();
  }

  function showBanner() {
    if (!configured) return;
    injectStyles();
    closeBanner();

    const text = currentCopy();
    const panel = document.createElement('section');
    panel.className = 'khe-analytics-consent';
    panel.setAttribute('data-analytics-consent-panel', '');
    panel.innerHTML = `
      <a href="${localizedPrivacyUrl()}">${text.question}</a>
      <button type="button" data-consent-choice="granted">${text.allow}</button>
      <button type="button" data-consent-choice="denied">${text.deny}</button>
    `;

    panel.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest('[data-consent-choice]');
      if (!button) return;

      const choice = button.dataset.consentChoice;
      if (choice !== 'granted' && choice !== 'denied') return;

      writeChoice(choice);
      if (choice === 'granted') loadBeacon();
      panel.remove();
    });

    document.body.appendChild(panel);
  }

  function scheduleBanner() {
    const open = () => {
      if (!readChoice()) showBanner();
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(open, { timeout: 1200 });
      return;
    }

    window.setTimeout(open, 350);
  }

  function applyChoice() {
    const choice = readChoice();

    if (choice === 'granted') {
      loadBeacon();
      return;
    }

    if (!choice) {
      scheduleBanner();
    }
  }

  window.kheAnalyticsConsent = {
    show: showBanner,
    reset() {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Ignore storage errors.
      }
      showBanner();
    },
  };

  document.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-analytics-preferences]')) {
      showBanner();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyChoice, { once: true });
  } else {
    applyChoice();
  }
})();
