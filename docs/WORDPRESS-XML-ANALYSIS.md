# Deep analysis: theoctagon.WordPress.2025-11-02.xml

## Overview

- **Format**: WordPress WXR 1.2 (eXtended RSS)
- **Generator**: WordPress 6.8.3, exported 2025-11-02
- **Site**: The Octagon — https://saccdsoctagon.org (Sacramento Country Day School Newspaper)
- **Size**: ~123,500 lines; ~1,436 `<item>` elements (posts, pages, attachments, nav items, etc.)

---

## 1. Channel-level data

### Site info
- **Title**: The Octagon  
- **Link**: https://saccdsoctagon.org  
- **Description**: A Sacramento Country Day School Newspaper  
- **Language**: en-US  

### Authors (~55)
Stored as `<wp:author>` with:
- `wp:author_id`, `wp:author_login`, `wp:author_email`
- `wp:author_display_name`, `wp:author_first_name`, `wp:author_last_name`

Emails are mostly `*@scdsstudent.org` or `*@saccds.org`. The parser maps these to your app’s author objects (id, name, role, bio, image, email).

### Categories
Many `<wp:category>` entries, e.g.:
- **Section-like**: news, arts-entertainment, sports, opinion, features, books, movies-tv, music, media, games-apps, food-service, science, health, covid-19
- **Special**: editors-picks, online-exclusives, interactive, from-copy-to-com
- **Legacy**: e.g. “Sports (doesn't appear on featured block)”, “pineapple-doesnt-appear-on-featured-block”

The parser maps category nicenames to your app sections via `categoryToSection` (e.g. `news` → `us`, `arts-entertainment` → `arts`).

### Tags
Hundreds of `<wp:tag>` (e.g. 2020, 2022-in-review, basketball, biden, covid). The parser uses the first few categories as tags, not the tag taxonomy.

---

## 2. Item types

Each `<item>` has `wp:post_type` and `wp:status`. Only **post + publish** are turned into articles.

| Type            | Purpose                    | Parser action      |
|----------------|----------------------------|--------------------|
| `post`         | Article                    | Used if status=publish |
| `post` (draft) | Unpublished article        | Skipped            |
| `attachment`   | Media (images, etc.)       | Skipped (see below) |
| `page`         | Static page                | Skipped            |
| `nav_menu_item`| Menu link                  | Skipped            |
| Other          | Blocks, layouts, etc.     | Skipped            |

So the **only** items that become articles are those with:
- `wp:post_type` = `post`
- `wp:status` = `publish`

Drafts and all non-post types are ignored.

---

## 3. Attachments (images)

Attachments are `<item>` with `wp:post_type` = `attachment`. Each has:

- **wp:post_id** — attachment ID (e.g. 43551, 43552).
- **wp:attachment_url** — **canonical image URL**, e.g.  
  `https://saccdsoctagon.org/wp-content/uploads/2021/06/IMG_7988-scaled-1.jpg`
- **guid** — sometimes `octagon.scdsstudent.org`; prefer `wp:attachment_url` for consistency.
- **wp:post_parent** — parent post ID (often 0 in this export).

So the export **does** contain real publication images: all `saccdsoctagon.org/wp-content/uploads/...` URLs.

The **current parser does not use attachments**. It only:
1. Scans post body HTML for `<img src="...">`.
2. Uses the first such URL as the article image.
3. If none (or placeholder/wayback), sets image to `''` (site placeholder).

So:
- If a post has **no `<img>` in the body** but **does** have a WordPress featured image, that featured image is in the XML as an attachment and is **not** used today.
- **Recommendation**: Build an **attachment map** (post_id → attachment_url) from all `attachment` items, then for each **post** read `wp:postmeta` where `wp:meta_key` = `_thumbnail_id` and use the attachment map to set the article’s primary image when body has no image (or as first choice over body images).

---

## 4. Featured image (thumbnail)

Posts can have:

```xml
<wp:postmeta>
  <wp:meta_key><![CDATA[_thumbnail_id]]></wp:meta_key>
  <wp:meta_value><![CDATA[39765]]></wp:meta_value>
</wp:postmeta>
```

So the post’s featured image is the **attachment** whose `wp:post_id` equals that number (e.g. 39765). The parser currently **does not** read `_thumbnail_id` or the attachment list, so featured images are only used when they also appear as an `<img>` in the body.

---

## 5. Post structure (articles)

For each `<item>` that is a post, the parser uses:

| XML path           | Use in app                          |
|--------------------|-------------------------------------|
| `title` / `#text`  | headline                            |
| `content:encoded`  | body (after cleanup)                 |
| `excerpt:encoded`  | part of dek                         |
| `wp:post_id`       | article id                          |
| `wp:post_name`     | slug (or derived from title)        |
| `wp:post_date`     | publishedAt                         |
| `dc:creator`       | author (matched to authors map)     |
| `category` (@_nicename) | section + tags (via categoryToSection) |
| (none)             | image — from body `<img>` only      |
| (none)             | _thumbnail_id not used              |

Body cleanup: strip WP comments, style/script, WP classes, normalize divs/paragraphs, trim. No change to image URLs in body (your app then restricts display to publication domains in the UI).

---

## 6. Content quirks in the XML

- **WordPress blocks**: e.g. `<!-- wp:paragraph -->` … `<!-- /wp:paragraph -->`. Parser strips all `<!-- ... -->` comments.
- **Shortcodes**: e.g. `[letsreview]` in body; they stay as raw text unless you add shortcode handling.
- **Empty or draft posts**: Many posts have empty `content:encoded` or `wp:status` = draft; those are skipped or produce minimal articles.
- **GUIDs**: Some old `guid` values point to `scdsoctagon.com` or `octagon.scdsstudent.org`; the canonical site in the export is `saccdsoctagon.org`.

---

## 7. Why you saw stock/Unsplash images

1. **Parser** only took images from post **body** `<img>` tags.
2. If a post had **no** such tag (e.g. featured image only), the parser had **no** image and previously fell back to **Unsplash** by section (that fallback is now removed).
3. So articles without an inline image in the body ended up with no image (or, historically, a stock photo). The **real** images for many of those live in the XML as **attachments** and as **`_thumbnail_id`** on posts.

---

## 8. Recommendations

1. **Use featured images**:  
   - First pass: collect all `item` where `wp:post_type` = `attachment`; build `attachmentIdToUrl[wp:post_id] = wp:attachment_url`.  
   - For each post item, read `wp:postmeta` for `_thumbnail_id`; if present, set article image from `attachmentIdToUrl[meta_value]` (and optionally prefer this over first body `<img>`).

2. **Keep only publication images**:  
   When assigning image from attachment or body, accept only URLs that match your publication domains (e.g. saccdsoctagon.org, octagon.scdsstudent.org). Reject or replace others with site placeholder so no Unsplash/third‑party URLs get into article data.

3. **Re-run after parser changes**:  
   After implementing (1) and (2), re-run the parser on `theoctagon.WordPress.2025-11-02.xml` and then run your existing script that sets story images from body (so body-first logic still applies where you want it). That will refill `octagonData.json` with publication-only images and more featured images.

4. **Optional**: Normalize attachment **guid** vs **wp:attachment_url** (e.g. always use `wp:attachment_url` when present) so all image URLs are saccdsoctagon.org and consistent.

---

## 9. Quick reference: where things are

| What you need        | Where in XML |
|----------------------|--------------|
| Post title           | `item.title` or `item.title['#text']` |
| Post body            | `item['content:encoded']` or `item['content:encoded']['#text']` |
| Featured image ID    | `item['wp:postmeta']` where `wp:meta_key` = `_thumbnail_id` → `wp:meta_value` |
| Attachment URL       | In same item, `item['wp:attachment_url']` (attachment items only) |
| Post ID              | `item['wp:post_id']` or `item['wp:post_id']['#text']` |
| Publish status       | `item['wp:status']` = `publish` |
| Categories           | `item.category` (array or single; use `@_nicename` or `#text`) |

This should give you a clear, deep view of the WordPress export and how it lines up with your parser and app.
