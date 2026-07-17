import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseTranscript } from '../../src/parsers';

/** The committed fixtures in public/testdata must always parse cleanly. */

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'testdata');
const read = (name: string) => fs.readFileSync(path.join(dir, name), 'utf8');

describe('synthetic test fixtures', () => {
  it('tone-check.vtt: 12 segments on the 10-second grid with speakers', () => {
    const { format, segments } = parseTranscript('tone-check.vtt', read('tone-check.vtt'));
    expect(format).toBe('vtt');
    expect(segments).toHaveLength(12);
    segments.forEach((seg, i) => {
      expect(seg.startMs).toBe(i * 10000);
      expect(seg.endMs).toBe((i + 1) * 10000);
      expect(seg.speaker).toBe(i % 2 === 0 ? 'Tester' : 'Guide');
    });
    expect(segments[2]!.text).toContain('Three beeps');
  });

  it('interview-onboarding.srt: 8 cues with speaker prefixes', () => {
    const { format, segments } = parseTranscript(
      'interview-onboarding.srt',
      read('interview-onboarding.srt'),
    );
    expect(format).toBe('srt');
    expect(segments).toHaveLength(8);
    expect(segments[0]!.speaker).toBe('Interviewer');
    expect(segments[1]!.speaker).toBe('P2');
    expect(segments[7]!.startMs).toBe(70000);
  });

  it('focus-group-notes.txt: timed plaintext with four speakers', () => {
    const { format, segments } = parseTranscript(
      'focus-group-notes.txt',
      read('focus-group-notes.txt'),
    );
    expect(format).toBe('plaintext');
    expect(segments).toHaveLength(8);
    expect(segments[0]).toMatchObject({ startMs: 0, speaker: 'Moderator' });
    expect(new Set(segments.map((s) => s.speaker)).size).toBe(4);
  });

  it('reflection-memo.txt: untimed paragraphs', () => {
    const { segments } = parseTranscript('reflection-memo.txt', read('reflection-memo.txt'));
    expect(segments.length).toBeGreaterThanOrEqual(4);
    for (const seg of segments) expect(seg.startMs).toBeUndefined();
  });

  it('audio and video fixtures exist and are non-trivial', () => {
    expect(fs.statSync(path.join(dir, 'tone-check.wav')).size).toBeGreaterThan(500000);
    expect(fs.statSync(path.join(dir, 'segment-slides.webm')).size).toBeGreaterThan(100000);
  });
});
