import type { Project, ProjectFile } from '../types';

export function serializeProject(project: Project): string {
  const file: ProjectFile = { qually: true, version: 1, project };
  return JSON.stringify(file, null, 2);
}

/** Parse and minimally validate an exported project file. Throws on bad input. */
export function deserializeProject(json: string): Project {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (typeof data !== 'object' || data === null || !('qually' in data)) {
    throw new Error('This file is not a Qually project file.');
  }
  const file = data as Partial<ProjectFile>;
  if (file.version !== 1 || !file.project) {
    throw new Error('Unsupported Qually project file version.');
  }
  const p = file.project;
  if (
    typeof p.id !== 'string' ||
    typeof p.name !== 'string' ||
    !Array.isArray(p.documents) ||
    !Array.isArray(p.codes) ||
    !Array.isArray(p.assignments)
  ) {
    throw new Error('This project file is malformed.');
  }
  return p;
}
