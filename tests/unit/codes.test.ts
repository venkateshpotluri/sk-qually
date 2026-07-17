import { describe, expect, it } from 'vitest';
import { codePath, codePathLabel, effectiveColorId, rootOf, subtreeIds } from '../../src/lib/codes';
import type { Code } from '../../src/types';

const codes: Code[] = [
  { id: 'a', name: 'Emotion', parentId: null, colorId: 'ocean' },
  { id: 'b', name: 'positive', parentId: 'a' },
  { id: 'c', name: 'excitement', parentId: 'b', colorId: 'rose' },
  { id: 'd', name: 'negative', parentId: 'a' },
  { id: 'e', name: 'Feature', parentId: null, colorId: 'moss' },
];

describe('code tree helpers', () => {
  it('computes full paths at any depth', () => {
    expect(codePath(codes[2]!, codes)).toEqual(['Emotion', 'positive', 'excitement']);
    expect(codePathLabel(codes[2]!, codes)).toBe('Emotion: positive: excitement');
  });

  it('collects subtrees depth-first', () => {
    expect(subtreeIds('a', codes)).toEqual(['a', 'b', 'c', 'd']);
    expect(subtreeIds('e', codes)).toEqual(['e']);
  });

  it('inherits colors from the nearest ancestor with an override winning', () => {
    expect(effectiveColorId(codes[1]!, codes)).toBe('ocean');
    expect(effectiveColorId(codes[2]!, codes)).toBe('rose');
    expect(effectiveColorId(codes[0]!, codes)).toBe('ocean');
  });

  it('finds the top-level ancestor', () => {
    expect(rootOf(codes[2]!, codes).id).toBe('a');
    expect(rootOf(codes[4]!, codes).id).toBe('e');
  });

  it('survives orphaned parents without crashing', () => {
    const orphan: Code = { id: 'x', name: 'orphan', parentId: 'missing' };
    expect(codePath(orphan, [...codes, orphan])).toEqual(['orphan']);
  });
});
