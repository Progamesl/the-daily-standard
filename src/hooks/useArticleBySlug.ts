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
import { normalizeArticle } from '@/lib/normalizeArticle';
import { readCoAuthors } from '@/lib/coAuthors';

function adminToArticle(admin: AdminArticle): Article {
  // Supabase rows aren't runtime-type-checked; normalise so a malformed field
  // can't throw while the article renders.
  return {
    ...normalizeArticle({ ...admin, coAuthors: readCoAuthors(admin.internalNotes) }),
    isCinematic: Boolean(admin.isCinematic),
  } as Article;
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
          const converted = admin ? adminToArticle(admin) : getPublicArticleBySlug(slug) ?? (fromAdmin ? adminToArticle(fromAdmin) : undefined);
          setArticle(prev => {
            if (prev && converted && !converted.body && prev.body) {
              return { ...converted, body: prev.body };
            }
            return converted;
          });
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

    // Public: R2 first → Supabase fallback → seed fallback
    if (!isR2ArticlesConfigured()) {
      // No R2 — try Supabase directly, then seed
      if (isSupabaseConfigured()) {
        let cancelled = false;
        setLoading(true);
        setError(null);
        getArticleBySlugFromSupabase(slug, { publishedOnly: true })
          .then((admin) => {
            if (cancelled) return;
            setArticle(admin ? adminToArticle(admin) : (getPublicArticleBySlug(slug) ?? undefined));
            setError(null);
          })
          .catch(() => {
            if (!cancelled) setArticle(getPublicArticleBySlug(slug) ?? undefined);
          })
          .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
      }
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
      .then(async (fromR2) => {
        if (cancelled) return;
        if (fromR2) {
          setArticle(prev => {
            // Always prefer a version with a body
            if (prev && !fromR2.body && prev.body) {
              return { ...fromR2, body: prev.body };
            }
            return fromR2;
          });
          setError(null);
          return;
        }
        // Article not in R2 yet — fall back to Supabase so newly published articles appear
        if (isSupabaseConfigured()) {
          try {
            const fromSupabase = await getArticleBySlugFromSupabase(slug, { publishedOnly: true });
            if (!cancelled) {
              const converted = fromSupabase ? adminToArticle(fromSupabase) : (getPublicArticleBySlug(slug) ?? undefined);
              setArticle(prev => {
                if (prev && converted && !converted.body && prev.body) {
                  return { ...converted, body: prev.body };
                }
                return converted;
              });
              setError(null);
            }
          } catch {
            if (!cancelled) setArticle(getPublicArticleBySlug(slug) ?? undefined);
          }
        } else {
          setArticle(getPublicArticleBySlug(slug) ?? undefined);
        }
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
