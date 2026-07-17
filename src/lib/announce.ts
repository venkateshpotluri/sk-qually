import type { Assignment, Code, Segment, Settings } from '../types';
import { codePathLabel, effectiveColorId } from './codes';
import { paletteColor } from './palette';
import { formatTimestamp } from './time';

/**
 * Compose the accessible name for a transcript segment, per the spec:
 *
 *   "Emotion: positive, Feature: new feature request, 00:00:12,
 *    I want a new button here, that would really improve the feature"
 *
 * Codes come first (full path, in assignment order), then the timestamp,
 * then the speaker (if any), then the text. Codes are omitted entirely when
 * none are assigned. When announceColors is on, each code is followed by its
 * color name in parentheses.
 */
export function segmentLabel(
  segment: Segment,
  documentId: string,
  codes: Code[],
  assignments: Assignment[],
  settings: Pick<Settings, 'announceColors'>,
): string {
  const parts: string[] = [];

  const assigned = assignments.filter(
    (a) => a.documentId === documentId && a.segmentId === segment.id,
  );
  for (const a of assigned) {
    const code = codes.find((c) => c.id === a.codeId);
    if (!code) continue;
    let label = codePathLabel(code, codes);
    if (settings.announceColors) {
      const color = paletteColor(effectiveColorId(code, codes));
      if (color) label += ` (${color.name})`;
    }
    parts.push(label);
  }

  if (segment.startMs !== undefined) parts.push(formatTimestamp(segment.startMs));
  if (segment.speaker) parts.push(segment.speaker);
  parts.push(segment.text);

  return parts.join(', ');
}
