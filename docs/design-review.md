# Qually — expert design review

This document is the complete, text-based record of Qually's visual and interaction
design: what was decided, why, what an expert review of the rendered UI found, and
what was changed as a result. It is written so the design can be audited without
seeing it. Measured numbers (contrast ratios) come from `scripts/contrast-check.mjs`,
which runs in CI and fails the build if any pairing regresses.

## 1. Review method

1. **Rendered inspection.** Every screen and state was captured at 1440×900 in both
   light and dark themes (via `scripts/screenshots.mjs`) and visually critiqued:
   alignment, spacing rhythm, typographic hierarchy, balance, and whether the result
   reads as a calm professional tool.
2. **Automated WCAG 2.1 AA scanning.** axe-core runs against every screen and every
   open dialog, in both themes, as part of the Playwright suite (9 scenarios). Zero
   violations is a hard test assertion, not a goal.
3. **Contrast measurement.** 54 foreground/background pairings are computed
   programmatically: all text pairs must reach 4.5:1 (AA text), all non-text
   indicators 3:1 (AA non-text). Current status: 54/54 pass.
4. **Heuristic pass** against the ARIA Authoring Practices patterns for every
   composite widget, and Nielsen's heuristics for the flows (visibility of status,
   user control, error prevention, recognition over recall).

## 2. Layout geography

**Home screen** — a single centered column (max width 44rem). Top to bottom: the
"Qually" wordmark (2rem, weight 750, with a small accent-colored period as the only
decorative flourish), a one-line tagline, a highlighted privacy note (soft indigo
panel with a 3px accent left border), the "New project" form, an "Import project
file" button, the project list as cards, and finally a "Privacy" section with the
"Clear all local data" control, separated by a hairline rule.

**Project screen** — same centered column. Breadcrumb link back to all projects,
project name as the h1, a toolbar of project actions (rename, export JSON, export
CSV, delete), the document list as cards (each with segment/coded counts and video
name), then the "Add a document" form.

**Coding view** — the only wide screen (max 84rem). A header row holds the
breadcrumb + document title on the left and the document switcher, Settings, and
Shortcuts buttons on the right, separated from the content by a hairline border.
Below, a two-column grid: the **transcript** panel takes the flexible left ~two
thirds; the right column (20–26rem) stacks the **video** panel above the **codes**
panel and is sticky so codes stay in reach while the transcript scrolls. All three
are white/raised cards with 1px borders, 10px radii, and a very soft two-layer
shadow. Panel headings ("Transcript", "Video", "Codes") are small uppercase
letterspaced labels in muted color — visible headings, quiet visual weight. Below
56rem viewport width the grid stacks to a single column.

DOM and reading order is transcript → video → codes, and `Alt+1/2/3/4` jump
between regions, so the visual arrangement never dictates navigation.

## 3. Type, spacing, motion

- One family: **Inter Variable** (self-hosted via npm — no CDN, keeping the
  no-network promise), system-ui fallback. Body 1rem/1.6; h1 1.6rem/675 (2rem/750
  for the wordmark); h2 1.15rem/625; metadata 0.8–0.9rem. Hierarchy is carried by
  weight and size, never by color alone.
- Timestamps use tabular numerals so they align vertically down the transcript.
- Spacing sits on a ~0.35/0.6/0.9/1.5rem rhythm; cards and panels share identical
  padding so the three coding panels read as one system.
- Motion is limited to 120–150ms background/transform eases (hover states, the
  disclosure chevron, the skip link) and is fully disabled under
  `prefers-reduced-motion: reduce`.

## 4. Color system

Two full themes, switched by `prefers-color-scheme` with a manual override
(Settings → Theme) via a `data-theme` attribute.

| Token | Light | Dark | Role |
|---|---|---|---|
| bg | `#faf9f7` (warm off-white) | `#16181d` | page background |
| bg-raised | `#ffffff` | `#1e2127` | cards, panels, dialogs |
| bg-sunken | `#f0eeea` | `#101216` | wells, hover, playing segment |
| text | `#1c1f24` | `#e8e9ec` | body text |
| text-muted | `#565e6a` | `#a5adba` | metadata, hints |
| accent | `#3d4db7` (indigo) | `#9daaf7` | links, primary buttons, focus rings, selection |
| danger | `#a3352b` | `#e88b7d` | destructive actions |

Key measured ratios (all pass; full 54-row table by running
`node scripts/contrast-check.mjs`): body text 15.7:1 light / 14.6:1 dark; muted text
6.2:1 / 7.9:1; accent-as-text 6.8:1 / 8.1:1; button labels on accent 7.1:1 / 8.2:1;
text on the selected-segment tint 13.9:1 / 11.3:1; focus ring vs any surface ≥6.8:1
(needs only 3:1).

**Code palette.** Twelve categorical colors, each with a human name — brick red,
ocean blue, moss green, plum purple, amber yellow, teal, rose pink, slate gray,
olive green, cobalt blue, rust orange, orchid violet. Each has a darker value for
the light theme and a lighter value for the dark theme, so every swatch/stripe
holds ≥3:1 non-text contrast in both themes (measured range 5.5–8.3:1). The names
are exactly what the "Announce code colors" setting appends to announcements, so
the vocabulary a screen-reader user hears matches what a sighted teammate says.
New top-level codes automatically take the least-used color; sub-codes inherit
their ancestor's color unless overridden.

## 5. Controls and their semantics

