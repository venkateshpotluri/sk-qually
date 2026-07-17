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
  // Rows in reading order — document, then segment position — so the CSV is
  // pleasant to analyze without re-sorting.
  for (const doc of project.documents) {
    for (const segment of doc.segments) {
      const assigned = project.assignments.filter(
        (a) => a.documentId === doc.id && a.segmentId === segment.id,
      );
      for (const a of assigned) {
        const code = project.codes.find((c) => c.id === a.codeId);
        if (!code) continue;
        rows.push([
          doc.title,
          segment.startMs !== undefined ? formatTimestamp(segment.startMs) : '',
          segment.endMs !== undefined ? formatTimestamp(segment.endMs) : '',
          segment.speaker ?? '',
          segment.text,
          codePath(code, project.codes).join(' > '),
        ]);
      }
    }
  }
  return rows.map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n';
}
