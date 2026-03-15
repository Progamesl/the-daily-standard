/**
 * ImageUpload
 * Supports four ways to add a story image:
 *   1. Paste a URL directly
 *   2. Paste an image from clipboard (⌘V / Ctrl+V)
 *   3. Drag-and-drop / paste / browse → uploads to Cloudinary (or Imgur if not configured), stores URL
 *
 * Prefer Cloudinary (set VITE_CLOUDINARY_* in .env) so images don't use Supabase. Hold Ctrl/Cmd to save as base64.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Link2, X, Clipboard, CloudUpload, Loader2 } from 'lucide-react';
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
 * Convert file to base64, with MINIMAL compression only when absolutely necessary.
 * Maximum quality preservation is the priority.
 * Only compresses if the image would exceed storage limits.
 */
function fileToBase64(file: File): Promise<string> {
  const sizeMB = file.size / (1024 * 1024);
  
  // For images under 3MB, use direct conversion (NO compression, 100% quality)
  if (sizeMB < 3) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
  
  // Only compress if image is very large (3MB+)
  // Use very high quality settings to maintain maximum quality
  let quality = 0.95;  // 95% quality (near-lossless)
  let maxWidth = 2560;  // Keep high resolution
  
  // Only apply more compression if absolutely necessary (5MB+)
  if (sizeMB > 8) {
    quality = 0.92;  // Still very high quality
    maxWidth = 2400;
  } else if (sizeMB > 5) {
    quality = 0.94;  // Extremely high quality
    maxWidth = 2560;
  }
  
  return compressImage(file, maxWidth, quality);
}

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_CLOUD && CLOUDINARY_PRESET);
}

/**
 * Upload image to Cloudinary (unsigned preset). Returns the secure image URL.
 * Use this when VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET are set.
 */
async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) {
    throw new Error('Cloudinary not configured');
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Upload failed (${response.status})`);
  }

  const data = await response.json();
  const url = data.secure_url;
  if (!url) throw new Error('Cloudinary did not return a URL');
  return url;
}

/**
 * Upload image to Imgur (free, anonymous - no API key). Fallback when Cloudinary is not configured.
 */
async function uploadToImgur(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: { 'Authorization': 'Client-ID 546c25a59c58ad7' },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ data: { error: 'Upload failed' } }));
    throw new Error(error.data?.error || 'Failed to upload to Imgur');
  }

  const data = await response.json();
  if (!data.success || !data.data?.link) throw new Error('Imgur did not return a valid URL');
  return data.data.link;
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
  const [uploading, setUploading] = useState(false);

  const uploadAndSetUrl = useCallback(async (file: File) => {
    setUploading(true);
    setWarn('');
    try {
      let url: string;
      if (isCloudinaryConfigured()) {
        url = await uploadToCloudinary(file);
        setWarn('✓ Image uploaded to Cloudinary. URL saved.');
      } else {
        url = await uploadToImgur(file);
        setWarn('✓ Image uploaded to Imgur. URL saved.');
      }
      onChange(url);
      setTimeout(() => setWarn(''), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      if (isCloudinaryConfigured()) {
        setWarn(`Cloudinary failed: ${msg}. Try again or paste a URL.`);
      } else {
        setWarn(`Upload failed: ${msg}. You can save as base64 (Ctrl) or try again.`);
      }
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const applyFile = useCallback(async (file: File, uploadToImgurInstead = true) => {
    if (!file.type.startsWith('image/')) {
      setWarn('Please select an image file.');
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 10) {
      setWarn('File is too large (max 10 MB). Paste a URL instead.');
      return;
    }

    // Default: upload to Cloudinary (or Imgur) and save URL. Ctrl/Cmd = save as base64.
    if (uploadToImgurInstead) {
      await uploadAndSetUrl(file);
      return;
    }

    setWarn('');
    setPasting(true);
    try {
      const b64 = await fileToBase64(file);
      const finalSizeMB = new Blob([b64]).size / (1024 * 1024);
      
      // Only show compression message if image was actually compressed (3MB+)
      if (sizeMB >= 3) {
        const compressionRatio = ((1 - finalSizeMB / sizeMB) * 100).toFixed(0);
        if (compressionRatio !== '0' && parseFloat(compressionRatio) > 5) {
          setWarn(`✓ Image optimized from ${sizeMB.toFixed(1)} MB to ${finalSizeMB.toFixed(1)} MB (${compressionRatio}% smaller) while maintaining maximum quality.`);
        } else {
          // Image was processed but minimal/no compression applied
          setWarn(`✓ Image processed at maximum quality (${finalSizeMB.toFixed(1)} MB).`);
        }
      }
      
      // Only warn if final size is very large (approaching storage limit)
      if (finalSizeMB > 4) {
        setWarn(`⚠️ Very large image (${finalSizeMB.toFixed(1)} MB). Click "Upload to Imgur" to get a URL instead.`);
      }
      
      onChange(b64);
      // Brief success feedback
      setTimeout(() => setPasting(false), 300);
    } catch (err) {
      setPasting(false);
      const errorMsg = err instanceof Error ? err.message : 'Failed to process image';
      if (errorMsg.includes('quota') || errorMsg.includes('storage')) {
        setWarn('Storage full! Click "Upload to Imgur" to get a URL instead.');
      } else {
        setWarn('Failed to process image. Please try again.');
      }
    }
  }, [onChange, uploadAndSetUrl]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file, !e.ctrlKey && !e.metaKey); // Default Imgur; Ctrl/Cmd = base64
  }, [applyFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file, true); // Always Imgur when browsing
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
                  // Default Imgur; hold Ctrl/Cmd to save as base64
                  await applyFile(file, !e.ctrlKey && !e.metaKey);
                  setMode('upload');
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
            await applyFile(file, !e.ctrlKey && !e.metaKey);
            setMode('upload');
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
        <div className="space-y-3">
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
                : uploading
                ? 'border-blue-400 bg-blue-50'
                : dragging
                ? 'border-blue-400 bg-blue-50'
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                <p className="text-sm text-blue-600 font-medium">Uploading to Imgur...</p>
              </>
            ) : (
              <>
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
                <p className="text-xs text-slate-400 mt-1">
                  Images upload to {isCloudinaryConfigured() ? 'Cloudinary' : 'Imgur'} (saves storage). Hold <kbd className="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded text-[10px] font-mono">Ctrl</kbd> to save inline
                </p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileInput}
            />
          </div>
          
          {/* Upload to Imgur button - shown when there's a base64 image */}
          {value && value.startsWith('data:') && !uploading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                const response = await fetch(value);
                const blob = await response.blob();
                const file = new File([blob], 'image.jpg', { type: blob.type });
                await uploadAndSetUrl(file);
              }}
              className="w-full gap-2"
            >
              <CloudUpload className="h-4 w-4" />
              {isCloudinaryConfigured() ? 'Upload to Cloudinary (Get URL)' : 'Upload to Imgur (Get URL)'}
            </Button>
          )}
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
