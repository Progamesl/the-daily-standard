# Cloudinary setup (images off Supabase)

Images are uploaded to Cloudinary; only the image **URL** is stored in Supabase. That keeps Supabase storage and egress low (no image bytes in your DB or API responses).

---

## Step 1: Create a Cloudinary account

1. Go to **[cloudinary.com](https://cloudinary.com)** and sign up (free).
2. Confirm your email if asked.

---

## Step 2: Get your Cloud name

1. In the **Cloudinary Dashboard**, you’re on the main overview.
2. Find **“Cloud name”** (e.g. `dxxxxxx`). Copy it — you’ll use it as `VITE_CLOUDINARY_CLOUD_NAME`.

---

## Step 3: Create an unsigned upload preset

1. In the dashboard, open **Settings** (gear icon).
2. Go to the **Upload** tab.
3. Scroll to **“Upload presets”**.
4. Click **“Add upload preset”**.
5. Set:
   - **Preset name:** e.g. `octagon_unsigned` (you’ll use this as `VITE_CLOUDINARY_UPLOAD_PRESET`).
   - **Signing Mode:** **Unsigned** (required for browser uploads without a backend).
   - **Folder (optional):** e.g. `octagon` so uploads go into a folder.
   - Leave other options as default unless you want things like auto format (e.g. WebP).
6. Click **Save**.

---

## Step 4: Add env vars to your project

1. In your project root, open **`.env`** (create it if it doesn’t exist).
2. Add these two lines (use your real values from steps 2 and 3):

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_name_here
```

Example:

```env
VITE_CLOUDINARY_CLOUD_NAME=dxxxxxx
VITE_CLOUDINARY_UPLOAD_PRESET=octagon_unsigned
```

3. Save the file.  
4. **Restart the dev server** (`npm run dev`) so Vite picks up the new env vars.

---

## Step 5: Confirm it works

1. Open the **admin** → create or edit a **story**.
2. In the **Story Image** field, paste an image from your clipboard (⌘V / Ctrl+V) or drag-and-drop an image.
3. It should upload to Cloudinary and the field should show a URL like:
   `https://res.cloudinary.com/your_cloud_name/image/upload/v1234567890/xxxxx.jpg`
4. Save the article. In the database (Supabase) you should see only that URL in `image` / `images`, not base64.

If upload fails, check the browser console and that:
- `.env` has the correct `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`.
- The preset is **Unsigned**.
- You restarted the dev server after changing `.env`.

---

## Flow summary

| Step | What happens |
|------|----------------|
| Editor uploads image | Browser sends file to Cloudinary (unsigned upload). |
| Cloudinary | Stores the image, returns a URL (e.g. `https://res.cloudinary.com/.../image/upload/...`). |
| App | Saves **only that URL** in the article (Supabase `articles.image` or `images`). |
| Reader opens article | Page loads; `<img src={article.image} />` loads the image from Cloudinary. |

Supabase never stores or serves the image bytes, so image storage and bandwidth use Cloudinary’s free tier (~25 GB each).

---

## Optional: use Cloudinary transforms (smaller/faster images)

You can add resize/format in the URL so images are smaller and faster to load. For example, to serve a max 1200px-wide image in auto format (e.g. WebP):

- Original URL: `https://res.cloudinary.com/dxxx/image/upload/v123/abc.jpg`
- With transform: `https://res.cloudinary.com/dxxx/image/upload/w_1200,f_auto,q_auto/v123/abc.jpg`

You can do this in the app by wrapping the stored URL and inserting `/w_1200,f_auto,q_auto` after `/upload/` (before the version segment). The guide in the codebase or in Cloudinary’s “Transformations” docs has the exact format.
