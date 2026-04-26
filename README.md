# khe-sites

Static source for:

- `khe.ee`
- `games.khe.ee` launcher

The individual games are deployed from their own repositories. This repo owns
the landing pages, shared locale handoff helper, and the launcher shell that
links into the game apps.

Shared static assets live in `src/shared/` and are copied into each site's
`/assets/` directory during build.

## Development

```sh
npm run check
npm run build
```

Build output:

- `dist/landing` -> `/srv/data/sites/khe`
- `dist/games` -> `/srv/data/games/launcher`

GitHub Actions deploys both directories on push to `main`.
