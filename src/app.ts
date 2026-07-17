import { clearChildren, el, isTypingTarget } from './ui/dom';
import { mountLiveRegion } from './ui/live-region';
import { openShortcutsDialog } from './ui/shortcuts-dialog';
import { applyTheme } from './ui/theme';
import { renderHome } from './ui/screens/home';
import { renderProject } from './ui/screens/project';
import { renderCoding } from './ui/screens/coding';

export type Route =
  | { screen: 'home' }
  | { screen: 'project'; projectId: string }
  | { screen: 'doc'; projectId: string; docId: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'project' && parts[1] && parts[2] === 'doc' && parts[3]) {
    return { screen: 'doc', projectId: parts[1], docId: parts[3] };
  }
  if (parts[0] === 'project' && parts[1]) {
    return { screen: 'project', projectId: parts[1] };
  }
  return { screen: 'home' };
}

export function routeHash(route: Route): string {
  switch (route.screen) {
    case 'home':
      return '#/';
    case 'project':
      return `#/project/${route.projectId}`;
    case 'doc':
      return `#/project/${route.projectId}/doc/${route.docId}`;
  }
}

export function navigate(route: Route): void {
  location.hash = routeHash(route);
}

let main: HTMLElement;
let firstRender = true;

async function render(): Promise<void> {
  const route = parseRoute(location.hash);
  clearChildren(main);
  let heading: HTMLElement | null = null;
  try {
    switch (route.screen) {
      case 'home':
        heading = await renderHome(main);
        break;
      case 'project':
        heading = await renderProject(main, route.projectId);
        break;
      case 'doc':
        heading = await renderCoding(main, route.projectId, route.docId);
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    heading = el('h1', { tabindex: '-1' }, ['Error']);
    main.append(heading, el('p', {}, [message]), el('a', { href: '#/' }, ['Back to projects']));
  }
  // Move focus to the new screen's heading on navigation (not on initial load).
  if (heading && !firstRender) {
    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }
  firstRender = false;
}

export function startApp(root: HTMLElement): void {
  applyTheme();

  const skipLink = el('a', { class: 'skip-link', href: '#main' }, ['Skip to main content']);
  main = el('main', { id: 'main' });
  root.append(skipLink, main);
  mountLiveRegion(root);

  window.addEventListener('hashchange', () => void render());
  window.addEventListener('keydown', (event) => {
    if (event.key === '?' && !isTypingTarget(event.target) && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      openShortcutsDialog();
    }
  });

  void render();
}
