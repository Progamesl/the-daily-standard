import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface DocxImporterProps {
  onImport: (data: { headline: string; body: string; byline: string }) => void;
}

export function DocxImporter({ onImport }: DocxImporterProps) {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      toast.error('Please upload a .docx file (Word document)');
      return;
    }

    setLoading(true);
    try {
      // Load mammoth from CDN if not available
      if (!(window as any).mammoth) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const mammoth = (window as any).mammoth;
        
        try {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const html = result.value; // The generated HTML
          
          // Extract headline (usually first heading or first line)
          const temp = document.createElement('div');
          temp.innerHTML = html;
          
          let headline = '';
          const firstHeading = temp.querySelector('h1, h2, h3');
          if (firstHeading) {
            headline = firstHeading.textContent || '';
            firstHeading.remove(); // Remove headline from body
          } else {
            const firstPara = temp.querySelector('p');
            if (firstPara) {
              headline = firstPara.textContent || '';
              firstPara.remove();
            }
          }

          // Extract byline
          let byline = '';
          const text = temp.textContent || '';
          const bylineMatch = text.match(/By\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
          if (bylineMatch) {
            byline = bylineMatch[1];
          }

          onImport({
            headline: headline.trim(),
            body: temp.innerHTML,
            byline: byline.trim(),
          });
          
          toast.success('Document imported successfully! Review the fields below.');
        } catch (err) {
          console.error(err);
          toast.error('Failed to parse document structure.');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      toast.error('Failed to load document parser. Check your connection.');
    } finally {
      setLoading(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        id="docx-upload"
        className="hidden"
        accept=".docx"
        onChange={handleFileUpload}
        disabled={loading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:text-violet-800"
        onClick={() => document.getElementById('docx-upload')?.click()}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Import from DocX / Word
      </Button>
    </div>
  );
}
