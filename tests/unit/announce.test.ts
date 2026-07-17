import { describe, expect, it } from 'vitest';
import { segmentLabel } from '../../src/lib/announce';
import type { Assignment, Code, Segment } from '../../src/types';

const codes: Code[] = [
  { id: 'emotion', name: 'Emotion', parentId: null, colorId: 'ocean' },
  { id: 'positive', name: 'positive', parentId: 'emotion' },
  { id: 'excitement', name: 'excitement', parentId: 'positive' },
  { id: 'feature', name: 'Feature', parentId: null, colorId: 'moss' },
  { id: 'nfr', name: 'new feature request', parentId: 'feature' },
];

const segment: Segment = {
  id: 'seg1',
  startMs: 12000,
  text: 'I want a new button here, that would really improve the feature',
};

function assignment(codeId: string): Assignment {
  return { documentId: 'doc1', segmentId: 'seg1', codeId, assignedAt: '2026-01-01T00:00:00Z' };
}

describe('segmentLabel', () => {
  it('matches the announcement format from the spec', () => {
    const label = segmentLabel(segment, 'doc1', codes, [assignment('positive'), assignment('nfr')], {
      announceColors: false,
    });
    expect(label).toBe(
      'Emotion: positive, Feature: new feature request, 00:00:12, I want a new button here, that would really improve the feature',
    );
  });

  it('omits codes entirely when none are assigned', () => {
    const label = segmentLabel(segment, 'doc1', codes, [], { announceColors: false });
    expect(label).toBe('00:00:12, I want a new button here, that would really improve the feature');
  });

  it('announces the full path for deeply nested codes', () => {
    const label = segmentLabel(segment, 'doc1', codes, [assignment('excitement')], {
      announceColors: false,
    });
    expect(label).toContain('Emotion: positive: excitement');
  });

  it('appends inherited color names when announceColors is on', () => {
    const label = segmentLabel(segment, 'doc1', codes, [assignment('positive')], {
      announceColors: true,
    });
    expect(label).toContain('Emotion: positive (ocean blue)');
  });

  it('includes the speaker between timestamp and text', () => {
    const label = segmentLabel({ ...segment, speaker: 'P3' }, 'doc1', codes, [], {
      announceColors: false,
    });
    expect(label).toBe('00:00:12, P3, I want a new button here, that would really improve the feature');
  });

  it('ignores assignments for other documents', () => {
    const other: Assignment = { ...assignment('positive'), documentId: 'doc2' };
    const label = segmentLabel(segment, 'doc1', codes, [other], { announceColors: false });
    expect(label).not.toContain('Emotion');
  });
});
