/**
 * Prepare selected checklist stories for bulk import.
 *
 * Usage:
 *   npm run upload:prepare
 *   npm run upload:prepare -- --source-dir ./story-sources
 *   npm run upload:prepare -- --fetch-google-docs
 *
 * Reads scripts/story-upload-manifest.json, resolves any local source exports,
 * optionally tries Google Docs HTML export, and writes a prepared import file.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, extname, join, resolve } from 'path';

const DEFAULT_MANIFEST = 'scripts/story-upload-manifest.json';
const DEFAULT_OUT = 'scripts/story-upload-prepared.json';
const DEFAULT_AUTHOR = {
  id: 'author-the-octagon-staff',
  name: 'The Octagon Staff',
  role: 'Student Journalist',
  bio: '',
  image: '',
};

function parseArgs(argv) {
  const args = {
    manifest: DEFAULT_MANIFEST,
    out: DEFAULT_OUT,
    sourceDir: undefined,
    fetchGoogleDocs: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') args.out = argv[++i];
    else if (arg === '--source-dir') args.sourceDir = argv[++i];
    else if (arg === '--fetch-google-docs') args.fetchGoogleDocs = true;
    else if (!arg.startsWith('--')) args.manifest = arg;
  }

  return args;
}

function generateSlug(headline) {
  return String(headline)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function uniqueSlug(base, used) {
  const fallback = base || 'untitled-story';
  let slug = fallback;
  let suffix = 2;
  while (used.has(slug)) {
    slug = `${fallback}-${suffix}`;
    suffix += 1;
  }
  used.add(slug);
  return slug;
}

function htmlToText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|h[1-6]|li|div|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanHtml(html) {
  let cleaned = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+(class|style|id|aria-[a-z-]+)="[^"]*"/gi, '')
    .replace(/\s+(class|style|id|aria-[a-z-]+)='[^']*'/gi, '')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '');

  const body = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (body) cleaned = body[1];

  return cleaned
    .replace(/<(?!\/?(p|h1|h2|h3|h4|h5|h6|ul|ol|li|blockquote|strong|em|b|i|a|img|br)\b)[^>]+>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function textToHtml(text) {
  const blocks = String(text)
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean);

  return blocks.map(block => `<p>${escapeHtml(block).replace(/\n/g, ' ')}</p>`).join('\n');
}

function extractByline(lines) {
  for (const line of lines) {
    const match = line.match(/^by\s+(.+)$/i);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function authorFromByline(byline) {
  if (!byline) return DEFAULT_AUTHOR;
  const name = byline.replace(/^by\s+/i, '').trim();
  const id = `author-${generateSlug(name) || 'unknown'}`;
  return {
    ...DEFAULT_AUTHOR,
    id,
    name,
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200`,
  };
}

function calculateReadingTime(html) {
  const text = htmlToText(html);
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function countWords(html) {
  return htmlToText(html).split(/\s+/).filter(Boolean).length;
}

function localCandidates(row) {
  const names = [
    row.id,
    row.googleDocId,
    row.slugHint,
    generateSlug(row.storyTitleReference),
    generateSlug(row.pageLabel),
    basename(row.sourceUrl || '').replace(/\?.*$/, ''),
  ].filter(Boolean);

  const unique = [...new Set(names)];
  const extensions = ['.html', '.htm', '.txt', '.md', '.json'];
  return unique.flatMap(name => extensions.map(ext => `${name}${ext}`));
}

function readLocalSource(row, sourceDir) {
  if (!sourceDir) return null;
  const root = resolve(sourceDir);
  for (const candidate of localCandidates(row)) {
    const file = join(root, candidate);
    if (existsSync(file)) {
      const ext = extname(file).toLowerCase();
      const raw = readFileSync(file, 'utf8');
      return { kind: 'local-file', path: file, ext, raw };
    }
  }
  return null;
}

async function fetchGoogleDoc(row) {
  if (!row.googleDocId) return null;
  const url = `https://docs.google.com/document/d/${row.googleDocId}/export?format=html`;
  const response = await fetch(url, { redirect: 'follow' });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Google export returned HTTP ${response.status}`);
  }
  if (/Google Docs:\s*Sign-in|Sign in\s+to continue|Type the text you hear or see/i.test(text)) {
    throw new Error('Google Docs export requires sign-in or CAPTCHA');
  }
  return { kind: 'google-doc-export', url, ext: '.html', raw: text };
}

function sourceToArticle(row, source, slug) {
  let headline = row.storyTitleReference;
  let body = '';
  let byline = '';
  let image = '';
  let images = [];
  let imageCaption = '';

  if (source.ext === '.json') {
    const parsed = JSON.parse(source.raw);
    headline = parsed.headline || parsed.title || headline;
    body = parsed.body || parsed.html || textToHtml(parsed.text || '');
    byline = parsed.byline || parsed.author?.name || '';
    image = parsed.image || '';
    images = Array.isArray(parsed.images) ? parsed.images : [];
    imageCaption = parsed.imageCaption || parsed.image_caption || '';
  } else if (source.ext === '.html' || source.ext === '.htm') {
    const text = htmlToText(source.raw);
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    byline = extractByline(lines);
    const heading = source.raw.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
    if (heading?.[1]) headline = htmlToText(heading[1]) || headline;
    body = cleanHtml(source.raw);
    const imageMatches = [...source.raw.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
    images = imageMatches.map(match => match[1]).filter(src => /^https?:\/\//i.test(src));
    image = images[0] || '';
  } else {
    const lines = source.raw.split('\n').map(line => line.trim()).filter(Boolean);
    byline = extractByline(lines);
    body = textToHtml(lines.filter(line => !/^by\s+/i.test(line)).join('\n\n'));
  }

  const author = authorFromByline(byline);
  const now = new Date().toISOString();

  return {
    id: `upload_${slug}`,
    slug,
    headline,
    dek: '',
    body,
    image,
    images,
    imageCaption,
    section: row.targetSection,
    author,
    publishedAt: now,
    updatedAt: now,
    readingTime: calculateReadingTime(body),
    tags: [row.targetSection],
    status: row.intendedStatus,
    priority: 'normal',
    featured: false,
    isCinematic: false,
    internalNotes: [
      {
        id: `note_${Date.now()}`,
        authorId: 'system',
        authorName: 'Upload tooling',
        type: 'note',
        createdAt: now,
        content: `Prepared from ${row.id} (${source.kind}). Verify copy, images, and byline before publication.`,
      },
    ],
    revisions: [],
    wordCount: countWords(body),
  };
}

async function resolveRow(row, options, usedSlugs) {
  const slug = uniqueSlug(generateSlug(row.storyTitleReference || row.pageLabel), usedSlugs);
  const localSource = readLocalSource(row, options.sourceDir);

  try {
    const source = localSource || (options.fetchGoogleDocs ? await fetchGoogleDoc(row) : null);
    if (!source) {
      return {
        unresolved: {
          ...row,
          slug,
          reason: row.sourceType === 'google_doc'
            ? 'Google Doc was not fetched. Re-run with --fetch-google-docs or provide a local export.'
            : 'No matching local source export found.',
        },
      };
    }

    const article = sourceToArticle(row, source, slug);
    return { article, author: article.author, resolvedFrom: source.kind };
  } catch (error) {
    return {
      unresolved: {
        ...row,
        slug,
        reason: error instanceof Error ? error.message : 'Source extraction failed',
      },
    };
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(options.manifest, 'utf8'));
  const seed = JSON.parse(readFileSync('src/data/octagonData.json', 'utf8'));
  const usedSlugs = new Set((seed.articles || []).map(article => article.slug).filter(Boolean));
  const prepared = {
    generatedAt: new Date().toISOString(),
    sourceManifest: options.manifest,
    sourceDir: options.sourceDir || null,
    fetchGoogleDocs: options.fetchGoogleDocs,
    articles: [],
    authors: {},
    unresolved: [],
    skipped: manifest.rows.filter(row => row.skipReason),
  };

  for (const row of manifest.rows.filter(row => !row.skipReason)) {
    const result = await resolveRow(row, options, usedSlugs);
    if (result.article) {
      prepared.articles.push(result.article);
      prepared.authors[result.author.id] = result.author;
    } else if (result.unresolved) {
      prepared.unresolved.push(result.unresolved);
    }
  }

  mkdirSync(resolve(options.out, '..'), { recursive: true });
  writeFileSync(options.out, `${JSON.stringify(prepared, null, 2)}\n`);

  console.log(`Prepared ${prepared.articles.length} articles.`);
  console.log(`Unresolved sources: ${prepared.unresolved.length}.`);
  console.log(`Wrote ${options.out}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
