import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bold, Italic, Underline, Heading2, Heading3,
  List, ListOrdered, Quote, Link as LinkIcon, ImageIcon,
  Minus, Undo2, Redo2, Eye, Code2, RemoveFormatting, Type, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing your story…',
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'edit' | 'html' | 'preview'>('edit');
  const [htmlSource, setHtmlSource] = useState(value);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const savedSelectionRef = useRef<Range | null>(null);
  const isInternalUpdate = useRef(false);

  // Sync external value → editor content (only when not typing)
  useEffect(() => {
    if (editorRef.current && mode === 'edit' && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalUpdate.current = false;
  }, [value, mode]);

  // Emit changes from editor
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Clean pasted HTML - strip inline styles, normalize to semantic tags
  const cleanPastedHtml = useCallback((html: string): string => {
    // Create a temporary div to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove all inline styles and non-semantic attributes
    const allElements = temp.querySelectorAll('*');
    allElements.forEach((el) => {
      // Remove style attribute (this removes ALL inline CSS)
      el.removeAttribute('style');
      // Remove deprecated font attributes
      el.removeAttribute('face');
      el.removeAttribute('size');
      el.removeAttribute('color');
      
      // Remove Google Docs specific classes/attributes
      el.removeAttribute('class');
      el.removeAttribute('id');
      el.removeAttribute('dir');
      el.removeAttribute('lang');
      
      // Remove all data-* attributes (Google Docs uses these heavily)
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          el.removeAttribute(attr.name);
        }
      });
      
      // Keep only semantic attributes for links and images
      if (el.tagName === 'A') {
        const href = el.getAttribute('href');
        el.removeAttribute('href');
        if (href) el.setAttribute('href', href);
      }
      if (el.tagName === 'IMG') {
        const src = el.getAttribute('src');
        const alt = el.getAttribute('alt');
        el.removeAttribute('src');
        el.removeAttribute('alt');
        if (src) el.setAttribute('src', src);
        if (alt) el.setAttribute('alt', alt);
      }
    });

    // Convert Google Docs specific tags to standard HTML
    // Replace <span> with no attributes with plain text
    const spans = temp.querySelectorAll('span');
    spans.forEach((span) => {
      if (!span.hasAttributes() || (span.attributes.length === 0)) {
        const parent = span.parentNode;
        if (parent) {
          while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
          }
          parent.removeChild(span);
        }
      }
    });

    // Normalize line breaks and paragraphs to match existing article format
    let cleaned = temp.innerHTML
      // Convert divs to paragraphs (matching existing article structure)
      .replace(/<div><br><\/div>/gi, '<p><br></p>')
      .replace(/<div>/gi, '<p>')
      .replace(/<\/div>/gi, '</p>')
      // Double line breaks = new paragraph (AP Style)
      .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>')
      // Remove empty paragraphs
      .replace(/(<p><\/p>)+/gi, '')
      // Normalize whitespace within paragraphs (AP Style: single space)
      .replace(/\s+/g, ' ')
      // Remove leading/trailing whitespace from paragraphs
      .replace(/<p>\s+/g, '<p>')
      .replace(/\s+<\/p>/g, '</p>')
      .trim();

    // Ensure proper paragraph structure (matching existing articles)
    if (!cleaned) {
      cleaned = '<p><br></p>';
    } else if (!cleaned.startsWith('<p>') && !cleaned.startsWith('<h') && !cleaned.startsWith('<figure') && !cleaned.startsWith('<blockquote')) {
      cleaned = `<p>${cleaned}</p>`;
    }

    // AP Style: Ensure single space after periods (not double)
    cleaned = cleaned.replace(/\.\s{2,}/g, '. ');

    // Remove any remaining inline formatting that shouldn't be there
    cleaned = cleaned.replace(/style=["'][^"']*["']/gi, '');
    
    return cleaned;
  }, []);

  // Auto Format: apply all formatting rules to current content
  const handleAutoFormat = useCallback(() => {
    if (!editorRef.current) return;
    const current = editorRef.current.innerHTML;
    if (!current || current === '<br>') return;
    const formatted = cleanPastedHtml(current);
    editorRef.current.innerHTML = formatted;
    isInternalUpdate.current = true;
    onChange(formatted);
    toast.success('Auto-formatted to AP Style ✓');
  }, [cleanPastedHtml, onChange]);

  // Convert plain text to formatted HTML (for PDFs, Google Docs plain text, etc.)
  // Matches existing article formatting: clean <p> tags, AP Style rules
  const convertPlainTextToHtml = useCallback((text: string): string => {
    if (!text.trim()) return '<p><br></p>';
    
    // AP Style: Normalize whitespace first (single space, not double)
    text = text.replace(/\s+/g, ' ').trim();
    
    // Split by double line breaks (paragraph breaks - AP Style)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    if (paragraphs.length === 0) return '<p><br></p>';
    
    // Convert each paragraph to match existing article structure
    const html = paragraphs.map(para => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      
      // AP Style: Single space after periods (not double)
      const normalized = trimmed.replace(/\.\s{2,}/g, '. ');
      
      // For plain text, we typically don't want <br> tags within paragraphs
      // (AP Style: paragraphs are solid blocks of text)
      // But if there are intentional line breaks, preserve them
      const hasLineBreaks = trimmed.includes('\n');
      if (hasLineBreaks) {
        // Replace single line breaks with <br> tags
        const withBreaks = normalized
          .split(/\n/)
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join('<br>');
        return `<p>${withBreaks}</p>`;
      }
      
      return `<p>${normalized}</p>`;
    }).filter(p => p.length > 0).join('');
    
    return html || '<p><br></p>';
  }, []);

  // Handle paste events - clean the pasted content
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const htmlData = e.clipboardData.getData('text/html');
    const plainData = e.clipboardData.getData('text/plain');
    
    if (!editorRef.current) return;

    // Get current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    // If HTML was pasted, clean it
    if (htmlData && htmlData.trim().length > 0) {
      const cleaned = cleanPastedHtml(htmlData);
      const temp = document.createElement('div');
      temp.innerHTML = cleaned;
      
      // Insert cleaned nodes
      const fragment = document.createDocumentFragment();
      while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
      }
      range.insertNode(fragment);
    } else if (plainData) {
      // Plain text (PDF, etc.) - convert to formatted HTML
      const html = convertPlainTextToHtml(plainData);
      const temp = document.createElement('div');
      temp.innerHTML = html;
      
      // Insert formatted nodes
      const fragment = document.createDocumentFragment();
      while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
      }
      range.insertNode(fragment);
    }

    // Move cursor to end of inserted content
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    // Trigger input event to update state
    handleInput();
  }, [cleanPastedHtml, convertPlainTextToHtml, handleInput]);

  // execCommand wrapper
  const exec = useCallback(
    (command: string, val?: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false, val);
      handleInput();
    },
    [handleInput]
  );

  const formatBlock = useCallback(
    (tag: string) => exec('formatBlock', tag),
    [exec]
  );

  // Selection helpers for dialogs
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      setLinkText(sel.toString());
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelectionRef.current);
    }
  };

  // Insert link
  const insertLink = () => {
    restoreSelection();
    if (linkUrl) {
      const selectedText = window.getSelection()?.toString();
      if (linkText && !selectedText) {
        exec(
          'insertHTML',
          `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`
        );
      } else {
        exec('createLink', linkUrl);
      }
    }
    setLinkDialogOpen(false);
    setLinkUrl('');
    setLinkText('');
  };

  // Insert image
  const insertImage = () => {
    restoreSelection();
    if (imageUrl) {
      const caption = imageAlt
        ? `<figcaption class="text-sm text-gray-500 mt-2 text-center">${imageAlt}</figcaption>`
        : '';
      exec(
        'insertHTML',
        `<figure class="my-4"><img src="${imageUrl}" alt="${imageAlt}" class="w-full rounded-lg" />${caption}</figure>`
      );
    }
    setImageDialogOpen(false);
    setImageUrl('');
    setImageAlt('');
  };

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    switch (e.key.toLowerCase()) {
      case 'b':
        e.preventDefault();
        exec('bold');
        break;
      case 'i':
        e.preventDefault();
        exec('italic');
        break;
      case 'u':
        e.preventDefault();
        exec('underline');
        break;
    }
  };

  // Mode switching
  const switchToHtml = () => {
    if (editorRef.current) setHtmlSource(editorRef.current.innerHTML);
    setMode('html');
  };

  const switchFromHtml = () => {
    onChange(htmlSource);
    setMode('edit');
  };

  // Placeholder for empty state
  const showPlaceholder = !value || value === '<br>' || value === '<div><br></div>';

  // Toolbar button
  const TB = ({
    icon: Icon,
    label,
    onClick,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className={cn('border rounded-lg overflow-hidden bg-background', className)}>
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-slate-50 dark:bg-slate-900">
        {mode === 'edit' && (
          <>
            <TB icon={Bold} label="Bold (⌘B)" onClick={() => exec('bold')} />
            <TB icon={Italic} label="Italic (⌘I)" onClick={() => exec('italic')} />
            <TB icon={Underline} label="Underline (⌘U)" onClick={() => exec('underline')} />

            <Separator orientation="vertical" className="h-5 mx-1" />

            <TB icon={Heading2} label="Heading 2" onClick={() => formatBlock('h2')} />
            <TB icon={Heading3} label="Heading 3" onClick={() => formatBlock('h3')} />
            <TB icon={Type} label="Paragraph" onClick={() => formatBlock('p')} />

            <Separator orientation="vertical" className="h-5 mx-1" />

            <TB icon={List} label="Bullet List" onClick={() => exec('insertUnorderedList')} />
            <TB icon={ListOrdered} label="Numbered List" onClick={() => exec('insertOrderedList')} />
            <TB icon={Quote} label="Blockquote" onClick={() => formatBlock('blockquote')} />
            <TB icon={Minus} label="Horizontal Rule" onClick={() => exec('insertHorizontalRule')} />

            <Separator orientation="vertical" className="h-5 mx-1" />

            <TB
              icon={LinkIcon}
              label="Insert Link"
              onClick={() => {
                saveSelection();
                setLinkDialogOpen(true);
              }}
            />
            <TB
              icon={ImageIcon}
              label="Insert Image"
              onClick={() => {
                saveSelection();
                setImageDialogOpen(true);
              }}
            />

            <Separator orientation="vertical" className="h-5 mx-1" />

            <TB icon={Undo2} label="Undo" onClick={() => exec('undo')} />
            <TB icon={Redo2} label="Redo" onClick={() => exec('redo')} />
            <TB icon={RemoveFormatting} label="Clear Formatting" onClick={() => exec('removeFormat')} />

            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Auto Format */}
            <button
              type="button"
              onClick={handleAutoFormat}
              title="Auto Format — strip inline styles, fix spacing, AP Style"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Auto Format
            </button>
          </>
        )}

        <div className="flex-1" />

        {/* Mode toggles */}
        <button
          type="button"
          onClick={() => (mode === 'html' ? switchFromHtml() : switchToHtml())}
          title="HTML Source"
          className={cn(
            'px-2.5 py-1 rounded text-xs font-medium transition-colors',
            mode === 'html'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
          )}
        >
          <Code2 className="h-3.5 w-3.5 inline mr-1 -mt-px" />
          HTML
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'preview' ? 'edit' : 'preview')}
          title="Preview"
          className={cn(
            'px-2.5 py-1 rounded text-xs font-medium transition-colors ml-1',
            mode === 'preview'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
          )}
        >
          <Eye className="h-3.5 w-3.5 inline mr-1 -mt-px" />
          Preview
        </button>
      </div>

      {/* ── Editor area ────────────────────────────────────────────────── */}
      {mode === 'edit' && (
        <div className="relative">
          {showPlaceholder && (
            <div className="absolute top-4 left-4 text-slate-400 pointer-events-none select-none text-sm">
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            className="min-h-[400px] max-h-[600px] overflow-y-auto p-4 prose prose-sm max-w-none focus:outline-none
                       prose-headings:font-serif prose-headings:text-slate-900
                       prose-p:text-slate-700 prose-p:leading-relaxed
                       prose-blockquote:border-l-slate-300 prose-blockquote:text-slate-600
                       prose-a:text-blue-600 prose-a:underline
                       prose-img:rounded-lg prose-img:my-4
                       [&_*]:font-sans [&_*]:leading-relaxed
                       [&_p]:text-slate-700 [&_p]:mb-4
                       [&_strong]:font-bold [&_em]:italic
                       [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:mt-6 [&_h2]:mb-3
                       [&_h3]:font-serif [&_h3]:text-xl [&_h3]:mt-4 [&_h3]:mb-2"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            suppressContentEditableWarning
          />
        </div>
      )}

      {mode === 'html' && (
        <Textarea
          value={htmlSource}
          onChange={(e) => {
            setHtmlSource(e.target.value);
            onChange(e.target.value);
          }}
          className="min-h-[400px] max-h-[600px] font-mono text-sm border-0 rounded-none resize-none focus-visible:ring-0"
          placeholder="<p>Write HTML here…</p>"
        />
      )}

      {mode === 'preview' && (
        <div
          className="min-h-[400px] max-h-[600px] overflow-y-auto p-4 prose prose-sm max-w-none
                     prose-headings:font-serif prose-headings:text-slate-900
                     prose-p:text-slate-700 prose-p:leading-relaxed
                     prose-blockquote:border-l-slate-300 prose-blockquote:text-slate-600
                     prose-a:text-blue-600 prose-a:underline
                     prose-img:rounded-lg prose-img:my-4"
          dangerouslySetInnerHTML={{ __html: value || '<p class="text-slate-400 italic">Nothing to preview yet.</p>' }}
        />
      )}

      {/* ── Link Dialog ────────────────────────────────────────────────── */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>Add a hyperlink to your article.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="rte-link-url">URL</Label>
              <Input
                id="rte-link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rte-link-text">Text (optional)</Label>
              <Input
                id="rte-link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Link text"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={insertLink} disabled={!linkUrl.trim()}>
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Image Dialog ───────────────────────────────────────────────── */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
            <DialogDescription>Add an image to your article by URL.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="rte-img-url">Image URL</Label>
              <Input
                id="rte-img-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rte-img-alt">Caption / Alt Text</Label>
              <Input
                id="rte-img-alt"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Describe the image"
                className="mt-1"
              />
            </div>
            {imageUrl && (
              <div className="border rounded-lg overflow-hidden bg-slate-50">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={insertImage} disabled={!imageUrl.trim()}>
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