| Functionality | Control and semantics |
|---|---|
| Transcript | `ul` with `role="listbox"` labelled "Transcript"; each segment an option with roving tabindex. Selection follows focus. The option's `aria-label` is the composed announcement: code paths (with color names when enabled), timestamp, speaker, text — codes omitted when none. |
| Segment appearance | Left edge stripes (5px, rounded) — one per distinct code color; timestamp + speaker in small caps/muted; selected segment gets an accent border + soft tint; the currently playing segment gets a sunken tint and a small ▶ after its timestamp plus `aria-current="true"`. |
| Video | Native `<video controls>`; captions track auto-generated from the transcript (WebVTT, voice tags preserved). Re-attach prompt when a saved document's video isn't loaded this session. |
| Code hierarchy | `role="tree"` per the APG pattern, arbitrary depth (`aria-level`, `aria-expanded` on parents, `role="group"` for children). `aria-checked` on each treeitem reflects assignment to the selected segment, mirrored visually by a checkmark and bolded name. Color dot per code. |
| Code CRUD | Native `<dialog>` (name field, parent select showing full indented paths, color select). Visible "New code…", "Edit…", "Delete…" buttons under the Codes heading — single-letter shortcuts are accelerators, never the only path. Deleting warns that the subtree and its assignments go too. |
| Coding target | A quiet well under the Codes heading always states what's being coded: `Coding: 00:00:12 — "excerpt…"`. |
| Dialogs | Native `<dialog>` + `showModal`: modal, Escape closes, focus returned to opener by the platform, labelled via `aria-labelledby`. The shortcuts dialog focuses its heading on open so reading starts at the top. |
| Status messages | One polite `role="status"` live region for the whole app (assignments, saves, errors, imports). |
| Aggregates view | "View aggregates" in the coding header swaps the entire coding layout for a native `<table>` (column headers `scope="col"`, code paths as `scope="row"` row headers) of per-code segment counts — this document and all documents, with subtree rollups in parentheses. A "Show levels" select filters to any single level. The table and the coding panels are never on screen together; Close (or Escape) restores coding and returns focus to the opener, and opening pauses video playback. |
| Forms | Real `<label>`s throughout; hints wired with `aria-describedby`; native file inputs (hidden ones that are button-triggered are `display:none` + `aria-hidden`). |

ARIA is used only where HTML has no equivalent: the listbox, the tree, the live
region, `aria-current` for the playing segment, and dialog labelling. Everything
else is native elements.

## 6. Keyboard model

Global: `?` shortcuts help; `Escape` closes dialogs. Coding view: `Alt+1/2/3/4`
move to transcript / video / code tree / document switcher; `Ctrl+S` exports the
project file. Transcript: arrows/Home/End navigate and select, `Enter` plays from
the segment, `Space`/`K` play-pause, `J`/`L` skip ±5s, `C` jumps to the code tree.
Tree (APG standard): arrows navigate and expand/collapse, `Enter`/`Space` toggle
assignment, `N` new sub-code, `E` edit, `Delete` delete.

WCAG 2.1.4 compliance: every single-letter shortcut is scoped to a focused
component, and a Settings toggle disables them all (covered by an automated test).

## 7. Findings from the rendered review

1. **Shortcuts dialog opened scrolled to its bottom.** `showModal()` focuses the
   first focusable element — the Close button — so the browser scrolled a tall
   dialog to the end; a screen-reader or magnifier user would start at the bottom.
   *Fixed:* the dialog heading takes focus on open and scroll is reset to the top.
2. **Hidden file inputs failed axe's label rule.** The button-triggered import and
   attach-video inputs were visually hidden but still in the accessibility tree
   unlabeled. *Fixed:* `display:none` + `aria-hidden` — the visible buttons are the
   accessible path.
3. **Stale reads after the autosave debounce.** Opening a just-modified project
   re-read IndexedDB before the debounced write landed, losing the new document
   (caught by the e2e suite on first run). *Fixed:* the in-memory project is the
   source of truth; the store only reloads when switching projects and flushes
   pending saves first.
4. **A suspected dark-theme contrast failure that wasn't one.** An early dark
   screenshot showed the selected segment with a light background and washed-out
   text. Probing computed styles showed the correct dark value; the artifact was
   the capture script's own stray text selection and a mid-transition frame.
   Verified fixed with a clean capture; no product change needed beyond the
   verification.
5. **Minor polish applied:** the playing segment gained a background tint (it was
   only a ▶ mark), and the home wordmark gained its accent period so the first
   screen has one deliberate identity moment.

## 8. Verification status

- Unit tests: 29 (parsers, timestamp handling, announcement composition incl. the
  spec's exact example string, code-tree utilities, CSV/JSON/VTT export).
- E2E + axe: 9 scenarios — every screen and dialog scanned in light and dark; plus
  behavioral coverage of announcements, keyboard navigation, deep nesting,
  edit/delete cascades, reload persistence, export, and the shortcut kill-switch.
- Contrast: 54/54 programmatic checks pass; enforced in CI.

## 9. Known limitations / future review items

- Manual screen-reader passes (NVDA + Firefox, JAWS + Chrome, VoiceOver + Safari)
  still need a human run-through; `aria-checked` on treeitems and option re-announce
  behavior after assignment are the two spots most worth listening to.
- Type-ahead in the tree and listbox (first-letter jump) is deliberately absent
  because it would collide with the single-letter shortcuts; revisit if codebooks
  grow long.
- No undo yet — destructive actions rely on confirmation dialogs instead.
- REFI-QDA (QDPX) interchange is not yet implemented; the data model maps onto it.
