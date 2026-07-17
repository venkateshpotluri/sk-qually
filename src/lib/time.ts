/** Time parsing and formatting. All times are milliseconds. */

/**
 * Parse a VTT/SRT style timestamp: "hh:mm:ss.mmm", "mm:ss.mmm",
 * with either "." (VTT) or "," (SRT) before the milliseconds.
 * Returns undefined for anything unparsable.
 */
export function parseTimestamp(raw: string): number | undefined {
  const m = raw.trim().match(/^(?:(\d{1,3}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/);
  if (!m) return undefined;
  const [, h, min, s, ms] = m;
  const hours = h ? parseInt(h, 10) : 0;
  const minutes = parseInt(min!, 10);
  const seconds = parseInt(s!, 10);
  if (minutes > 59 || seconds > 59) return undefined;
  const millis = ms ? parseInt(ms.padEnd(3, '0'), 10) : 0;
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

/** Format milliseconds as "hh:mm:ss" (matches the announcement format in the spec). */
export function formatTimestamp(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
