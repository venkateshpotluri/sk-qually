# Qually — expert code review

Full-codebase review conducted after the initial implementation landed on `main`:
routing and screen lifecycle, state/persistence, the two composite widgets
(listbox, tree), parsers, exports, dialogs, and the test suites. Findings are
listed with their resolution; accepted risks are documented at the end so they
are deliberate decisions rather than oversights.

## Fixed

1. **Skip link triggered the router (serious, accessibility).**
   The "Skip to main content" link pointed at `#main`, but the app routes on the
   URL hash — activating it navigated to the project list instead of skipping.
   The one control that exists purely for keyboard/screen-reader users was the
   one control that broke for them. *Fix:* the click is intercepted and focus
   moves straight to `<main>`; the hash is untouched. Covered by a regression
   test that activates the link from the coding view and asserts the URL and
   view are unchanged and `<main>` holds focus.

2. **CSV export rows followed assignment-creation order.**
   Rows now come out in reading order — document, then segment position — so the
   file is usable in Excel/R without re-sorting. Unit-tested with deliberately
   reversed assignment order.

3. **Focus could drop to `<body>` after code create/edit.**
   When a code dialog was opened from a tree item via `E`/`N`, the tree re-render
   destroyed the element the closing dialog returned focus to. A recovery guard
   now returns focus to the tree whenever it would otherwise land on `<body>`.

4. **Blob URL leak for video and captions.**
   `URL.createObjectURL` results were never revoked when re-attaching a video,
   switching documents, or leaving the coding view. They are now tracked and
   revoked on rebuild and on navigation (tied to the screen's AbortController).

5. **Autosave hardening.**
   The debounced IndexedDB write now also flushes on `visibilitychange: hidden`
   (mobile tab switches rarely fire `pagehide`), and write failures are logged
   instead of being silently swallowed.

6. **First deploy friction.** `actions/configure-pages` now runs with
   `enablement: true`, so the workflow can switch the repository to
   GitHub-Actions-based Pages on first run instead of failing until it is
   enabled by hand (if organization policy forbids this, enable Pages manually
   under Settings → Pages → Source → GitHub Actions).

## Reviewed and accepted as-is (with rationale)

- **CSV formula-injection guard deliberately omitted.** OWASP recommends
  prefixing cells that start with `=`, `+`, `-`, or `@` when a CSV may be opened
  in Excel. Doing so would silently alter transcript text — unacceptable for
  qualitative data that may be analyzed programmatically, and the file contains
  only the researcher's own local data. Documented here as a conscious tradeoff;
  revisit if projects are ever shared with untrusted collaborators.
- **Speaker detection is a heuristic** (`Name:` prefix, ≤4 words, not a
  timestamp). False positives are possible on lines like `Note: …`; the cost is
  cosmetic (text moves into the speaker slot) and the conservative bound keeps
  ordinary sentences with colons intact. VTT voice tags are exact and preferred.
- **No type-ahead in tree/listbox** — it would collide with the single-letter
  shortcuts; noted as a future item if codebooks grow long.
- **Double render when deleting a project from the home screen** (explicit
  re-render plus a possible hashchange): idempotent and imperceptible; not worth
  plumbing a dedicated refresh path.
- **`aria-checked` on treeitems** is valid ARIA 1.2 and the state is mirrored
  visually and re-announced through the live region; flagged for the manual
  screen-reader pass to confirm verbosity feels right.

## Verification after fixes

- Unit tests: 30 passing (was 29; CSV ordering added).
- Playwright + axe: 10 scenarios passing (was 9; skip-link regression added);
  zero WCAG violations in light and dark themes.
- Contrast checks: 54/54; type check clean; production build clean.
