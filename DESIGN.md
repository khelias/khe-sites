---
version: alpha
name: KHE family
description: One family across the KHE sites and apps; shared chrome on one ground, one accent per room.
colors:
  paper: "#f6f6f2"
  surface: "#ffffff"
  sunken: "#eaeae4"
  ink: "#111315"
  ink-2: "#3b3f42"
  muted: "#666b6e"
  rule: "#e2e2db"
  rule-strong: "#c6c6bd"
  code-bg: "#e9e9e1"
  obsidian: "#121416"
  obsidian-2: "#1c1f23"
  obsidian-ink: "#f3f3ee"
  obsidian-muted: "#9da3a8"
  obsidian-rule: "#2c3136"
  home: "#d12839"
  server: "#1f685c"
  trips: "#b55231"
  trips-text: "#93411f"
  stories: "#9e2f69"
  workshop: "#586914"
  house: "#1d5ca3"
  house-ground: "#e4eaee"
  games: "#8a5b12"
  adventure: "#9a6420"
  study: "#2f6b3a"
  primary: "#111315"
typography:
  display:
    fontFamily: Familjen Grotesk
    fontSize: clamp(2rem, 4.6vw, 3.375rem)
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: -0.025em
  title:
    fontFamily: Familjen Grotesk
    fontSize: 34px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.02em
  heading:
    fontFamily: Familjen Grotesk
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.25
  context:
    fontFamily: Familjen Grotesk
    fontSize: 17px
    fontWeight: 500
  lead:
    fontFamily: Familjen Grotesk
    fontSize: 19px
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: Familjen Grotesk
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  small:
    fontFamily: Familjen Grotesk
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  control:
    fontFamily: Familjen Grotesk
    fontSize: 12px
    fontWeight: 600
  label:
    fontFamily: Familjen Grotesk
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
  fact:
    fontFamily: ui-monospace
    fontSize: 11px
    fontWeight: 500
rounded:
  focus: 4px
  control: 8px
  picture: 12px
  full: 999px
spacing:
  content: 1080px
  gutter: max(16px, env(safe-area-inset-*))
components:
  mark:
    textColor: "{colors.ink}"
  language-switcher:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.full}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
---

# KHE family

## Overview

