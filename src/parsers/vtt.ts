import type { Segment } from '../types';
import { newId } from '../lib/id';
import { parseTimestamp } from '../lib/time';

/**
 * Parse a WebVTT file into segments.
 * Supports voice tags (<v Speaker>) for speaker labels; all other inline
 * tags are stripped. NOTE/STYLE/REGION blocks and cue settings are ignored.
 */
export function parseVtt(input: string): Segment[] {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (!/^WEBVTT/.test(text)) {
    throw new Error('Not a WebVTT file: missing WEBVTT header.');
  }
  const blocks = text.split(/\n{2,}/);
  const segments: Segment[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) continue;
    const first = lines[0]!.trim();
    if (first.startsWith('WEBVTT') || first.startsWith('NOTE') || first.startsWith('STYLE') || first.startsWith('REGION')) {
      continue;
    }
    // Optional cue identifier line before the timing line.
    let timingIdx = lines.findIndex((l) => l.includes('-->'));
    if (timingIdx === -1) continue;
    const timing = lines[timingIdx]!;
    const [startRaw, endRaw] = timing.split('-->');
    const startMs = parseTimestamp(startRaw ?? '');
    const endMs = parseTimestamp((endRaw ?? '').trim().split(/\s+/)[0] ?? '');
    if (startMs === undefined) continue;

    const rawText = lines.slice(timingIdx + 1).join('\n').trim();
    if (!rawText) continue;

    const voiceMatch = rawText.match(/^<v(?:\.[^\s>]*)?\s+([^>]+)>/);
    const speaker = voiceMatch ? voiceMatch[1]!.trim() : undefined;
    const cleanText = rawText
      .replace(/<v(?:\.[^\s>]*)?\s+[^>]+>/g, '')
      .replace(/<\/?[^>]+>/g, '')
      .trim();
    if (!cleanText) continue;

    segments.push({
      id: newId(),
      startMs,
      ...(endMs !== undefined ? { endMs } : {}),
      ...(speaker ? { speaker } : {}),
      text: cleanText,
    });
  }
  return segments;
}
