import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight,
  ExternalLink, Upload, X, Loader2, MonitorPlay,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearAdsCache, type Ad } from '@/hooks/useAds';

const PLACEMENTS: { value: Ad['placement']; label: string; desc: string }[] = [
  { value: 'sidebar',     label: 'Sidebar (300×250)',    desc: 'Article page right column' },
  { value: 'leaderboard', label: 'Leaderboard (728×90)', desc: 'Top/bottom of pages' },
  { value: 'inline',      label: 'Inline (300×250)',     desc: 'Between article sections' },
];

const R2_UPLOAD_URL = import.meta.env.VITE_R2_UPLOAD_URL as string | undefined;
const R2_SECRET     = import.meta.env.VITE_R2_SECRET     as string | undefined;

async function uploadAdImage(file: File): Promise<string> {
  if (R2_UPLOAD_URL) {
    const fd = new FormData();
    fd.append('file', file);
    const headers: Record<string, string> = {};
    if (R2_SECRET) headers['X-R2-Secret'] = R2_SECRET;
    const res = await fetch(R2_UPLOAD_URL, { method: 'POST', body: fd, headers });
    if (!res.ok) throw new Error('R2 upload failed');
    const json = await res.json();
    if (!json.url) throw new Error('No URL returned from R2');
    return json.url;
  }
  // Fallback: Imgur
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: { Authorization: 'Client-ID 546c25a59c58ad7' },
    body: fd,
  });
  const json = await res.json();
  if (!json.success) throw new Error('Imgur upload failed');
  return json.data.link;
}

const EMPTY_FORM = {
  title: '',
  advertiser: '',
  image_url: '',
  link_url: '',
  placement: 'sidebar' as Ad['placement'],
  active: false,
  starts_at: '',
  ends_at: '',
  notes: '',
};

