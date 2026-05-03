# khe-sites

Multi-site static repo - one repo, two independently deployed sites:

- `khe.ee` from `src/landing/` (with `/lab/` Lab Atlas inside it)
- `games.khe.ee` from `src/games/` (launcher shell into game apps)

Individual game apps (`khe-study`, `khe-ai-adventure`) live in their own
repos and deploy separately; this repo only owns the launcher shell.

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
  landing/   Site #1: khe.ee, including:
    lab/     KHE Lab Atlas - public systems map of the homelab
             (ingress, deploys, recovery layers, service counts).
             Renders lab-data.json via lab/atlas.js.
  games/     Site #2: games.khe.ee launcher shell
  shared/    Cross-site assets - copied into each site's /assets/ at
             build time. Currently: site.css, site-footer.js,
             site-locale.js, analytics-consent.js, fonts/.
scripts/
  build.mjs              build dist/
  check.mjs              static checks
  generate-lab-data.mjs  generates src/landing/lab/lab-data.json
```

## Architectural rules (HARD)

1. **Adding a third site is a structural change.** `scripts/build.mjs`
   has a hardcoded `apps = ['landing', 'games']` array; adding `src/foo/`
   alone does nothing until the array, the deploy workflow, and the
   homelab nginx routing are updated together.

2. **`src/shared/` is for cross-site assets only.** A file there must be
   used by 2+ sites. If it is single-site, it belongs in that site's own
   directory. The build copies a hardcoded list of files from `shared/`
   into each site's `/assets/` - new shared files require a matching
   `copyFile` call in `build.mjs`.

3. **Each `src/<site>/` directory is its own deployable root.** Site
   internals do not cross over: no relative paths from `landing/` into
   `games/` or vice versa. Both sites consume `shared/` only via the
   build-time copy, never via direct path references.

4. **No bundler, no framework.** Vanilla HTML/CSS/JS. Adding any build
   tool or framework needs an ADR - it would invalidate the whole
   "static, no surprises" model that justifies this repo existing
   alongside the React app repos.

## Deployment

GitHub Actions on push to main.

- `dist/landing` -> `/srv/data/sites/khe`
- `dist/games` -> `/srv/data/games/launcher`

Individual game apps deploy separately to `/srv/data/games/{study,adventure}/`
on the homelab VM and are mounted into the launcher at `/study/` and
`/adventure/`.

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
