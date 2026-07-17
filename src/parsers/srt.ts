import type { Segment } from '../types';
import { newId } from '../lib/id';
import { parseTimestamp } from '../lib/time';
import { splitSpeakerPrefix } from './speaker';

/**
 * Parse a SubRip (.srt) file into segments.
 * Speaker labels are recognized as "Name: text" prefixes on the cue text.
 */
export function parseSrt(input: string): Segment[] {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const blocks = text.split(/\n{2,}/);
  const segments: Segment[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) continue;
    const timingIdx = lines.findIndex((l) => l.includes('-->'));
    if (timingIdx === -1) continue;
    const [startRaw, endRaw] = lines[timingIdx]!.split('-->');
    const startMs = parseTimestamp(startRaw ?? '');
    const endMs = parseTimestamp(endRaw ?? '');
    if (startMs === undefined) continue;

    const rawText = lines
      .slice(timingIdx + 1)
      .join('\n')
      .replace(/<\/?[^>]+>/g, '')
      .replace(/\{\\[^}]*\}/g, '')
      .trim();
    if (!rawText) continue;

    const { speaker, text: cleanText } = splitSpeakerPrefix(rawText);
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
