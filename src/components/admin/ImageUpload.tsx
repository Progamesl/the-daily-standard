/**
 * ImageUpload
 * Supports four ways to add a story image:
 *   1. Paste a URL directly
 *   2. Paste an image from clipboard (⌘V / Ctrl+V)
 *   3. Drag-and-drop an image file → converts to base64 and stores inline
 *   4. Click "Browse" to pick a file from disk
 *
 * Base64 works well for thumbnails/preview images kept in localStorage.
 * For large images, editors should upload to an external host (Google Photos,
 * Imgur, the school CDN) and paste the URL instead.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Link2, X, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value: string;           // current image URL or base64
  onChange: (url: string) => void;
  caption?: string;
  onCaptionChange?: (caption: string) => void;
  label?: string;
}

const MAX_B64_MB = 2; // warn if base64 exceeds this size

/**
 * Convert file to base64 with maximum quality preservation.
 * For images, we use FileReader directly to preserve 100% quality (no compression).
 * Canvas is only used as a fallback if needed.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use FileReader directly for maximum quality - it converts file to base64
    // without any compression or quality loss
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Clean up object URL if we created one
      resolve(result);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({
  value,
  onChange,
  caption = '',
  onCaptionChange,
  label = 'Story Image',
}: ImageUploadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const [mode, setMode]         = useState<'url' | 'upload'>('url');
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState(value.startsWith('data:') ? '' : value);
  const [warn, setWarn]         = useState('');
  const [pasting, setPasting]   = useState(false);

  const applyFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setWarn('Please select an image file.');
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 10) {
      setWarn('File is too large (max 10 MB). Paste a URL instead.');
      return;
    }
    setWarn('');
    setPasting(true);
    try {
      // FileReader preserves 100% quality - no compression
      const b64 = await fileToBase64(file);
      if (sizeMB > MAX_B64_MB) {
        setWarn(`Large image (${sizeMB.toFixed(1)} MB) stored as base64. For best performance, upload to Imgur or Google Photos and paste the URL.`);
      }
      onChange(b64);
      // Brief success feedback
      setTimeout(() => setPasting(false), 300);
    } catch (err) {
      setPasting(false);
      setWarn('Failed to process image. Please try again.');
    }
  }, [onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  }, [applyFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
    e.target.value = '';
  }, [applyFile]);

  const applyUrl = () => {
    const cleaned = urlInput.trim();
    if (cleaned) onChange(cleaned);
  };

  const clear = () => {
    onChange('');
    setUrlInput('');
    setWarn('');
  };

  // Clipboard paste handler - works globally when component is mounted
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Don't intercept if user is typing in a text input/textarea (let normal paste work)
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).type === 'text' ||
        activeEl.tagName === 'TEXTAREA'
      )) {
        // Check if it's our URL input - if so, check for image data first
        if (activeEl === inputRef.current) {
          const items = e.clipboardData?.items;
          if (items) {
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                  await applyFile(file);
                  setMode('upload'); // Switch to upload mode to show preview
                }
                return;
              }
            }
          }
        }
        // Otherwise, let normal text paste work
        return;
      }

      // For all other cases (clicking in upload area, or anywhere in component), handle image paste
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await applyFile(file);
            setMode('upload'); // Switch to upload mode to show preview
          }
          break;
        }
      }
    };

    // Add paste listener to document
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [applyFile]);

  const previewSrc = value || null;

  return (
    <div ref={containerRef} className="space-y-3">
      <Label className="text-sm font-medium text-slate-700 block">{label}</Label>

      {/* Mode tabs */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden w-fit">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
            mode === 'url'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-500 hover:bg-slate-50'
          )}
        >
          <Link2 className="h-3.5 w-3.5" />Paste URL
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-200',
            mode === 'upload'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-500 hover:bg-slate-50'
          )}
        >
          <Upload className="h-3.5 w-3.5" />Upload File
        </button>
      </div>

      {/* Paste hint */}
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        <Clipboard className="h-3 w-3" />
        <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">⌘V</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">Ctrl+V</kbd> to paste an image from clipboard</span>
      </p>

      {/* URL mode */}
      {mode === 'url' && (
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyUrl(); } }}
            placeholder="https://example.com/photo.jpg or paste image (⌘V)"
            className="flex-1 text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={applyUrl}>
            Set
          </Button>
        </div>
      )}

      {/* Upload / drag-drop mode */}
      {mode === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          onFocus={() => {}} // Make div focusable for paste
          tabIndex={0}
          className={cn(
            'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
            pasting
              ? 'border-green-400 bg-green-50'
              : dragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
          )}
        >
          <Upload className={cn('h-6 w-6 transition-colors', pasting ? 'text-green-600' : 'text-slate-400')} />
          <p className="text-sm text-slate-500 text-center">
            {pasting ? (
              <span className="text-green-600 font-medium">✓ Image pasted!</span>
            ) : (
              <>
                Drag &amp; drop an image here, or <span className="text-blue-600 font-medium">click to browse</span>
              </>
            )}
          </p>
          <p className="text-xs text-slate-400">JPG, PNG, WEBP · Max 10 MB · Or paste from clipboard</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileInput}
          />
        </div>
      )}

      {/* Warning */}
      {warn && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠ {warn}
        </p>
      )}

      {/* Preview */}
      {previewSrc && (
        <div className="relative rounded-lg overflow-hidden border border-slate-200">
          <img
            src={previewSrc}
            alt="Preview"
            className="w-full h-44 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
            title="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Caption */}
      {previewSrc && onCaptionChange && (
        <Input
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Image caption (optional)"
          className="text-sm"
        />
      )}
    </div>
  );
}
