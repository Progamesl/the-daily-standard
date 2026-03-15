/**
 * Fetches a single article by slug. When Supabase is configured, fetches only this
 * article from the API (reduces egress vs loading all articles with bodies).
 */

import { useState, useEffect } from 'react';
import { getArticleBySlugFromSupabase } from '@/lib/supabaseDataService';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { getPublicArticleBySlug } from '@/lib/publicDataService';
import { getAdminArticleBySlug } from '@/lib/adminDataService';
import type { Article } from '@/data/seedData';
import type { AdminArticle } from '@/lib/adminDataService';

function adminToArticle(admin: AdminArticle): Article {
  return {
    id: admin.id,
    slug: admin.slug,
    headline: admin.headline,
    dek: admin.dek,
    body: admin.body,
    image: admin.image,
    images: admin.images ?? [],
    imageCaption: admin.imageCaption,
    section: admin.section,
    author: admin.author,
    publishedAt: new Date(admin.publishedAt),
    updatedAt: admin.updatedAt ? new Date(admin.updatedAt) : undefined,
    readingTime: admin.readingTime,
    tags: admin.tags ?? [],
  };
}

export function useArticleBySlug(
  slug: string | undefined,
  isPreview: boolean
): { article: Article | undefined; loading: boolean; error: Error | null } {
  // When Supabase is on, we may have list-only data (body ''). Show that immediately, then load body.
  const [article, setArticle] = useState<Article | undefined>(() => {
    if (!slug) return undefined;
    const fromAdmin = isPreview ? getAdminArticleBySlug(slug) : null;
    const a = fromAdmin ? adminToArticle(fromAdmin) : getPublicArticleBySlug(slug);
    return a ?? undefined;
  });
  const [loading, setLoading] = useState(!!slug && isSupabaseConfigured());
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) {
      setArticle(undefined);
      setLoading(false);
      setError(null);
      return;
    }

    if (!isSupabaseConfigured()) {
      const fromAdmin = isPreview ? getAdminArticleBySlug(slug) : null;
      const a = fromAdmin ? adminToArticle(fromAdmin) : getPublicArticleBySlug(slug);
      setArticle(a ?? undefined);
      setLoading(false);
      setError(null);
      return;
    }

    // Show partial from list cache immediately (headline, dek, hero) so the page isn’t blank
    const fromAdmin = isPreview ? getAdminArticleBySlug(slug) : null;
    const partial = getPublicArticleBySlug(slug) ?? (fromAdmin ? adminToArticle(fromAdmin) : undefined);
    if (partial) setArticle(partial);

    let cancelled = false;
    setLoading(true);
    setError(null);
    getArticleBySlugFromSupabase(slug, { publishedOnly: !isPreview })
      .then((admin) => {
        if (cancelled) return;
        if (admin) {
          setArticle(adminToArticle(admin));
        } else {
          // Not in Supabase (e.g. older/seed-only article) — use merged list (seed + admin)
          const fromPublic = getPublicArticleBySlug(slug);
          const fromAdmin = isPreview ? getAdminArticleBySlug(slug) : null;
          setArticle(fromPublic ?? (fromAdmin ? adminToArticle(fromAdmin) : undefined));
        }
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setArticle(undefined);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, isPreview]);

  return { article, loading, error };
}
