# khe-sites

[![CI](https://github.com/khelias/khe-sites/actions/workflows/ci.yml/badge.svg)](https://github.com/khelias/khe-sites/actions/workflows/ci.yml)
[![CodeQL](https://github.com/khelias/khe-sites/actions/workflows/codeql.yml/badge.svg)](https://github.com/khelias/khe-sites/actions/workflows/codeql.yml)
[![Deploy](https://github.com/khelias/khe-sites/actions/workflows/deploy.yml/badge.svg)](https://github.com/khelias/khe-sites/actions/workflows/deploy.yml)

Static source for the public KHE web presence, in plain HTML, CSS and
JavaScript:

- [khe.ee](https://khe.ee) - the landing page and the
  [Lab Atlas](https://khe.ee/lab/), an interactive systems map of the homelab
- [games.khe.ee](https://games.khe.ee) - the launcher that links into the
  game apps, which deploy from their own repos

The Lab Atlas renders a snapshot generated from
[khe-homelab](https://github.com/khelias/khe-homelab) at build time, so it
follows the live stacks without anyone updating it by hand. Analytics are
Cloudflare Web Analytics, loaded only after the visitor consents.

## Running it

```sh
npm run check
npm run build     # dist/landing and dist/games
```

The build regenerates the Lab Atlas data when a `khe-homelab` checkout sits
next to this repo (or at `HOMELAB_ROOT`); without one it keeps the committed
snapshot. Every push to `main` deploys both sites to the homelab. The rules
for working on the code are in [AGENTS.md](AGENTS.md).

MIT licensed.
