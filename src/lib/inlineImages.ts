/**
 * Move pasted-in pictures out of the story text and into image storage.
 *
 * When someone pastes a photo straight into the body — from a phone, from a
 * Word document, from a screenshot — the browser puts the entire picture into
 * the HTML as a `data:` URL, often several megabytes of it. Storing that in the
 * article row is unworkable: it bloats every read of the story, and the JSON
 * the public site downloads grows by the size of the photo.
 *
 * The old handling was to delete the src, leaving `<img src="">`. The picture
 * vanished with no warning, and the writer only discovered it after publishing.
 * Here the picture is uploaded like any other image and the tag is pointed at
 * the uploaded copy, which is what the writer expected in the first place.
 */

const DATA_IMG = /<img\b[^>]*?\bsrc=["'](data:image\/[a-z0-9.+-]+;base64,[^"']+)["'][^>]*>/gi;

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i.exec(dataUrl);
  if (!match) return null;
  const [, mime, b64] = match;
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    return { blob: new Blob([bytes], { type: mime }), ext };
  } catch {
    return null;
  }
}

export interface InlineImageResult {
  html: string;
  /** How many pasted pictures were uploaded and are now proper links. */
  uploaded: number;
  /** How many could not be uploaded and were left in place untouched. */
  failed: number;
}

/**
 * Upload every `data:` image in `html` and return the HTML pointing at the
 * uploaded copies.
 *
 * A picture that fails to upload is deliberately left as-is rather than
 * stripped. Oversized HTML is a problem worth an error message; a story that
 * silently loses its illustrations is a problem nobody notices until a reader
 * does.
 */
export async function uploadInlineImages(html: string): Promise<InlineImageResult> {
  if (!html || typeof html !== 'string' || !html.includes('data:image')) {
    return { html, uploaded: 0, failed: 0 };
  }

  const sources = Array.from(html.matchAll(DATA_IMG), m => m[1]);
  const unique = Array.from(new Set(sources));
  if (unique.length === 0) return { html, uploaded: 0, failed: 0 };

  const replacements = new Map<string, string>();
  let failed = 0;

  for (const [i, dataUrl] of unique.entries()) {
    const parsed = dataUrlToBlob(dataUrl);
    if (!parsed) { failed++; continue; }
    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': parsed.blob.type || 'image/jpeg',
          'X-File-Name': `pasted-${Date.now()}-${i}.${parsed.ext}`,
        },
        body: parsed.blob,
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      if (!json?.url) throw new Error('no url');
      replacements.set(dataUrl, json.url);
    } catch {
      failed++;
    }
  }

  let out = html;
  for (const [dataUrl, url] of replacements) {
    out = out.split(dataUrl).join(url);
  }
  return { html: out, uploaded: replacements.size, failed };
}
