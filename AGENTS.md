# khe-sites

Static source for two independently deployed sites: `khe.ee` from
`src/landing/` (with the estate architecture page at `/architecture/`) and
`games.khe.ee` from `src/games/`, the launcher shell. The game apps
(`khe-study`, `khe-ai-adventure`) live and deploy in their own repos.

Plain HTML, CSS and vanilla JS, built by Node 24 scripts. No framework, no
bundler.

## Commands

- `npm run check` - build, then static validation of the sources and the
  built architecture pages
- `npm run build` - build `dist/landing` and `dist/games`

## Layout

```
src/
  landing/   khe.ee
    architecture/  estate architecture page: copy.js (en/et strings),
             architecture.js; diagrams, building blocks, the five key
             decisions, register and ADR pages are rendered into it at
             build time
  games/     games.khe.ee launcher shell
  shared/    cross-site assets, copied into each site's /assets/ at build
scripts/
  build.mjs                build dist/
  check.mjs                static checks
  architecture-sources.mjs reads khe-architecture and khe-homelab
  architecture-model.mjs   diagram elements, edges and layout
  render-architecture.mjs  renders the page, ADR pages and sitemap entries
  markdown.mjs             strict Markdown subset for the ADRs
  templates/decision.html  the ADR page
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
`/srv/data/games/launcher`. khe-study deploys to `/srv/data/games/study/`,
which the homelab nginx stack bind-mounts at `/study/`. khe-ai-adventure is
not a static deploy: the same nginx proxies `/adventure/` to the
`adventure-web` and `adventure-proxy` containers, pulled from GHCR
(khe-homelab `services/apps/games/`).

## Gotchas

- Build and check read their sources at build time: `ARCHITECTURE_ROOT`
  (khe-architecture: `ESTATE.md`, `decisions/`) and `HOMELAB_ROOT`
  (khe-homelab: compose files, the `## Resilience` list), else the sibling
  checkouts next to the main checkout (found through the git common dir, so
  a worktree works). A missing source fails the build naming the variable;
  there is no committed snapshot. CI and deploy check khe-architecture out
  into `.sources/`.
- `scripts/architecture-model.mjs` must name every repo in `ESTATE.md` and
  every khe-homelab service group, and nothing else; check fails otherwise.
  The repo elements appear in no diagram; they feed the building-block rows
  in the estate section's `<details>`.
- Each view (`estate`, `shipping`) has two layouts, `wide` and `narrow`,
  each with its own geometry and edges, and both naming the same nodes
  (check enforces it). The build draws one SVG per layout; CSS shows the wide
  one from 1080px and the narrow one, at most 420px, below. Diagram text is
  drawn once per language in a `<g lang>` and word-wrapped at build, and the
  build fails when a wrapped label overflows its box in either language. The
  text equivalent is a visually hidden list built from the narrow layout.
- The page sections, in order: hero with three static facts, `#estate`,
  `#key-decisions` (from `keyDecisions` in the model), `#shipping`, `#uptime`
  (one row per khe-homelab README resilience layer; check compares the
  counts) and `#decisions`, the register. Keep the register at
  `id="decisions"`: the homelab nginx redirects `/architecture/decisions/`
  to `/architecture/#decisions`, and the ADR pages link back to it.
- Headings use Source Serif 4 (weight 600, latin and latin-ext subsets in
  `src/shared/fonts/`), body text Inter, mono labels the system mono stack.
  Check fails when `site.css` loads a font file that is not there.
- ADRs render through `scripts/markdown.mjs`, which throws with file and line
  on anything outside its subset (tables, fences, quotes, raw HTML, images,
  deeper nesting, relative links other than `NNN-slug.md`). Extend the
  renderer and its fixtures in `check.mjs` together.
- Every copy key used on the architecture pages lives in `copy.js`, in both
  languages; the build fills the HTML from `COPY.en`.
- The architecture pages have their own light and dark palette (the `--a-*`
  tokens in the Architecture section of `site.css`, following the system
  setting); the rest of the site is dark only.
- The Cloudflare Web Analytics tokens in the HTML are public beacon tokens,
  not secrets. The beacon loads only after the visitor consents
  (`src/shared/analytics-consent.js`).
