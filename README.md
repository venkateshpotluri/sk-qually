# Qually

Qually is a qualitative coding tool — in the spirit of NVivo or Dedoose — built to be
**screen-reader-first and WCAG 2.1 AA compliant**, and to keep study data private:
**everything stays in your browser; nothing is ever uploaded.**

## Features

- **Projects** containing multiple documents; each document is a transcript with an
  optional video or audio file. The codebook (code tree) is shared across a project,
  so codes apply across interviews.
- **Transcript formats:** WebVTT, SRT, or plain text. Timestamps, VTT voice tags,
  and `Name:` speaker prefixes are picked up automatically.
- **Coding:** select a transcript segment, then assign codes from an arbitrarily deep
  code hierarchy. Screen readers announce a coded segment as
  `Emotion: positive, 00:00:12, I want a new button here…` — codes first, then
  timestamp, speaker, and text.
- **Color:** every top-level code gets a color (inherited by sub-codes, overridable)
  shown as edge stripes on segments so sighted teammates can follow along. A setting
  announces color names (e.g. "ocean blue") to screen-reader users too.
- **Video sync:** click or press Enter on a segment to play the video from that
  timestamp; captions are generated from the transcript automatically.
- **Aggregates:** a "View aggregates" table shows how many segments each code is
  assigned to (current document and project-wide, with sub-code rollups),
  filterable by hierarchy level. It replaces the coding view while open so the
  two are never on screen together.
- **Keyboard-first:** full keyboard operation, `?` opens the shortcuts list, and all
  single-letter shortcuts can be disabled (WCAG 2.1.4).
- **Privacy & persistence:** work autosaves to the browser's IndexedDB only. Export /
  import a JSON project file to move or back up work; export coded segments as CSV.
  A "Clear all local data" control wipes everything, for shared machines.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (parsers, announcements, exports)
npm run build      # type check + production build
npx playwright test  # end-to-end + axe accessibility tests
node scripts/contrast-check.mjs  # WCAG contrast verification of the design tokens
```

## Deployment

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
One-time setup: in the repository settings, under **Pages**, set the source to
**GitHub Actions**.

## Accessibility

The design and its verification are documented in
[docs/design-review.md](docs/design-review.md): layout, controls and their ARIA
roles, the full keyboard model, color tokens with measured contrast ratios, and
the expert review findings.
