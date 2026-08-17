/**
 * PDF Import Tool
 * ---------------
 * Upload a PDF (your in-person newspaper), extract text page by page,
 * then auto-detect individual stories so editors can open them directly
 * in the story editor.
 *
 * Uses PDF.js loaded from CDN at runtime — no npm install required.
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText, Upload, Wand2, ChevronDown, ChevronUp,
  ExternalLink, AlertTriangle, Loader2, X, Copy, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/lib/adminUserService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface DetectedStory {
  id: string;
  headline: string;
  byline: string;
  body: string;
  expanded: boolean;
}

interface PageText {
  page: number;
  text: string;
}

/* ── PDF.js CDN loader ──────────────────────────────────────────────────── */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfjsLib: any;
  }
}

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function loadPdfJs(): Promise<typeof window.pdfjsLib> {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
    document.head.appendChild(script);
  });
}

/* ── Story detection helpers ────────────────────────────────────────────── */

/** Returns true if a line looks like a headline (short, title-case or ALL CAPS) */
function looksLikeHeadline(line: string): boolean {
  const t = line.trim();
  if (!t || t.length < 5 || t.length > 120) return false;
  // All caps
  if (t === t.toUpperCase() && /[A-Z]/.test(t)) return true;
  // Title Case: most words capitalized
  const words = t.split(/\s+/);
  const capCount = words.filter(w => w[0] === w[0]?.toUpperCase() && w.length > 2).length;
  if (capCount / words.length > 0.6 && words.length >= 3 && words.length <= 15) return true;
  return false;
}

/** Returns the byline if the line matches "By First Last" pattern */
function extractByline(line: string): string | null {
  const m = line.trim().match(/^[Bb]y\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
  return m ? m[1] : null;
}

/** Split raw page text into detected stories */
function detectStories(pages: PageText[]): DetectedStory[] {
  // Combine all text
  const fullText = pages.map(p => p.text).join('\n\n--- PAGE BREAK ---\n\n');

  // Split into lines
  const rawLines = fullText.split('\n');

  // Clean lines
  const lines = rawLines.map(l => l.trim()).filter(Boolean);

  const stories: DetectedStory[] = [];
  let currentHeadline = '';
  let currentByline = '';
  let currentBody: string[] = [];
  let inStory = false;
  let bodyLineCount = 0;

  const SKIP_PATTERNS = [
    /^The Octagon/i,
    /^octagon/i,
    /^\d+$/,                  // page numbers
    /^Page \d+/i,
    /^---/,                   // our page break marker
    /^Vol\./i,
    /^Issue/i,
    /^Sacramento Country Day/i,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/,  // dates
  ];

  const isSkip = (l: string) => SKIP_PATTERNS.some(p => p.test(l));

  const flushStory = () => {
    if (currentHeadline && currentBody.length > 0) {
      // Clean the body text
      const bodyText = currentBody
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (bodyText.length > 50) { // skip tiny fragments
        stories.push({
          id: crypto.randomUUID(),
          headline: currentHeadline,
          byline: currentByline,
          body: bodyText,
          expanded: false,
        });
      }
    }
    currentHeadline = '';
    currentByline = '';
    currentBody = [];
    inStory = false;
    bodyLineCount = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isSkip(line)) continue;

    // Check for byline
    const byline = extractByline(line);
    if (byline && inStory) {
      currentByline = byline;
      continue;
    }

    // Check for headline - if we already have a story, flush it first
    if (looksLikeHeadline(line)) {
      const nextLine = lines[i + 1] || '';
      // Confirm it's a headline by checking next line is longer (body text)
      if (nextLine.length > 60 || extractByline(nextLine)) {
        flushStory();
        currentHeadline = line;
        inStory = true;
        continue;
      }
    }

    // Body text
    if (inStory && line.length > 20) {
      currentBody.push(line);
      bodyLineCount++;
    } else if (!inStory && line.length > 60) {
      // Long line with no detected headline above — treat as orphan body, skip
    }
  }

  flushStory(); // flush last story

  return stories;
}

