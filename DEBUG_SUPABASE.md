# Debug: Supabase Not Detected

## Quick Fix Steps:

1. **Make sure Supabase package is installed:**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **RESTART YOUR DEV SERVER:**
   - Stop the server (Ctrl+C)
   - Start it again: `npm run dev`
   - **This is critical** - Vite only reads `.env` on startup!

3. **Check browser console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for any errors

4. **Verify .env file location:**
   - Make sure `.env` is in the project root (same folder as `package.json`)
   - File should be named exactly `.env` (not `.env.local` or anything else)

5. **Check the values:**
   - Open `.env` file
   - Make sure there are NO spaces around the `=` sign
   - Should look like:
     ```
     VITE_SUPABASE_URL=https://pasmllgdewtgqfwgsmjg.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```

## If Still Not Working:

Add this temporary debug code to see what's happening:

In browser console, type:
```javascript
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing');
```

If both show as undefined, the `.env` file isn't being read. Make sure:
- File is named `.env` (not `.env.local`)
- File is in project root
- Dev server was restarted after creating `.env`
