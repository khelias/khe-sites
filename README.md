# khe-sites

[![CI](https://github.com/khelias/khe-sites/actions/workflows/ci.yml/badge.svg)](https://github.com/khelias/khe-sites/actions/workflows/ci.yml)
[![CodeQL](https://github.com/khelias/khe-sites/actions/workflows/codeql.yml/badge.svg)](https://github.com/khelias/khe-sites/actions/workflows/codeql.yml)
[![Deploy](https://github.com/khelias/khe-sites/actions/workflows/deploy.yml/badge.svg)](https://github.com/khelias/khe-sites/actions/workflows/deploy.yml)

Static source for:

- `khe.ee` — landing page and Lab Atlas (`/lab/`)
- `games.khe.ee` launcher

The individual games are deployed from their own repositories. This repo owns
the landing pages, Lab Atlas, shared locale handoff helper, and the launcher
shell that links into the game apps.

## Lab Atlas

`src/landing/lab/` is a public interactive systems map of the homelab in six
scenes: public path, ship path, private operations, signals, recovery, and the
house. It renders `lab-data.json`, which is generated from the `khe-homelab`
repo via `scripts/generate-lab-data.mjs` (also run as part of `npm run build`).

The generator looks for `khe-homelab` next to this repo, or at `HOMELAB_ROOT`
if that is set. When neither exists it keeps the committed `lab-data.json`
instead of failing, so a build without the homelab repo serves the last
committed snapshot. The deploy workflow sets `HOMELAB_ROOT=/home/khe/homelab`
so the published snapshot tracks the live stacks. For local generation:

```sh
git clone https://github.com/khelias/khe-homelab ../khe-homelab
node scripts/generate-lab-data.mjs
```

Shared static assets live in `src/shared/` and are copied into each site's
`/assets/` directory during build.

## Development

```sh
npm run check
npm run build
```

## Analytics Consent

Public pages include a consent-gated Cloudflare Web Analytics loader with
beacon token placeholders:

- `khe.ee` token is configured in the landing pages.
- `games.khe.ee` token is configured in the games launcher and game apps.

Replace these with the site tokens from Cloudflare Web Analytics before
deployment. The tokens are embedded in browser HTML and are not secrets. The
Cloudflare beacon is loaded only after the visitor allows analytics.

Build output:

- `dist/landing` -> `/srv/data/sites/khe`
- `dist/games` -> `/srv/data/games/launcher`

GitHub Actions deploys both directories on push to `main`.
