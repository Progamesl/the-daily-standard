/**
 * Stories written by more than one person.
 *
 * The main author is still author_id / author_name on the story. Anyone who
 * wrote it with them is kept as a single entry among the story's internal
 * notes — the same place the trash keeps who deleted a story and why — because
 * the articles table has no column for it, and adding one would mean a database
 * migration before this could help anybody. The entry is a note whose content
 * is JSON tagged kind: 'co_authors'.
 *
 * Only this file knows that. The editor reads and writes co-authors through
 * it, the notes panel uses it to keep the entry out of sight, and the public
 * site receives them as `coAuthors` on each story. /api/sync-r2 and
 * scripts/publishArticlesToR2.mjs carry their own copy of readCoAuthors, since
 * server code cannot import from src.
 */

import type { Article, Author } from '@/data/seedData';
import type { InternalNote } from '@/lib/adminDataService';

export const CO_AUTHORS_KIND = 'co_authors';

/** Who else wrote a story, kept the way the main author is: an id and a name. */
export interface CoAuthorRef {
  id: string;
  name: string;
}

/** The co-authors in a note, or null if it is any other kind of note. */
function parseEntry(note: unknown): CoAuthorRef[] | null {
  const content = (note as { content?: unknown } | null)?.content;
  if (typeof content !== 'string' || !content.includes(CO_AUTHORS_KIND)) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed?.kind !== CO_AUTHORS_KIND || !Array.isArray(parsed.authors)) return null;
    return (parsed.authors as unknown[])
      .map((a) => a as { id?: unknown; name?: unknown })
      .filter((a) => typeof a?.id === 'string' && a.id && typeof a.name === 'string' && a.name.trim())
      .map((a) => ({ id: a.id as string, name: (a.name as string).trim() }));
  } catch {
    return null;
  }
}

/** True for the entry that holds a story's co-authors, which is not a note anyone wrote. */
export function isCoAuthorsNote(note: unknown): boolean {
  return parseEntry(note) !== null;
}

/** A story's co-authors, read from its internal notes. */
export function readCoAuthors(notes: unknown): CoAuthorRef[] {
  if (!Array.isArray(notes)) return [];
  for (const note of notes) {
    const found = parseEntry(note);
    if (found) return found;
  }
  return [];
}

/**
 * The internal notes with the co-author entry set to `coAuthors` — added,
 * replaced, or removed when there are none. Every real note is left alone.
 */
export function withCoAuthors(
  notes: InternalNote[] | undefined,
  coAuthors: CoAuthorRef[],
  by?: { id?: string; name?: string },
): InternalNote[] {
  const list = notes ?? [];
  const current = readCoAuthors(list);
  const unchanged =
    current.length === coAuthors.length &&
    current.every((c, i) => c.id === coAuthors[i].id && c.name === coAuthors[i].name);
  if (unchanged) return list;

  const rest = list.filter((n) => !isCoAuthorsNote(n));
  if (coAuthors.length === 0) return rest;
  return [
    ...rest,
    {
      id: CO_AUTHORS_KIND,
      authorId: by?.id ?? 'unknown',
      authorName: by?.name ?? 'Unknown',
      content: JSON.stringify({
        kind: CO_AUTHORS_KIND,
        authors: coAuthors.map(({ id, name }) => ({ id, name })),
      }),
      type: 'note',
      createdAt: new Date().toISOString(),
    },
  ];
}

// ─── Bylines ──────────────────────────────────────────────────────────────────

/** Everyone who wrote a story, main author first, nobody twice. */
export function storyAuthors(article: Pick<Article, 'author' | 'coAuthors'>): Author[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const out: Author[] = [];
  for (const a of [article.author, ...(article.coAuthors ?? [])]) {
    if (!a?.name) continue;
    const name = a.name.trim().toLowerCase();
    if ((a.id && seenIds.has(a.id)) || seenNames.has(name)) continue;
    if (a.id) seenIds.add(a.id);
    seenNames.add(name);
    out.push(a);
  }
  return out;
}

/** "Ana Ruiz", "Ana Ruiz and Sam Lee", "Ana Ruiz, Sam Lee and Jo Park" — AP style, no serial comma. */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The whole byline as one line of text, for cards and anywhere a name cannot be a link. */
export function bylineText(article: Pick<Article, 'author' | 'coAuthors'>): string {
  return joinNames(storyAuthors(article).map((a) => a.name));
}
