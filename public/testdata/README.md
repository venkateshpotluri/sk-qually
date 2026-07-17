# Qually synthetic test fixtures

Shared reference data for testing and bug reports. Regenerate with
`node scripts/make-testdata.mjs`. All files are also served from the live site
under `/sk-qually/testdata/`.

## The shared timeline

Every timed fixture uses the same ground truth: **12 segments of exactly 10
seconds each**, covering 0:00–2:00. Segment *n* runs from `10 × (n−1)` to
`10 × n` seconds.

- **tone-check.wav** (audio, 2:00) — segment *n* begins with ***n* short
  880 Hz beeps** (count the beeps to know where you are by ear), followed by a
  soft sustained tone that rises one semitone per segment.
- **segment-slides.webm** (silent video, 2:00) — segment *n* shows the digit
  *n* on its own background color, for sighted verification of the same
  timeline.
- **tone-check.vtt** — transcript aligned to that grid; each cue states its own
  segment number, beep count, and start time, with alternating voice-tag
  speakers (Tester / Guide).

Attach `tone-check.wav` **or** `segment-slides.webm` as the media for a
document created from `tone-check.vtt`. Example check: select segment three,
press Enter — you should immediately hear three beeps (or see the digit 3).

## Other transcripts

- **interview-onboarding.srt** — realistic 8-cue interview on the same
  10-second grid (0:00–1:20), with `Interviewer:` / `P2:` speaker prefixes.
  Also works with the audio/video above for seek testing.
- **focus-group-notes.txt** — timed plaintext (`[00:00:10]` style) with four
  speakers; exercises the plaintext timestamp and speaker parsing.
- **reflection-memo.txt** — untimed plaintext paragraphs; exercises the
  no-timestamp path (Enter on a segment should announce that there is no
  timestamp).

## Reporting bugs against these fixtures

Name the file, the segment number, and what you did, e.g.: "In tone-check,
selected segment 5, pressed Enter — heard four beeps instead of five." Both of
us can then reproduce the exact state.
