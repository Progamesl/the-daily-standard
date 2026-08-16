/**
 * The masthead, read from the database.
 *
 * This lived in src/data/staffData.ts, which meant adding a staffer or fixing a
 * bio was a code change and a deploy — something the newsroom cannot do for
 * itself. It comes from the `authors` table now and is edited from the admin.
 *
 * The file is still here and still the fallback. If the database cannot be
 * reached, or the masthead columns have not been added yet, the staff page
 * shows the committed list rather than an empty page. That also means this can
 * ship before the migration runs, and starts working the moment it does.
 */

import { supabase } from './supabaseClient';
import { ALL_MEMBERS, type StaffMember } from '@/data/staffData';

const CACHE_KEY = 'octagon_masthead_cache';
const CACHE_TIME_KEY = 'octagon_masthead_fetched_at';
const CACHE_TTL = 10 * 60 * 1000;

/** The sections a person can be filed under, in the order the page shows them. */
export const MASTHEAD_SECTIONS = [
  'Editors-in-Chief',
  'Section Editors',
  'Technology Staff',
  'Business Staff',
  'Page Editors',
  'Reporters',
  'Photographers',
  'Multimedia Staff',
  'Graphic Artists',
] as const;

export interface MastheadRow extends StaffMember {
  id: string;
  sortOrder: number;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function rowToMember(row: Record<string, unknown>): MastheadRow {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    role: String(row.role ?? 'Reporter'),
    // ui-avatars placeholders are not photographs; the page draws nicer
    // initials itself, so treat them as no photo at all.
    photo: typeof row.image === 'string' && row.image && !row.image.includes('ui-avatars.com')
      ? row.image
      : null,
    bio: (row.bio as string) || undefined,
    email: (row.email as string) || undefined,
    primarySection: String(row.primary_section || 'Reporters'),
    altSections: asStringArray(row.alt_sections),
    tags: asStringArray(row.tags),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

/** Order by section, then by the order an editor chose, then by name. */
export function sortMasthead<T extends { primarySection: string; sortOrder?: number; name: string }>(
  people: T[],
): T[] {
  const rank = (s: string) => {
    const i = (MASTHEAD_SECTIONS as readonly string[]).indexOf(s);
    return i === -1 ? MASTHEAD_SECTIONS.length : i;
  };
  return [...people].sort(
    (a, b) =>
      rank(a.primarySection) - rank(b.primarySection) ||
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      a.name.localeCompare(b.name),
  );
}

function readCache(): MastheadRow[] | null {
  try {
    const at = Number(localStorage.getItem(CACHE_TIME_KEY) || 0);
    if (!at || Date.now() - at > CACHE_TTL) return null;
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(rows: MastheadRow[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
    localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
  } catch { /* quota — non-fatal */ }
}

/** Drop the cached copy so an edit shows up straight away. */
export function clearMastheadCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIME_KEY);
  } catch { /* non-fatal */ }
}

/** The committed file, used when the database has nothing to say. */
export function mastheadFromFile(): MastheadRow[] {
  return ALL_MEMBERS.map((m, i) => ({ ...m, id: `file-${i}`, sortOrder: i }));
}

/**
 * Everyone on this year's masthead.
 *
 * Falls back to the committed file on any failure, so the staff page is never
 * blank — a stale masthead is a much smaller problem than no masthead.
 */
export async function fetchMasthead(): Promise<{ people: MastheadRow[]; fromServer: boolean }> {
  const cached = readCache();
  if (cached) return { people: sortMasthead(cached), fromServer: true };

  if (!supabase) return { people: sortMasthead(mastheadFromFile()), fromServer: false };

  try {
    const { data, error } = await supabase
      .from('authors')
      .select('id, name, role, bio, image, email, primary_section, alt_sections, tags, sort_order')
      .eq('on_masthead', true);

    // The columns are missing until 06_staff_masthead.sql has been run.
    if (error || !data || data.length === 0) {
      return { people: sortMasthead(mastheadFromFile()), fromServer: false };
    }

    const people = (data as unknown as Record<string, unknown>[]).map(rowToMember);
    writeCache(people);
    return { people: sortMasthead(people), fromServer: true };
  } catch {
    return { people: sortMasthead(mastheadFromFile()), fromServer: false };
  }
}
