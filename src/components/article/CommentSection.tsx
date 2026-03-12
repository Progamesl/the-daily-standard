/**
 * CommentSection Component
 *
 * Displays approved comments for an article and allows users to submit new comments.
 * Uses Realtime to show new comments immediately when they're approved.
 */

import { useState } from 'react';
import { useComments } from '@/hooks/useComments';

interface CommentSectionProps {
  articleId: string;
}

/**
 * Format a timestamp as relative time (e.g., "2 hours ago", "just now").
 * No external library — pure JavaScript.
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 10) return 'just now';
  if (diffSecs < 60) return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
}

export function CommentSection({ articleId }: CommentSectionProps) {
  const { comments, loading, submitComment, submitting, submitError, submitSuccess } =
    useComments(articleId);
  const [displayName, setDisplayName] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = displayName.trim();
    const trimmedContent = content.trim();

    if (trimmedName.length === 0 || trimmedName.length > 50) {
      return;
    }
    if (trimmedContent.length < 10 || trimmedContent.length > 500) {
      return;
    }

    const result = await submitComment(trimmedName, trimmedContent);
    if (!result.error) {
      setDisplayName('');
      setContent('');
    }
  };

  return (
    <section className="mt-12 pt-8 border-t border-slate-200">
      <h2 className="font-serif text-xl font-bold text-slate-900 mb-6">
        Comments ({comments.length})
      </h2>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-full mb-1"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && comments.length === 0 && (
        <p className="text-slate-600 text-sm mb-8">Be the first to comment on this story.</p>
      )}

      {/* Comment list */}
      {!loading && comments.length > 0 && (
        <div className="space-y-6 mb-8">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-slate-100 pb-4 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <span className="font-semibold text-slate-900 text-sm">{comment.display_name}</span>
                <span className="text-xs text-slate-500">{formatRelativeTime(comment.created_at)}</span>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Submit form */}
      <form onSubmit={handleSubmit} className="border-t border-slate-200 pt-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="comment-name" className="block text-sm font-medium text-slate-700 mb-1">
              Display Name
            </label>
            <input
              id="comment-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="comment-content" className="block text-sm font-medium text-slate-700 mb-1">
              Comment
            </label>
            <textarea
              id="comment-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              minLength={10}
              maxLength={500}
              required
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-y"
              placeholder="Share your thoughts..."
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-slate-500">
                {content.length < 10
                  ? `Minimum ${10 - content.length} more characters`
                  : `${content.length}/500 characters`}
              </span>
              <span className="text-xs text-slate-500">{content.length}/500</span>
            </div>
          </div>

          {submitError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              Your comment has been submitted and is awaiting moderation.
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || displayName.trim().length === 0 || content.trim().length < 10}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Comment'
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
