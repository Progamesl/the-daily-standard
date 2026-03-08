# The Octagon CMS - Complete Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Database Architecture (Supabase)](#database-architecture-supabase)
5. [Data Flow & Storage](#data-flow--storage)
6. [Admin System](#admin-system)
7. [Public-Facing Site](#public-facing-site)
8. [Key Features](#key-features)
9. [Deployment](#deployment)
10. [Security](#security)

---

## System Overview

**The Octagon** is a production-ready, headless CMS (Content Management System) built for a high-school newspaper with 70 staff members and 600+ readers. The system enables non-technical editors to upload, edit, and manage stories that automatically appear across all browsers and devices in real-time.

### Core Philosophy
- **Headless CMS Pattern**: Content stored in Supabase (PostgreSQL database), rendered by React frontend
- **Single Source of Truth**: Supabase is the authoritative database; localStorage acts as a cache
- **Automatic Sync**: Changes propagate instantly across all devices via event-driven architecture
- **Zero Manual Steps**: Editors upload once, stories appear everywhere automatically

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Hosting)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         React SPA (Single Page Application)          │  │
│  │  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │  Public Site │  │  Admin Panel  │                 │  │
│  │  │  (Read-only) │  │  (Full CRUD) │                 │  │
│  │  └──────┬───────┘  └──────┬───────┘                 │  │
│  │         │                  │                          │  │
│  │         └────────┬─────────┘                          │  │
│  │                  │                                    │  │
│  │         ┌────────▼────────┐                           │  │
│  │         │  Data Services  │                           │  │
│  │         │  (React Hooks)  │                           │  │
│  │         └────────┬────────┘                           │  │
│  └──────────────────┼──────────────────────────────────┘  │
│                     │                                       │
│         ┌───────────┴───────────┐                          │
│         │   Supabase (PostgreSQL)│                          │
│         │   Single Source of Truth│                         │
│         └───────────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

**Frontend (React + TypeScript)**
- **Public Pages**: Homepage, article pages, section pages, staff page
- **Admin Panel**: Dashboard, story editor, author management, analytics, security
- **Shared Components**: Layout, navigation, forms, UI components (ShadCN)

**Data Layer**
- **Seed Data**: Static JSON file (`octagonData.json`) with 572 baseline articles
- **Admin Data Service**: CRUD operations, caching, Supabase sync
- **Public Data Service**: Merges seed + admin articles for public display
- **Supabase Data Service**: Direct database operations

**State Management**
- **React Context**: Authentication, data sync, user sessions
- **LocalStorage**: Cache for offline support and performance
- **Supabase Cache**: In-memory cache with 30-second TTL

---

## Tech Stack

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **React Router DOM**: Client-side routing
- **Tailwind CSS**: Utility-first styling
- **ShadCN UI**: Component library (buttons, dialogs, forms, etc.)
- **Lucide React**: Icon library
- **Sonner**: Toast notifications
- **Recharts**: Analytics charts

### Backend/Database
- **Supabase**: PostgreSQL database with REST API
- **Row Level Security (RLS)**: Database-level access control
- **PostgreSQL**: Relational database for articles, authors, users, analytics

### Deployment
- **Vercel**: Hosting and CI/CD
- **GitHub**: Version control
- **Environment Variables**: Secure configuration

### Development Tools
- **ESLint**: Code linting
- **TypeScript**: Static type checking
- **Git**: Version control

---

## Database Architecture (Supabase)

### Database Schema

#### `articles` Table
Primary table storing all article content and metadata.

**Core Fields:**
- `id` (TEXT, PRIMARY KEY): Unique article identifier
- `slug` (TEXT, UNIQUE): URL-friendly identifier (e.g., "sprinting-to-victory")
- `headline` (TEXT): Article title
- `dek` (TEXT): Subtitle/description
- `body` (TEXT): Full article HTML content
- `image` (TEXT): Primary image URL
- `images` (JSONB): Array of additional image URLs
- `image_caption` (TEXT): Image description
- `section` (TEXT): Article section (us, arts, opinion, editorial, sports)
- `author_id` (TEXT): Reference to author
- `author_name` (TEXT): Denormalized author name (for performance)
- `published_at` (TIMESTAMPTZ): Publication date
- `reading_time` (INTEGER): Estimated reading time in minutes
- `tags` (JSONB): Array of tags
- `status` (TEXT): Workflow status (pitch, draft, published, archived, etc.)
- `priority` (TEXT): Priority level (normal, breaking, high)
- `featured` (BOOLEAN): Whether article appears as homepage hero

**Editorial Workflow Fields:**
- `assigned_to_id` (TEXT): Reporter assigned to story
- `assigned_to_name` (TEXT): Reporter name (denormalized)
- `assigned_by_id` (TEXT): Editor who assigned the story
- `reviewed_by_id` (TEXT): Editor who approved the story
- `deadline` (TIMESTAMPTZ): Story deadline
- `pitch_summary` (TEXT): Original pitch text

**SEO Fields:**
- `meta_title` (TEXT): Custom SEO title
- `meta_description` (TEXT): Meta description for search engines
- `og_image` (TEXT): Open Graph image for social sharing
- `canonical_url` (TEXT): Canonical URL for SEO

**Editorial Tools:**
- `internal_notes` (JSONB): Array of editorial notes
- `revisions` (JSONB): Array of revision snapshots (last 20)
- `word_count` (INTEGER): Article word count

**Timestamps:**
- `created_at` (TIMESTAMPTZ): Record creation time
- `updated_at` (TIMESTAMPTZ): Last update time

#### `authors` Table
Stores author/staff member information.

**Fields:**
- `id` (TEXT, PRIMARY KEY): Unique author identifier
- `name` (TEXT): Author full name
- `role` (TEXT): Role (Editor-in-Chief, Reporter, etc.)
- `bio` (TEXT): Author biography
- `image` (TEXT): Profile photo URL
- `email` (TEXT): Contact email
- `twitter` (TEXT): Twitter handle
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `admin_users` Table
Stores admin panel user accounts with role-based access.

**Fields:**
- `id` (TEXT, PRIMARY KEY): User ID
- `username` (TEXT, UNIQUE): Login username
- `password_hash` (TEXT): Hashed password
- `display_name` (TEXT): Display name
- `role` (TEXT): User role (super_admin, editor_in_chief, etc.)
- `active` (BOOLEAN): Whether account is active
- `failed_attempts` (INTEGER): Failed login attempts
- `locked_until` (TIMESTAMPTZ): Account lockout expiration
- `last_login` (TIMESTAMPTZ): Last successful login
- `created_at` (TIMESTAMPTZ)

#### `login_attempts` Table
Security logging for authentication attempts.

**Fields:**
- `id` (TEXT, PRIMARY KEY)
- `username` (TEXT): Attempted username
- `ip` (TEXT): Client IP address
- `user_agent` (TEXT): Browser user agent
- `success` (BOOLEAN): Whether login succeeded
- `timestamp` (TIMESTAMPTZ): Attempt time
- `user_id` (TEXT): User ID (if successful)

#### `security_alerts` Table
Stores security events (IP blocks, suspicious activity).

**Fields:**
- `id` (TEXT, PRIMARY KEY)
- `type` (TEXT): Alert type (ip_blocked, suspicious_activity, etc.)
- `message` (TEXT): Alert message
- `ip` (TEXT): Related IP address
- `severity` (TEXT): Alert severity
- `timestamp` (TIMESTAMPTZ)

#### `activity_log` Table
Editorial activity tracking.

**Fields:**
- `id` (TEXT, PRIMARY KEY)
- `type` (TEXT): Activity type (article_created, article_saved, login, etc.)
- `description` (TEXT): Activity description
- `user_id` (TEXT): User who performed action
- `user_name` (TEXT): User name (denormalized)
- `article_id` (TEXT): Related article (if applicable)
- `timestamp` (TIMESTAMPTZ)

#### `site_settings` Table
Site-wide configuration.

**Fields:**
- `id` (TEXT, PRIMARY KEY): Always "site_settings"
- `site_name` (TEXT): Site name
- `tagline` (TEXT): Site tagline
- `meta_description` (TEXT): Default meta description
- `announcement_banner` (TEXT): Announcement text
- `newsletter_enabled` (BOOLEAN): Newsletter feature toggle
- `comments_enabled` (BOOLEAN): Comments feature toggle
- `maintenance_mode` (BOOLEAN): Maintenance mode toggle
- `updated_at` (TIMESTAMPTZ)

#### `article_views` Table
Analytics: Article view tracking.

**Fields:**
- `id` (TEXT, PRIMARY KEY)
- `article_id` (TEXT): Article viewed
- `ip` (TEXT): Viewer IP (hashed for privacy)
- `user_agent` (TEXT): Browser info
- `timestamp` (TIMESTAMPTZ): View time

#### `article_engagement` Table
Analytics: Reading behavior tracking.

**Fields:**
- `id` (TEXT, PRIMARY KEY)
- `article_id` (TEXT): Article ID
- `scroll_depth` (INTEGER): Percentage scrolled (0-100)
- `reading_time` (INTEGER): Time spent reading (seconds)
- `timestamp` (TIMESTAMPTZ)

### Row Level Security (RLS)

**Current Configuration:**
- **Anonymous Access**: Enabled for `articles` and `authors` tables (read/write)
- **Rationale**: Application handles authentication; database trusts the application
- **Future Enhancement**: Can implement user-based RLS policies for multi-tenant scenarios

**RLS Policies:**
```sql
-- Allow anonymous read/write access (application handles auth)
CREATE POLICY "Anon can read articles" ON articles FOR SELECT USING (true);
CREATE POLICY "Anon can insert articles" ON articles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon can update articles" ON articles FOR UPDATE USING (true);
CREATE POLICY "Anon can delete articles" ON articles FOR DELETE USING (true);
```

---

## Data Flow & Storage

### Data Sources

1. **Seed Data** (`src/data/octagonData.json`)
   - 572 baseline articles from original WordPress export
   - Static JSON file committed to repository
   - Loaded at build time
   - Acts as fallback/starting point

2. **Supabase Database**
   - Single source of truth for all admin-created/edited articles
   - Real-time sync across all devices
   - Persistent storage (survives cache clears, browser changes)

3. **LocalStorage Cache**
   - Browser-based cache for performance
   - Stores articles, authors, settings, backups
   - Synced from Supabase on page load
   - Used for offline support

### Data Merging Strategy

**Public Pages:**
```
Seed Articles (572) 
  + 
Admin Articles (from Supabase)
  - 
Deleted Articles (from localStorage)
  =
Final Article List
```

**Admin Pages:**
```
Seed Articles (572)
  +
Admin Articles (from Supabase/localStorage)
  -
Deleted Articles
  =
Admin Article List
```

**Priority:**
1. Admin articles override seed articles (same ID)
2. Deleted articles are filtered out
3. Only published articles appear on public site

### Sync Flow

**On Page Load:**
1. App renders immediately from localStorage cache (instant load)
2. `DataSyncContext` triggers background Supabase sync
3. Supabase data fetched and merged with localStorage
4. Pages re-render automatically when fresh data arrives

**On Article Save:**
1. Editor clicks "Save" or "Publish"
2. `saveAdminArticle()` called
3. Article saved to Supabase FIRST (waits for confirmation)
4. Article saved to localStorage (cache)
5. Global event `supabase-article-saved` dispatched
6. All pages listen and trigger re-sync
7. Article appears everywhere within seconds

**On Article Delete:**
1. `deleteAdminArticle()` called
2. Article moved to trash (with snapshot)
3. Article ID added to deleted list
4. Article removed from Supabase (async)
5. Article removed from localStorage
6. Pages re-render automatically

### Caching Strategy

**Supabase Cache:**
- In-memory cache with 30-second TTL
- Shared across all components
- Invalidated on save/delete operations
- Falls back to localStorage if cache miss

**LocalStorage Cache:**
- 2-second TTL for reads
- Updated on every Supabase sync
- Used for offline support
- Cleared on explicit cache invalidation

---

## Admin System

### Authentication

**Multi-Step Login:**
1. Username + Password
2. "Email Verification" (fake security - code: `SID-6767`)
3. Session created (24-hour expiry)

**Security Features:**
- Rate limiting (5 attempts per minute per IP)
- IP blocking (after repeated failures)
- Account lockout (after 5 failed attempts)
- Login attempt logging
- Security alerts for suspicious activity

**User Roles:**
- `super_admin`: Full access, security settings
- `editor_in_chief`: Full editorial control
- `managing_editor`: Editorial oversight
- `section_editor`: Section-specific editing
- `reporter`: Create/edit own stories
- `photographer`: Image upload only

### Admin Dashboard

**Key Metrics:**
- Total articles, pitches, drafts, submitted stories
- Overdue deadlines
- Breaking news alerts
- Pipeline view (workflow stages)
- Review queue
- Section performance charts
- Recent activity feed

### Story Editor

**Features:**
- Rich text editor (WYSIWYG)
- Image upload (drag-drop, clipboard paste, Imgur integration)
- Auto-save (every 5 seconds)
- Undo/Redo (50 states, keyboard shortcuts)
- Revision history (last 20 snapshots)
- SEO panel (meta tags, OG image, canonical URL)
- Assignment panel (reporter, deadline, priority)
- Internal notes (editorial comments)
- Preview mode (unpublished articles)
- Duplicate article
- Featured toggle (homepage hero)

**Workflow Statuses:**
- `pitch`: Story idea
- `assigned`: Assigned to reporter
- `draft`: Being written
- `submitted`: Submitted for review
- `in_review`: Editor reviewing
- `approved`: Ready to publish
- `published`: Live on site
- `archived`: Removed from site

### Stories List

**Features:**
- Pagination (25 per page)
- Search (headline, dek, author, assigned to)
- Filters (status, section, priority, reporter)
- Sorting (date, title, deadline)
- Bulk select/delete
- Quick actions (edit, duplicate, delete, preview)
- Overdue deadline highlighting

### Authors Management

**Features:**
- CRUD operations
- Role badges
- Section assignments
- Profile photos (auto-seeded from staff data)
- Bio, email, Twitter
- Story count per author

### Trash/Recycle Bin

**Features:**
- View all deleted articles
- Restore articles
- Permanent delete
- Shows who deleted, when, and reason
- Full article snapshots preserved

### Analytics Dashboard

**Metrics:**
- Total views, unique visitors
- Views over time (line chart)
- Top articles (by views)
- Author performance
- Section performance (bar chart)
- Reading time tracking
- Scroll depth tracking

### Security Dashboard

**Features:**
- Security alerts
- Blocked IPs
- Login attempts log
- Account lockouts
- Suspicious activity detection

### Settings

**Site Configuration:**
- Site name, tagline
- Meta description
- Announcement banner
- Feature toggles (newsletter, comments)
- Maintenance mode

**Data Management:**
- Export all data (JSON backup)
- Import data (JSON file or paste)
- Automatic backups (hourly, last 10)
- Supabase migration tools
- Merge duplicate authors

### Activity Log

**Features:**
- All team activity (logins, saves, edits, deletes)
- Searchable, filterable
- Grouped by day
- Shows user, action, timestamp

---

## Public-Facing Site

### Homepage

**Layout:**
- Hero story (featured article or latest)
- Secondary hero cards (2 stories with images)
- Breaking news section
- Editors' picks
- Section highlights (News, Arts, Opinion, Editorial, Sports)
- Most popular articles
- Newsletter signup

**Data Sources:**
- `getFeaturedPublicArticle()`: Featured article or latest
- `getLatestPublicArticles()`: Most recent stories
- `getBreakingPublicNews()`: Breaking priority stories
- `getPublicArticlesBySection()`: Section-specific stories

### Article Pages

**Features:**
- Full article content (HTML)
- Author byline with photo
- Publication date
- Reading time
- Related articles
- Reading progress bar
- Text size controls (3 A's)
- Social sharing buttons
- View tracking (analytics)

**Preview Mode:**
- Unpublished articles accessible via `?preview=1`
- Shows "PREVIEW MODE" banner
- Fetches directly from admin data

### Section Pages

**Features:**
- All articles in section
- Sorted by date (newest first)
- Pagination
- Section description

### Staff Page

**Features:**
- All authors/staff members
- Role badges
- Profile photos
- Bios
- Story counts

---

## Key Features

### 1. Headless CMS Architecture

**Why:**
- Content separate from presentation
- API-first approach
- Easy to add mobile apps, other frontends
- Scalable and maintainable

**How:**
- Supabase provides REST API
- React fetches and renders
- No server-side rendering needed
- Static site generation possible

### 2. Automatic Cross-Device Sync

**How It Works:**
1. Article saved to Supabase
2. Global event dispatched
3. All open pages listen for event
4. Pages re-fetch from Supabase
5. UI updates automatically

**Result:**
- Upload on one device → appears on all devices instantly
- No manual refresh needed
- Works across browsers, sessions, cache clears

### 3. Optimistic Rendering

**Pattern:**
- Pages render immediately from cache
- Supabase sync happens in background
- UI updates when fresh data arrives

**Benefits:**
- Instant page loads (like NYTimes)
- No loading spinners
- Smooth user experience

### 4. Revision History

**Implementation:**
- Every save creates a snapshot
- Last 20 revisions stored
- Can restore any previous version
- Shows who saved, when, and notes

**Storage:**
- Stored in `revisions` JSONB field
- Includes headline, body, status
- Timestamp and user info

### 5. Image Handling

**Upload Methods:**
- Drag-and-drop
- Clipboard paste
- File picker
- Imgur integration (for URLs)

**Processing:**
- Automatic compression (for large images)
- Quality preservation (95%+ for images under 8MB)
- Base64 encoding (for localStorage)
- URL conversion (via Imgur API)

**Storage:**
- Images stored as URLs (not binary)
- Imgur for external hosting
- Base64 for small images (localStorage)

### 6. Editorial Workflow

**Stages:**
1. **Pitch**: Story idea submitted
2. **Assigned**: Editor assigns to reporter
3. **Draft**: Reporter writes story
4. **Submitted**: Reporter submits for review
5. **In Review**: Editor reviews
6. **Approved**: Ready to publish
7. **Published**: Live on site
8. **Archived**: Removed from site

**Features:**
- Assignment tracking (who, when, deadline)
- Priority levels (normal, high, breaking)
- Internal notes (editorial comments)
- Review queue (stories awaiting approval)

### 7. SEO Optimization

**Fields:**
- Custom meta title
- Meta description
- OG image (social sharing)
- Canonical URL
- Auto-generated from article content if not set

**Implementation:**
- Stored in database
- Rendered in `<head>` via `DocumentHead` component
- Dynamic per article

### 8. Analytics Tracking

**Metrics:**
- Article views (per article, per day)
- Reading time (time spent on article)
- Scroll depth (how far users scroll)
- Author performance (views per author)
- Section performance (views per section)

**Storage:**
- `article_views` table: View events
- `article_engagement` table: Reading behavior
- Aggregated in real-time for dashboard

### 9. Security System

**Features:**
- Rate limiting (5 attempts/minute/IP)
- IP blocking (after repeated failures)
- Account lockout (5 failed attempts)
- Login attempt logging
- Security alerts
- Fake email verification (deterrent)

**Implementation:**
- Stored in `login_attempts` and `security_alerts` tables
- Checked on every login attempt
- Automatic blocking and alerting

### 10. Backup System

**Automatic Backups:**
- Hourly backups of articles and authors
- Stored in localStorage
- Last 10 backups kept
- Can restore from any backup

**Manual Backups:**
- Export all data as JSON
- Import from JSON file or paste
- Full data portability

---

## Deployment

### Vercel Configuration

**Build Settings:**
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Node Version: 18.x

**Environment Variables:**
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

**Routing:**
- SPA mode (all routes serve `index.html`)
- Configured via `vercel.json`

### CI/CD Pipeline

1. Push to GitHub `main` branch
2. Vercel detects change
3. Runs `npm install`
4. Runs `npm run build`
5. Deploys to production
6. Automatic rollback on build failure

### Domain Configuration

- Custom domain: `scdsoctagon.net`
- SSL certificate (automatic via Vercel)
- DNS configured to point to Vercel

---

## Security

### Authentication

**Password Storage:**
- Passwords hashed (simple hash function)
- Not stored in plain text
- Future: Upgrade to bcrypt/argon2

**Session Management:**
- 24-hour session expiry
- Stored in localStorage
- Validated on every admin request

### Access Control

**Role-Based Permissions:**
- Super Admin: Full access
- Editor-in-Chief: Editorial control
- Section Editor: Section-specific
- Reporter: Own stories only
- Photographer: Images only

**Permission Checks:**
- Component-level guards
- Route-level guards
- API-level validation (future)

### Data Protection

**Input Validation:**
- TypeScript types
- Form validation
- SQL injection prevention (Supabase handles)
- XSS prevention (React escapes by default)

**Rate Limiting:**
- Login attempts: 5/minute/IP
- API calls: Handled by Supabase
- Future: Add application-level rate limiting

---

## File Structure

```
the-daily-standard/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── admin/           # Admin-specific components
│   │   ├── article/         # Article display components
│   │   ├── layout/          # Layout components
│   │   └── ui/              # ShadCN UI components
│   ├── contexts/            # React contexts (auth, data sync)
│   ├── data/                # Seed data (octagonData.json)
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Core services
│   │   ├── adminDataService.ts    # Article CRUD, caching
│   │   ├── publicDataService.ts   # Public article merging
│   │   ├── supabaseClient.ts      # Supabase initialization
│   │   ├── supabaseDataService.ts # Supabase operations
│   │   ├── adminUserService.ts    # Authentication
│   │   └── analyticsService.ts    # Analytics calculations
│   ├── pages/               # Page components
│   │   ├── admin/           # Admin panel pages
│   │   └── [public pages]   # Public-facing pages
│   └── App.tsx              # Main app component, routing
├── supabase/
│   ├── migrations.sql       # Database schema
│   └── fix_rls_policies.sql # RLS policy updates
├── public/                  # Static assets
├── .env                     # Environment variables (local)
└── package.json             # Dependencies
```

---

## Performance Optimizations

### Caching
- **Supabase Cache**: 30-second TTL, shared across components
- **LocalStorage Cache**: 2-second TTL for reads
- **React Query**: Future enhancement for better caching

### Code Splitting
- **Route-based**: Each page loads independently
- **Lazy Loading**: Admin pages loaded on demand
- **Dynamic Imports**: Supabase client loaded asynchronously

### Image Optimization
- **Compression**: Automatic for large images
- **Lazy Loading**: Images load on scroll
- **CDN**: Imgur provides CDN for uploaded images

### Database Optimization
- **Indexes**: On `id`, `slug`, `published_at`, `section`
- **Denormalization**: Author names stored with articles
- **JSONB**: Efficient storage for arrays (tags, images, notes)

---

## Future Enhancements

### Planned Features
1. **Real-time Collaboration**: Multiple editors editing simultaneously
2. **Comments System**: Reader comments on articles
3. **Newsletter Integration**: Email newsletter signup
4. **Search**: Full-text search across articles
5. **Media Library**: Centralized image/media management
6. **Scheduled Publishing**: Publish articles at specific times
7. **Multi-language Support**: Internationalization
8. **Mobile App**: React Native app using same API

### Technical Improvements
1. **Server-Side Rendering (SSR)**: Better SEO, faster initial load
2. **GraphQL API**: More flexible data fetching
3. **WebSockets**: Real-time updates without polling
4. **Advanced Analytics**: Heatmaps, user journeys
5. **A/B Testing**: Test different headlines, layouts
6. **CDN Integration**: Faster global content delivery

---

## API Reference

### Supabase API

**Base URL:** `https://[project-id].supabase.co`

**Endpoints:**
- `GET /rest/v1/articles`: Fetch all articles
- `POST /rest/v1/articles`: Create article
- `PATCH /rest/v1/articles?id=eq.[id]`: Update article
- `DELETE /rest/v1/articles?id=eq.[id]`: Delete article

**Authentication:**
- Header: `apikey: [anon-key]`
- Header: `Authorization: Bearer [anon-key]`

### Internal API (Data Services)

**`getAdminArticlesMap()`**
- Returns: `Record<string, AdminArticle>`
- Source: Supabase (cached) + localStorage
- Priority: Supabase > localStorage

**`saveAdminArticle(article, userId, userName)`**
- Returns: `Promise<AdminArticle>`
- Saves to: Supabase first, then localStorage
- Triggers: Global sync event

**`deleteAdminArticle(id, userId, userName, reason)`**
- Returns: `void`
- Moves to: Trash (with snapshot)
- Deletes from: Supabase + localStorage

---

## Troubleshooting

### Common Issues

**"Article not found"**
- **Cause**: Seed article not in Supabase
- **Fix**: `getAdminArticle()` now checks seed data

**"Stories not syncing across devices"**
- **Cause**: Supabase not configured or RLS blocking
- **Fix**: Check environment variables, run `fix_rls_policies.sql`

**"Build fails on Vercel"**
- **Cause**: Missing environment variables
- **Fix**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel dashboard

**"Images not uploading"**
- **Cause**: localStorage quota exceeded
- **Fix**: Use Imgur integration (Shift+paste) for large images

---

## Conclusion

The Octagon CMS is a production-ready, headless content management system built with modern web technologies. It provides a seamless editing experience for non-technical users while maintaining the flexibility and scalability needed for a high-traffic news site.

**Key Strengths:**
- ✅ Automatic cross-device sync
- ✅ Real-time updates
- ✅ Comprehensive editorial workflow
- ✅ Advanced analytics
- ✅ Security features
- ✅ Scalable architecture

**Technology Choices:**
- React + TypeScript for type safety and modern UI
- Supabase for managed PostgreSQL and real-time sync
- Vercel for zero-config deployment
- Headless CMS pattern for flexibility

The system is designed to grow with the publication, supporting 70 staff members and 600+ readers today, with the architecture to scale to thousands of articles and millions of page views.

---

**Document Version:** 1.0  
**Last Updated:** March 2025  
**Maintained By:** The Octagon Development Team
