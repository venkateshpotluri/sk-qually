/** Core data model for Qually. Everything serializes to plain JSON. */

export interface Segment {
  id: string;
  /** Start time in milliseconds; absent for untimed plaintext transcripts. */
  startMs?: number;
  /** End time in milliseconds. */
  endMs?: number;
  speaker?: string;
  text: string;
}

export type TranscriptFormat = 'vtt' | 'srt' | 'plaintext';

export interface TranscriptDoc {
  id: string;
  title: string;
  format: TranscriptFormat;
  /** Original file name of the attached video, used to prompt re-attachment. */
  videoFileName?: string;
  segments: Segment[];
}

export interface Code {
  id: string;
  name: string;
  /** null for top-level codes; codes nest to arbitrary depth. */
  parentId: string | null;
  /** Palette color id. Top-level codes always have one; descendants inherit unless overridden. */
  colorId?: string;
}

export interface Assignment {
  documentId: string;
  segmentId: string;
  codeId: string;
  assignedAt: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  documents: TranscriptDoc[];
  codes: Code[];
  assignments: Assignment[];
}

/** Versioned envelope for exported project files. */
export interface ProjectFile {
  qually: true;
  version: 1;
  project: Project;
}

export interface Settings {
  /** Append palette color names to screen-reader announcements. */
  announceColors: boolean;
  /** Allow single-letter shortcuts (WCAG 2.1.4 requires they can be disabled). */
  singleKeyShortcuts: boolean;
  theme: 'system' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: Settings = {
  announceColors: false,
  singleKeyShortcuts: true,
  theme: 'system',
};
