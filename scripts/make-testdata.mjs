#!/usr/bin/env node
/**
 * Generate the shared synthetic test fixtures in public/testdata/.
 *
 * Ground-truth timeline (shared by every fixture): 12 segments of 10 seconds
 * each, covering 0:00–2:00. Segment n (1-12):
 *   - audibly: starts with n short 880 Hz beeps (count the beeps to know
 *     where you are), followed by a soft sustained tone whose pitch rises
 *     one semitone per segment;
 *   - visually (silent WebM): a slide with the segment number and a
 *     distinct background color.
 *
 * Outputs:
 *   tone-check.wav        2-minute audio reference (attach as the "video")
 *   segment-slides.webm   2-minute silent video reference (needs ffmpeg)
 *   tone-check.vtt        transcript aligned to the timeline (voice tags)
 *   interview-onboarding.srt   realistic 8-cue interview, same 10 s grid
 *   focus-group-notes.txt      timed plaintext with speaker prefixes
 *   reflection-memo.txt        untimed plaintext (edge case)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'testdata');
fs.mkdirSync(outDir, { recursive: true });

const SEGMENTS = 12;
const SEG_SECONDS = 10;
const TOTAL_SECONDS = SEGMENTS * SEG_SECONDS;

// ---------------------------------------------------------------- audio (WAV)

const RATE = 8000;
const samples = new Int16Array(RATE * TOTAL_SECONDS);

/** Add a sine tone with 5 ms attack/release ramps to avoid clicks. */
function tone(startSec, durSec, freq, amplitude) {
  const start = Math.floor(startSec * RATE);
  const count = Math.floor(durSec * RATE);
  const ramp = Math.floor(0.005 * RATE);
  for (let i = 0; i < count; i++) {
    let env = 1;
    if (i < ramp) env = i / ramp;
    else if (i > count - ramp) env = (count - i) / ramp;
    const value = Math.sin(2 * Math.PI * freq * (i / RATE)) * amplitude * env * 32767;
    const idx = start + i;
    if (idx < samples.length) samples[idx] = Math.max(-32767, Math.min(32767, samples[idx] + value));
  }
}

for (let n = 1; n <= SEGMENTS; n++) {
  const t0 = (n - 1) * SEG_SECONDS;
  // n counting beeps at the segment start.
  for (let b = 0; b < n; b++) {
    tone(t0 + b * 0.27, 0.15, 880, 0.5);
  }
  // Soft sustained tone, one semitone higher per segment (C3 chromatic scale).
  const beepsEnd = t0 + n * 0.27 + 0.2;
  const pitch = 130.81 * 2 ** ((n - 1) / 12);
  tone(beepsEnd, t0 + SEG_SECONDS - 0.4 - beepsEnd, pitch, 0.12);
}

