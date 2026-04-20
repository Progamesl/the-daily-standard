/**
 * useComments Hook
 *
 * Fetches approved comments for an article and subscribes to Realtime updates.
 * When a new comment is inserted and approved, it appears immediately without refetch.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Comment {
  id: string;
  article_id: string;
  display_name: string;
  content: string;
  approved: boolean;
  created_at: string;
}

interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  submitComment: (displayName: string, content: string) => Promise<{ error: string | null }>;
  submitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;
}

export function useComments(articleId: string): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [tableMissing, setTableMissing] = useState(false);

  // ─── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase || !articleId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchComments() {
      if (tableMissing) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('article_id', articleId)
          .eq('approved', true)
          .order('created_at', { ascending: true });

        if (error) {
          // 42P01 is the PostgREST/Postgres error for "relation does not exist"
          if (error.code === '42P01') {
            console.warn('ℹ️ Comment system is not yet initialized (table "public.comments" missing). Run migrations_comments_only.sql to enable.');
            setTableMissing(true);
          } else {
            console.error('Failed to fetch comments:', error);
          }
          
          if (!cancelled) {
            setComments([]);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setComments((data as Comment[]) || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching comments:', err);
        if (!cancelled) {
          setComments([]);
          setLoading(false);
        }
      }
    }

    fetchComments();

    // ─── Realtime subscription ────────────────────────────────────────────────
    const channelName = `comments-${articleId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `article_id=eq.${articleId}`,
        },
        (payload) => {
          const newComment = payload.new as Comment;
          // Only add if approved (moderation happens server-side or via admin)
          if (newComment.approved && !cancelled) {
            setComments((prev) => {
              // Avoid duplicates
              if (prev.some((c) => c.id === newComment.id)) {
                return prev;
              }
              // Insert in chronological order
              return [...prev, newComment].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [articleId]);

  // ─── Submit comment ─────────────────────────────────────────────────────────
  const submitComment = async (
    displayName: string,
    content: string
  ): Promise<{ error: string | null }> => {
    if (!supabase || !articleId) {
      return { error: 'Supabase is not configured.' };
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const { error } = await supabase.from('comments').insert({
        article_id: articleId,
        display_name: displayName.trim(),
        content: content.trim(),
        approved: false, // Requires moderation
      });

      if (error) {
        setSubmitError(error.message);
        return { error: error.message };
      }

      setSubmitSuccess(true);
      // Clear success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit comment';
      setSubmitError(message);
      return { error: message };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    comments,
    loading,
    submitComment,
    submitting,
    submitError,
    submitSuccess,
  };
}
