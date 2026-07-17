import { describe, expect, it } from 'vitest';
import { detectFormat, parsePlaintext, parseSrt, parseTranscript, parseVtt } from '../../src/parsers';

const VTT = `WEBVTT

NOTE this is a comment

1
00:00:12.000 --> 00:00:15.000
<v Participant 3>I want a new button here, that would really improve the feature

00:00:15.500 --> 00:00:18.000 align:start
It should be <b>big</b> and obvious
`;

const SRT = `1
00:00:12,000 --> 00:00:15,000
P3: I want a new button here

2
00:00:15,500 --> 00:00:18,000
It should be big and obvious
`;

describe('parseVtt', () => {
  it('parses cues with times, voice tags and stripped markup', () => {
    const segments = parseVtt(VTT);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      startMs: 12000,
      endMs: 15000,
      speaker: 'Participant 3',
      text: 'I want a new button here, that would really improve the feature',
    });
    expect(segments[1]!.text).toBe('It should be big and obvious');
    expect(segments[1]!.speaker).toBeUndefined();
  });
  it('rejects non-VTT content', () => {
    expect(() => parseVtt('not a vtt file')).toThrow(/WEBVTT/);
  });
});

describe('parseSrt', () => {
  it('parses cues and Name: speaker prefixes', () => {
    const segments = parseSrt(SRT);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      startMs: 12000,
      endMs: 15000,
      speaker: 'P3',
      text: 'I want a new button here',
    });
  });
});

describe('parsePlaintext', () => {
  it('splits paragraphs into segments with speakers and timestamps', () => {
    const segments = parsePlaintext(
      `[00:00:12] Interviewer: How do you feel about the tool?\n\nP3: It works well for me.\n\nJust a plain paragraph.`,
    );
    expect(segments).toHaveLength(3);
    expect(segments[0]).toMatchObject({
      startMs: 12000,
      speaker: 'Interviewer',
      text: 'How do you feel about the tool?',
    });
    expect(segments[1]).toMatchObject({ speaker: 'P3', text: 'It works well for me.' });
    expect(segments[2]!.speaker).toBeUndefined();
    expect(segments[2]!.startMs).toBeUndefined();
  });
  it('falls back to one segment per line when there are no blank lines', () => {
    const segments = parsePlaintext('line one\nline two\nline three');
    expect(segments).toHaveLength(3);
  });
  it('does not mistake times or long clauses for speakers', () => {
    const segments = parsePlaintext(
      'The meeting at 10:30: everyone arrived on time and nothing else of note happened there.',
    );
    expect(segments[0]!.speaker).toBeUndefined();
  });
});

describe('detectFormat / parseTranscript', () => {
  it('detects by extension and content', () => {
    expect(detectFormat('a.vtt', '')).toBe('vtt');
    expect(detectFormat('a.srt', '')).toBe('srt');
    expect(detectFormat('a.txt', VTT)).toBe('vtt');
    expect(detectFormat('a.txt', SRT)).toBe('srt');
    expect(detectFormat('a.txt', 'hello world')).toBe('plaintext');
  });
  it('throws a friendly error for empty transcripts', () => {
    expect(() => parseTranscript('a.txt', '   ')).toThrow(/No transcript segments/);
  });
});
