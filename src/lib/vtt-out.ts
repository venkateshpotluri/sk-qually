import type { Segment } from '../types';

function vttTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const millis = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(millis, 3)}`;
}

/**
 * Generate a WebVTT captions track from timed segments so the video always
 * has captions, whatever format the transcript came in. Returns undefined
 * when the transcript has no timestamps.
 */
export function segmentsToVtt(segments: Segment[]): string | undefined {
  const timed = segments.filter((s) => s.startMs !== undefined);
  if (timed.length === 0) return undefined;
  const lines = ['WEBVTT', ''];
  for (let i = 0; i < timed.length; i++) {
    const seg = timed[i]!;
    const start = seg.startMs!;
    const next = timed[i + 1]?.startMs;
    const end = seg.endMs ?? (next !== undefined && next > start ? next : start + 5000);
    const text = seg.speaker ? `<v ${seg.speaker}>${seg.text}` : seg.text;
    lines.push(`${vttTime(start)} --> ${vttTime(end)}`, text, '');
  }
  return lines.join('\n');
}
