/**
 * BreakingNewsTicker Component
 *
 * Displays a scrolling ticker of active breaking news items.
 * Uses pure CSS animation for seamless horizontal scrolling.
 * Updates in real-time via Supabase Realtime.
 */

import { useBreakingNews } from '@/hooks/useBreakingNews';

export function BreakingNewsTicker() {
  const { items, loading } = useBreakingNews();

  // Don't render if loading or no active items
  if (loading || items.length === 0) {
    return null;
  }

  // Create text content array for duplication
  const textItems: Array<{ id: string; text: string; url: string | null }> = [];
  items.forEach((item, idx) => {
    textItems.push({ id: item.id, text: item.text, url: item.url });
    if (idx < items.length - 1) {
      textItems.push({ id: `bullet-${idx}`, text: ' • ', url: null });
    }
  });

  // Duplicate for seamless loop
  const duplicatedTextItems = [...textItems, ...textItems];

  return (
    <>
      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .breaking-news-scroll {
          animation: scroll-left 30s linear infinite;
        }
        .breaking-news-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="w-full bg-slate-900 text-white py-2 overflow-hidden relative">
        <div className="flex items-center">
          {/* BREAKING badge */}
          <div className="bg-red-600 text-white font-bold text-xs uppercase px-3 py-1 shrink-0 z-10">
            BREAKING
          </div>

          {/* Scrolling content */}
          <div className="flex-1 overflow-hidden">
            <div className="breaking-news-scroll flex items-center">
              {duplicatedTextItems.map((item, idx) => (
                <span key={`${item.id}-${idx}`} className="text-sm sm:text-base whitespace-nowrap">
                  {item.url ? (
                    <a
                      href={item.url}
                      className="hover:underline transition-opacity"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span>{item.text}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
