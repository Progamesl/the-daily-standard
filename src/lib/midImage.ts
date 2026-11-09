/**
 * A picture inside the story — a chart, a graph, a second photograph — shown
 * between two paragraphs with its own caption. Optional, one per story.
 *
 * It is kept as a 'mid_image' entry among the story's internal notes (see
 * storyNotes.ts) rather than written into the body, so an editor can swap,
 * move or remove it from its own field without touching the story's HTML. It
 * goes into the body only when the story is shown: placeMidImage puts it after
 * the paragraph the editor picked, or halfway through.
 */

import type { InternalNote } from '@/lib/adminDataService';
import { readNoteEntry, withNoteEntry } from '@/lib/storyNotes';

export interface MidImage {
  url: string;
  caption: string;
  /** The paragraph it follows, counting from 1; null for halfway through. */
  after: number | null;
}

/** A mid-article image from whatever shape it arrived in, or undefined if there is none. */
export function normalizeMidImage(value: unknown): MidImage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  const url = typeof v.url === 'string' ? v.url.trim() : '';
  // Only real web addresses: a pasted picture is uploaded before it is saved.
  if (!/^https?:\/\//i.test(url)) return undefined;
  const after = Number(v.after);
  return {
    url,
    caption: typeof v.caption === 'string' ? v.caption.trim() : '',
    after: Number.isInteger(after) && after > 0 ? after : null,
  };
}

/** The story's mid-article image, read from its internal notes. */
export function readMidImage(notes: unknown): MidImage | undefined {
  return normalizeMidImage(readNoteEntry(notes, 'mid_image'));
}

/** The internal notes with the mid-article image set, or removed when it is null. */
export function withMidImage(
  notes: InternalNote[] | undefined,
  image: MidImage | null,
  by?: { id?: string; name?: string },
): InternalNote[] {
  const data = image ? { url: image.url, caption: image.caption, after: image.after } : null;
  return withNoteEntry(notes, 'mid_image', data, by);
}

const BLOCK = new Set([
  'P', 'DIV', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI',
  'BLOCKQUOTE', 'FIGURE', 'TABLE', 'PRE', 'HR', 'IFRAME',
]);
/** Blocks that are never a paragraph and never hold the story's paragraphs. */
const NOT_PARAGRAPHS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'BLOCKQUOTE', 'FIGURE', 'TABLE', 'PRE', 'HR', 'IFRAME']);

interface Paragraph { anchor: Node; text: string }

/**
 * The story's paragraphs, in order, each with the node to place a picture after.
 *
 * Bodies come in three shapes, and all of them have to count. Imports and the
 * WordPress archive use <p>. A story typed straight into the admin editor has
 * its first line as bare text and every line after it in a <div>. And Google
 * Docs pastes wrap everything in an inline element. So a paragraph is any
 * <p> or <div> with words and no blocks inside, or a run of loose text and
 * inline tags between blocks; quotes, lists, headings, tables and figures are
 * never paragraphs.
 */
function paragraphsOf(root: Element): Paragraph[] {
  const found: Paragraph[] = [];
  let run: Node[] = [];
  const endRun = () => {
    const text = run.map((n) => n.textContent ?? '').join('');
    if (text.trim()) found.push({ anchor: run[run.length - 1], text });
    run = [];
  };
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      run.push(node);
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as Element;
    const holdsBlocks = Array.from(el.children).some((c) => BLOCK.has(c.tagName));
    if (!BLOCK.has(el.tagName) && !holdsBlocks) {
      run.push(el);
      continue;
    }
    endRun();
    if (NOT_PARAGRAPHS.has(el.tagName)) continue;
    if (holdsBlocks) found.push(...paragraphsOf(el));
    else if (el.textContent?.trim()) found.push({ anchor: el, text: el.textContent });
  }
  endRun();
  return found;
}

function parse(html: string): Document | null {
  if (typeof DOMParser === 'undefined') return null;
  return new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, 'text/html');
}

/** The text of each paragraph, so the editor can say which one the picture follows. */
export function paragraphTexts(html: string): string[] {
  const doc = parse(html || '');
  if (!doc) return [];
  return paragraphsOf(doc.body).map((p) => p.text.replace(/\s+/g, ' ').trim());
}

/**
 * Which paragraph the picture follows, given how many the story has. Never
 * after the last one — it belongs between two — and halfway when not chosen.
 * A story trimmed after the editor chose keeps it before the final paragraph.
 */
export function midImageSlot(paragraphCount: number, after: number | null): number {
  if (paragraphCount <= 0) return 0;
  if (paragraphCount === 1) return 1;
  const wanted = after ?? Math.ceil(paragraphCount / 2);
  return Math.min(Math.max(1, wanted), paragraphCount - 1);
}

/** The story's HTML with the mid-article image placed in it. */
export function placeMidImage(html: string, image: MidImage | null | undefined): string {
  if (!image?.url || !html) return html;
  const doc = parse(html);
  if (!doc) return html;

  // Built with DOM calls, never by gluing strings, so a caption can hold any
  // characters at all without becoming markup.
  const figure = doc.createElement('figure');
  figure.className = 'mid-image';
  const img = doc.createElement('img');
  img.src = image.url;
  img.alt = image.caption;
  figure.appendChild(img);
  if (image.caption) {
    const caption = doc.createElement('figcaption');
    caption.textContent = image.caption;
    figure.appendChild(caption);
  }

  const paragraphs = paragraphsOf(doc.body);
  const slot = midImageSlot(paragraphs.length, image.after);
  // No body yet (it is still loading): wait for it rather than show a picture on its own.
  if (slot === 0) return html;
  (paragraphs[slot - 1].anchor as ChildNode).after(figure);
  return doc.body.innerHTML;
}
