#!/usr/bin/env python3
"""Sync published Supabase + seed articles to Cloudflare R2 without Node."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import hmac
import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen


SEED_PATH = Path("src/data/octagonData.json")


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def env(name: str, *fallbacks: str) -> str:
    for key in (name, *fallbacks):
        value = os.environ.get(key)
        if value:
            return value
    raise RuntimeError(f"Missing environment variable: {name}")


def supabase_get(url: str, key: str, path: str, params: dict[str, str]) -> list[dict[str, Any]]:
    endpoint = f"{url.rstrip('/')}/rest/v1/{path}?{urlencode(params)}"
    request = Request(
        endpoint,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase fetch failed: HTTP {error.code}: {body}") from error


def row_to_public(row: dict[str, Any]) -> dict[str, Any]:
    author = row.get("author") or {}
    return {
        "id": str(row.get("id") or ""),
        "slug": row.get("slug") or "",
        "headline": row.get("headline") or "",
        "dek": row.get("dek") or "",
        "body": row.get("body") or "",
        "image": row.get("image") or "",
        "images": row.get("images") or [],
        "imageCaption": row.get("image_caption") or row.get("imageCaption") or "",
        "section": row.get("section") or "",
        "author": {
            "id": str(author.get("id") or row.get("author_id") or ""),
            "name": author.get("name") or row.get("author_name") or "",
            "role": author.get("role") or "Student Journalist",
            "bio": author.get("bio") or "",
            "image": author.get("image") or "",
            "email": author.get("email"),
            "twitter": author.get("twitter"),
        },
        "publishedAt": row.get("published_at") or row.get("publishedAt") or dt.datetime.now(dt.timezone.utc).isoformat(),
        "updatedAt": row.get("updated_at") or row.get("updatedAt"),
        "readingTime": row.get("reading_time") or row.get("readingTime") or 1,
        "tags": row.get("tags") or [],
        "featured": bool(row.get("featured") or False),
        "priority": row.get("priority") or "normal",
    }


def parse_time(value: str) -> float:
    try:
        return dt.datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def merge_articles(seed_articles: list[dict[str, Any]], supabase_articles: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_slug: dict[str, dict[str, Any]] = {}
    for article in seed_articles:
        public = row_to_public(article)
        if public["slug"]:
            by_slug[public["slug"]] = public

    for article in supabase_articles:
        public = row_to_public(article)
        if not public["slug"]:
            continue
        existing = by_slug.get(public["slug"])
        if existing and not public.get("body") and existing.get("body"):
            by_slug[public["slug"]] = {**public, "body": existing["body"]}
        else:
            by_slug[public["slug"]] = public
    return by_slug


def sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def signing_key(secret: str, date_stamp: str, region: str, service: str) -> bytes:
    date_key = sign(("AWS4" + secret).encode("utf-8"), date_stamp)
    region_key = sign(date_key, region)
    service_key = sign(region_key, service)
    return sign(service_key, "aws4_request")


def put_r2(
    endpoint: str,
    bucket: str,
    access_key: str,
    secret_key: str,
    key: str,
    body: bytes,
    cache_control: str,
    dry_run: bool,
) -> None:
    parsed = urlparse(endpoint.rstrip("/"))
    host = parsed.netloc
    region = "auto"
    service = "s3"
    now = dt.datetime.now(dt.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    payload_hash = hashlib.sha256(body).hexdigest()
    canonical_uri = "/" + quote(f"{bucket}/{key}", safe="/")
    url = f"{parsed.scheme}://{host}{canonical_uri}"

    headers = {
        "cache-control": cache_control,
        "content-type": "application/json",
        "host": host,
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz_date,
    }
    signed_headers = ";".join(sorted(headers))
    canonical_headers = "".join(f"{name}:{headers[name]}\n" for name in sorted(headers))
    canonical_request = "\n".join([
        "PUT",
        canonical_uri,
        "",
        canonical_headers,
        signed_headers,
        payload_hash,
    ])
    algorithm = "AWS4-HMAC-SHA256"
    credential_scope = f"{date_stamp}/{region}/{service}/aws4_request"
    string_to_sign = "\n".join([
        algorithm,
        amz_date,
        credential_scope,
        hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
    ])
    signature = hmac.new(
        signing_key(secret_key, date_stamp, region, service),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    authorization = (
        f"{algorithm} Credential={access_key}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )

    if dry_run:
        print(f"Dry run: would upload r2://{bucket}/{key} ({len(body)} bytes)")
        return

    request_headers = {
        "Cache-Control": cache_control,
        "Content-Type": "application/json",
        "Host": host,
        "X-Amz-Content-Sha256": payload_hash,
        "X-Amz-Date": amz_date,
        "Authorization": authorization,
    }
    request = Request(url, data=body, headers=request_headers, method="PUT")
    try:
        with urlopen(request, timeout=60) as response:
            if response.status not in (200, 201, 204):
                raise RuntimeError(f"Unexpected R2 response: HTTP {response.status}")
    except HTTPError as error:
        body_text = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"R2 upload failed for {key}: HTTP {error.code}: {body_text}") from error


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    load_env_file(Path(".env.local"))
    load_env_file(Path(".env"))

    supabase_url = env("VITE_SUPABASE_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = env("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY")
    r2_access = env("R2_ACCESS_KEY_ID")
    r2_secret = env("R2_SECRET_ACCESS_KEY")
    r2_endpoint = env("R2_S3_ENDPOINT")
    r2_bucket = os.environ.get("R2_BUCKET") or "octagon-images"

    columns = ",".join([
        "id",
        "slug",
        "headline",
        "dek",
        "body",
        "image",
        "images",
        "image_caption",
        "section",
        "author_id",
        "author_name",
        "published_at",
        "updated_at",
        "reading_time",
        "tags",
        "featured",
        "priority",
    ])
    supabase_rows = supabase_get(
        supabase_url,
        supabase_key,
        "articles",
        {"select": columns, "status": "eq.published"},
    )
    seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    by_slug = merge_articles(seed.get("articles") or [], supabase_rows)
    articles = list(by_slug.values())
    article_list = [
        {key: value for key, value in article.items() if key != "body"}
        for article in sorted(articles, key=lambda item: parse_time(item.get("publishedAt", "")), reverse=True)
    ]

    put_r2(
        r2_endpoint,
        r2_bucket,
        r2_access,
        r2_secret,
        "articles/articles.json",
        json.dumps(article_list, separators=(",", ":")).encode("utf-8"),
        "public, max-age=60, stale-while-revalidate=300",
        args.dry_run,
    )

    for article in articles:
        slug = article.get("slug")
        if not slug:
            continue
        put_r2(
            r2_endpoint,
            r2_bucket,
            r2_access,
            r2_secret,
            f"articles/content/{slug}.json",
            json.dumps(article, separators=(",", ":")).encode("utf-8"),
            "public, max-age=3600, stale-while-revalidate=86400",
            args.dry_run,
        )

    print(f"Synced {len(article_list)} articles to R2.")
    print(f"Supabase published: {len(supabase_rows)}")
    print(f"Seed articles: {len(seed.get('articles') or [])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
