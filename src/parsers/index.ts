import type { Segment, TranscriptFormat } from '../types';
import { parseVtt } from './vtt';
import { parseSrt } from './srt';
import { parsePlaintext } from './plaintext';

export { parseVtt, parseSrt, parsePlaintext };

/** Detect the transcript format from file name and content. */
export function detectFormat(fileName: string, content: string): TranscriptFormat {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'vtt') return 'vtt';
  if (ext === 'srt') return 'srt';
  const head = content.replace(/^﻿/, '').trimStart();
  if (head.startsWith('WEBVTT')) return 'vtt';
  if (/^\d+\s*\n\s*\d{1,3}:\d{2}:\d{2},\d{3}\s*-->/m.test(content)) return 'srt';
  return 'plaintext';
}

export function parseTranscript(fileName: string, content: string): { format: TranscriptFormat; segments: Segment[] } {
  const format = detectFormat(fileName, content);
  const segments =
    format === 'vtt' ? parseVtt(content) : format === 'srt' ? parseSrt(content) : parsePlaintext(content);
  if (segments.length === 0) {
    throw new Error('No transcript segments could be parsed from this file.');
  }
  return { format, segments };
}
