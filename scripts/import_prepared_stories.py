#!/usr/bin/env python3
"""Import prepared story JSON into Supabase without Node/npm dependencies."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen


DEFAULT_PREPARED = "scripts/downloaded-stories-prepared.json"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def require_env() -> tuple[str, str]:
    url = (
        os.environ.get("VITE_SUPABASE_URL")
        or os.environ.get("SUPABASE_URL")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    )
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SECRET_KEY")
        or os.environ.get("VITE_SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )
    if not url or not key:
        raise RuntimeError("Missing Supabase URL/key in .env.local")
    return url.rstrip("/"), key


def post_json(url: str, key: str, table: str, rows: list[dict[str, Any]], dry_run: bool) -> int:
    if not rows:
        return 0

    endpoint = f"{url}/rest/v1/{table}?on_conflict=id"
    if dry_run:
        print(f"Dry run: would upsert {len(rows)} {table}.")
        return len(rows)

    request = Request(
        endpoint,
        data=json.dumps(rows).encode("utf-8"),
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=60) as response:
            if response.status not in (200, 201, 204):
                raise RuntimeError(f"Unexpected Supabase response: {response.status}")
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase {table} upsert failed: HTTP {error.code}: {body}") from error

    return len(rows)


def to_db_author(author: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": author["id"],
        "name": author["name"],
        "role": author.get("role") or "Student Journalist",
        "bio": author.get("bio") or "",
        "image": author.get("image") or "",
        "email": author.get("email") or None,
        "twitter": author.get("twitter") or None,
    }


def to_db_article(article: dict[str, Any]) -> dict[str, Any]:
    # Deliberately omit is_cinematic here so imports still work if production
    # Supabase has not run the newest schema migration yet.
    return {
        "id": article["id"],
        "slug": article["slug"],
        "headline": article["headline"],
        "dek": article.get("dek") or "",
        "body": article.get("body") or "",
        "image": article.get("image") or "",
        "images": article.get("images") or [],
        "image_caption": article.get("imageCaption") or "",
        "section": article["section"],
        "author_id": article["author"]["id"],
        "author_name": article["author"]["name"],
        "published_at": article.get("publishedAt"),
        "updated_at": article.get("updatedAt"),
        "reading_time": article.get("readingTime") or 1,
        "tags": article.get("tags") or [],
        "status": article.get("status") or "draft",
        "priority": article.get("priority") or "normal",
        "featured": bool(article.get("featured")),
        "assigned_to_id": article.get("assignedToId"),
        "assigned_to_name": article.get("assignedToName"),
        "assigned_by_id": article.get("assignedById"),
        "reviewed_by_id": article.get("reviewedById"),
        "deadline": article.get("deadline"),
        "pitch_summary": article.get("pitchSummary"),
        "meta_title": article.get("metaTitle"),
        "meta_description": article.get("metaDescription"),
        "og_image": article.get("ogImage"),
        "canonical_url": article.get("canonicalUrl"),
        "internal_notes": article.get("internalNotes") or [],
        "revisions": article.get("revisions") or [],
        "word_count": article.get("wordCount"),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("prepared", nargs="?", default=DEFAULT_PREPARED)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    load_env_file(Path(".env.local"))
    load_env_file(Path(".env"))

    prepared_path = Path(args.prepared)
    prepared = json.loads(prepared_path.read_text(encoding="utf-8"))
    articles = prepared.get("articles") or []
    authors = list((prepared.get("authors") or {}).values())

    supabase_url, supabase_key = require_env()
    db_authors = [to_db_author(author) for author in authors]
    db_articles = [to_db_article(article) for article in articles]

    saved_authors = post_json(supabase_url, supabase_key, "authors", db_authors, args.dry_run)
    saved_articles = post_json(supabase_url, supabase_key, "articles", db_articles, args.dry_run)

    published = sum(1 for article in articles if article.get("status") == "published")
    drafts = sum(1 for article in articles if article.get("status") == "draft")
    print(f"Imported {saved_articles} articles and {saved_authors} authors.")
    print(f"Published: {published}")
    print(f"Draft: {drafts}")
    if prepared.get("unresolved"):
        print(f"Unresolved: {len(prepared['unresolved'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
