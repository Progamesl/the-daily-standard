# The Octagon – Full Upgrade Checklist (25 Major Tasks)

Each item is a **significant, heavy, or complex** change that materially improves the site.

---

## Design & Foundation
1. **Design system overhaul** – Typography scale (type scale 1.25), full color tokens, spacing/radius/shadow scales, CSS variables + Tailwind extend.
2. **Dark mode** – Full dark theme (CSS variables), theme toggle in header, persist preference (localStorage), apply everywhere.
3. **Loading & skeleton states** – Skeleton components for hero, cards, article body; use for initial load and route transitions.
4. **Micro-interactions & focus** – Consistent hover/active/focus-visible on buttons, cards, links; subtle transitions site-wide.

## Masthead & Navigation
5. **Masthead mega-upgrade** – Sticky behavior, Subscribe → /subscribe, improved mobile drawer (sections grid, CTA), proper aria and keyboard.
6. **Global search UI** – Search dialog (Cmd+K / click), input filters articles by headline/dek, result list with links, keyboard nav.
7. **Breadcrumbs** – Reusable breadcrumb on Article (Home > Section > Title), Section (Home > Section), Author (Home > Author).

## Footer & Static
8. **Footer redesign** – Multi-column layout, newsletter CTA block, section links, social, legal; flow-container; "Back to top" button.
9. **404 page redesign** – Clear message, illustration or strong visual, quick links (Home, Sections), search CTA.
10. **About page** – Mission, story, team snippet, CTA to Contact; modern layout.
11. **Contact page** – Form (name, email, message), address block, success state; validation and a11y.
12. **Subscribe page** – Tiers (e.g. Free / Student / Full), pricing cards, primary CTA; linked from masthead.

## Homepage
13. **Breaking news strip** – If any article isBreaking, show a thin strip above hero with headline(s) and link.
14. **Editors’ Picks strip** – Dedicated horizontal strip (4–5 cards) with thumbnails and headlines; clear section title.
15. **In-Depth / Long Reads section** – Articles with readingTime ≥ 5 (or similar), distinct card style.
16. **Newsletter block redesign** – Prominent card with headline, value prop, email input + button, success/error states.
17. **Trending / Most Read upgrade** – Sidebar with rank, view count (or mock), better typography and spacing.

## Article Page
18. **Article page full redesign** – Full-bleed hero image, container for title/byline, reading progress bar, clear body typography.
19. **Table of contents** – For long articles, extract headings from body and show sticky ToC.
20. **Pull quotes & media** – Detect blockquotes in body and render as pull quote; support inline images/gallery in body.
21. **Author card & related stories** – Author card below byline (photo, name, bio, link); related stories (same section/tags) with 3–4 cards and thumbnails.
22. **Share bar** – Share buttons (Twitter, Facebook, Copy link) with working copy and optional native share.

## Section & Author
23. **Section page redesign** – Featured hero card, grid with consistent card design, sort/filter (Latest / Most Read), pagination or Load more.
24. **Author page redesign** – Author hero (photo, name, role, bio), grid of articles with StoryCard, optional pagination.

## Technical & SEO
25. **SEO & meta** – Per-route title/description; Article/Section/Author og:image, og:title, og:description; JSON-LD Article schema on article pages.

---

**Implementation order:** Foundation (1–4) → Masthead/Footer/Static (5–12) → Homepage (13–17) → Article (18–22) → Section/Author (23–24) → SEO (25).
