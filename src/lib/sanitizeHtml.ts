/**
 * Make story HTML safe to put on the page.
 *
 * Article bodies are rendered with dangerouslySetInnerHTML, and until now
 * nothing checked what was in them. Anyone who could write a story — every
 * reporter, and anyone who got hold of a reporter's password — could put a
 * <script> tag in the body and have it run in the browser of every person who
 * read that story. From there: their session, their account, or a redirect to
 * somewhere else entirely. Stories also arrive from a WordPress export and from
 * pasted Google Docs, so the markup is not all hand-written anyway.
 *
 * The list below is what a newspaper article legitimately contains. Anything
 * else is dropped rather than escaped, so a story with something odd in it
 * still reads properly, minus the odd thing.
 */

import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  // Text
  'p', 'br', 'hr', 'span', 'div', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'sub', 'sup', 'small', 'mark', 'abbr', 'cite', 'q', 'time',
  // Structure
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  // Media and links
  'a', 'img', 'figure', 'figcaption', 'picture', 'source',
  // Tables — used by sports results and election coverage
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // The paper's own multimedia: match footage, a senior playing the drums, an
  // interview, audio from a music elective. None of it can run code.
  'video', 'audio', 'track',
  // Collapsible sections — the Class of 2022 college list is eleven of them.
  'details', 'summary',
  // Embeds and the crossword. Both are real things the paper publishes and both
  // are heavily constrained below — see the hook. Running the whole archive
  // through this found six Spotify players in an album review and the grid of
  // Octoblock #3, which a blanket ban would have quietly deleted.
  'iframe', 'input',
];

// Deliberately NOT allowed, having checked what is actually in the archive:
//   svg    — all 97 of them are a WordPress plugin's accordion arrows, and SVG
//            can carry script and foreignObject, so it is a real way in
//   canvas — one scroll animation whose JavaScript is stripped anyway, leaving
//            an empty box
//   custom elements (o-anim-typing) — inert without the library that defines them

/**
 * Where an embed may come from.
 *
 * An iframe pointing anywhere at all is a way to put a convincing fake login
 * box, or somebody else's page, inside a story. Pointing at Spotify is a music
 * review. The host is checked, not just the tag.
 */
const EMBED_HOSTS = [
  'open.spotify.com',
  'www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com',
  'player.vimeo.com',
  'w.soundcloud.com',
  'docs.google.com', 'drive.google.com',
  'www.instagram.com', 'instagram.com',
  'platform.twitter.com',
  'embed.podcasts.apple.com',
];

/** Text boxes a puzzle needs. Never a password or file field inside a story. */
const SAFE_INPUT_TYPES = new Set(['text', 'number']);

/** The only attributes whose value is a link and therefore needs URI checking. */
const URI_ATTR = ['href', 'src', 'srcset'];

const ALLOWED_ATTR = [
  'href', 'title', 'target', 'rel',
  'src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding', 'referrerpolicy',
  'class', 'id', 'style', 'colspan', 'rowspan', 'scope', 'datetime', 'lang', 'dir',
  // Embeds
  'allow', 'allowfullscreen', 'frameborder', 'sandbox',
  // Puzzle boxes
  'type', 'maxlength', 'placeholder', 'value', 'size', 'readonly', 'disabled', 'inputmode',
  // Video and audio
  'controls', 'poster', 'preload', 'muted', 'loop', 'playsinline', 'kind', 'srclang', 'label',
  // Accessibility, which is content as much as anything else here
  'role', 'aria-hidden', 'aria-label', 'aria-describedby', 'open',
];

/**
 * The only CSS a story is allowed to carry.
 *
 * `style` has to stay: print-imported stories put alignment and emphasis on
 * individual paragraphs, and dropping it would visibly wreck the archive. But
 * DOMPurify does not inspect CSS values by default — an attack payload of
 * `style="background:url(javascript:alert(1))"` came through untouched when I
 * tested it. So the value is rebuilt from scratch here, property by property,
 * out of things that can only ever affect how text looks.
 */
