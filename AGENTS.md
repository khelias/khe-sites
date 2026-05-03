# khe-sites

Static HTML for `khe.ee` (landing) and `games.khe.ee` (launcher shell).
Individual games deploy from their own repos.

## Tech stack

- Plain HTML, vanilla JS, CSS. No framework, no bundler.
- Custom Node.js build scripts (`scripts/build.mjs`, `scripts/check.mjs`).
- Node 24+.

## Commands

- `npm run check` - static validation
- `npm run build` - build `dist/landing` and `dist/games`

## Layout

```
src/
  landing/   khe.ee pages, including:
    lab/     KHE Lab Atlas - public systems map of the homelab
             (ingress, deploys, recovery layers, service counts).
             Renders lab-data.json via lab/atlas.js.
  games/     games.khe.ee launcher shell
  shared/    fonts, site.css, analytics-consent.js, site-footer.js,
             site-locale.js. Copied into each site's /assets/ at build.
scripts/
  build.mjs              build dist/
  check.mjs              static checks
  generate-lab-data.mjs  generates src/landing/lab/lab-data.json
```

## Deployment

GitHub Actions on push to main.

- `dist/landing` -> `/srv/data/sites/khe`
- `dist/games` -> `/srv/data/games/launcher`

Individual game apps (khe-study, khe-ai-adventure) deploy separately to
`/srv/data/games/{study,adventure}/` on the homelab VM and are mounted into
the launcher at `/study/` and `/adventure/`.

## Gotchas

- Cloudflare Web Analytics tokens are placeholders in HTML, not secrets.
  Replace with site tokens before deploy. Beacon loads only after visitor
  allows analytics (consent-gated via `src/shared/analytics-consent.js`).
- The launcher hosts no game code itself. Game directories on the VM are
  bind-mounted into nginx by the homelab compose stack.
- `scripts/generate-lab-data.mjs` reads `../khe-homelab/` (sibling repo) to
  count compose files, services, and containers. Without `khe-homelab`
  cloned next to this repo, lab-data generation fails. CI must check out
  both repos. For local generation:
  `git clone https://github.com/khelias/khe-homelab ../khe-homelab`
