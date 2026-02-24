import { useState } from "react";
import { Share2, Twitter, Facebook, Link2, Check, Type, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListenButton } from "./ListenButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SAVED_ARTICLES_KEY = "octagon-saved-articles";

function getSavedSlugs(): Set<string> {
  try {
    const raw = localStorage.getItem(SAVED_ARTICLES_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

function toggleSaved(slug: string): boolean {
  const set = getSavedSlugs();
  if (set.has(slug)) {
    set.delete(slug);
  } else {
    set.add(slug);
  }
  localStorage.setItem(SAVED_ARTICLES_KEY, JSON.stringify([...set]));
  return set.has(slug);
}

interface ArticleReadingToolbarProps {
  slug: string;
  headline: string;
  dek: string;
  bodyText: string;
  shareUrl: string;
  shareTitle: string;
  shareDescription?: string;
  onFontSizeChange?: (size: "normal" | "large" | "xlarge") => void;
  fontSize?: "normal" | "large" | "xlarge";
}

export function ArticleReadingToolbar({
  slug,
  headline,
  dek,
  bodyText,
  shareUrl,
  shareTitle,
  shareDescription,
  onFontSizeChange,
  fontSize = "normal",
}: ArticleReadingToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(() => getSavedSlugs().has(slug));

  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${shareUrl}` : shareUrl;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareTitle)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareDescription ?? shareTitle,
          url: fullUrl,
        });
      } catch {
        // user cancelled or error
      }
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const handleBookmark = () => {
    const nowSaved = toggleSaved(slug);
    setSaved(nowSaved);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-3 border-t border-border">
      <ListenButton title={headline} text={bodyText} className="shrink-0" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground shrink-0">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          {hasNativeShare && (
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share (device)
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
              <Twitter className="h-4 w-4 mr-2" />
              Twitter
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer">
              <Facebook className="h-4 w-4 mr-2" />
              Facebook
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyLink}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Copy link
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        className={`gap-2 shrink-0 ${saved ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}
        onClick={handleBookmark}
        aria-label={saved ? "Remove from saved" : "Save article"}
      >
        {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        {saved ? "Saved" : "Save"}
      </Button>

      {onFontSizeChange && (
        <div className="flex items-center gap-0.5 border border-border rounded-md p-0.5 shrink-0">
          <span className="sr-only">Text size</span>
          <Button
            variant={fontSize === "normal" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 text-xs font-bold"
            onClick={() => onFontSizeChange("normal")}
            aria-label="Normal text size"
          >
            A
          </Button>
          <Button
            variant={fontSize === "large" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 text-sm font-bold"
            onClick={() => onFontSizeChange("large")}
            aria-label="Large text"
          >
            A
          </Button>
          <Button
            variant={fontSize === "xlarge" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 text-base font-bold"
            onClick={() => onFontSizeChange("xlarge")}
            aria-label="Largest text"
          >
            A
          </Button>
        </div>
      )}
    </div>
  );
}