const ALLOWED_CSS = new Set([
  'text-align', 'text-decoration', 'text-indent', 'text-transform',
  'font-style', 'font-weight', 'font-variant',
  'color', 'background-color',
  'margin-left', 'margin-right', 'padding-left', 'padding-right',
  'float', 'clear', 'width', 'max-width', 'height', 'line-height', 'letter-spacing',
  'vertical-align', 'white-space', 'list-style-type',
]);

/** Anything that can fetch, execute, or escape the element it is written on. */
const CSS_DANGER = /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|binding\s*:|\\/i;

function safeStyle(value: string): string {
  return value
    .split(';')
    .map(decl => {
      const i = decl.indexOf(':');
      if (i === -1) return '';
      const prop = decl.slice(0, i).trim().toLowerCase();
      const val = decl.slice(i + 1).trim();
      if (!ALLOWED_CSS.has(prop) || !val || CSS_DANGER.test(val)) return '';
      return `${prop}: ${val}`;
    })
    .filter(Boolean)
    .join('; ');
}

/**
 * Strip anything that could run code, then hand back the story.
 */
export function sanitizeArticleHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  // No document to parse against (build-time render); returning nothing is the
  // safe direction, and the browser renders it a moment later anyway.
  if (typeof window === 'undefined') return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Belt and braces: these are the tags an attacker reaches for first, and
    // naming them here means a future edit to ALLOWED_TAGS cannot let them back
    // in by accident. `form` stays forbidden even though `input` is allowed —
    // a text box with nowhere to submit is inert, which is what makes the
    // crossword safe.
    FORBID_TAGS: ['script', 'style', 'object', 'embed', 'form',
      'button', 'textarea', 'select', 'link', 'meta', 'base'],
    // Every on* handler, plus the attributes used to smuggle one in.
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onanimationstart',
      'formaction', 'action', 'srcdoc', 'ping'],
    // javascript: and data: URIs in href/src.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
    // Everything that is not a link is declared as such.
    //
    // The rule above is applied to any attribute the library does not already
    // know is value-only, so with it in place `colspan="2"`, `width="100"`,
    // `type="text"` and `maxlength="1"` all failed the URI test and were
    // silently deleted — quietly wrecking every table, sized image and
    // crossword square in the archive. Only href, src and srcset carry links.
    ADD_URI_SAFE_ATTR: ALLOWED_ATTR.filter(a => !URI_ATTR.includes(a)),
    // Keep the text of anything removed, so a story never silently loses words.
    KEEP_CONTENT: true,
  });
}

/**
 * Once, on load: make every link that survives sanitising safe to click.
 *
 * A target="_blank" link without rel="noopener" hands the page it opens a
 * handle back to ours.
 */
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', node => {
    // A target="_blank" link without rel="noopener" hands the page it opens a
    // handle back to ours.
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }

    // Rebuild any style attribute out of properties that can only change how
    // text looks. See safeStyle — CSS values are not checked by default.
    if (node.hasAttribute?.('style')) {
      const kept = safeStyle(node.getAttribute('style') || '');
      if (kept) node.setAttribute('style', kept);
      else node.removeAttribute('style');
    }

    // An embed has to come from somewhere we recognise. Anywhere else and it is
    // a stranger's page wearing our layout — a fake sign-in box, most likely.
    if (node.tagName === 'IFRAME') {
      let host = '';
      try {
        host = new URL(node.getAttribute('src') || '', window.location.origin).hostname;
      } catch { host = ''; }
      if (!EMBED_HOSTS.includes(host)) {
        node.remove();
        return;
      }
      node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-presentation');
      node.setAttribute('referrerpolicy', 'no-referrer');
      node.setAttribute('loading', 'lazy');
    }

    // A text box for a puzzle is fine. A password or file box inside a story is
    // somebody collecting things from readers, so the type is forced.
    if (node.tagName === 'INPUT') {
      const type = (node.getAttribute('type') || 'text').toLowerCase();
      if (!SAFE_INPUT_TYPES.has(type)) node.setAttribute('type', 'text');
      node.removeAttribute('name');
      node.setAttribute('autocomplete', 'off');
    }
  });
}
