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
 * Compress image to reduce file size while maintaining good quality.
 * Returns a compressed base64 string.
 */
function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if too large
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            // Convert compressed blob to base64
            const reader2 = new FileReader();
            reader2.onload = () => resolve(reader2.result as string);
            reader2.onerror = () => reject(new Error('Failed to read compressed image'));
            reader2.readAsDataURL(blob);
          },
          file.type || 'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert file to base64, with automatic compression for large images.
 * Small images (< 1MB) are preserved at full quality.
 * Large images are compressed to fit within storage limits.
 */
function fileToBase64(file: File): Promise<string> {
  const sizeMB = file.size / (1024 * 1024);
  
  // For small images, use direct conversion (no compression)
  if (sizeMB < 1) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
  
  // For larger images, compress them
  // Adjust quality based on size: larger = more compression
  let quality = 0.85;
  let maxWidth = 1920;
  
  if (sizeMB > 5) {
    quality = 0.7;
    maxWidth = 1280;
  } else if (sizeMB > 3) {
    quality = 0.75;
    maxWidth = 1600;
  } else if (sizeMB > 2) {
    quality = 0.8;
    maxWidth = 1920;
  }
  
  return compressImage(file, maxWidth, quality);
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
      // Automatically compress large images
      const b64 = await fileToBase64(file);
      const finalSizeMB = new Blob([b64]).size / (1024 * 1024);
      
      if (sizeMB > 1) {
        // Show compression info if image was compressed
        const compressionRatio = ((1 - finalSizeMB / sizeMB) * 100).toFixed(0);
        if (compressionRatio !== '0') {
          setWarn(`✓ Image compressed from ${sizeMB.toFixed(1)} MB to ${finalSizeMB.toFixed(1)} MB (${compressionRatio}% smaller) to fit storage limits.`);
        }
      }
      
      if (finalSizeMB > 2.5) {
        setWarn(`⚠️ Large image (${finalSizeMB.toFixed(1)} MB). If you encounter storage errors, consider using an image URL instead.`);
      }
      
      onChange(b64);
      // Brief success feedback
      setTimeout(() => setPasting(false), 300);
    } catch (err) {
      setPasting(false);
      const errorMsg = err instanceof Error ? err.message : 'Failed to process image';
      if (errorMsg.includes('quota') || errorMsg.includes('storage')) {
        setWarn('Storage full! Image too large. Please upload to Imgur/Google Photos and paste the URL instead.');
      } else {
        setWarn('Failed to process image. Please try again.');
      }
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
