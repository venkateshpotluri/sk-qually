import { describe, expect, it } from 'vitest';
import { projectToCsv } from '../../src/lib/csv';
import { deserializeProject, serializeProject } from '../../src/lib/project-io';
import { segmentsToVtt } from '../../src/lib/vtt-out';
import type { Project } from '../../src/types';

const project: Project = {
  id: 'p1',
  name: 'Study',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  documents: [
    {
      id: 'd1',
      title: 'Interview 1',
      format: 'vtt',
      segments: [
        { id: 's1', startMs: 12000, endMs: 15000, speaker: 'P3', text: 'I want a "new" button, please' },
      ],
    },
  ],
  codes: [
    { id: 'c1', name: 'Feature', parentId: null, colorId: 'moss' },
    { id: 'c2', name: 'new feature request', parentId: 'c1' },
  ],
  assignments: [{ documentId: 'd1', segmentId: 's1', codeId: 'c2', assignedAt: '2026-01-02T00:00:00Z' }],
};

describe('projectToCsv', () => {
  it('produces one quoted row per assignment with the full code path', () => {
    const csv = projectToCsv(project);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe('document,start,end,speaker,segment_text,code_path');
    expect(lines[1]).toBe(
      'Interview 1,00:00:12,00:00:15,P3,"I want a ""new"" button, please",Feature > new feature request',
    );
  });
});

describe('projectToCsv row order', () => {
  it('orders rows by document and segment position, not assignment time', () => {
    const multi: Project = {
      ...project,
      documents: [
        {
          id: 'd1',
          title: 'Interview 1',
          format: 'vtt',
          segments: [
            { id: 's1', startMs: 1000, text: 'first segment' },
            { id: 's2', startMs: 2000, text: 'second segment' },
          ],
        },
      ],
      // Deliberately assigned in reverse order.
      assignments: [
        { documentId: 'd1', segmentId: 's2', codeId: 'c1', assignedAt: '2026-01-01T00:00:00Z' },
        { documentId: 'd1', segmentId: 's1', codeId: 'c1', assignedAt: '2026-01-02T00:00:00Z' },
      ],
    };
    const lines = projectToCsv(multi).trim().split('\r\n');
    expect(lines[1]).toContain('first segment');
    expect(lines[2]).toContain('second segment');
  });
});

describe('project file round-trip', () => {
  it('serializes and deserializes losslessly', () => {
    const restored = deserializeProject(serializeProject(project));
    expect(restored).toEqual(project);
  });
  it('rejects files that are not Qually projects', () => {
    expect(() => deserializeProject('{}')).toThrow(/not a Qually project/);
    expect(() => deserializeProject('nonsense')).toThrow(/not valid JSON/);
  });
});

describe('segmentsToVtt', () => {
  it('generates captions with voice tags from timed segments', () => {
    const vtt = segmentsToVtt(project.documents[0]!.segments)!;
    expect(vtt).toContain('WEBVTT');
    expect(vtt).toContain('00:00:12.000 --> 00:00:15.000');
    expect(vtt).toContain('<v P3>');
  });
  it('returns undefined for untimed transcripts', () => {
    expect(segmentsToVtt([{ id: 's', text: 'no time' }])).toBeUndefined();
  });
});
