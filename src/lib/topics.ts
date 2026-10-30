/**
 * Topic pages: Politics, Business, Technology and Journalism.
 *
 * A story belongs to one section — News, Sports and so on — which decides its
 * label and where it sits on the homepage. Topic pages are extra places it can
 * be listed on top of that, as many as fit. The footer linked to most of these
 * for years with nothing behind them; now an editor files stories onto them.
 *
 * Which topics a story is on is kept as a 'topics' entry among its internal
 * notes, because the articles table has no column for it — see storyNotes.ts.
 * The public site receives them as `topics` (slugs) on each story.
 */

import type { Section } from '@/data/seedData';
import type { InternalNote } from '@/lib/adminDataService';
import { readNoteEntry, withNoteEntry } from '@/lib/storyNotes';

export const TOPICS: Section[] = [
  { id: 'politics', name: 'Politics', slug: 'politics', description: 'Elections, government, and policy' },
  { id: 'business', name: 'Business', slug: 'business', description: 'Business, money, and the economy' },
  { id: 'technology', name: 'Technology', slug: 'technology', description: 'Technology, computing, and innovation' },
  { id: 'journalism', name: 'Journalism', slug: 'journalism', description: 'Student journalism and the craft of reporting' },
];

export function getTopicBySlug(slug: string): Section | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

/** The topic pages a story is on, read from its internal notes. Unknown slugs are dropped. */
export function readTopics(notes: unknown): string[] {
  const topics = readNoteEntry(notes, 'topics')?.topics;
  if (!Array.isArray(topics)) return [];
  return [...new Set(topics.filter((t): t is string => typeof t === 'string' && !!getTopicBySlug(t)))];
}

/** The internal notes with the topics entry set to `topics`, or removed when there are none. */
export function withTopics(
  notes: InternalNote[] | undefined,
  topics: string[],
  by?: { id?: string; name?: string },
): InternalNote[] {
  return withNoteEntry(notes, 'topics', topics.length ? { topics } : null, by);
}
