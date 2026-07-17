import type { Project } from '../types';
import { codePath } from './codes';
import { formatTimestamp } from './time';

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * One row per code assignment: which code (full path) applies to which
 * segment of which document.
 */
export function projectToCsv(project: Project): string {
  const rows: string[][] = [
    ['document', 'start', 'end', 'speaker', 'segment_text', 'code_path'],
  ];
  for (const a of project.assignments) {
    const doc = project.documents.find((d) => d.id === a.documentId);
    const segment = doc?.segments.find((s) => s.id === a.segmentId);
    const code = project.codes.find((c) => c.id === a.codeId);
    if (!doc || !segment || !code) continue;
    rows.push([
      doc.title,
      segment.startMs !== undefined ? formatTimestamp(segment.startMs) : '',
      segment.endMs !== undefined ? formatTimestamp(segment.endMs) : '',
      segment.speaker ?? '',
      segment.text,
      codePath(code, project.codes).join(' > '),
    ]);
  }
  return rows.map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n';
}
