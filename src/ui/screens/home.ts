import { navigate } from '../../app';
import { store } from '../../state/store';
import { deserializeProject } from '../../lib/project-io';
import { confirmDialog } from '../dialogs';
import { el } from '../dom';
import { announce } from '../live-region';

/** Project home: create, open, import, delete projects; clear all data. */
export async function renderHome(main: HTMLElement): Promise<HTMLElement> {
  document.title = 'Qually — projects';
  store.closeProject();
  const projects = await store.listProjects();

  const heading = el('h1', { tabindex: '-1', class: 'wordmark' }, ['Qually']);
  const header = el('header', { class: 'page-header home-header' }, [
    heading,
    el('p', { class: 'tagline' }, ['Qualitative coding, accessible to everyone.']),
  ]);

  const privacyNote = el('p', { class: 'privacy-note' }, [
    'All study data stays in this browser. Nothing is ever uploaded. ',
    'Autosaved work lives in this browser only — export a project file to move it or back it up.',
  ]);

  // --- new project ---
  const nameId = 'new-project-name';
  const nameInput = el('input', {
    id: nameId,
    type: 'text',
    required: true,
    autocomplete: 'off',
    placeholder: 'e.g. Interview study spring 2026',
  });
  const newForm = el('form', { class: 'inline-form' }, [
    el('div', { class: 'field' }, [el('label', { for: nameId }, ['Project name']), nameInput]),
    el('button', { type: 'submit', class: 'btn btn-primary' }, ['Create project']),
  ]);
  newForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    const project = await store.createProject(name);
    navigate({ screen: 'project', projectId: project.id });
  });

  // --- import ---
  const importInput = el('input', {
    type: 'file',
    accept: '.json,application/json',
    hidden: true,
    'aria-hidden': 'true',
    tabindex: '-1',
  });
  const importBtn = el('button', { type: 'button', class: 'btn' }, ['Import project file…']);
  importBtn.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const project = deserializeProject(await file.text());
      const saved = await store.importProject(project);
      announce(`Imported project ${saved.name}.`);
      navigate({ screen: 'project', projectId: saved.id });
    } catch (err) {
      announce(err instanceof Error ? err.message : 'Could not import this file.');
    } finally {
      importInput.value = '';
    }
  });

  // --- project list ---
  const listSection = el('section', { 'aria-labelledby': 'projects-h' });
  const listHeading = el('h2', { id: 'projects-h' }, ['Your projects']);
  listSection.append(listHeading);

  if (projects.length === 0) {
    listSection.append(
      el('p', { class: 'muted' }, ['No projects yet. Create one above to get started.']),
    );
  } else {
    const ul = el('ul', { class: 'card-list' });
    for (const project of projects) {
      const open = el('a', { href: `#/project/${project.id}`, class: 'card-title' }, [project.name]);
      const meta = el('p', { class: 'muted' }, [
        `${project.documents.length} document${project.documents.length === 1 ? '' : 's'}, ` +
          `${project.codes.length} code${project.codes.length === 1 ? '' : 's'} — ` +
          `updated ${new Date(project.updatedAt).toLocaleString()}`,
      ]);
      const deleteBtn = el('button', { type: 'button', class: 'btn btn-small btn-danger-quiet' }, [
        'Delete',
        el('span', { class: 'sr-only' }, [` project ${project.name}`]),
      ]);
      deleteBtn.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Delete project',
          message: `Delete “${project.name}” and all its documents, codes and assignments from this browser? This cannot be undone. Export the project first if you need a copy.`,
          confirmLabel: 'Delete project',
          danger: true,
        });
        if (ok) {
          await store.deleteProject(project.id);
          announce(`Deleted project ${project.name}.`);
          navigate({ screen: 'home' });
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      });
      ul.append(el('li', { class: 'card' }, [el('div', {}, [open, meta]), deleteBtn]));
    }
    listSection.append(ul);
  }

  // --- danger zone ---
  const clearBtn = el('button', { type: 'button', class: 'btn btn-danger-quiet' }, [
    'Clear all local data…',
  ]);
  clearBtn.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Clear all local data',
      message:
        'Remove every project stored in this browser? Use this on shared computers when you are done. This cannot be undone.',
      confirmLabel: 'Clear everything',
      danger: true,
    });
    if (ok) {
      await store.clearAllData();
      announce('All local data cleared.');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });

  main.append(
    header,
    privacyNote,
    el('section', { 'aria-labelledby': 'new-h' }, [
      el('h2', { id: 'new-h' }, ['New project']),
      newForm,
      el('div', { class: 'import-row' }, [importBtn, importInput]),
    ]),
    listSection,
    el('section', { class: 'danger-zone', 'aria-labelledby': 'danger-h' }, [
      el('h2', { id: 'danger-h' }, ['Privacy']),
      clearBtn,
    ]),
  );
  return heading;
}
