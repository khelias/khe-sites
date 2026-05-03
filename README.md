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

`src/landing/lab/` is a public interactive systems map of the homelab: ingress,
deploy path, private operations, and recovery. It renders `lab-data.json`, which
is generated from the sibling `khe-homelab` repo via `scripts/generate-lab-data.mjs`.

Without `khe-homelab` cloned next to this repo, lab-data generation fails. CI
checks out both repos automatically. For local generation:

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
