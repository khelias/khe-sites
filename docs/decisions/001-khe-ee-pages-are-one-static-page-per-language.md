# ADR-001: khe.ee pages are one static page per language, Estonian at the root

- **Status:** Accepted (2026-11-20)
- **Related:** [estate ADR-043](https://github.com/khelias/khe-architecture/blob/main/decisions/043-household-parts-are-public-source-built-into-khe-sites.md) (the workshop room's own language folders), [estate ADR-019](https://github.com/khelias/khe-architecture/blob/main/decisions/019-consent-banner-from-the-origin-root.md) (the `/privacy` link other repos keep), [estate ADR-016](https://github.com/khelias/khe-architecture/blob/main/decisions/016-static-fallback-at-the-edge.md) (the edge fallback that mirrors the redirect)

## Context

The khe.ee pages this repo builds (the landing, the privacy notice and the
architecture pages) were one English HTML file each, translated in place
by a script. The Estonian page existed only after that script ran: its
`?lang=et` address served English HTML with a canonical link to the bare
address, so the hreflang alternates folded into one page. Search engines
that do not run scripts, and the AI crawlers, saw only English, and Google
rewrote the Estonian title and picked the snippet from the body text.

Other repos link into these pages: the rooms menu in
[`khe-ui`](https://github.com/khelias/khe-ui) (`/?lang=`), the app footers
and the khe-trips and khe-stories privacy links (`/privacy?lang=`).
Indexed addresses are hard to take back.

## Decision

1. **One static page per language.** Each khe.ee page this repo builds has
   an HTML file per language, with its title, description, share image and
   structured data in that language, a self canonical, and absolute
   hreflang links to every language and `x-default`.
2. **Estonian at the root, English under `/en/`.** `khe.ee/` is Estonian
   and `x-default`; English is `khe.ee/en/`, and so on for each page
   (`/en/architecture/`, `/en/privacy/`). A visitor with no stored choice
   gets Estonian. No page redirects by the browser's language.
3. **`?lang` and a stored choice move the visitor.** A script at the top of
   `<head>` opens the other language's page when `?lang` or the language
   the visitor stored with the switcher differs from the page's; the stored
   choice beats the page. The switcher stores the choice and goes to the
   other page.
4. **The server answers a mismatched `?lang` itself.** The homelab nginx
   and the edge fallback answer a `?lang` that differs from the page's
   language with a 301 to the other page, query kept, so a crawler that
   runs no script lands on the right page and nothing loops.
5. **A room may keep its own language folders.** The workshop room (estate
   ADR-043) has `/workshop/` and `/workshop/en/`, built by its own repo: the
   same scheme inside the room, not `/en/workshop/`.
6. **The ADR pages stay English only,** one self-canonical page each with
   no hreflang, since their text exists only in English.
7. **Other repos keep their links.** `/?lang=` and `/privacy?lang=` stay
   valid entry points (points 3 and 4 move them), so `khe-ui`, khe-trips
   and khe-stories change nothing.
8. **games.khe.ee is not covered yet;** it keeps translating in place until
   its own decision.

## Alternatives considered

- **Keep translating in place and fix the metadata:** the Estonian page
  still would not exist without a script, which is the cause.
- **English at the root, Estonian under `/et/`:** the visitors who search
  the name are mostly Estonian, and the root is what search and links show
  first.
- **Redirect by browser language:** crawlers send no language, and a
  redirect on the root hides one of the two pages from them.

## Consequences

- Search engines and crawlers that run no script see each language as it
  is written. The result may look worse for a few weeks while they re-read
  the site.
- A visitor who arrives with no stored choice sees Estonian at `khe.ee/`;
  English readers press the switcher once.
- The build writes twice as many pages for the covered pages, and its check
  holds each pair to its own language, canonical and alternates.
- An old `?lang` link still works through point 4; a nginx change and a
  change here ship together, the redirect after the pages exist.
