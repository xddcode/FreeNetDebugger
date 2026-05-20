import { isGroup, type WorkspaceItem } from '../types';

/** Groups first, then sessions — same rule applied recursively inside groups. */
export function sortWorkspaceItems(items: WorkspaceItem[]): WorkspaceItem[] {
  const groups: WorkspaceItem[] = [];
  const sessions: WorkspaceItem[] = [];

  for (const it of items) {
    if (isGroup(it)) {
      groups.push({
        ...it,
        children: sortWorkspaceItems(it.children),
      });
    } else {
      sessions.push(it);
    }
  }

  return [...groups, ...sessions];
}

/** In-place variant for Immer drafts in the session store. */
export function sortWorkspaceItemsInPlace(items: WorkspaceItem[]): void {
  const groups: WorkspaceItem[] = [];
  const sessions: WorkspaceItem[] = [];

  for (const it of items) {
    if (isGroup(it)) {
      sortWorkspaceItemsInPlace(it.children);
      groups.push(it);
    } else {
      sessions.push(it);
    }
  }

  items.splice(0, items.length, ...groups, ...sessions);
}
