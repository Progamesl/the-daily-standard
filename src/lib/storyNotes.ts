/**
 * Facts about a story that the articles table has no column for.
 *
 * Each is kept as a single entry among the story's internal notes — a note
 * whose content is JSON tagged with a `kind` — because adding a column means a
 * database migration before the feature can help anybody. The trash has always
 * recorded who deleted a story this way; co-authors (coAuthors.ts) and topic
 * pages (topics.ts) use it too.
 *
 * These entries are data, not notes anybody wrote, so the notes panel hides
 * them. /api/sync-r2 and scripts/publishArticlesToR2.mjs carry their own copy of
 * readNoteEntry, since server code cannot import from src.
 */

import type { InternalNote } from '@/lib/adminDataService';

/** The kinds of entry that hold story data and stay out of the notes panel. */
export const STORY_DATA_KINDS = ['co_authors', 'topics'] as const;
export type StoryDataKind = (typeof STORY_DATA_KINDS)[number];

function parse(note: unknown): Record<string, unknown> | null {
  const content = (note as { content?: unknown } | null)?.content;
  if (typeof content !== 'string' || !content.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' && typeof parsed.kind === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

/** The `kind` entry in a story's notes, or null if it has none. */
export function readNoteEntry(notes: unknown, kind: StoryDataKind): Record<string, unknown> | null {
  if (!Array.isArray(notes)) return null;
  for (const note of notes) {
    const parsed = parse(note);
    if (parsed?.kind === kind) return parsed;
  }
  return null;
}

/** True for an entry holding story data — of `kind`, or of any kind if none is given. */
export function isStoryDataNote(note: unknown, kind?: StoryDataKind): boolean {
  const found = parse(note)?.kind;
  return kind ? found === kind : (STORY_DATA_KINDS as readonly unknown[]).includes(found);
}

/**
 * The notes with the `kind` entry set to `data` — added, replaced, or removed
 * when `data` is null. Every other note is left alone, and the list comes back
 * untouched if the entry already says this.
 */
export function withNoteEntry(
  notes: InternalNote[] | undefined,
  kind: StoryDataKind,
  data: Record<string, unknown> | null,
  by?: { id?: string; name?: string },
): InternalNote[] {
  const list = notes ?? [];
  const next = data ? { kind, ...data } : null;
  if (JSON.stringify(readNoteEntry(list, kind)) === JSON.stringify(next)) return list;

  const rest = list.filter((n) => !isStoryDataNote(n, kind));
  if (!next) return rest;
  return [
    ...rest,
    {
      id: kind,
      authorId: by?.id ?? 'unknown',
      authorName: by?.name ?? 'Unknown',
      content: JSON.stringify(next),
      type: 'note',
      createdAt: new Date().toISOString(),
    },
  ];
}
