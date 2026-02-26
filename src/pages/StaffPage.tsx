import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { X, ArrowUpRight, Search } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { articles } from "@/data/seedData";
import type { Article } from "@/data/seedData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  name: string;
  photo?: string | null;
  role: string;
  bio?: string;
  tags?: string[];
  primarySection: string;
  altSections?: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────
// primarySection = highest-ranked role (where they appear in "All")
// altSections    = additional functional sections they belong to

const ALL_MEMBERS: Member[] = [
  // ── Editors-in-Chief ──────────────────────────────────────────────────────
  { name: "Rehan Afzal",   photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5696833_216.jpg?resize=200,200", role: "Editor-in-Chief", primarySection: "Editors-in-Chief", altSections: ["Photographers","Multimedia Staff"], tags: ["Photo Editor","Page Editor","Photographer","Multimedia"] },
  { name: "Eesha Dhawan",  photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5652069_971.jpg?resize=200,200",  role: "Editor-in-Chief", primarySection: "Editors-in-Chief" },
  { name: "Anisha Mondal", photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7137947_730.jpg?resize=200,200",  role: "Editor-in-Chief", primarySection: "Editors-in-Chief", altSections: ["Page Editors"], tags: ["Page Editor"] },
  { name: "Zema Nasirov",  photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_4613340_941.jpg?resize=200,200",  role: "Editor-in-Chief", primarySection: "Editors-in-Chief", altSections: ["Photographers","Graphic Artists"], tags: ["Page Editor","Photographer","Graphic Artist"] },

  // ── Section Editors ───────────────────────────────────────────────────────
  { name: "Maddy Schank",   photo: null, role: "Copy Editor",         primarySection: "Section Editors", altSections: ["Reporters"], tags: ["Reporter"] },
  { name: "Ryan Xu",        photo: null, role: "Copy Editor",         primarySection: "Section Editors", altSections: ["Technology Staff","Multimedia Staff"], tags: ["Technology Staff","Multimedia Editor","Reporter"] },
  { name: "Kate Barnes",    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7348123_570.jpg?resize=200,200", role: "News Editor",          primarySection: "Section Editors" },
  { name: "Jacob Rabe",     photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7029452_690.jpg?resize=200,200", role: "Feature Editor",        primarySection: "Section Editors", altSections: ["Page Editors"], tags: ["Page Editor"] },
  { name: "Parsiny Nijher", photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7535246_48.jpg?resize=200,200",  role: "Sports Editor",         primarySection: "Section Editors", altSections: ["Reporters"], tags: ["Reporter"] },
  { name: "Anika Nadgauda", photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5739564_255.jpg?resize=200,200", role: "A&E / Opinion Editor",  primarySection: "Section Editors", altSections: ["Page Editors"], tags: ["Page Editor","Social Media Editor"] },

  // ── Technology Staff ──────────────────────────────────────────────────────
  { name: "Sid Shukla", photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6857756_142.jpg?resize=200,200", role: "Technology Staff", primarySection: "Technology Staff", altSections: ["Business Staff","Page Editors"], tags: ["Business Manager","Page Editor","Reporter"] },

  // ── Page Editors ──────────────────────────────────────────────────────────
  { name: "Lukas Chung",             photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7114686_810.jpg?resize=200,200", role: "Page Editor", primarySection: "Page Editors", altSections: ["Reporters"], tags: ["Reporter"] },
  { name: "Jesse Dizon",             photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6242173_764.jpg?resize=200,200", role: "Page Editor", primarySection: "Page Editors" },
  { name: "Vivian Li",               photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6857377_874.jpg?resize=200,200", role: "Page Editor", primarySection: "Page Editors", altSections: ["Reporters"], tags: ["Reporter"] },
  { name: "Zachary Vando-Milberger", photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_4613392_393.jpg?resize=200,200", role: "Page Editor", primarySection: "Page Editors", altSections: ["Reporters"], tags: ["Reporter"] },
  { name: "Andrea Yue",              photo: null,                                                                                                   role: "Page Editor", primarySection: "Page Editors", altSections: ["Reporters"], tags: ["Reporter"] },

  // ── Reporters ─────────────────────────────────────────────────────────────
  { name: "Noor Alameri",          photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7139431_748.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters" },
  { name: "Chloey Fang",           photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7196347_644.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters" },
  { name: "Trisha Gandhi",         photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_8312970_219.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters" },
  { name: "Lucas Holz",            photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7737056_70.jpg?resize=200,200",  role: "Reporter", primarySection: "Reporters" },
  { name: "Ammar Hussain",         photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6425432_560.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters" },
  { name: "Ethan Minton",          photo: null,                                                                                                   role: "Reporter", primarySection: "Reporters" },
  { name: "Maggie Nuñez-Aguilera", photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7595033_713.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters" },
  { name: "Parsa Salari",          photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6352338_182.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters" },
  { name: "Khivi Singh",           photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6375565_50.jpg?resize=200,200",  role: "Reporter", primarySection: "Reporters" },
  { name: "Susie Wang",            photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5729732_955.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters" },
  { name: "Brenden Yu",            photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7889021_930.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters" },

  // ── Graphic Artists ───────────────────────────────────────────────────────
  { name: "Claire Gemmell", photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_4613323_272.jpg?resize=200,200", role: "Graphic Artist", primarySection: "Graphic Artists" },
  { name: "Gavin Wang",     photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5692514_791.jpg?resize=200,200", role: "Graphic Artist", primarySection: "Graphic Artists" },
];

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
  return articles.filter((a) => a.author?.name?.toLowerCase() === name.toLowerCase());
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, photo, size }: { name: string; photo?: string | null; size: number }) {
  const [err, setErr] = useState(false);
  if (!photo || err) {
    return (
      <div
        style={{ width: size, height: size, fontSize: size * 0.33 }}
        className="rounded-full bg-stone-100 text-stone-400 font-bold font-serif flex items-center justify-center select-none shrink-0"
      >
        {initials(name)}
      </div>
    );
  }
  return (
    <img
      src={photo}
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

  return (
    <button
      onClick={() => onSelect(member)}
      className="group w-full text-left bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-stone-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-200 ease-out cursor-pointer"
    >
      {/* Photo */}
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        {hasPhoto ? (
          <img
            src={member.photo!}
            alt={member.name}
            className="w-full h-full object-cover object-top group-hover:scale-[1.04] transition-transform duration-500 ease-out"
            referrerPolicy="no-referrer"
            onError={() => setErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-bold text-stone-300 select-none font-serif">
              {initials(member.name)}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-3 left-3">
          <span className="inline-block bg-stone-900 text-white text-[9px] font-black uppercase tracking-[0.18em] px-3 py-[5px] rounded-full leading-none">
            {member.role}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pt-3.5 pb-4">
        <h3 className="font-serif text-[1.05rem] font-bold text-stone-900 leading-snug">
          {member.name}
        </h3>
        <p className="text-[12px] text-stone-400 mt-1.5 leading-relaxed line-clamp-3">
          {member.bio ?? "Bio coming soon."}
        </p>
      </div>
    </button>
  );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────

function ProfileModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const memberArticles = articlesByName(member.name);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
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
