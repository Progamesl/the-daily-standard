# How to Sync Stories to Code

## Step-by-Step Instructions

### 1. Download the File
- Click "Sync to Code" button in Admin → Settings
- File downloads as `octagonData-YYYY-MM-DD.json`

### 2. Replace the File
```bash
# Find your downloaded file (usually in Downloads folder)
# Then copy it to replace the existing file:

cp ~/Downloads/octagonData-*.json the-daily-standard/src/data/octagonData.json
```

### 3. Commit to Git
```bash
cd the-daily-standard
git add src/data/octagonData.json
git commit -m "chore: Sync stories to code - hardcode latest articles"
git push
```

### 4. Done!
- Stories are now hardcoded in the code
- They'll appear on all browsers/devices automatically
- No Supabase sync needed - stories are in the codebase

## Quick Command (All in One)
```bash
cd the-daily-standard
cp ~/Downloads/octagonData-*.json src/data/octagonData.json
git add src/data/octagonData.json
git commit -m "chore: Sync stories to code"
git push
```
