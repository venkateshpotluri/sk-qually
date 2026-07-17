import type { Code } from '../types';

/** Path from root to the given code, e.g. ["Emotion", "positive", "excitement"]. */
export function codePath(code: Code, all: Code[]): string[] {
  const byId = new Map(all.map((c) => [c.id, c]));
  const path: string[] = [];
  let current: Code | undefined = code;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

/** "Emotion: positive: excitement" — the announced form of a code. */
export function codePathLabel(code: Code, all: Code[]): string {
  return codePath(code, all).join(': ');
}

export function childrenOf(parentId: string | null, all: Code[]): Code[] {
  return all.filter((c) => c.parentId === parentId);
}

/** The code and all its descendants, in depth-first order. */
export function subtreeIds(codeId: string, all: Code[]): string[] {
  const result: string[] = [codeId];
  for (const child of all.filter((c) => c.parentId === codeId)) {
    result.push(...subtreeIds(child.id, all));
  }
  return result;
}

/** Effective color: own color if set, otherwise inherited from nearest ancestor. */
export function effectiveColorId(code: Code, all: Code[]): string | undefined {
  const byId = new Map(all.map((c) => [c.id, c]));
  let current: Code | undefined = code;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.colorId) return current.colorId;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return undefined;
}

/** Top-level ancestor of a code (the code itself if top-level). */
export function rootOf(code: Code, all: Code[]): Code {
  const byId = new Map(all.map((c) => [c.id, c]));
  let current = code;
  const seen = new Set<string>();
  while (current.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

export function depthOf(code: Code, all: Code[]): number {
  return codePath(code, all).length;
}
