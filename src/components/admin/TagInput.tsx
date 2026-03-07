import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Add a tag…',
  className,
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(input.toLowerCase()) &&
      !value.includes(s)
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [input]);

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !value.includes(t)) {
      onChange([...value, t]);
    }
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (showSuggestions && filtered[selectedIndex]) {
        addTag(filtered[selectedIndex]);
      } else if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-background min-h-[42px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-red-500 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(e.target.value.length > 0);
          }}
          onFocus={() => input.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filtered.slice(0, 8).map((suggestion, i) => (
            <button
              key={suggestion}
              type="button"
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors',
                i === selectedIndex && 'bg-accent'
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(suggestion);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
