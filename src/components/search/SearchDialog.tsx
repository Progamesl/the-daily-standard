import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getAllPublicArticles } from "@/lib/publicDataService";
import { useDataSync } from "@/contexts/DataSyncContext";
import { Search, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { syncVersion } = useDataSync();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return getAllPublicArticles().filter(
      (a) =>
        a.headline.toLowerCase().includes(q) ||
        a.dek?.toLowerCase().includes(q) ||
        a.section.toLowerCase().includes(q) ||
        a.author?.name?.toLowerCase().includes(q) ||
        a.tags?.some((t) => t.toLowerCase().includes(q))
    );
    // syncVersion in deps so results refresh when live R2 data loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, syncVersion]).slice(0, 8);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        navigate(`/article/${results[selectedIndex].slug}`);
        onOpenChange(false);
        setQuery("");
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, selectedIndex, navigate, onOpenChange]);

  const handleSelect = (slug: string) => {
    navigate(`/article/${slug}`);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden shadow-2xl border-rule-thick">
        <DialogHeader className="px-5 py-4 border-b border-border bg-muted/20">
          <DialogTitle className="font-serif text-xl italic">Search The Octagon</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border-b border-border px-4 bg-background">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search by headline, section, author..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none h-14 text-base"
            autoFocus
            aria-label="Search"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 && query.trim() && (
            <p className="p-4 text-sm text-muted-foreground">No articles found.</p>
          )}
          {results.length === 0 && !query.trim() && (
            <p className="p-4 text-sm text-muted-foreground">Type to search articles.</p>
          )}
          <ul role="listbox" aria-label="Search results">
            {results.map((article, i) => (
              <li
                key={article.id}
                role="option"
                aria-selected={i === selectedIndex}
                className={cn(
                  "flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border last:border-0",
                  i === selectedIndex && "bg-muted"
                )}
                onClick={() => handleSelect(article.slug)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm line-clamp-2">{article.headline}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {article.section} · {article.author.name}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