/** Convert detected story body to HTML matching existing article format */
function bodyToHtml(text: string): string {
  const paras = text.split(/\n\s*\n/).filter(p => p.trim());
  return paras.map(p => `<p>${p.trim().replace(/\n/g, ' ')}</p>`).join('');
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function AdminPdfImport() {
  const { currentUser } = useAdminAuth();
  const navigate = useNavigate();
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [pages, setPages] = useState<PageText[]>([]);
  const [stories, setStories] = useState<DetectedStory[]>([]);
  const [rawText, setRawText] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [fileName, setFileName] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const processPdf = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }
    setFileName(file.name);
    setLoading(true);
    setProgress('Loading PDF engine…');
    setPages([]);
    setStories([]);
    setRawText('');

    try {
      const pdfjs = await loadPdfJs();
      setProgress('Reading PDF…');

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      const extractedPages: PageText[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setProgress(`Extracting text: page ${pageNum} of ${totalPages}…`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        extractedPages.push({ page: pageNum, text: pageText });
      }

      setPages(extractedPages);
      const fullRaw = extractedPages.map(p => `[Page ${p.page}]\n${p.text}`).join('\n\n');
      setRawText(fullRaw);

      setProgress('Detecting stories…');
      const detected = detectStories(extractedPages);
      setStories(detected);

      if (detected.length === 0) {
        toast.warning('No stories auto-detected. Use the raw text below to copy content manually.');
      } else {
        toast.success(`Found ${detected.length} potential ${detected.length === 1 ? 'story' : 'stories'}!`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to process PDF. Make sure it is a text-based PDF (not a scanned image).');
    } finally {
      setLoading(false);
      setProgress('');
    }
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processPdf(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processPdf(file);
  };

  const openInEditor = (story: DetectedStory) => {
    const html = bodyToHtml(story.body);
    // Store pre-fill data in sessionStorage so editor can pick it up
    sessionStorage.setItem('pdf_prefill', JSON.stringify({
      headline: story.headline,
      byline: story.byline,
      body: html,
    }));
    logActivity(
      'pdf_imported',
      `Pulled "${story.headline}" out of a PDF${story.byline ? ` by ${story.byline}` : ''}`,
      currentUser?.id, undefined, currentUser?.displayName,
    );
    navigate('/admin/stories/new?from=pdf');
  };

  const copyBody = (story: DetectedStory) => {
    navigator.clipboard.writeText(story.body).then(() => {
      setCopied(story.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const toggleExpand = (id: string) => {
    setStories(prev => prev.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s));
  };

  const updateStory = (id: string, field: keyof DetectedStory, val: string) => {
    setStories(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const removeStory = (id: string) => {
    setStories(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <FileText className="h-6 w-6 text-violet-600" />
            <h1 className="text-2xl font-serif font-bold text-slate-900">PDF Newspaper Import</h1>
          </div>
          <p className="text-sm text-slate-500">
            Upload your printed newspaper PDF to extract and auto-detect stories. Works best with
            <strong> text-based PDFs</strong> (not scanned images).
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">

        {/* Notice */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Multi-column PDFs:</strong> Newspaper PDFs with multiple columns may have text
            extracted in the wrong order (PDF text is read left-to-right, not column-by-column).
            Use the auto-detected stories as a starting point and edit as needed. The raw text view
            lets you copy/paste individual sections manually.
          </div>
        </div>

        {/* Upload zone */}
        {!loading && pages.length === 0 && (
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all',
              dragging
                ? 'border-violet-400 bg-violet-50'
                : 'border-slate-300 bg-white hover:border-violet-300 hover:bg-violet-50/30'
            )}
          >
            <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center">
              <Upload className="h-8 w-8 text-violet-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-700">Drop your PDF here</p>
              <p className="text-sm text-slate-500 mt-1">or <span className="text-violet-600 font-medium">click to browse</span></p>
              <p className="text-xs text-slate-400 mt-2">PDF files only · Text-based PDFs work best</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={onFileInput} />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-violet-600 animate-spin" />
            <p className="text-slate-600 font-medium">{progress}</p>
            <p className="text-sm text-slate-400">This may take a moment for large PDFs…</p>
          </div>
        )}

        {/* Results */}
        {!loading && pages.length > 0 && (
          <div className="space-y-6">
            {/* File info + reset */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-violet-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{fileName}</p>
                  <p className="text-xs text-slate-500">{pages.length} pages · {stories.length} stories detected</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setPages([]); setStories([]); setRawText(''); setFileName(''); }}>
                Upload new PDF
              </Button>
            </div>

            {/* Detected stories */}
            {stories.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-violet-600" />
                  Auto-Detected Stories
                  <span className="text-xs font-normal text-slate-500 ml-1">Review and edit before opening in editor</span>
                </h2>
                <div className="space-y-3">
                  {stories.map((story, idx) => (
                    <div key={story.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      {/* Story header */}
                      <div className="flex items-start gap-3 px-5 py-4">
                        <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <Input
                            value={story.headline}
                            onChange={(e) => updateStory(story.id, 'headline', e.target.value)}
                            className="font-serif font-bold text-base border-0 p-0 h-auto focus-visible:ring-0 text-slate-900"
                            placeholder="Headline…"
                          />
                          {story.byline && (
                            <p className="text-xs text-slate-500 mt-0.5">By {story.byline}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 px-2 text-slate-500"
                            onClick={() => copyBody(story)}
                            title="Copy body text"
                          >
                            {copied === story.id
                              ? <Check className="h-3.5 w-3.5 text-green-600" />
                              : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 px-2 text-slate-500"
                            onClick={() => toggleExpand(story.id)}
                            title={story.expanded ? 'Collapse' : 'Expand'}
                          >
                            {story.expanded
                              ? <ChevronUp className="h-3.5 w-3.5" />
                              : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                            onClick={() => openInEditor(story)}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open in Editor
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 px-2 text-slate-400 hover:text-red-500"
                            onClick={() => removeStory(story.id)}
                            title="Remove"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Expandable body */}
                      {story.expanded && (
                        <div className="border-t border-slate-100 px-5 py-4">
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                            Story Body (editable)
                          </Label>
                          <Textarea
                            value={story.body}
                            onChange={(e) => updateStory(story.id, 'body', e.target.value)}
                            className="text-sm min-h-[200px] font-serif leading-relaxed"
                            placeholder="Story body text…"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stories.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                <Wand2 className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="font-medium text-slate-600">No stories auto-detected</p>
                <p className="text-sm mt-1">This PDF may be image-based (scanned) or have unusual formatting.<br />Use the raw text below to copy content manually.</p>
              </div>
            )}

            {/* Raw text toggle */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                onClick={() => setShowRaw(!showRaw)}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Raw Extracted Text</span>
                  <span className="text-xs text-slate-400">(all pages, unformatted)</span>
                </div>
                {showRaw ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {showRaw && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <div className="flex justify-end mb-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(rawText);
                        toast.success('Copied to clipboard');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" />Copy All
                    </Button>
                  </div>
                  <Textarea
                    value={rawText}
                    readOnly
                    className="font-mono text-xs min-h-[400px] bg-slate-50"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
