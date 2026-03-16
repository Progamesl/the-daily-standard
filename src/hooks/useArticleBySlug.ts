/**
 * Fetches a single article by slug.
 * Public: R2 JSON first (zero Supabase egress), then seed fallback.
 * Preview: Supabase/admin only.
 */

import { useState, useEffect } from 'react';
import { getArticleBySlugFromSupabase } from '@/lib/supabaseDataService';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { getPublicArticleBySlug } from '@/lib/publicDataService';
import { getAdminArticleBySlug } from '@/lib/adminDataService';
import { getArticleBySlugFromR2, isR2ArticlesConfigured } from '@/lib/r2Articles';
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
  const [article, setArticle] = useState<Article | undefined>(() => {
    if (!slug) return undefined;
    const fromAdmin = isPreview ? getAdminArticleBySlug(slug) : null;
    const a = fromAdmin ? adminToArticle(fromAdmin) : getPublicArticleBySlug(slug);
    return a ?? undefined;
  });
  const [loading, setLoading] = useState(
    !!slug && (isR2ArticlesConfigured() || (isPreview && isSupabaseConfigured()))
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) {
      setArticle(undefined);
      setLoading(false);
      setError(null);
      return;
    }

    if (isPreview) {
      const fromAdmin = getAdminArticleBySlug(slug);
      if (fromAdmin) setArticle(adminToArticle(fromAdmin));
      if (!isSupabaseConfigured()) {
        setArticle(fromAdmin ? adminToArticle(fromAdmin) : getPublicArticleBySlug(slug) ?? undefined);
        setLoading(false);
        return;
      }
      let cancelled = false;
      setLoading(true);
      setError(null);
      getArticleBySlugFromSupabase(slug, { publishedOnly: false })
        .then((admin) => {
          if (cancelled) return;
          setArticle(
            admin ? adminToArticle(admin) : getPublicArticleBySlug(slug) ?? (fromAdmin ? adminToArticle(fromAdmin) : undefined)
          );
          setError(null);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    // Public: R2 first (no Supabase), then seed
    if (!isR2ArticlesConfigured()) {
      setArticle(getPublicArticleBySlug(slug) ?? undefined);
      setLoading(false);
      return;
    }
    const partial = getPublicArticleBySlug(slug);
    if (partial) setArticle(partial);
    let cancelled = false;
    setLoading(true);
    setError(null);
    getArticleBySlugFromR2(slug)
      .then((fromR2) => {
        if (cancelled) return;
        setArticle(fromR2 ?? getPublicArticleBySlug(slug) ?? undefined);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setArticle(getPublicArticleBySlug(slug) ?? undefined);
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
