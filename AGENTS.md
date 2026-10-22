# khe-sites

Static source for two independently deployed sites: `khe.ee` from
`src/landing/` (with the estate architecture pages at `/architecture/`,
`/architecture/decisions/` and `/agents/`) and
`games.khe.ee` from `src/games/`, the launcher shell. The game apps
(`khe-study`, `khe-ai-adventure`) live and deploy in their own repos.

Plain HTML, CSS and vanilla JS, built by Node 24 scripts. No framework, no
bundler. One devDependency, `@khelias/ui` (the KHE site header with its
rooms menu and theme toggle, and the site footer), pinned exactly; run
`npm ci` before building.

The look is the KHE family layer
([estate ADR-018](https://github.com/khelias/khe-architecture/blob/main/decisions/018-rooms-menu-in-the-shared-header.md),
which supersedes ADR-015): shared chrome on one ground in every room, one
accent per room shown in the chrome only in the `.ee` and as the room's dot
in the rooms list, light and dark following the system setting.
khe-sites owns the family [`DESIGN.md`](DESIGN.md), the one source of the
family values; the apps copy them into their `--khe-header-*` values.

## Commands

- `npm run check` - build, then static validation of the sources, the
  built pages and `DESIGN.md` against the tokens
- `npm run build` - build `dist/landing` and `dist/games`

## Layout

```
src/
  landing/   khe.ee
    architecture/  the home server page: copy.js (en/et strings of all
             three architecture pages), architecture.js; its diagrams and
             building blocks are rendered into it at build time
      decisions/   the five key decisions and the register, rendered at
             build time; the ADR pages are built beside it
    agents/  agentic development (home room): the agents diagram
  games/     games.khe.ee launcher shell
  shared/    cross-site assets, copied into each site's /assets/ at build
scripts/
  build.mjs                build dist/
  check.mjs                static checks
  architecture-sources.mjs reads khe-architecture and khe-homelab
  house3d-demo.mjs         runs khe-home-assistant's demo build into
                           dist/landing/ha/
  architecture-model.mjs   diagram elements, edges and layout
  render-architecture.mjs  renders the three pages, ADR pages and sitemap
                           entries
  site-header.mjs          fills each page's site-header, site-theme and
                           site-footer markers through @khelias/ui
  asset-versions.mjs       stamps ?v=<content hash> on .css and .js links
  markdown.mjs             strict Markdown subset for the ADRs
  templates/decision.html  the ADR page
  templates/house3d-header.html  the header marker and script the build puts
                           on /ha/
```

## Rules

1. **A third site is a structural change.** `scripts/build.mjs` has a
   hardcoded `apps = ['landing', 'games']`; a new `src/foo/` does nothing
   until that array, `deploy.yml` and the homelab nginx routing change
   together.
2. **`src/shared/` holds only files used by both sites.** The build copies
   a hardcoded list from it, so a new shared file needs its own `copyFile`
   line in `build.mjs`.
3. **Each `src/<site>/` is its own deployable root.** No relative paths
   between `landing/` and `games/`; both reach `shared/` only through the
   build-time copy.
4. **No bundler, no framework** without an ADR. The "static, no surprises"
   model is why this repo exists beside the React app repos.
5. **The architecture page reads `khe-architecture` at build**
   (`scripts/architecture-sources.mjs`) and keeps no copy of an ADR or of
   `ESTATE.md`
   ([estate ADR-012](https://github.com/khelias/khe-architecture/blob/main/decisions/012-estate-architecture-is-public.md)).
6. **The landing links the khe-trips demo at `/trips/`, built and deployed
   by khe-trips and served by khe-homelab's landing container.** It shows
   only trips that are over, and only their short title, place and start
   date for trips that do not open
   ([estate ADR-013](https://github.com/khelias/khe-architecture/blob/main/decisions/013-trips-public-demo.md)).
   It is not in the sitemap and `robots.txt` does not disallow it, so a
   crawler reads its `noindex`.
7. **Shared UI comes from versioned packages, never automerged.** The KHE
   site header, its theme toggle and the site footer are `@khelias/ui` from
   khe-ui, a devDependency pinned exactly: their markup comes from
   `renderSiteHeader` and `renderSiteFooter`, the theme rules from
   `@khelias/ui/theme`, the CSS from the package, and a fix to any of them
   is made in khe-ui
   ([estate ADR-017](https://github.com/khelias/khe-architecture/blob/main/decisions/017-shared-theme-toggle-and-footer.md)). A shared package holds presentation
   only, is pinned, and is merged here by hand: the last rule in
   `renovate.json` turns automerge off for it
   ([estate ADR-014](https://github.com/khelias/khe-architecture/blob/main/decisions/014-shared-ui-packages.md)).

## Deployment

`deploy.yml` runs on push to main on the self-hosted homelab runner:
`dist/landing` goes to `/srv/data/sites/khe`, `dist/games` to
`/srv/data/games/launcher`. khe-study deploys to `/srv/data/games/study/`,
which the homelab nginx stack bind-mounts at `/study/`. khe-ai-adventure is
not a static deploy: the same nginx proxies `/adventure/` to the
`adventure-web` and `adventure-proxy` containers, pulled from GHCR
(khe-homelab `services/apps/games/`).

What this repo publishes on `khe.ee` and `games.khe.ee` is also copied
hourly to the Cloudflare edge fallback ([estate ADR-016](https://github.com/khelias/khe-architecture/blob/main/decisions/016-static-fallback-at-the-edge.md)), which serves it
when the homelab is down, so it must be fit for a third-party host.

Because deploy runs on that runner, a fork PR's run is approved only after
reading its `.github/workflows/` diff
([estate ADR-006](https://github.com/khelias/khe-architecture/blob/main/decisions/006-branch-protection.md)).

Automated writers
([estate ADR-007](https://github.com/khelias/khe-architecture/blob/main/decisions/007-automated-writers.md)): Renovate
automerges npm patch and minor updates of stable packages, 0.x patches of
devDependencies, GitHub Actions minor and patch updates, digests, pins and
lock file maintenance (`renovate.json`); every merge to `main` deploys, and
the weekly schedule redeploys from the current sources. The way back from a
bad merge here is to revert its commit on `main` and push, which redeploys
the previous state; a bad page from a source repo is reverted there and
reaches khe.ee at the next deploy here. A new automated writer joins the
estate's writer register in khe-meta in the same change.

## Gotchas

- Build and check read their sources at build time: `ARCHITECTURE_ROOT`
  (khe-architecture: `ESTATE.md`, `decisions/`) and `HOMELAB_ROOT`
  (khe-homelab: compose files, the `## Resilience` list), else the sibling
  checkouts next to the main checkout (found through the git common dir, so
  a worktree works). A missing source fails the build naming the variable;
  there is no committed snapshot. CI and deploy check khe-architecture out
  into `.sources/`.
- `/ha/` is the Home Assistant 3D view on khe-home-assistant's made-up
  test house: the build runs that repo's `python3 -I
  scripts/house3d-build.py --demo` (so the build needs `python3`) from
  `HOME_ASSISTANT_ROOT`, else the sibling checkout, which CI and deploy
  check out into `.sources/` too. A change there reaches khe.ee at the next
  deploy here: a push, the weekly schedule or `gh workflow run deploy.yml`.
  The old `/house3d/` answers 301 to the same path under `/ha/` (khe-homelab's
  landing nginx). The build then puts the site header (`scripts/templates/house3d-header.html`)
  on the page. The demo starts its fixed bars and views below `--host-h`,
  which the header's script sets to its height, and the build fails on a
  demo without it. The switcher translates the header and the title and
  reloads the page: the demo reads `?lang`, which the locale controller
  keeps current, once at load and shows itself in that language
  (khe-home-assistant ADR-003, its `*.en.json` files, which the check
  requires); the hash keeps the open view.
- The built `/assets/site-header.css` is `@khelias/ui`'s header CSS and its
  footer CSS from `node_modules`, followed by `src/shared/site-header.css`, which holds only
  khe-sites' fonts (Inter, Source Serif 4), the family tokens and the
  `--khe-header-*` values it sets on `.site-header`;
  no rule here restyles a `.site-header__*` part. Every page links it
  before `site.css`; `/ha/`, with Home Assistant's own styles, links only
  it. The package sets its defaults on `.site-header`, so a value on
  `:root` never reaches the header.
- The site header markup comes from `@khelias/ui`'s `renderSiteHeader`, called
  only by `scripts/site-header.mjs`. A page
  carries `<!-- site-header home=… [rooms] [theme] [fixed] -->` on a line
  of its own, and the build replaces it with the header in the page's
  `<html lang>`, at the marker's indent. `home` names where the mark leads,
  always the khe.ee front page (`landing` is `/`, `khe.ee` its full address
  from games.khe.ee). Its strings are `SITE_HEADER_COPY`
  in `src/shared/site-locale.js` (both languages, the `header*` keys), which
  `createLocaleController` merges under every page's copy. Every
  built page must have exactly one header (check).
- The rooms menu (estate ADR-018): `rooms` on the marker renders the
  current room's button, from the page's `<html data-room>`, and the list of
  every room; every page but the khe.ee landing has it, the landing none
  (check). The header shows no page title: a page's name is its heading. The
  room names, notes and addresses are the package's (`@khelias/ui/rooms`);
  the build copies its `dist/rooms.js` to `/assets/rooms.js`, and on a page
  with the button `createLocaleController` imports it once the page shows a
  language other than the one it was built in, and calls `setRoomsLocale`
  from `applyLocale`, so a first locale of `et` and every switch after it
  rewrite the names, notes and `?lang` of every room link. The list's
  `--khe-header-menu-*` values are set in `site-header.css`; its dots are the
  package's room accents, which check compares with `DESIGN.md`'s Colors
  table.
- Theme (estate ADR-017): every page but `/ha/` follows the system setting
  until the visitor presses the header's toggle (`theme` on the marker,
  label `headerTheme`). The choice is stored under `THEME_STORAGE_KEY`
  (`khe-theme`, in `site-locale.js`) per origin, so khe.ee and games.khe.ee
  keep their own, and a choice equal to the system clears it. A
  `<!-- site-theme -->` marker in `<head>`, after the `theme-color` metas and
  before the first stylesheet, becomes the package's inline
  `themeInitScript`, which sets `data-theme` on `<html>` before first paint;
  the CSP allows it through `'unsafe-inline'`. `createLocaleController`
  loads `/assets/theme.js` (the package's `dist/theme.js`, copied by the
  build) only on a page with the toggle, which also has a `modulepreload` for
  it, and calls `wireThemeToggle`. A dark
  rule in `site-header.css` or `site.css` follows the family pattern, under
  the media query on `:root:not([data-theme="light"])` and again on
  `:root[data-theme="dark"]`, or the override misses it (check).
  `/ha/` has neither the toggle nor the script: it stays dark. The favicon
  follows the system only.
- The footer is a `<!-- site-footer -->` marker filled at build by
  `renderSiteFooter` in the page's language: GitHub and LinkedIn with their
  marks, Privacy (`data-link="privacy"`), and the hosting line. Its strings
  are `SITE_FOOTER_COPY` in `site-locale.js`, merged like the header's;
  `site.css` sets its `--khe-footer-*` values from the family tokens and
  places it per page. Every page but `/ha/` has exactly one (check).
- Nothing in the sources carries `?v=`: after the pages are built, the build
  stamps every root-relative `.css` and `.js` URL in them, and in the files
  those link, with the first 10 hex of the built file's SHA-256, so a change
  to `site.css` or `site-locale.js` needs no hand edit. Check fails on a
  hand-written `?v=` in a source and on a built link whose hash does not
  match its file. Relative URLs (khe-home-assistant's files under `/ha/`) and
  fonts are not stamped.
- `scripts/architecture-model.mjs` must name every repo in `ESTATE.md` and
  every khe-homelab service group, and nothing else; check fails otherwise.
  The repo elements appear in no diagram; they feed the building-block rows
  in the estate section's `<details>`.
- Each view (`estate`, `shipping`, `agents`) names the `page` it is drawn on
  (`architecture` or `agents`; `ARCHITECTURE_PAGES` in
  `render-architecture.mjs` lists the pages and their markers, and check
  counts each page's diagrams from it). Each has two layouts, `wide` and
  `narrow`, each with its own geometry and edges, and both naming the same
  nodes (check enforces it). The build draws one SVG per layout; CSS shows
  the wide one from 1240px (where the column fits the 1192-unit layout
  unscaled) and the narrow one, at most 420px, below. Diagram text is drawn once per
  language in a `<g lang>` and word-wrapped at build, and the build fails
  when a wrapped label overflows its box in either language. The text
  equivalent is a visually hidden list built from the narrow layout.
- The three pages share `copy.js`, `architecture.js` and the
  `architecture-page` body class; `body[data-page]` picks each one's title
  and description (`title` for the server page, `<page>PageTitle` for the
  others). `/architecture/` (server room): hero with three static facts,
  `#estate`, `#shipping` (the delivery view, from the push to the deploy),
  `#uptime` (one row per khe-homelab README resilience layer; check compares
  the counts), then a line to the decisions page.
  `/architecture/decisions/` (server room): `#key-decisions` (from
  `keyDecisions` in the model) and `#decisions`, the register, which check
  requires there and nowhere else; the ADR pages' breadcrumb links it, and
  khe-homelab's landing nginx and edge fallback serve the bare directory
  (no redirect). `/agents/` (home room): the agents view, from the plan to
  the push. The push is in both diagrams: the agents view ends on it, the
  delivery view starts from it.
- Headings use Source Serif 4 (weight 600, latin and latin-ext subsets in
  `src/shared/fonts/`), body text Inter, mono labels the system mono stack.
  Check fails when `site-header.css` or `site.css` loads a font file that is
  not there.
- ADRs render through `scripts/markdown.mjs`, which throws with file and line
  on anything outside its subset (tables, fences, quotes, raw HTML, images,
  deeper nesting, relative links other than `NNN-slug.md`). Extend the
  renderer and its fixtures in `check.mjs` together.
- Every copy key used on the architecture pages lives in `copy.js`, in both
  languages, except the header's; the build fills the HTML from `COPY.en`.
- Touch: `:hover` rules sit inside `@media (hover: hover) and (pointer: fine)`
  so they do not stick after a tap; the press state is `:active` (a row
  mirrors its hover state, plain links and summaries dim through a
  zero-specificity rule). iOS applies `:active` only because
  `createLocaleController` in `site-locale.js` adds a `touchstart` listener.
  Every page has `viewport-fit=cover`, so edge-hugging elements pad with
  `max(<gap>, env(safe-area-inset-*))`.
- The family tokens (`--paper`, `--ink`, `--muted`, the room accents and the
  rest in `DESIGN.md`) sit in `site-header.css` in three blocks: light on
  `:root`, dark under `prefers-color-scheme` on
  `:root:not([data-theme="light"])`, and again on `:root[data-theme="dark"]`;
  `:root[data-theme="light"]` sets only `color-scheme: light`. Check fails when `DESIGN.md`'s frontmatter colours differ from the light
  block or the two dark blocks differ. The pre-family tokens (`--bg`,
  `--text*`, `--border*`, `--card-bg`, `--accent*`, `--display-font`) are
  gone, and check fails when one comes back in a source file. The
  architecture pages' `--a-*` names alias the family tokens; only the
  diagram tokens keep values of their own. `--a-accent` is the page's
  `--room`, and the accent ink and soft fill have home-room values for
  `/agents/`.
- Every built page's `<html>` carries `data-room` (`home`, `server`,
  `trips`, `house`, `games`; check), which sets `--room` (fills, dots) and
  `--room-text` (text, the `.ee`, focus). A landing row
  sets its own `data-room` for its dot and arrow. `/ha/` gets
  `data-room="house" data-theme="dark"` from `house3d-demo.mjs`: the house
  view has no light theme yet, so its header stays dark (check).
- The landing and games pages, and their privacy pages, keep their copy in an
  inline `COPY` (the header and footer strings come from `site-locale.js`); check fails when a `data-i18n`, `data-i18n-html` or
  `data-i18n-aria` key of the source page is missing from its `et` or `en`.
- The favicon and share images draw their text as paths
  (`logo.svg`, `og-image.svg`), so `rsvg-convert -w 1200 -h 630` renders the
  PNGs without installed fonts.
- The Cloudflare Web Analytics tokens in the HTML are public beacon tokens,
  not secrets. The beacon loads only after the visitor consents in the
  banner, `src/shared/analytics-consent.js`, served on both origins at
  `/assets/analytics-consent.js`. /study and /adventure load it unstamped
  from the games root and keep no copy
  ([estate ADR-019](https://github.com/khelias/khe-architecture/blob/main/decisions/019-consent-banner-from-the-origin-root.md)),
  so renaming or moving it, or changing its `data-analytics-token` and
  `data-analytics-privacy-url` attributes, the `khe.analyticsConsent.v1`
  storage key, `window.kheAnalyticsConsent` or `[data-analytics-preferences]`,
  breaks them; a breaking change goes to a new path. Its colours are its own
  `--khe-consent-*` values in both themes, which check holds equal to
  `site-header.css`, and it reads no page token, since the games define none.
