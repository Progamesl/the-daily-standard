/**
 * ImageUpload
 * Supports three ways to add a story image:
 *   1. Paste a URL directly
 *   2. Drag-and-drop an image file → converts to base64 and stores inline
 *   3. Click "Browse" to pick a file from disk
 *
 * Base64 works well for thumbnails/preview images kept in localStorage.
 * For large images, editors should upload to an external host (Google Photos,
 * Imgur, the school CDN) and paste the URL instead.
 */

import { useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Link2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value: string;           // current image URL or base64
  onChange: (url: string) => void;
  caption?: string;
  onCaptionChange?: (caption: string) => void;
  label?: string;
}

const MAX_B64_MB = 2; // warn if base64 exceeds this size

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
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
  const inputRef      = useRef<HTMLInputElement>(null);
  const [mode, setMode]         = useState<'url' | 'upload'>('url');
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState(value.startsWith('data:') ? '' : value);
  const [warn, setWarn]         = useState('');

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
    const b64 = await fileToBase64(file);
    if (sizeMB > MAX_B64_MB) {
      setWarn(`Large image (${sizeMB.toFixed(1)} MB) stored as base64. For best performance, upload to Imgur or Google Photos and paste the URL.`);
    }
    onChange(b64);
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

  const previewSrc = value || null;

  return (
    <div className="space-y-3">
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

      {/* URL mode */}
      {mode === 'url' && (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyUrl(); } }}
            placeholder="https://example.com/photo.jpg"
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
          className={cn(
            'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors',
            dragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
          )}
        >
          <Upload className="h-6 w-6 text-slate-400" />
          <p className="text-sm text-slate-500 text-center">
            Drag &amp; drop an image here, or <span className="text-blue-600 font-medium">click to browse</span>
          </p>
          <p className="text-xs text-slate-400">JPG, PNG, WEBP · Max 10 MB</p>
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
