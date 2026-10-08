# khe-sites

[![CI](https://github.com/khelias/khe-sites/actions/workflows/ci.yml/badge.svg)](https://github.com/khelias/khe-sites/actions/workflows/ci.yml)
[![CodeQL](https://github.com/khelias/khe-sites/actions/workflows/codeql.yml/badge.svg)](https://github.com/khelias/khe-sites/actions/workflows/codeql.yml)
[![Deploy](https://github.com/khelias/khe-sites/actions/workflows/deploy.yml/badge.svg)](https://github.com/khelias/khe-sites/actions/workflows/deploy.yml)

Static source for the public KHE web presence, in plain HTML, CSS and
JavaScript:

- [khe.ee](https://khe.ee) - the landing page and the
  [estate architecture](https://khe.ee/architecture/): the estate in one
  diagram, the decisions that shape it, how a change ships, how it stays up
  and where it is weak, and every estate decision on its own page
- [games.khe.ee](https://games.khe.ee) - the launcher that links into the
  game apps, which deploy from their own repos

The architecture page is built from its public sources, the decisions and
estate index in [khe-architecture](https://github.com/khelias/khe-architecture)
and the stacks in [khe-homelab](https://github.com/khelias/khe-homelab), so it
follows them without anyone copying text across. Analytics are
Cloudflare Web Analytics, loaded only after the visitor consents.

## Running it

```sh
npm run check
npm run build     # dist/landing and dist/games
```

Both need `khe-architecture` and `khe-homelab` checked out next to this repo,
or their paths in `ARCHITECTURE_ROOT` and `HOMELAB_ROOT`. Every push to
`main` deploys both sites to the homelab. The rules
for working on the code are in [AGENTS.md](AGENTS.md).

MIT licensed.
