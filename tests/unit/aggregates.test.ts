import { describe, expect, it } from 'vitest';
import { aggregateRows, maxLevel } from '../../src/lib/aggregates';
import type { Assignment, Project } from '../../src/types';

function assignment(documentId: string, segmentId: string, codeId: string): Assignment {
  return { documentId, segmentId, codeId, assignedAt: '2026-01-01T00:00:00Z' };
}

const project: Project = {
  id: 'p1',
  name: 'Study',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  documents: [
    { id: 'd1', title: 'One', format: 'vtt', segments: [] },
    { id: 'd2', title: 'Two', format: 'vtt', segments: [] },
  ],
  codes: [
    { id: 'emotion', name: 'Emotion', parentId: null, colorId: 'brick' },
    { id: 'positive', name: 'positive', parentId: 'emotion' },
    { id: 'joy', name: 'joy', parentId: 'positive' },
    { id: 'feature', name: 'Feature', parentId: null, colorId: 'ocean' },
  ],
  assignments: [
    assignment('d1', 's1', 'positive'),
    assignment('d1', 's2', 'positive'),
    assignment('d1', 's2', 'joy'),
    assignment('d1', 's3', 'emotion'),
    assignment('d2', 's9', 'joy'),
    assignment('d2', 's9', 'feature'),
  ],
};

describe('aggregateRows', () => {
  const rows = aggregateRows(project, 'd1');
  const byId = (id: string) => rows.find((r) => r.codeId === id)!;

  it('returns rows in depth-first tree order with paths and levels', () => {
    expect(rows.map((r) => r.codeId)).toEqual(['emotion', 'positive', 'joy', 'feature']);
    expect(byId('joy').path).toEqual(['Emotion', 'positive', 'joy']);
    expect(byId('joy').level).toBe(3);
    expect(maxLevel(rows)).toBe(3);
  });

  it('counts direct assignments per document and project-wide', () => {
    expect(byId('positive').docDirect).toBe(2);
    expect(byId('positive').allDirect).toBe(2);
    expect(byId('joy').docDirect).toBe(1);
    expect(byId('joy').allDirect).toBe(2);
    expect(byId('feature').docDirect).toBe(0);
    expect(byId('feature').allDirect).toBe(1);
  });

  it('counts subtree segments without double-counting overlaps', () => {
    // d1: s1 (positive), s2 (positive AND joy — one segment), s3 (emotion) = 3.
    expect(byId('emotion').docSubtree).toBe(3);
    // Project-wide adds d2's s9 (joy) = 4.
    expect(byId('emotion').allSubtree).toBe(4);
    expect(byId('positive').docSubtree).toBe(2);
    // A leaf's subtree count equals its direct count.
    expect(byId('joy').docSubtree).toBe(byId('joy').docDirect);
  });
});
