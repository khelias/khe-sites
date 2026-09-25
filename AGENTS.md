# khe-sites

Static source for two independently deployed sites: `khe.ee` from
`src/landing/` (with the Lab Atlas at `/lab/`) and `games.khe.ee` from
`src/games/`, the launcher shell. The game apps (`khe-study`,
`khe-ai-adventure`) live and deploy in their own repos.

Plain HTML, CSS and vanilla JS, built by Node 24 scripts. No framework, no
bundler.

## Commands

- `npm run check` - static validation
- `npm run build` - build `dist/landing` and `dist/games`

## Layout

```
src/
  landing/   khe.ee
    lab/     Lab Atlas, a public systems map of the homelab; renders
             lab-data.json via lab/atlas.js
  games/     games.khe.ee launcher shell
  shared/    cross-site assets, copied into each site's /assets/ at build
scripts/
  build.mjs              build dist/
  check.mjs              static checks
  generate-lab-data.mjs  generates src/landing/lab/lab-data.json
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

## Deployment

`deploy.yml` runs on push to main on the self-hosted homelab runner:
`dist/landing` goes to `/srv/data/sites/khe`, `dist/games` to
`/srv/data/games/launcher`. The game apps deploy to
`/srv/data/games/{study,adventure}/`, which the homelab nginx stack
bind-mounts at `/study/` and `/adventure/`.

## Gotchas

- The Cloudflare Web Analytics tokens in the HTML are public beacon tokens,
  not secrets. The beacon loads only after the visitor consents
  (`src/shared/analytics-consent.js`).
- `generate-lab-data.mjs` counts compose files, services and containers from
  `HOMELAB_ROOT` (deploy sets `/home/khe/homelab`) or `../khe-homelab/`,
  which in the `khe` workspace is `repos/khe-homelab`, and resilience layers
  from the numbered list under `## Resilience` in its README. With neither
  checkout present it keeps the committed `lab-data.json`; a checkout whose
  README has no such list fails the build.