function wavFile(pcm, rate) {
  const data = Buffer.from(pcm.buffer);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

fs.writeFileSync(path.join(outDir, 'tone-check.wav'), wavFile(samples, RATE));
console.log('wrote tone-check.wav');

// ------------------------------------------------------------- video (WebM)

// Slide colors: the light-theme code palette, one per segment.
const COLORS = [
  '#a3352b', '#1d5f9e', '#3d6b35', '#6d3f7e', '#8a6116', '#0f6a66',
  '#a13560', '#4e5d6c', '#5f6b1f', '#3b4bbf', '#96481a', '#8438a8',
];

// Recorded with Playwright's Chromium: a page cycles through numbered color
// slides on the shared 10-second grid while the context records video.
if (process.env.SKIP_VIDEO !== '1') {
  const { chromium } = await import('@playwright/test');
  const executablePath = fs.existsSync('/opt/pw-browsers/chromium')
    ? '/opt/pw-browsers/chromium'
    : undefined;
  const browser = await chromium.launch({ executablePath });
  const context = await browser.newContext({
    viewport: { width: 640, height: 360 },
    recordVideo: { dir: outDir, size: { width: 640, height: 360 } },
  });
  const page = await context.newPage();
  await page.setContent(`
    <body style="margin:0">
    <div id="slide" style="width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;
      font:700 40vh system-ui,sans-serif;color:#fff"></div>
    <script>
      const colors = ${JSON.stringify(COLORS)};
      const start = performance.now();
      function tick() {
        const n = Math.min(${SEGMENTS}, Math.floor((performance.now() - start) / ${SEG_SECONDS * 1000}) + 1);
        const slide = document.getElementById('slide');
        slide.style.background = colors[n - 1];
        slide.textContent = n;
        requestAnimationFrame(tick);
      }
      tick();
    </script>
    </body>`);
  await page.waitForTimeout(TOTAL_SECONDS * 1000);
  const video = page.video();
  await context.close();
  await browser.close();
  const recorded = await video.path();
  fs.renameSync(recorded, path.join(outDir, 'segment-slides.webm'));
  console.log('wrote segment-slides.webm');
} else {
  console.log('SKIP_VIDEO=1; skipped segment-slides.webm');
}

// -------------------------------------------------------------- transcripts

const pad = (x) => String(x).padStart(2, '0');
const vttTime = (s) => `00:${pad(Math.floor(s / 60))}:${pad(s % 60)}.000`;
const srtTime = (s) => `00:${pad(Math.floor(s / 60))}:${pad(s % 60)},000`;
const NUMBERS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const spoken = (s) =>
  s === 0 ? 'zero seconds' : s < 60 ? `${s} seconds` : `${Math.floor(s / 60)} minute ${s % 60} seconds`;

let vtt = 'WEBVTT\n\nNOTE Qually synthetic fixture — 12 segments, 10 seconds each.\n\n';
for (let n = 1; n <= SEGMENTS; n++) {
  const start = (n - 1) * SEG_SECONDS;
  const speaker = n % 2 === 1 ? 'Tester' : 'Guide';
  vtt += `${n}\n${vttTime(start)} --> ${vttTime(start + SEG_SECONDS)}\n`;
  vtt += `<v ${speaker}>Segment ${NUMBERS[n - 1]} of twelve. ${NUMBERS[n - 1][0].toUpperCase()}${NUMBERS[n - 1].slice(1)} beeps mark this segment, starting at ${spoken(start)}.\n\n`;
}
fs.writeFileSync(path.join(outDir, 'tone-check.vtt'), vtt);
console.log('wrote tone-check.vtt');

const srtCues = [
  ['Interviewer', 'Welcome, and thanks for making time today. Could you start by telling me how you first set up the product?'],
  ['P2', 'Sure. The install itself was quick, but honestly the first-run screen confused me: three buttons, no explanation.'],
  ['Interviewer', 'What did you expect to see instead?'],
  ['P2', 'A single obvious next step. I want a guided path, something like "import your data, then invite your team".'],
  ['Interviewer', 'You mentioned inviting a team. How did that go when you tried it?'],
  ['P2', 'That part was actually delightful. The invite link worked on the first try and my colleague was in within a minute.'],
  ['Interviewer', 'Anything that almost made you give up?'],
  ['P2', 'The settings page. It felt like a maze, and I still cannot find where notifications live. That frustrated me a lot.'],
];
let srt = '';
srtCues.forEach(([speaker, text], i) => {
  const start = i * SEG_SECONDS;
  srt += `${i + 1}\n${srtTime(start)} --> ${srtTime(start + SEG_SECONDS)}\n${speaker}: ${text}\n\n`;
});
fs.writeFileSync(path.join(outDir, 'interview-onboarding.srt'), srt);
console.log('wrote interview-onboarding.srt');

const focusGroup = `[00:00:00] Moderator: Let's go around the table. What is one thing the current tool does well?
[00:00:10] Riley: Search is fast, and I trust the results. That is rare.
[00:00:20] Sam: Agreed on search. But exporting anything takes me five clicks minimum, and that gets old.
[00:00:30] Moderator: Sam, walk me through where those clicks happen.
[00:00:40] Sam: Menu, then export, then a format screen, then a confirm screen, then a download button. Feels like a form from 2009.
[00:00:50] Priya: For me the mobile view is the pain point: half the buttons are off screen on my phone.
[00:01:00] Moderator: If you could fix only one of these before the next release, which would it be?
[00:01:10] Riley: Mobile. Search already works; give Priya her buttons back.
`;
fs.writeFileSync(path.join(outDir, 'focus-group-notes.txt'), focusGroup);
console.log('wrote focus-group-notes.txt');

const memo = `Reflections after week one of fieldwork.

Participants keep describing the onboarding flow with spatial metaphors: a maze, a fork in the road, a dead end. Worth creating a code family for navigation metaphors.

Two people independently praised the invite flow in almost identical words. Possible ceiling effect, or the flow is genuinely good. Check against next cohort.

Open question for the team: are we hearing frustration about settings because the settings are bad, or because our tasks send people there too often?
`;
fs.writeFileSync(path.join(outDir, 'reflection-memo.txt'), memo);
console.log('wrote reflection-memo.txt');
console.log('done');
