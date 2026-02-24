# Execution plan – load all data, images, and ship

## 1. Data loading (octagonData)
- **src/data/seedData.ts** – initData() already fetches `/octagonData.json` from public. convertArticle already keeps `image`/`images`, `id` string. Ensure author ids normalized to string; fix lint `any` types so eslint passes.

## 2. Images (all from data, embeddable preferred)
- **src/lib/imageHelpers.ts** – Already prefers embeddable URLs (saccdsoctagon, unsplash, etc.), getUniqueDisplayImages with string ids. No change unless build references break.

## 3. Homepage
- **src/pages/Index.tsx** – Already uses getUniqueDisplayImages + getImage for all sections, hero image steal when lead has no image. No change.

## 4. Article & section pages
- **src/pages/ArticlePage.tsx** – Uses enhanceArticleImage for hero and related. No change.
- **src/components/stories/StoryCard.tsx**, **TopStories.tsx** – Use enhanceArticleImage. No change.

## 5. Build and public data
- **public/octagonData.json** – Must exist for fetch in dev and build (Vite copies public to dist). Verify present; if only src/data/octagonData.json exists, copy or symlink for build.

## 6. Checks
- Run `npm run lint` → fix any errors. **Done:** 0 errors (warnings only).
- Run `npm run build` → fix any errors until green. **Done:** build succeeds; `dist/octagonData.json` present.
- Run `npm run test` → **Done:** 1 test passed.
