---
version: alpha
name: KHE family
description: One family across the KHE sites and apps; shared chrome on one ground, one accent per room.
colors:
  paper: "#fafafa"
  surface: "#ffffff"
  sunken: "#eff1f1"
  ink: "#121415"
  ink-2: "#363b3d"
  muted: "#5f6567"
  rule: "#e3e5e5"
  rule-strong: "#c3c7c7"
  home: "#d7263d"
  server: "#246b5f"
  trips: "#b75a3a"
  trips-text: "#93411f"
  house: "#1f5fa8"
  house-ground: "#e8eef6"
  games: "#8a5a12"
  adventure: "#6a3d8f"
  study: "#2f6b3a"
  primary: "#121415"
typography:
  display:
    fontFamily: Source Serif 4
    fontSize: clamp(2.6rem, 6vw, 4rem)
    fontWeight: 600
    lineHeight: 1.02
  title:
    fontFamily: Source Serif 4
    fontSize: 34px
    fontWeight: 600
    lineHeight: 1.15
  heading:
    fontFamily: Source Serif 4
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.25
  context:
    fontFamily: Source Serif 4
    fontSize: 17px
    fontWeight: 600
  lead:
    fontFamily: Inter
    fontSize: 19px
    lineHeight: 1.5
  body:
    fontFamily: Inter
    fontSize: 16px
    lineHeight: 1.6
  small:
    fontFamily: Inter
    fontSize: 14px
    lineHeight: 1.5
  control:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 600
  label:
    fontFamily: Inter
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
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
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
([estate ADR-021](https://github.com/khelias/khe-architecture/blob/main/decisions/021-family-shell-and-design-check.md),
which supersedes ADR-018 and ADR-015). Every room shares one ground, one ink
and one type in its chrome (the header, the mark, the language switcher, the
page ground and the type of the page chrome) and in the shell of its
application (surfaces, controls, dialogs, notifications, menus, lists), and
has one accent of its own, which the chrome shows in the `.ee` of the mark
and as the room's dot in the rooms list. Play areas, canvases, maps and the
house drawing keep their own look. The ground and ink are the architecture
page's editorial pair, promoted to the family.

This file is the one source of the family values. Other repos keep only their
own room in their design docs and cite this one. The tokens live in
`src/shared/site-header.css`; `scripts/check.mjs` fails when the frontmatter
differs from its light `:root` block, or when the system-dark block differs
from the `:root[data-theme="dark"]` block. The five room accents are also
`@khelias/ui`'s own defaults for the rooms list's dots, since every header
shows all five; the check fails when the package's light or dark dot differs
from the Colors table below.

## Rooms

| Room | Where | Accent | Text accent |
|---|---|---|---|
| Home | khe.ee landing, its privacy page, khe.ee/agents | `home` | `home` |
| Server | khe.ee/architecture, its decisions page and the ADR pages | `server` | `server` |
| Trips | khe.ee/trips, khe.ee/r/..., trips.khe.ee | `trips` | `trips-text` |
| House | khe.ee/ha | `house` | `house` |
| Games | the games.khe.ee hub and its privacy page | `games` | `games` |

AI Seiklus (`adventure`) and Tarkade Mängud (`study`) live inside the Games
room: their colours mark their rows on the hub and the `.ee` of their own
headers. `study` is proposed; khe-study has no single accent yet.

`data-room` on `<html>` maps the room to two properties: `--room` for fills
and dots, `--room-text` for text, the `.ee` and the focus ring. Trips is the
one room whose two differ, because `trips` is 4.2:1 on light `paper`.

## Colors

The frontmatter holds the light theme. Dark values live only in the CSS, and
the consent banner (`src/shared/analytics-consent.js`) carries its own copy of
the six it uses in both themes, so it renders on the game pages too:

| Token | Light | Dark | Use |
|---|---|---|---|
| paper | #fafafa | #0b0d0d | page ground, header ground (opaque) |
| surface | #ffffff | #121615 | switcher track, inputs |
| sunken | #eff1f1 | #0f1211 | picture wells, dark thumbnails, pressed row |
| ink | #121415 | #eef1f0 | names, titles, the KHE of the mark |
| ink-2 | #363b3d | #c4cac7 | running text |
| muted | #5f6567 | #8a928f | labels, inactive language, on paper only |
| rule | #e3e5e5 | #232827 | hairlines |
| rule-strong | #c3c7c7 | #3a413f | the mark's box, section rules |
| home | #d7263d | #fb4b57 | Home accent and text |
| server | #246b5f | #7fc8b8 | Server accent and text |
| trips | #b75a3a | #d9764f | Trips fills and marks |
| trips-text | #93411f | #e8926a | Trips text, its `.ee` |
| house | #1f5fa8 | #6fe3ff | House accent and text |
| house-ground | #e8eef6 | #060c1b | the house drawing's ground only |
| games | #8a5a12 | #d9a441 | Games hub accent and text |
| adventure | #6a3d8f | #b59ad6 | AI Seiklus (dark only in the game) |
| study | #2f6b3a | #7cc28a | Tarkade Mängud |

`primary` in the frontmatter is `ink`: the family's one filled button is ink
on paper, so no tool invents a primary hue.

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
([estate ADR-017](https://github.com/khelias/khe-architecture/blob/main/decisions/017-shared-theme-toggle-and-footer.md)).
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
an app the app's name follows after a slash ("Mängud ⌄ / Tarkade Mängud"). A
page's own name lives in its heading, never in the header. The list, its
names, notes and addresses come from `@khelias/ui`, so every room lists the
same rooms
([estate ADR-021](https://github.com/khelias/khe-architecture/blob/main/decisions/021-family-shell-and-design-check.md)).

## Application shell and state colour

The family covers every room's shell, not only the chrome
([estate ADR-021](https://github.com/khelias/khe-architecture/blob/main/decisions/021-family-shell-and-design-check.md) point 1): the page
ground, the type, the surfaces, the controls, dialogs, notifications, menus
and lists around a room's content use the values and rules in this file.
Play areas, canvases, maps and the house drawing keep their own look, within
the design check's baseline, which only shrinks. A room whose shell does not
meet this yet says so in its `AGENTS.md`. State colour is meaning, not an
accent: on and off, ok, warning, fault, a map state, right or wrong. A room
may use several, each naming a state, at 3:1 for marks and 4.5:1 for text in
both themes. Shared state tokens are a follow-up, once two rooms need the
same ones.

## Typography

Source Serif 4 600 for what you read (display, titles, headings, the header
title), Inter for what you look up (lead, body, controls, labels), the system
mono stack for facts: dates, numbers, times and codes.

- `display` serif 600, clamp(2.6rem, 6vw, 4rem) / 1.02: the landing name,
  the games hub title
- `title` serif 34px, `heading` serif 22px
- `context` serif 17px: the header title's family size (see the mark)
- `lead` Inter 19px, `body` 16px / 1.6, `small` 14px
- `control` Inter 600 12px
- `label` Inter 500 13px / 1.4, sentence case, no tracking and no dot: the
  kicker above a title, a list's heading; `muted`, or the room's text accent
  on a page's own kicker
- `fact` mono 500 11px, no capitals or tracking: a date, a number, a code

The Source Serif 4 files (weight 600, latin and latin-ext) ship in khe-sites
only. The apps use the family serif stack, `'Source Serif 4', 'Iowan Old
Style', Georgia, serif`, so an app without the files (trips) falls back to
Iowan Old Style.

## Layout

Content is one column, `width: min(1080px, 100%)`, with a gutter of
`max(16px, env(safe-area-inset-*))`; the header's inner row has the same
width. The header height is `@khelias/ui`'s own (3.65rem + 1px, 3.35rem + 1px
at 520px and below). No page scrolls sideways at 320px.

## Shapes

- 4px: the focus ring's corner
- 8px: the mark, controls and anything pressable
- 12px: pictures (the landing and games thumbnails; light ones sit on a 12% tint of their room)
- 999px: the language switcher and its buttons

## Elevation & Depth

Flat. The header is opaque `paper` over one `rule`, with no blur and no
shadow, so its contrast never depends on what scrolls under it. Sections are
separated by space and a `rule` or `rule-strong` hairline; nothing is a card.
The one exception is the rooms list, which floats over the page on
`surface` with a `rule-strong` edge and a soft shadow.

## Motion and touch

Hover rules sit inside `@media (hover: hover) and (pointer: fine)`; the press
state is `:active`. A row's arrow moves 2px on hover and stays put under
`prefers-reduced-motion: reduce`. Every hit area is at least 44px. The
package's own press scale has no reduced-motion rule yet (a khe-ui follow-up).

## Focus

A 2px outline in `--room-text`, offset 2 to 3px, 4px corner; the header's
focus colour is the same property.

## The mark

`KHE` in Inter 600, ink, with `.ee` at 0.7em in `--room-text`, in a
`rule-strong` box with an 8px corner on `paper`, no shadow. The favicon is the
same mark with the Home `.ee`. In the header the mark, rooms button, title and
buttons keep `@khelias/ui`'s sizes; the family `context`, `control` and
`label` sizes apply to page content until a khe-ui release exposes them.

## Header values in the apps

The values reach every app as `--khe-header-*` properties set on
`.site-header` (and a standalone `.language-switcher`), never on `:root`,
where they would not reach the header:

- `bg` paper, `blur` 0px, `border` rule, `text` ink, `text-muted` muted
- `title-font` the serif stack, `focus` the room's text accent
- `brand-border` rule-strong, `brand-bg` paper, `brand-shadow` none,
  `suffix` the room's text accent
- `switcher-radius` and `button-radius` 999px, `switcher-border` rule,
  `switcher-bg` surface, the pressed button ink on paper with a rule-strong
  edge
- `menu-bg` surface, `menu-border` rule-strong, `menu-current-bg` sunken,
  `menu-shadow` a soft `0 12px 32px` black at 14%: the rooms list floats
  over the page, the one shadow in the chrome
- the five `room-<id>` dots are the package's, the room accents in both
  themes; an app sets them only to differ, which it should not

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
only shrinks ([estate ADR-021](https://github.com/khelias/khe-architecture/blob/main/decisions/021-family-shell-and-design-check.md) point 8);
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
- Invented numbers: a statistic nobody measured.
- Emoji used as icons.
- Exclamation copy ("Great job!") and capitalised praise.
- Glow: a coloured shadow or halo behind a control or a title.
- Gradient text.