export default function AdminAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAds = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAds((data as Ad[]) || []);
    } catch {
      toast.error('Failed to load ads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (ad: Ad) => {
    setEditingId(ad.id);
    setForm({
      title:      ad.title,
      advertiser: ad.advertiser,
      image_url:  ad.image_url,
      link_url:   ad.link_url,
      placement:  ad.placement,
      active:     ad.active,
      starts_at:  ad.starts_at ? ad.starts_at.slice(0, 10) : '',
      ends_at:    ad.ends_at   ? ad.ends_at.slice(0, 10)   : '',
      notes:      ad.notes ?? '',
    });
    setShowForm(true);
  };

  const handleImageFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadAdImage(file);
      setForm(f => ({ ...f, image_url: url }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Image upload failed — try pasting a URL instead');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!form.image_url) { toast.error('Please add an ad image'); return; }
    if (!form.link_url.startsWith('http')) { toast.error('Link URL must start with http'); return; }

    setSaving(true);
    try {
      const payload = {
        title:      form.title,
        advertiser: form.advertiser,
        image_url:  form.image_url,
        link_url:   form.link_url,
        placement:  form.placement,
        active:     form.active,
        starts_at:  form.starts_at || null,
        ends_at:    form.ends_at   || null,
        notes:      form.notes     || null,
      };

      let error;
      if (editingId) {
        ({ error } = await supabase.from('ads').update(payload).eq('id', editingId));
      } else {
        ({ error } = await supabase.from('ads').insert(payload));
      }
      if (error) throw error;

      clearAdsCache();
      toast.success(editingId ? 'Ad updated' : 'Ad created');
      setShowForm(false);
      fetchAds();
    } catch (err) {
      toast.error('Failed to save ad');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (ad: Ad) => {
    if (!supabase) return;
    setActionLoading(prev => new Set(prev).add(ad.id));
    try {
      const { error } = await supabase
        .from('ads')
        .update({ active: !ad.active })
        .eq('id', ad.id);
      if (error) throw error;
      clearAdsCache();
      setAds(prev => prev.map(a => a.id === ad.id ? { ...a, active: !a.active } : a));
      toast.success(ad.active ? 'Ad paused' : 'Ad activated — now live on site');
    } catch {
      toast.error('Failed to update ad');
    } finally {
      setActionLoading(prev => { const s = new Set(prev); s.delete(ad.id); return s; });
    }
  };

  const deleteAd = async (id: string) => {
    if (!supabase || !confirm('Delete this ad? This cannot be undone.')) return;
    setActionLoading(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase.from('ads').delete().eq('id', id);
      if (error) throw error;
      clearAdsCache();
      setAds(prev => prev.filter(a => a.id !== id));
      toast.success('Ad deleted');
    } catch {
      toast.error('Failed to delete ad');
    } finally {
      setActionLoading(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const liveCount = ads.filter(a => a.active).length;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Advertisements</h1>
          <p className="text-sm text-slate-500 mt-1">
            {liveCount > 0
              ? `${liveCount} ad${liveCount !== 1 ? 's' : ''} currently live on site`
              : 'No ads currently running — activate one below'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAds} className="gap-2">
            <RefreshCw className="h-4 w-4" />Refresh
          </Button>
          <Button size="sm" onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />New Ad
          </Button>
        </div>
      </div>

      {/* Ad list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />Loading…
        </div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <MonitorPlay className="h-10 w-10" />
          <p className="font-medium">No ads yet</p>
          <p className="text-sm">Click "New Ad" to add your first advertiser.</p>
          <Button size="sm" onClick={openNew} className="mt-2 gap-2">
            <Plus className="h-4 w-4" />Create First Ad
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ads.map(ad => {
            const placement = PLACEMENTS.find(p => p.value === ad.placement);
            const expired = ad.ends_at && new Date(ad.ends_at) < new Date();
            const notStarted = ad.starts_at && new Date(ad.starts_at) > new Date();
            return (
              <div
                key={ad.id}
                className={cn(
                  'bg-white rounded-2xl border overflow-hidden shadow-sm transition-all hover:shadow-md',
                  ad.active && !expired && !notStarted ? 'border-green-300' : 'border-slate-200'
                )}
              >
                {/* Creative preview */}
                <div
                  className="relative bg-slate-100 cursor-pointer"
                  style={{ aspectRatio: ad.placement === 'leaderboard' ? '8/1' : '6/5' }}
                  onClick={() => openEdit(ad)}
                >
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
                  />
                  {/* Status overlay */}
                  <div className="absolute top-2 left-2">
                    {ad.active && !expired && !notStarted ? (
                      <span className="text-xs bg-green-500 text-white font-bold px-2 py-0.5 rounded-full">LIVE</span>
                    ) : expired ? (
                      <span className="text-xs bg-slate-500 text-white font-bold px-2 py-0.5 rounded-full">EXPIRED</span>
                    ) : notStarted ? (
                      <span className="text-xs bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">SCHEDULED</span>
                    ) : (
                      <span className="text-xs bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full">PAUSED</span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{ad.advertiser}</p>
                      <p className="text-xs text-slate-500 truncate">{ad.title}</p>
                    </div>
                    <a
                      href={ad.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <span className="inline-block text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium mb-3">
                    {placement?.label ?? ad.placement}
                  </span>
                  {(ad.starts_at || ad.ends_at) && (
                    <p className="text-xs text-slate-400 mb-3">
                      {ad.starts_at ? new Date(ad.starts_at).toLocaleDateString() : 'Now'} →{' '}
                      {ad.ends_at ? new Date(ad.ends_at).toLocaleDateString() : 'No end'}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => toggleActive(ad)}
                      disabled={actionLoading.has(ad.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-1 justify-center',
                        ad.active
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {actionLoading.has(ad.id) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : ad.active ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                      {ad.active ? 'Live' : 'Activate'}
                    </button>
                    <button
                      onClick={() => openEdit(ad)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteAd(ad.id)}
                      disabled={actionLoading.has(ad.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Slide-over form ─────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowForm(false)}
          />
          {/* Panel */}
          <div className="relative ml-auto w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="font-bold text-slate-900 text-lg">
                {editingId ? 'Edit Ad' : 'New Ad'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Advertiser + title */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Advertiser Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={form.advertiser}
                    onChange={e => setForm(f => ({ ...f, advertiser: e.target.value }))}
                    placeholder="Smith Tutoring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Internal Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Spring 2025 Campaign"
                  />
                </div>
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Ad Image <span className="text-red-500">*</span>
                </label>

                {form.image_url ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img
                      src={form.image_url}
                      alt="Ad preview"
                      className="w-full max-h-48 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white shadow text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-slate-400 transition-colors',
                      uploading && 'opacity-60 pointer-events-none'
                    )}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file?.type.startsWith('image/')) handleImageFile(file);
                    }}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Loader2 className="h-7 w-7 animate-spin" />
                        <p className="text-sm font-medium">Uploading…</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Upload className="h-7 w-7" />
                        <p className="text-sm font-medium text-slate-600">Drop image or click to browse</p>
                        <p className="text-xs">PNG, JPG, WebP — or paste a URL below</p>
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFile(file);
                    e.target.value = '';
                  }}
                />

                <Input
                  className="mt-2"
                  placeholder="Or paste image URL…"
                  value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                />
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Click-through URL <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="url"
                  value={form.link_url}
                  onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="https://advertiser-website.com"
                />
              </div>

              {/* Placement */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Placement</label>
                <div className="grid gap-2">
                  {PLACEMENTS.map(p => (
                    <label
                      key={p.value}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                        form.placement === p.value
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      <input
                        type="radio"
                        name="placement"
                        value={p.value}
                        checked={form.placement === p.value}
                        onChange={() => setForm(f => ({ ...f, placement: p.value }))}
                        className="accent-slate-900"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{p.label}</p>
                        <p className="text-xs text-slate-500">{p.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={form.starts_at}
                    onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                  />
                  <p className="text-xs text-slate-400 mt-1">Leave blank to start immediately</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
                  <Input
                    type="date"
                    value={form.ends_at}
                    onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                  />
                  <p className="text-xs text-slate-400 mt-1">Leave blank to run indefinitely</p>
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <p className="font-semibold text-sm text-slate-800">Activate immediately</p>
                  <p className="text-xs text-slate-500">Ad will appear on the site right away</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative',
                    form.active ? 'bg-green-500' : 'bg-slate-300'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                      form.active ? 'translate-x-6' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Invoice #1042 paid 3/1/25, 4-issue contract"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
                />
              </div>
            </form>

            {/* Panel footer */}
            <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-slate-200 bg-white">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="ad-form"
                className="flex-1 gap-2"
                disabled={saving}
                onClick={handleSave}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Save Changes' : 'Create Ad'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