The KHE sites and apps are one family of rooms
([estate ADR-035](https://github.com/khelias/khe-architecture/blob/main/decisions/035-family-shell-and-design-check-with-its-exceptions.md)).
Every room shares one ground, one ink
and one type in its chrome (the header, the mark, the language switcher, the
page ground and the type of the page chrome) and in the shell of its
application (surfaces, controls, dialogs, notifications, menus, lists), and
has one accent of its own, which the chrome shows in the `.ee` of the mark
and as the room's dot in the rooms list. The family covers the shared chrome
and the khe.ee pages themselves: the landing, `/architecture/`, its decisions
page and the ADR pages, `/agents/`, `/workshop/`, the games hub, the privacy
and 404 pages and the `/ha/` demo frame. The content of the product rooms keeps
its own look: Unejänku (khe-stories), the Home Assistant dashboard, Tarkade
Mängud (khe-study) and AI Seiklus (khe-ai-adventure)
([estate ADR-035](https://github.com/khelias/khe-architecture/blob/main/decisions/035-family-shell-and-design-check-with-its-exceptions.md)
points 1, 10 and 13). The ground, ink and obsidian are the "Nordic contrast"
values chosen on 2026-11-23: a pale stone ground with dark showcase bands.

This file is the one source of the family values. Other repos keep only their
own room in their design docs and cite this one. The tokens live in
`src/shared/site-header.css`; `scripts/check.mjs` fails when the frontmatter
differs from its light `:root` block, or when the system-dark block differs
from the `:root[data-theme="dark"]` block. The seven room accents are also
`@khelias/ui`'s own defaults for the rooms list's dots, since every header
shows all seven; the check fails when the package's light or dark dot differs
from the Colors table below.

## Rooms

| Room | Where | Accent | Text accent |
|---|---|---|---|
| Home | khe.ee landing, its privacy page, khe.ee/agents | `home` | `home` |
| Server | khe.ee/architecture, its decisions page and the ADR pages | `server` | `server` |
| Trips | khe.ee/trips, khe.ee/r/..., trips.khe.ee | `trips` | `trips-text` |
| Stories | khe.ee/stories, stories.khe.ee (khe-stories) | `stories` | `stories` |
| Workshop | khe.ee/workshop | `workshop` | `workshop` |
| House | khe.ee/ha | `house` | `house` |
| Games | the games.khe.ee hub and its privacy page | `games` | `games` |

AI Seiklus (`adventure`) and Tarkade Mängud (`study`) live inside the Games
room: their colours mark their rows on the hub and the `.ee` of their own
headers. `study` is proposed; khe-study has no single accent yet.

`data-room` on `<html>` maps the room to two properties: `--room` for fills
and dots, `--room-text` for text, the `.ee` and the focus ring. Trips is the
one room whose two differ: `trips` passes AA as text only just (4.6:1 on
light `paper`), so its text keeps the darker `trips-text`.

## Colors

The frontmatter holds the light theme. Dark values live only in the CSS, and
the consent banner (`src/shared/analytics-consent.js`) carries its own copy of
the four it uses in both themes, so it renders on the game pages too. The
`obsidian` tokens are the showcase band's: dark in both themes, so
`obsidian-ink` and `obsidian-muted` keep one value.

| Token | Light | Dark | Use |
|---|---|---|---|
| paper | #f6f6f2 | #0c0e0f | page ground, header ground (opaque) |
| surface | #ffffff | #15181a | switcher track, inputs, a card's picture well |
| sunken | #eaeae4 | #1d2124 | pressed row, filter buttons, plate bands |
| ink | #111315 | #f1f2ee | names, titles, the KHE of the mark, the landing's sentence |
| ink-2 | #3b3f42 | #c5c9c6 | running text |
| muted | #666b6e | #8b928f | labels, inactive language, on paper and surface |
| rule | #e2e2db | #252a2d | hairlines |
| rule-strong | #c6c6bd | #3d4448 | the mark's box, section rules |
| code-bg | #e9e9e1 | #202528 | inline code |
| obsidian | #121416 | #14171a | the showcase band's ground |
| obsidian-2 | #1c1f23 | #1d2226 | a picture well inside the band |
| obsidian-ink | #f3f3ee | #f3f3ee | titles in the band |
| obsidian-muted | #9da3a8 | #9da3a8 | kickers and running text in the band |
| obsidian-rule | #2c3136 | #2a3036 | the band's edges and picture frames in dark |
| home | #d12839 | #f65d65 | Home accent and text |
| server | #1f685c | #7ccbb9 | Server accent and text |
| trips | #b55231 | #ea946d | Trips fills and marks |
| trips-text | #93411f | #e8926a | Trips text, its `.ee` |
| stories | #9e2f69 | #f292c3 | Stories accent and text |
| workshop | #586914 | #bdd05e | Workshop accent and text |
| house | #1d5ca3 | #70c3ff | House accent and text |
| house-ground | #e4eaee | #070d1d | the house drawing's ground only |
| games | #8a5b12 | #e2b253 | Games hub accent and text |
| adventure | #9a6420 | #e5ad5e | AI Seiklus (dark only in the game) |
| study | #2f6b3a | #7cc28a | Tarkade Mängud |

`primary` in the frontmatter is `ink`: the family's one filled button is ink
on paper, so no tool invents a primary hue.

Contrast (WCAG AA, 4.5:1 for text), measured on 2026-11-23 for the Nordic
contrast values: `ink`, `ink-2`, `muted` and every text accent pass on `paper`
and `surface` in both themes (`muted` 5.0:1 on light paper, 5.6:1 on dark
surface); `obsidian-ink` and `obsidian-muted` pass on `obsidian` and
`obsidian-2` in both themes (`obsidian-muted` 6.3:1 at worst). No value needed
adjusting. Page text never sits on the band: the band sets its own text tokens.
`trips-text` was measured again against the new ground and kept (6.4:1 light,
8.1:1 dark); `house-ground` keeps its old offset from `paper` per channel,
which moved it to `#e4eaee` and `#070d1d`. `muted` on light `sunken` is 4.47:1, under AA, so
`sunken` carries controls and plate fills, not muted text. Every room accent
passes as text on `paper` and `surface` in both themes (`trips` and
`adventure` 4.6:1 light at worst); the rooms menu's dots carry the same values
from `@khelias/ui`.

## Themes

Every room has a light and a dark theme following `prefers-color-scheme`:
light on `:root`, dark under `@media (prefers-color-scheme: dark)` on
`:root:not([data-theme="light"])` and again on `:root[data-theme="dark"]`. A
room may commit its content to one theme when the subject asks for it, and
its header then takes that theme through `data-theme` on `<html>`: `/ha/` is
dark until the 3D house view has a light theme, AI Seiklus is dark by design.
A room that offers both themes may let the visitor override the system
setting, and then does it with the shared header's toggle from
`@khelias/ui`, next to the language switcher: khe.ee, KHE Games and Trips do
([estate ADR-014](https://github.com/khelias/khe-architecture/blob/main/decisions/014-shared-ui-packages.md) points 6-7).
The choice is `data-theme` on `<html>`, set before first paint and stored per
site. Each page carries two `theme-color` metas, `paper` light and dark.

## Footer

Every room with a footer uses `@khelias/ui`'s: GitHub and LinkedIn with
their marks, Privacy as text, then the room's lines, ending with "Ise
majutatud Eestis" / "Self-hosted in Estonia" in the page's language. Its
text is `muted`, `ink` on hover, the focus ring the room's text accent;
each room places it on its own page. Trips has none for now.

## The accent rule

The room's accent appears in the shared chrome only in the `.ee` of the mark,
in `--room-text`, and every room's accent as its dot in the rooms list.
Nothing else in the header is coloured: the rooms button, the title, the
room names and notes and the switcher are ink and muted.

## The header

The KHE.ee mark leads to the khe.ee front page from every room. After it,
on every page but the khe.ee landing, the current room's name with a chevron
("Mängud ⌄") opens the rooms list: every room in a fixed order, each with
its dot, its name and a short note, the current one marked with a check. Inside
an app the app's name follows after a slash ("Mängud ⌄ / Tarkade Mängud"). On a
phone, from 520px down to just above 360px, an app's header shows the room's
chevron without its name, so the app's name fits; beside an app's own action
the app's name gives way instead. A
page's own name lives in its heading, never in the header. The list, its
names, notes and addresses come from `@khelias/ui`, so every room lists the
same rooms
([estate ADR-035](https://github.com/khelias/khe-architecture/blob/main/decisions/035-family-shell-and-design-check-with-its-exceptions.md)).
A demo carries a line under the header, part of it: "Demo" in ink and one
muted sentence on what the demo shows and what stays private, on `sunken`,
neutral with no room accent
([estate ADR-035](https://github.com/khelias/khe-architecture/blob/main/decisions/035-family-shell-and-design-check-with-its-exceptions.md) point 11).

## Application shell and state colour

The family covers every room's shell, not only the chrome
([estate ADR-035](https://github.com/khelias/khe-architecture/blob/main/decisions/035-family-shell-and-design-check-with-its-exceptions.md) point 1): the page
ground, the type, the surfaces, the controls, dialogs, notifications, menus
and lists around a room's content use the values and rules in this file.
Play areas, canvases, maps and the house drawing keep their own look, within
the design check's baseline, which only shrinks. A room whose shell does not
meet this yet says so in its `AGENTS.md`. The content of Tarkade Mängud and AI
Seiklus keeps its own look, set in each repo's design docs, with the chrome
around it on the family
([estate ADR-035](https://github.com/khelias/khe-architecture/blob/main/decisions/035-family-shell-and-design-check-with-its-exceptions.md) point 13).
The Stories room's content keeps
its own look, system type, a reading serif, large radii and a material behind
the player, under the family header and footer ([estate ADR-035](https://github.com/khelias/khe-architecture/blob/main/decisions/035-family-shell-and-design-check-with-its-exceptions.md) point 10); that look
lives in khe-stories ([estate ADR-031](https://github.com/khelias/khe-architecture/blob/main/decisions/031-stories-public-app-private-stories-audio-outside-git.md)), whose design check skips those files. State colour is meaning, not an
accent: on and off, ok, warning, fault, a map state, right or wrong. A room
may use several, each naming a state, at 3:1 for marks and 4.5:1 for text in
both themes. Shared state tokens are a follow-up, once two rooms need the
same ones.

## Typography

One typeface, Familjen Grotesk, for everything in the shell; the system
mono stack for facts: dates, numbers, times and codes. The stack is
`'Familjen Grotesk', system-ui, sans-serif` everywhere.

Why (2026-11-20): the shells used Source Serif 4 over Inter, the look of the
AI assistants' own sites, and the first person shown khe.ee read it as made
with AI. The system font in place of Inter changed nothing visible on Apple
devices (tried 2026-11-17), and system type with a reading serif suits a
story, not a shell. Familjen was chosen over Schibsted Grotesk and Hanken
Grotesk from renders of the landing at desktop and phone width.

- `display` 500, clamp(2rem, 4.6vw, 3.375rem) / 1.06, -0.025em: the landing's
  one sentence, under the portrait, name and role in `context` and `small`;
  the games hub title in the same style at its own size
- `title` 500 34px, -0.02em; `heading` 500 22px
- `context` 500 17px: the header title's family size (see the mark)
- `lead` 400 19px, `body` 400 16px / 1.6, `small` 400 14px
- `control` 600 12px
- `label` 500 13px / 1.4, sentence case, no tracking and no dot: the
  kicker above a title, a list's heading; `muted`, or the room's text accent
  on a page's own kicker
- `fact` mono 500 11px, no capitals or tracking: a date, a number, a code

Each app self-hosts the variable files (weight 400 to 700, latin and
latin-ext, from the Fontsource build of Google Fonts' release) with their
OFL text, and none loads the font from a third-party host; khe-sites' pages
preload the latin one. Play areas keep their own type (estate ADR-035
point 1): the adventure game's stage its serif, the trips atlas its system
serif. The Stories room sets its own type ([estate ADR-035](https://github.com/khelias/khe-architecture/blob/main/decisions/035-family-shell-and-design-check-with-its-exceptions.md) point 10):
the system font, and `ui-serif` (New York on Apple) for the story, with
its own serif as the fallback.

## Layout

Content is one column, `width: min(1080px, 100%)`, with a gutter of
`max(16px, env(safe-area-inset-*))`; the header's inner row has the same
width, on every page. Only the wide architecture diagrams leave it, by 80px a
side from 1240px up. The header height is
`@khelias/ui`'s own (3.65rem + 1px, 3.35rem + 1px at 520px and below). No page
scrolls sideways at 320px.

Grids are equal: two columns, `repeat(2, minmax(0, 1fr))`, one column at
760px and below. No asymmetric splits and no rows that mix two and three
items. The one exception is the ADR page's rail (below).

### Cards and bands

The landing shows its projects as picture cards, all alike: a 16:10 picture
(`aspect-ratio: 16 / 10`, `object-fit: cover`, 12px corner, one `rule`
hairline), then the kicker (`label` size with the room's dot), the title and
one line. A card is a link with no shadow and no fill; its title underlines
in the room's accent on hover. The order is house, workshop, stories, trips,
server, the home room's agents card, then the two games: the two spatial pieces
(the house and the workshop) sit in the obsidian band, then three pairs on the
ground.

The obsidian band runs the full width on `obsidian` in both themes, with
`obsidian-ink` titles and `obsidian-muted` text; in dark an `obsidian-rule`
edge above and below separates it from the ground. In light a room's dot is
mixed toward `obsidian-ink` so it holds on the dark ground. `/agents/` sets its
numbers on the same ground.

Pictures are screenshots of public pages (the `/ha/` demo, a Töökoda part), a
published story picture, or plates drawn as SVG and inlined at build so their
classes follow the theme. A plate's text is sentence case, never capitals, and
any text in a type the family does not load is drawn as paths.

### Decisions page and ADR pages

The five key decisions are rows of two equal halves: the decision, and its
`Pluss` and `Miinus`, each cued by colour and a rule above it (solid in the
room's accent, dashed in the diagram's warm tone), so they differ in more
than hue. The register is one table per topic, under a search and topic
buttons that the script shows; without it every decision is listed and the
controls stay hidden. The decisions that left the register fold under one
line with their count.

An ADR page has a head across the column (back link, number and topic, title,
status and date), then the prose beside a 14rem rail: the sections, the
decisions it supersedes and relates to, and its source, sticky from 960px up
and above the prose below it. The previous and next decision close the
column. Numbered points keep their source number in a gutter of their own,
set with `position: relative` and `padding-left` on the item.

## Shapes

- 4px: the focus ring's corner
- 8px: the mark, controls and anything pressable
- 12px: pictures
- 999px: the language switcher, the consent pill and their buttons

## Elevation & Depth

Flat. The header is opaque `paper` over one `rule`, with no blur and no
shadow, so its contrast never depends on what scrolls under it. Sections and
rows are separated by space and a `rule` or `rule-strong` hairline; depth
comes from the obsidian band, not from shadow. A picture card is a picture
and text, not a raised box.
The exceptions float over the page on `surface` with a `rule-strong` edge
and a soft shadow: the rooms list, and the consent banner, a pill at the
bottom centre with its question and two equal buttons.

## Motion and touch

Hover rules sit inside `@media (hover: hover) and (pointer: fine)`; the press
state is `:active`. A games row's arrow moves 2px on hover and stays put under
`prefers-reduced-motion: reduce`; a landing card has no arrow, and its title
underlines on hover. Every hit area is at least 44px. The
package's own press scale has no reduced-motion rule yet (a khe-ui follow-up).

## Focus

A 2px outline in `--room-text`, offset 2 to 3px, 4px corner; the header's
focus colour is the same property.

## The mark

`KHE` in Familjen Grotesk 600, ink, with `.ee` on the baseline in
`--room-text`, borderless and aligned flush with the content column. The
favicon keeps the same mark with the Home `.ee`. In the header the mark,
rooms button, title, rotating contrast-disc theme toggle and `0.75rem`
language buttons keep `@khelias/ui`'s sizes; the family `context`, `control`
and `label` sizes apply to page content until a khe-ui release exposes them.

## Header values in the apps

The values reach every app as `--khe-header-*` properties set on
`.site-header` (and a standalone `.language-switcher`), never on `:root`,
where they would not reach the header:

- `bg` paper, `blur` 0px, `border` rule, `text` ink, `text-muted` muted
- `font` the family stack (`title-font` follows it), `title-weight` 500,
  `focus` the room's text accent, `suffix` the room's text accent
- `switcher-radius` and `button-radius` 999px, `switcher-border`
  rule-strong, `switcher-bg` surface, the pressed button paper on ink with
  an ink edge; the theme toggle uses the switcher's surface and border and
  stays in ink on hover
- `menu-radius` 10px, `menu-bg` surface, `menu-border` rule-strong,
  `menu-current-bg` sunken, `menu-shadow` a soft `0 12px 32px` black at
  14%: the rooms list floats over the page, the one shadow in the chrome
- the seven `room-<id>` dots are the package's, the room accents in both
  themes; an app sets them only to differ, which it should not
- footer: `--khe-footer-border` rule over a split row (links start, lines
  end; stacked start on phone)

## Do's and Don'ts

- Do set a room's accent once, through `data-room`, and let `--room` and
  `--room-text` carry it.
- Do add a family colour here, in both themes in `site-header.css`, and in
  every app that sets it.
- Do measure text against the header's computed background.
- Don't colour anything in the chrome but the `.ee` and the rooms list's dots.
- Don't use a state colour as a room accent, or an accent to mean a state.
- Don't put a blur, a shadow or a translucent ground on the header bar.
- Don't restyle the package's `.site-header__*` parts; set its properties.

### Tells

The habits that make a page read as generated. `khe-design-lint` from
`@khelias/ui` counts the first group in every web app against a baseline that
only shrinks ([estate ADR-035](https://github.com/khelias/khe-architecture/blob/main/decisions/035-family-shell-and-design-check-with-its-exceptions.md) point 8);
a line may opt out with `design-lint-allow <rule>: <reason>`.

- Gradients, backdrop blur and blur filters.
- Shadows, other than the one floating layer (the rooms list, a dialog, a
  menu) and a `0 0 0 Npx` ring.
- Radii above 12px, other than the 999px pill and a circle.
- Default palette colours (Tailwind's named scales and their hex values)
  instead of the family tokens.
- Capitals by CSS and tracking wider than 0.02em.
- Emoji in interface strings; content (a badge picture, a game's word list)
  may keep them.
- Em dashes in interface strings.

No check sees the rest; review for them:

- A centred hero with a pill badge above the title.
- Three icon feature cards in a row.
- A kicker on every row or section that repeats what its title already says.
- Invented numbers: a statistic nobody measured.
- Emoji used as icons.
- Exclamation copy ("Great job!") and capitalised praise.
- Glow: a coloured shadow or halo behind a control or a title.
- Gradient text.
