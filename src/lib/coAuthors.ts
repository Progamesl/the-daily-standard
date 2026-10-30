/**
 * Stories written by more than one person.
 *
 * The main author is still author_id / author_name on the story. Anyone who
 * wrote it with them is kept as a 'co_authors' entry among the story's internal
 * notes, because the articles table has no column for it — see storyNotes.ts.
 * The editor reads and writes co-authors through here, and the public site
 * receives them as `coAuthors` on each story.
 */

import type { Article, Author } from '@/data/seedData';
import type { InternalNote } from '@/lib/adminDataService';
import { readNoteEntry, isStoryDataNote, withNoteEntry } from '@/lib/storyNotes';

/** Who else wrote a story, kept the way the main author is: an id and a name. */
export interface CoAuthorRef {
  id: string;
  name: string;
}

/** True for the entry that holds a story's co-authors, which is not a note anyone wrote. */
export function isCoAuthorsNote(note: unknown): boolean {
  return isStoryDataNote(note, 'co_authors');
}

/** A story's co-authors, read from its internal notes. */
export function readCoAuthors(notes: unknown): CoAuthorRef[] {
  const authors = readNoteEntry(notes, 'co_authors')?.authors;
  if (!Array.isArray(authors)) return [];
  return (authors as unknown[])
    .map((a) => a as { id?: unknown; name?: unknown })
    .filter((a) => typeof a?.id === 'string' && a.id && typeof a.name === 'string' && a.name.trim())
    .map((a) => ({ id: a.id as string, name: (a.name as string).trim() }));
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
  const data = coAuthors.length ? { authors: coAuthors.map(({ id, name }) => ({ id, name })) } : null;
  return withNoteEntry(notes, 'co_authors', data, by);
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
