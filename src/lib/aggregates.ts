import type { Project } from '../types';
import { childrenOf, codePath, subtreeIds } from './codes';

/**
 * Aggregate assignment counts for the aggregates table. One row per code, in
 * depth-first tree order. "Direct" counts segments assigned the code itself;
 * "subtree" additionally counts segments assigned any of its descendants
 * (a segment coded with several codes of one subtree is counted once).
 */
export interface AggregateRow {
  codeId: string;
  /** Full path from root, e.g. ["Emotion", "positive"]. */
  path: string[];
  /** 1 for top-level codes, 2 for their children, and so on. */
  level: number;
  docDirect: number;
  docSubtree: number;
  allDirect: number;
  allSubtree: number;
}

export function aggregateRows(project: Project, documentId: string): AggregateRow[] {
  const rows: AggregateRow[] = [];

  const count = (codeIds: string[], docOnly: boolean): number => {
    const wanted = new Set(codeIds);
    const segments = new Set<string>();
    for (const a of project.assignments) {
      if (docOnly && a.documentId !== documentId) continue;
      if (wanted.has(a.codeId)) segments.add(`${a.documentId}:${a.segmentId}`);
    }
    return segments.size;
  };

  const walk = (parentId: string | null, level: number): void => {
    for (const code of childrenOf(parentId, project.codes)) {
      const subtree = subtreeIds(code.id, project.codes);
      rows.push({
        codeId: code.id,
        path: codePath(code, project.codes),
        level,
        docDirect: count([code.id], true),
        docSubtree: count(subtree, true),
        allDirect: count([code.id], false),
        allSubtree: count(subtree, false),
      });
      walk(code.id, level + 1);
    }
  };
  walk(null, 1);
  return rows;
}

export function maxLevel(rows: AggregateRow[]): number {
  return rows.reduce((max, row) => Math.max(max, row.level), 0);
}
