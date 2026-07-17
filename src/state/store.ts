import type { Assignment, Code, Project, Segment, Settings, TranscriptDoc, TranscriptFormat } from '../types';
import { newId } from '../lib/id';
import { nextColorId } from '../lib/palette';
import { subtreeIds } from '../lib/codes';
import * as db from '../storage/db';
import { loadSettings, saveSettings } from '../storage/settings';

/**
 * Application store. Holds the currently open project, autosaves mutations
 * to IndexedDB (debounced), and keeps per-session video files in memory —
 * video bytes are never persisted.
 */

const SAVE_DELAY_MS = 400;

class Store {
  settings: Settings = loadSettings();
  project: Project | null = null;

  /** Session-only cache of attached video files, keyed by document id. */
  private videoFiles = new Map<string, File>();
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  // ----- settings -----

  updateSettings(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    saveSettings(this.settings);
  }

  // ----- projects -----

  listProjects(): Promise<Project[]> {
    return db.loadAllProjects();
  }

  async createProject(name: string): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      id: newId(),
      name,
      createdAt: now,
      updatedAt: now,
      documents: [],
      codes: [],
      assignments: [],
    };
    await db.saveProject(project);
    return project;
  }

  async openProject(id: string): Promise<Project | undefined> {
    // The in-memory project is the source of truth — the IndexedDB copy can
    // lag behind it by one debounce interval.
    if (this.project?.id === id) return this.project;
    this.flushSave();
    this.videoFiles.clear();
    const project = await db.loadProject(id);
    this.project = project ?? null;
    return project;
  }

  closeProject(): void {
    this.flushSave();
    this.project = null;
    this.videoFiles.clear();
  }

  async importProject(project: Project): Promise<Project> {
    const existing = await db.loadProject(project.id);
    const copy: Project = existing
      ? { ...project, id: newId(), name: `${project.name} (imported)` }
      : project;
    copy.updatedAt = new Date().toISOString();
    await db.saveProject(copy);
    return copy;
  }

  async deleteProject(id: string): Promise<void> {
    if (this.project?.id === id) this.closeProject();
    await db.deleteProject(id);
  }

  async renameProject(id: string, name: string): Promise<void> {
    const project = this.project?.id === id ? this.project : await db.loadProject(id);
    if (!project) return;
    project.name = name;
    project.updatedAt = new Date().toISOString();
    await db.saveProject(project);
  }

  async clearAllData(): Promise<void> {
    this.project = null;
    this.videoFiles.clear();
    await db.clearAllData();
  }

  // ----- documents -----

  addDocument(title: string, format: TranscriptFormat, segments: Segment[], videoFileName?: string): TranscriptDoc {
    const project = this.mustProject();
    const doc: TranscriptDoc = {
      id: newId(),
      title,
      format,
      segments,
      ...(videoFileName ? { videoFileName } : {}),
    };
    project.documents.push(doc);
    this.touch();
    return doc;
  }

  renameDocument(docId: string, title: string): void {
    const doc = this.mustProject().documents.find((d) => d.id === docId);
    if (!doc) return;
    doc.title = title;
    this.touch();
  }

  removeDocument(docId: string): void {
    const project = this.mustProject();
    project.documents = project.documents.filter((d) => d.id !== docId);
    project.assignments = project.assignments.filter((a) => a.documentId !== docId);
    this.videoFiles.delete(docId);
    this.touch();
  }

  attachVideo(docId: string, file: File): void {
    const doc = this.mustProject().documents.find((d) => d.id === docId);
    if (!doc) return;
    this.videoFiles.set(docId, file);
    if (doc.videoFileName !== file.name) {
      doc.videoFileName = file.name;
      this.touch();
    }
  }

  videoFor(docId: string): File | undefined {
    return this.videoFiles.get(docId);
  }

  // ----- codes -----

  createCode(name: string, parentId: string | null, colorId?: string): Code {
    const project = this.mustProject();
    const code: Code = {
      id: newId(),
      name,
      parentId,
      ...(parentId === null
        ? { colorId: colorId ?? nextColorId(project.codes.map((c) => c.colorId)) }
        : colorId
          ? { colorId }
          : {}),
    };
    project.codes.push(code);
    this.touch();
    return code;
  }

  updateCode(
    codeId: string,
    patch: { name?: string; colorId?: string | undefined; parentId?: string | null },
  ): void {
    const project = this.mustProject();
    const code = project.codes.find((c) => c.id === codeId);
    if (!code) return;
    if (patch.name !== undefined) code.name = patch.name;
    if (patch.parentId !== undefined && patch.parentId !== code.id) {
      // The dialog excludes the code's own subtree, but guard against cycles anyway.
      if (patch.parentId === null || !subtreeIds(codeId, project.codes).includes(patch.parentId)) {
        code.parentId = patch.parentId;
      }
    }
    if ('colorId' in patch) {
      if (patch.colorId) code.colorId = patch.colorId;
      else if (code.parentId !== null) delete code.colorId;
    }
    // Top-level codes always carry a color so descendants have one to inherit.
    if (code.parentId === null && !code.colorId) {
      code.colorId = nextColorId(project.codes.map((c) => c.colorId));
    }
    this.touch();
  }

  /** Delete a code and its whole subtree, plus all their assignments. */
  deleteCode(codeId: string): void {
    const project = this.mustProject();
    const doomed = new Set(subtreeIds(codeId, project.codes));
    project.codes = project.codes.filter((c) => !doomed.has(c.id));
    project.assignments = project.assignments.filter((a) => !doomed.has(a.codeId));
    this.touch();
  }

  // ----- assignments -----

  isAssigned(documentId: string, segmentId: string, codeId: string): boolean {
    return this.mustProject().assignments.some(
      (a) => a.documentId === documentId && a.segmentId === segmentId && a.codeId === codeId,
    );
  }

  assign(documentId: string, segmentId: string, codeId: string): void {
    if (this.isAssigned(documentId, segmentId, codeId)) return;
    const assignment: Assignment = {
      documentId,
      segmentId,
      codeId,
      assignedAt: new Date().toISOString(),
    };
    this.mustProject().assignments.push(assignment);
    this.touch();
  }

  unassign(documentId: string, segmentId: string, codeId: string): void {
    const project = this.mustProject();
    project.assignments = project.assignments.filter(
      (a) => !(a.documentId === documentId && a.segmentId === segmentId && a.codeId === codeId),
    );
    this.touch();
  }

  assignmentsFor(documentId: string, segmentId: string): Assignment[] {
    return this.mustProject().assignments.filter(
      (a) => a.documentId === documentId && a.segmentId === segmentId,
    );
  }

  // ----- persistence -----

  private mustProject(): Project {
    if (!this.project) throw new Error('No project is open.');
    return this.project;
  }

  private touch(): void {
    const project = this.mustProject();
    project.updatedAt = new Date().toISOString();
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flushSave(), SAVE_DELAY_MS);
  }

  flushSave(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    if (this.project) void db.saveProject(this.project);
  }
}

export const store = new Store();

// Make sure pending edits hit IndexedDB even if the tab closes quickly.
window.addEventListener('pagehide', () => store.flushSave());
