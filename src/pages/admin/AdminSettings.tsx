import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Save, Download, Upload, Trash2, AlertTriangle,
  Globe, Mail, Share2, Database, Users, Clock, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getSiteSettings, saveSiteSettings, exportAdminData,
  importAdminDataFromJson, clearAdminData, mergeDuplicateAuthors,
  getAutoBackups, restoreFromBackup, deleteBackup,
  type SiteSettings,
} from '@/lib/adminDataService';

export default function AdminSettings() {
  const [settings, setSettings] = useState<SiteSettings>(getSiteSettings);
  const [saving, setSaving]     = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [merging, setMerging] = useState(false);

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      saveSiteSettings(settings);
      setSaving(false);
      toast.success('Settings saved');
    }, 300);
  };

  const handleExport = () => {
    const data = exportAdminData();
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `the-octagon-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  const handleImport = () => {
    try {
      importAdminDataFromJson(importText);
      toast.success('Data imported successfully');
      setShowImport(false);
      setImportText('');
    } catch {
      toast.error('Invalid JSON. Please check your file and try again.');
    }
  };

  const handleMergeDuplicates = () => {
    setMerging(true);
    try {
      const result = mergeDuplicateAuthors();
      if (result.merged > 0 || result.articlesUpdated > 0) {
        toast.success(
          `Merged ${result.merged} duplicate author${result.merged === 1 ? '' : 's'} and updated ${result.articlesUpdated} article${result.articlesUpdated === 1 ? '' : 's'}`
        );
      } else {
        toast.info('No duplicate authors found');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to merge duplicates');
    } finally {
      setMerging(false);
    }
  };

  const handleClearData = () => {
    clearAdminData();
    setClearOpen(false);
    toast.success('All content data cleared');
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Site-wide configuration</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* ── Site Identity ───────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="h-5 w-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">Site Identity</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="siteName">Publication Name</Label>
              <Input id="siteName" value={settings.siteName}
                onChange={(e) => update('siteName', e.target.value)}
                placeholder="The Octagon" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" value={settings.tagline}
                onChange={(e) => update('tagline', e.target.value)}
                placeholder="The official student newspaper…" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="metaDesc">Default Meta Description</Label>
              <Textarea id="metaDesc" value={settings.defaultMetaDescription}
                onChange={(e) => update('defaultMetaDescription', e.target.value)}
                placeholder="Brief description for search engines…" className="mt-1" rows={2} />
              <p className="text-xs text-slate-400 mt-1">
                {settings.defaultMetaDescription.length}/160 characters
              </p>
            </div>
            <div>
              <Label htmlFor="announcement">Announcement Banner <span className="text-slate-400 text-xs">(leave blank to hide)</span></Label>
              <Input id="announcement" value={settings.announcementBanner}
                onChange={(e) => update('announcementBanner', e.target.value)}
                placeholder="Breaking: Story or announcement…" className="mt-1" />
            </div>
          </div>
        </section>

        {/* ── Contact & Social ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Mail className="h-5 w-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">Contact & Social</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Contact Email</Label>
              <Input id="email" type="email" value={settings.contactEmail}
                onChange={(e) => update('contactEmail', e.target.value)}
                placeholder="octagon@saccds.org" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="twitter">Twitter / X Handle</Label>
                <Input id="twitter" value={settings.socialTwitter}
                  onChange={(e) => update('socialTwitter', e.target.value)}
                  placeholder="@thedailystandard" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram Handle</Label>
                <Input id="instagram" value={settings.socialInstagram}
                  onChange={(e) => update('socialInstagram', e.target.value)}
                  placeholder="@thedailystandard" className="mt-1" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Publishing ───────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Share2 className="h-5 w-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">Publishing</h2>
          </div>
          <div className="space-y-5">
            <div>
              <Label htmlFor="perPage">Articles Per Page</Label>
              <Input id="perPage" type="number" min={5} max={100}
                value={settings.articlesPerPage}
                onChange={(e) => update('articlesPerPage', Number(e.target.value))}
                className="mt-1 w-32" />
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">Newsletter Sign-Up</p>
                <p className="text-xs text-slate-400 mt-0.5">Show newsletter subscription form on the site</p>
              </div>
              <Switch checked={settings.enableNewsletter}
                onCheckedChange={(v) => update('enableNewsletter', v)} />
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">Reader Comments</p>
                <p className="text-xs text-slate-400 mt-0.5">Enable comments on articles (requires backend integration)</p>
              </div>
              <Switch checked={settings.enableComments}
                onCheckedChange={(v) => update('enableComments', v)} />
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Maintenance Mode
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Take the public site offline for maintenance. Admin portal stays accessible.
                </p>
              </div>
              <Switch checked={settings.maintenanceMode}
                onCheckedChange={(v) => update('maintenanceMode', v)} />
            </div>
          </div>
        </section>

        {/* ── IMPORTANT: localStorage Warning ─────────────────────────────── */}
        <section className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-900 mb-1">⚠️ CRITICAL: Data Storage Warning</h3>
              <p className="text-xs text-red-700 leading-relaxed mb-3">
                Your stories are stored in your browser's localStorage. This means:
              </p>
              <ul className="text-xs text-red-700 space-y-1 mb-3 list-disc list-inside">
                <li>Data is <strong>only saved in THIS browser</strong> on THIS device</li>
                <li>If you use a different browser or device, your stories won't be there</li>
                <li>If you clear browser data, all stories will be deleted</li>
                <li>Rebuilds don't affect localStorage, but switching browsers/devices will lose data</li>
              </ul>
              <p className="text-xs font-semibold text-red-900">
                🔒 SOLUTION: Export your data regularly! Use the Export button below after every session.
              </p>
            </div>
          </div>
        </section>

        {/* ── Data Management ──────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Database className="h-5 w-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">Data Management</h2>
          </div>

          <div className="space-y-4">
            {/* Export */}
            <div className="flex items-start justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div>
                <p className="text-sm font-bold text-blue-900">📥 Export All Data (REQUIRED)</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Download a JSON backup of all articles and authors. <strong>Do this after every editing session!</strong>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 shrink-0 ml-4 border-blue-300 text-blue-700 hover:bg-blue-100">
                <Download className="h-4 w-4" />Export Now
              </Button>
            </div>
            
            {/* Automatic Backups */}
            <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-700">Automatic Backups</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {backups.length > 0 
                    ? `${backups.length} automatic backup${backups.length === 1 ? '' : 's'} available (created hourly)`
                    : 'No backups yet. Backups are created automatically when you save articles.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowBackups(!showBackups)} className="gap-1.5 shrink-0 ml-4">
                <Clock className="h-4 w-4" />{showBackups ? 'Hide' : 'View'} Backups
              </Button>
            </div>
            {showBackups && backups.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 max-h-64 overflow-y-auto">
                {backups.map(backup => (
                  <div key={backup.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-700">
                        {new Date(backup.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {Object.keys(backup.articles).length} articles, {Object.keys(backup.authors).length} authors
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (restoreFromBackup(backup.id)) {
                            toast.success('Backup restored! Page will refresh.');
                            setTimeout(() => window.location.reload(), 1000);
                          } else {
                            toast.error('Failed to restore backup');
                          }
                        }}
                        className="gap-1.5 text-xs"
                      >
                        <RotateCcw className="h-3 w-3" />Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          deleteBackup(backup.id);
                          toast.success('Backup deleted');
                          setShowBackups(false);
                          setTimeout(() => setShowBackups(true), 100);
                        }}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Import */}
            <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-700">Import Data</p>
                <p className="text-xs text-slate-400 mt-0.5">Restore from a previously exported JSON file.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowImport(!showImport)} className="gap-1.5 shrink-0 ml-4">
                <Upload className="h-4 w-4" />Import
              </Button>
            </div>
            {showImport && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs text-amber-600 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Importing will overwrite existing data. Export first as a backup.
                </p>
                <Textarea value={importText} onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste exported JSON here…" rows={6} className="text-xs font-mono" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleImport} disabled={!importText.trim()}>
                    Import Data
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowImport(false); setImportText(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Merge Duplicate Authors */}
            <div className="flex items-start justify-between p-4 bg-violet-50 rounded-xl border border-violet-100">
              <div>
                <p className="text-sm font-medium text-violet-700">Merge Duplicate Authors</p>
                <p className="text-xs text-violet-400 mt-0.5">
                  Automatically finds and merges authors with the same name. Stories are reassigned to the kept author.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMergeDuplicates}
                disabled={merging}
                className="gap-1.5 shrink-0 ml-4 text-violet-600 border-violet-200 hover:bg-violet-100"
              >
                <Users className="h-4 w-4" />
                {merging ? 'Merging…' : 'Merge Duplicates'}
              </Button>
            </div>

            {/* Clear Data */}
            <div className="flex items-start justify-between p-4 bg-red-50 rounded-xl border border-red-100">
              <div>
                <p className="text-sm font-medium text-red-700">Clear All Content Data</p>
                <p className="text-xs text-red-400 mt-0.5">
                  Permanently delete all admin-created articles and authors. Seed data is unaffected.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setClearOpen(true)}
                className="gap-1.5 shrink-0 ml-4 text-red-600 border-red-200 hover:bg-red-100">
                <Trash2 className="h-4 w-4" />Clear
              </Button>
            </div>
          </div>
        </section>

        {/* ── Future Roadmap Note ───────────────────────────────────────────── */}
        <section className="bg-blue-50 border border-blue-100 rounded-xl p-5">
          <p className="text-sm font-semibold text-blue-800 mb-2">🚀 Production Upgrade Path</p>
          <ul className="text-xs text-blue-700 space-y-1.5 leading-relaxed">
            <li>• <strong>Database:</strong> Migrate localStorage → Supabase (PostgreSQL) for multi-device, real-time sync</li>
            <li>• <strong>Image Upload:</strong> Integrate Cloudinary or Supabase Storage for drag-and-drop media uploads</li>
            <li>• <strong>Email:</strong> Add Resend/SendGrid for automated assignment notifications and submission alerts</li>
            <li>• <strong>Auth:</strong> Move to Supabase Auth for secure bcrypt passwords, OAuth (Google Workspace), and SSO</li>
            <li>• <strong>Scheduling:</strong> Cron job via Supabase Edge Functions to auto-publish approved articles</li>
            <li>• <strong>Analytics:</strong> Integrate Plausible or PostHog for real pageview tracking</li>
            <li>• <strong>Search:</strong> Add Algolia or pg_vector for full-text article search on the public site</li>
          </ul>
        </section>
      </div>

      {/* Clear Confirmation */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Content Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all admin-created articles and authors.
              Please export your data first. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearData} className="bg-red-600 hover:bg-red-700">
              Clear All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
