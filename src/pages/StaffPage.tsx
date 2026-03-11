import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { X, ArrowUpRight, Search } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { getArticles } from "@/data/seedData";
import type { Article } from "@/data/seedData";
import { ALL_MEMBERS } from "@/data/staffData";
import type { StaffMember as Member } from "@/data/staffData";

const SECTION_TABS = [
  "All",
  "Editors-in-Chief",
  "Section Editors",
  "Technology Staff",
  "Business Staff",
  "Page Editors",
  "Reporters",
  "Photographers",
  "Multimedia Staff",
  "Graphic Artists",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function articlesByName(name: string): Article[] {
  return getArticles().filter((a) => a.author?.name?.toLowerCase() === name.toLowerCase());
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const DEFAULT_AVATAR = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDipdfJoNun68DCzbb0IGCbIZOjiBu7a7URg&s";

function Avatar({ name, photo, size }: { name: string; photo?: string | null; size: number }) {
  const [err, setErr] = useState(false);
  const avatarSrc = photo && !err ? photo : DEFAULT_AVATAR;
  
  return (
    <img
      src={avatarSrc}
      alt={name}
      style={{ width: size, height: size }}
      className="rounded-full object-cover object-top shrink-0"
      referrerPolicy="no-referrer"
      onError={() => setErr(true)}
    />
  );
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

function StaffCard({ member, onSelect }: { member: Member; onSelect: (m: Member) => void }) {
  const [err, setErr] = useState(false);
  const hasPhoto = !!member.photo && !err;
  const photoSrc = hasPhoto ? member.photo! : DEFAULT_AVATAR;

  return (
    <button
      onClick={() => onSelect(member)}
      className="group p-0 w-full text-left bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-stone-300 hover:shadow-[0_8px_36px_rgba(0,0,0,0.11)] hover:-translate-y-1 transition-all duration-200 ease-out cursor-pointer flex flex-col"
    >
      {/* Photo */}
      <div className="relative aspect-square overflow-hidden bg-stone-100 shrink-0">
          <img
          src={photoSrc}
            alt={member.name}
            className="w-full h-full object-cover object-center group-hover:scale-[1.04] transition-transform duration-500 ease-out"
            referrerPolicy="no-referrer"
            onError={() => setErr(true)}
          />
        {/* Only show gradient over real photos */}
        {hasPhoto && (
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
        )}
        <div className="absolute bottom-3 left-3">
          <span className="inline-block bg-stone-900 text-white text-[9px] font-black uppercase tracking-[0.18em] px-3 py-[5px] rounded-full leading-none shadow-sm">
            {member.role}
          </span>
        </div>
      </div>

      {/* Info — flex-1 so cards in same row share height */}
      <div className="px-5 pt-4 pb-5 flex flex-col flex-1">
        <h3 className="font-serif text-[1.05rem] font-bold text-stone-900 leading-snug mb-2">
          {member.name}
        </h3>
        {/* Fixed-height bio area so all cards align regardless of bio length */}
        <div className="flex-1 overflow-hidden">
          <p className="text-[12px] text-stone-400 leading-[1.65] line-clamp-3">
            {member.bio ?? "Bio coming soon."}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────

function ProfileModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const memberArticles = articlesByName(member.name);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" />
      <div
        className="relative z-10 bg-white w-full max-w-[540px] max-h-[92dvh] rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-5 px-7 pt-7 pb-6 border-b border-stone-100 shrink-0">
          <Avatar name={member.name} photo={member.photo} size={64} />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-stone-400 mb-1">{member.role}</p>
            <h2 className="font-serif text-2xl font-bold text-stone-900 leading-tight">{member.name}</h2>
            {member.tags && member.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {member.tags.map((t) => (
                  <span key={t} className="text-[10px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-7 pt-6 pb-8 space-y-7">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-stone-400 mb-3">Bio</p>
            <p className="text-[13px] text-stone-500 leading-relaxed">
              {member.bio ?? "Bio coming soon."}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-stone-400 mb-4">Work</p>
            {memberArticles.length === 0 ? (
              <p className="text-[13px] text-stone-400 italic">No published articles yet.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {memberArticles.map((a) => (
                  <Link
                    key={a.id}
                    to={`/article/${a.slug}`}
                    onClick={onClose}
                    className="group/item flex items-start gap-4 py-4 first:pt-0 hover:opacity-70 transition-opacity"
                  >
                    {a.image && (
                      <img src={a.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 bg-stone-100" referrerPolicy="no-referrer" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">{a.section}</p>
                      <p className="text-[13px] font-semibold text-stone-900 leading-snug line-clamp-2">{a.headline}</p>
                      <p className="text-[11px] text-stone-400 mt-1.5">
                        {a.publishedAt instanceof Date
                          ? a.publishedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : ""}
                      </p>
                    </div>
                    <ArrowUpRight size={13} className="shrink-0 mt-1 text-stone-300 group-hover/item:text-stone-600 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [selected, setSelected] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState("All");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    let members = activeTab === "All"
      ? ALL_MEMBERS
      : ALL_MEMBERS.filter(
          (m) => m.primarySection === activeTab || m.altSections?.includes(activeTab)
        );
    if (query.trim()) {
      const q = query.toLowerCase();
      members = members.filter((m) => m.name.toLowerCase().includes(q));
    }
    return members;
  }, [activeTab, query]);

  return (
    <Layout>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-stone-200">
        <div className="flow-container py-10 md:py-14">
          <div className="flex items-baseline justify-between mb-5">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
              2025–2026 <span className="italic">Staff</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 hidden sm:block">
              The Octagon
            </p>
          </div>
          <div className="h-px bg-stone-200 mb-7" />

          {/* Search */}
          <div className="relative max-w-sm mb-6">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search staff…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-[13px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent transition"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {SECTION_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setQuery(""); }}
                className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-150 ${
                  activeTab === tab
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      <div className="bg-[#f7f6f4] min-h-[60vh]">
        <div className="flow-container py-12">
          {visible.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-stone-400 text-sm">No staff members found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6 lg:gap-7">
              {visible.map((m) => (
                <StaffCard key={m.name + m.primarySection} member={m} onSelect={setSelected} />
              ))}
            </div>
          )}

          <div className="border-t border-stone-200 mt-14 pt-6">
            <p className="text-[11px] text-stone-400">
              Staff listed at their highest editorial role. Secondary responsibilities appear on each member's profile.
            </p>
          </div>
        </div>
      </div>

      {selected && <ProfileModal member={selected} onClose={() => setSelected(null)} />}
    </Layout>
  );
}
