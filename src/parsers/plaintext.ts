import type { Segment } from '../types';
import { newId } from '../lib/id';
import { parseTimestamp } from '../lib/time';
import { splitSpeakerPrefix } from './speaker';

/**
 * Parse a plaintext transcript. Paragraphs (separated by blank lines) become
 * segments; if there are no blank lines, each non-empty line is a segment.
 * Optional leading "[hh:mm:ss]" or "hh:mm:ss" timestamps and "Name:" speaker
 * prefixes are recognized.
 */
export function parsePlaintext(input: string): Segment[] {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim();
  if (!text) return [];

  const hasParagraphs = /\n{2,}/.test(text);
  const chunks = hasParagraphs
    ? text.split(/\n{2,}/)
    : text.split('\n');

  const segments: Segment[] = [];
  for (const chunk of chunks) {
    let body = chunk.replace(/\s*\n\s*/g, ' ').trim();
    if (!body) continue;

    let startMs: number | undefined;
    const bracketed = body.match(/^\[(\d{1,3}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\]\s*/);
    const bare = body.match(/^(\d{1,3}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s+/);
    if (bracketed) {
      startMs = parseTimestamp(bracketed[1]!);
      if (startMs !== undefined) body = body.slice(bracketed[0].length);
    } else if (bare) {
      startMs = parseTimestamp(bare[1]!);
      if (startMs !== undefined) body = body.slice(bare[0].length);
    }

    const { speaker, text: cleanText } = splitSpeakerPrefix(body);
    if (!cleanText) continue;
    segments.push({
      id: newId(),
      ...(startMs !== undefined ? { startMs } : {}),
      ...(speaker ? { speaker } : {}),
      text: cleanText,
    });
  }
  return segments;
}
