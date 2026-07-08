/**
 * Prepare downloaded Google Docs text exports for CMS import.
 *
 * Usage:
 *   npm run upload:prepare:downloads
 *   npm run upload:prepare:downloads -- --source-dir ~/Downloads --out scripts/downloaded-stories-prepared.json
 *   npm run upload:import -- scripts/downloaded-stories-prepared.json --sync-r2
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join, resolve } from 'path';

const DEFAULT_SOURCE_DIR = join(homedir(), 'Downloads');
const DEFAULT_OUT = 'scripts/downloaded-stories-prepared.json';

const storyConfigs = [
  {
    file: 'Cognitive Development - D3.txt',
    slug: 'are-screens-making-us-dumber',
    headline: "Are Screens Making Us Dumber? The Science Schools Won't Talk About",
    section: 'us',
    authors: ['Lucas Holz'],
    date: '2026-05-05T17:00:00.000Z',
    tags: ['Issue 10', 'News', 'Technology', 'Education'],
    stopBefore: 'Hey Lucas,',
  },
  {
    file: 'coyote creek d1.txt',
    slug: 'coyote-creek-solar-project-faces-environmental-opposition',
    headline: 'Coyote Creek solar project faces environmental opposition',
    section: 'us',
    authors: ['Ryan Xu', 'Khivi Singh'],
    date: '2026-05-06T17:00:00.000Z',
    tags: ['Issue 10', 'News', 'Environment'],
    stopBefore: 'ADD TO STORY',
  },
  {
    file: 'Online Sports Gambling Must Be Regulated.txt',
    slug: 'online-sports-gambling-must-be-regulated',
    headline: 'Online Sports Gambling Must Be Regulated',
    section: 'us',
    authors: ['Ethan Minton'],
    date: '2026-05-07T17:00:00.000Z',
    tags: ['Issue 10', 'News', 'Sports Gambling'],
    stopBefore: 'Hey Ethan,',
  },
  {
    file: 'D4 Soccer van crash injures CD student.txt',
    slug: 'soccer-van-crash-injures-country-day-student',
    headline: 'Soccer van crash injures Country Day student',
    section: 'us',
    authors: ['Jacob Rabe'],
    date: '2026-05-08T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'News', 'Soccer'],
    stopBefore: '________________',
  },
  {
    file: 'AI Data Center Story.txt',
    slug: 'ai-data-centers-raise-energy-and-climate-questions',
    headline: 'AI data centers raise energy and climate questions',
    section: 'us',
    authors: ['Jacob Rabe'],
    date: '2026-05-09T17:00:00.000Z',
    tags: ['Issue 10', 'News', 'AI', 'Climate'],
    stopBefore: 'Hersh quotes',
  },
  {
    file: 'D4 JEA convention_awards.txt',
    slug: 'octagon-staffers-earn-six-national-journalism-awards',
    headline: 'Octagon staffers earn six national journalism awards',
    section: 'us',
    authors: ['Trisha Gandhi'],
    date: '2026-05-10T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'News', 'Journalism'],
    stopBefore: 'Hi Trisha,',
  },
  {
    file: '10 Octagon - D4 - New Positions - Octagon Medallion & Student Council.txt',
    slug: 'new-student-leadership-positions-declared-for-2026-27',
    headline: 'New Student Leadership Positions declared for the year of 2026-27',
    section: 'us',
    authors: ['Vivian Li'],
    date: '2026-05-11T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'News', 'Student Leadership'],
    stopBefore: 'D1 10/10',
  },
  {
    file: 'D3 Leaving Teachers Feature.txt',
    slug: 'leaving-teachers-reflect-on-country-day',
    headline: 'Leaving teachers reflect on Country Day',
    section: 'features',
    authors: ['Zachary Vando-Milberger'],
    date: '2026-05-12T17:00:00.000Z',
    tags: ['Issue 10', 'Features', 'Teachers'],
    stopBefore: 'Hi,',
  },
  {
    file: 'Ashley Lattyak Freshman Foci D4.txt',
    slug: 'freshman-foci-ashley-lattyak',
    headline: 'Freshman Foci: Ashley Lattyak',
    section: 'features',
    authors: ['Trisha Gandhi'],
    date: '2026-05-13T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'Features', 'Freshman Foci'],
    stopBefore: 'Hi Trisha,',
  },
  {
    file: 'D4 Freshman Focus_ Cara Shin.txt',
    slug: 'freshman-focus-cara-shin',
    headline: 'Freshman Focus: Cara Shin',
    section: 'features',
    authors: ['Susie Wang'],
    date: '2026-05-14T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'Features', 'Freshman Foci'],
    stopBefore: 'Hi Susie,',
  },
  {
    file: 'Feature 15_ Entrepreneurship Reborn at Country Day - Brenden Yu D4.txt',
    slug: 'entrepreneurship-reborn-at-country-day',
    headline: 'Entrepreneurship Reborn at Country Day',
    section: 'features',
    authors: ['Brenden Yu'],
    date: '2026-05-15T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'Features', 'Business'],
    stopBefore: '________________',
  },
  {
    file: 'Draft 4_ No Shame in Community College.txt',
    slug: 'no-shame-in-community-college',
    headline: 'No Shame in Community College',
    section: 'opinion',
    authors: ['Khivi Singh'],
    date: '2026-05-16T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'Opinion', 'College'],
    stopBefore: 'Heyyy Khivi,',
  },
  {
    file: 'Advice column questions.txt',
    slug: 'advice-column-dating-and-college-pressure',
    headline: 'Advice column',
    section: 'opinion',
    authors: ['Kate Barnes'],
    date: '2026-05-17T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'Opinion', 'Advice'],
  },
  {
    file: 'My Angle_ Eating Disorders are Back- D4.txt',
    slug: 'my-angle-eating-disorders-are-back',
    headline: 'My Angle: Eating Disorders are Back',
    section: 'opinion',
    authors: ['Noor Alameri'],
    date: '2026-05-18T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'Opinion', 'Mental Health'],
    stopBefore: 'Hey Noor,',
  },
  {
    file: 'Shukla superior commentary.txt',
    slug: 'were-not-disengaged-youre-not-listening',
    headline: "We're Not Disengaged - You're Not Listening",
    section: 'opinion',
    authors: ['Sid Shukla'],
    date: '2026-05-19T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'Opinion', 'Commentary'],
    stopBefore: 'D1 Ms T',
  },
  {
    file: 'D4 Starbucks Summer Menu Review.txt',
    slug: 'starbucks-summer-menu-review',
    headline: 'Starbucks Summer Menu Review',
    section: 'arts',
    authors: ['Susie Wang'],
    date: '2026-05-20T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'A&E', 'Food Review'],
    stopBefore: 'Heyy Susie,',
  },
  {
    file: '10 Octagon - Print Creme Coffee Review D4.txt',
    slug: 'creme-coffee-review',
    headline: 'Creme Coffee Review',
    section: 'arts',
    authors: ['Vivian Li'],
    date: '2026-05-21T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'A&E', 'Food Review'],
    stopBefore: '~~ Rehan comment',
  },
  {
    file: 'd4 kanye album review.txt',
    slug: 'bully-review',
    headline: 'BULLY Review',
    section: 'arts',
    authors: ['Chloey Fang'],
    date: '2026-05-22T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'A&E', 'Music Review'],
    stopBefore: 'Hey Chloey,',
  },
  {
    file: 'Iceman Album Review - A&E.txt',
    slug: 'drakes-iceman-freezes-the-world',
    headline: "Drake's Iceman Freezes the World",
    section: 'arts',
    authors: ['Lucas Holz'],
    date: '2026-05-23T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'A&E', 'Music Review'],
    stopBefore: 'Hey Lucas,',
  },
  {
    file: 'D4 No MLB Season 2027-Parsa Salari.txt',
    slug: 'no-mlb-season-2027',
    headline: 'No MLB Season 2027',
    section: 'sports',
    authors: ['Parsa Salari'],
    date: '2026-05-24T17:00:00.000Z',
    status: 'published',
    tags: ['Issue 10', 'Sports', 'Baseball'],
    stopBefore: 'Hey Parsa!',
  },
  {
    file: 'Octagon Golf Feature.txt',
    slug: 'golf-team-finds-strength-in-depth-and-consistency',
    headline: 'Golf team finds strength in depth and consistency',
    section: 'sports',
    authors: ['Ammar Hussain'],
    date: '2026-05-25T17:00:00.000Z',
    tags: ['Issue 10', 'Sports', 'Golf'],
    stopBefore: 'Hey, where are we on this?',
  },
];

const knownAuthors = {
  'Ammar Hussain': 'Reporter',
  'Brenden Yu': 'Reporter',
  'Chloey Fang': 'Reporter',
  'Ethan Minton': 'Reporter',
  'Jacob Rabe': 'Feature Editor',
  'Kate Barnes': 'News Editor',
  'Khivi Singh': 'Reporter',
  'Lucas Holz': 'Reporter',
  'Noor Alameri': 'Reporter',
  'Parsa Salari': 'Reporter',
  'Ryan Xu': 'Copy Editor',
  'Sid Shukla': 'Technology Staff',
  'Susie Wang': 'Reporter',
  'Trisha Gandhi': 'Reporter',
  'Vivian Li': 'Page Editor',
  'Zachary Vando-Milberger': 'Page Editor',
};

function parseArgs(argv) {
  const options = {
    sourceDir: DEFAULT_SOURCE_DIR,
    out: DEFAULT_OUT,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source-dir') options.sourceDir = expandHome(argv[++i]);
    else if (arg === '--out') options.out = argv[++i];
  }

  return options;
}

function expandHome(path) {
  if (!path) return path;
  return path.startsWith('~/') ? join(homedir(), path.slice(2)) : path;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeText(raw, config) {
  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (config.stopBefore) {
    const idx = text.indexOf(config.stopBefore);
    if (idx >= 0) text = text.slice(0, idx);
  }

  const lines = text
    .split('\n')
    .map(line => line.replace(/\[[a-z]\]/gi, '').trimEnd());

  const headerEnd = lines.findIndex(line => /^(reporter|section editor|section editor-in-chief|editor-in-chief|copy editor)$/i.test(line.trim()));
  let bodyLines = headerEnd >= 0 ? lines.slice(headerEnd + 1) : lines;

  while (bodyLines.length && !bodyLines[0].trim()) bodyLines.shift();

  if (bodyLines[0]?.trim().toLowerCase() === config.headline.toLowerCase()) {
    bodyLines.shift();
  }

  return bodyLines
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function blockToHtml(block) {
  const trimmed = block.trim();
  const escaped = escapeHtml(trimmed).replace(/\n/g, ' ');
  if (!escaped) return '';

  if (
    /^Q:/.test(trimmed) ||
    /^A:/.test(trimmed) ||
    /^[A-Z][A-Za-z0-9 .,'&():-]{2,80}$/.test(trimmed) && trimmed.length < 80
  ) {
    return `<h2>${escaped}</h2>`;
  }

  return `<p>${escaped}</p>`;
}

function textToHtml(text) {
  return text
    .split(/\n\s*\n/)
    .map(blockToHtml)
    .filter(Boolean)
    .join('\n');
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function statusFor(config) {
  if (config.status) return config.status;
  return /\bD4\b|Draft 4|done/i.test(config.file) ? 'published' : 'draft';
}

function authorRecord(name) {
  const id = slugify(name || 'The Octagon Staff') || 'the-octagon-staff';
  return {
    id,
    name,
    role: knownAuthors[name] || 'Student Journalist',
    bio: '',
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200`,
    email: '',
    twitter: '',
  };
}

function combinedAuthor(names) {
  if (names.length === 1) return authorRecord(names[0]);

  const name = names.join(' and ');
  return {
    id: names.map(slugify).join('-and-'),
    name,
    role: 'Student Journalist',
    bio: '',
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200`,
    email: '',
    twitter: '',
  };
}

function prepareArticle(config, sourceDir) {
  const path = join(sourceDir, config.file);
  if (!existsSync(path)) {
    return {
      unresolved: {
        file: config.file,
        slug: config.slug,
        headline: config.headline,
        reason: `Missing source file at ${path}`,
      },
    };
  }

  const raw = readFileSync(path, 'utf8');
  const text = normalizeText(raw, config);
  const body = textToHtml(text);
  const author = combinedAuthor(config.authors);
  const now = new Date().toISOString();

  return {
    article: {
      id: `upload_${config.slug}`,
      slug: config.slug,
      headline: config.headline,
      dek: config.dek || '',
      body,
      image: '',
      images: [],
      imageCaption: '',
      section: config.section,
      author,
      publishedAt: config.date,
      updatedAt: now,
      readingTime: Math.max(1, Math.ceil(countWords(text) / 225)),
      tags: config.tags,
      status: statusFor(config),
      priority: 'normal',
      featured: false,
      isCinematic: false,
      internalNotes: [
        {
          id: `note_${config.slug}`,
          authorId: 'system',
          authorName: 'Downloaded story import',
          type: 'note',
          createdAt: now,
          content: `Prepared from ${config.file}. Editor comments were stripped at import prep time. Verify images and captions separately.`,
        },
      ],
      revisions: [],
      wordCount: countWords(text),
    },
    author,
  };
}

const options = parseArgs(process.argv.slice(2));
const sourceDir = resolve(options.sourceDir);
const prepared = {
  generatedAt: new Date().toISOString(),
  sourceManifest: 'downloaded-google-doc-text-exports',
  sourceDir,
  fetchGoogleDocs: false,
  articles: [],
  authors: {},
  unresolved: [],
  skipped: [
    {
      file: 'Senior Superlatives.txt',
      reason: 'Handled by the dedicated /special/senior-superlatives page.',
    },
    {
      file: 'poems for page.txt',
      reason: 'Handled by the dedicated /special/poems page.',
    },
    {
      file: 'senior university.txt',
      reason: 'Data-only college destinations page; keep for a future special page or graphic.',
    },
  ],
};

for (const config of storyConfigs) {
  const result = prepareArticle(config, sourceDir);
  if (result.article) {
    prepared.articles.push(result.article);
    prepared.authors[result.author.id] = result.author;
    for (const name of config.authors) {
      const author = authorRecord(name);
      prepared.authors[author.id] = author;
    }
  } else {
    prepared.unresolved.push(result.unresolved);
  }
}

prepared.summary = {
  configuredSources: storyConfigs.length,
  preparedArticles: prepared.articles.length,
  published: prepared.articles.filter(article => article.status === 'published').length,
  draft: prepared.articles.filter(article => article.status === 'draft').length,
  unresolved: prepared.unresolved.length,
  skippedSpecials: prepared.skipped.length,
};

mkdirSync(dirname(options.out), { recursive: true });
writeFileSync(options.out, `${JSON.stringify(prepared, null, 2)}\n`);

console.log(`Prepared ${prepared.articles.length} downloaded stories.`);
console.log(`Published: ${prepared.summary.published}`);
console.log(`Draft: ${prepared.summary.draft}`);
console.log(`Unresolved: ${prepared.summary.unresolved}`);
console.log(`Wrote ${options.out}`);
