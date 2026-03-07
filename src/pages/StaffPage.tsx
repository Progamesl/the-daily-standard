import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { X, ArrowUpRight, Search } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { getArticles } from "@/data/seedData";
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
  { name: "Rehan Afzal",   photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5696833_216.jpg?resize=200,200", role: "Editor-in-Chief", primarySection: "Editors-in-Chief", altSections: ["Photographers","Multimedia Staff"], tags: ["Photo Editor","Page Editor","Photographer","Multimedia"], bio: "Senior Rehan Afzal keeps himself occupied by participating in mock trial, taking photos and most importantly, managing his sidekick, sophomore Sid Shukla. His busy schedule includes long hours spent at school, and even night shifts due to procrastinating the day's homework. After a hard day of 'work', Rehan likes to relax by going to the driving range with his dad, or hitting the gym and benching 405 lbs. Contact him at rafzal26@scdsstudent.org." },
  { name: "Eesha Dhawan",  photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5652069_971.jpg?resize=200,200",  role: "Editor-in-Chief", primarySection: "Editors-in-Chief" },
  { name: "Anisha Mondal", photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7137947_730.jpg?resize=200,200",  role: "Editor-in-Chief", primarySection: "Editors-in-Chief", altSections: ["Page Editors"], tags: ["Page Editor"] },
  { name: "Zema Nasirov",  photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_4613340_941.jpg?resize=200,200",  role: "Editor-in-Chief", primarySection: "Editors-in-Chief", altSections: ["Photographers","Graphic Artists"], tags: ["Page Editor","Photographer","Graphic Artist"] },

  // ── Section Editors ───────────────────────────────────────────────────────
  { name: "Maddy Schank",   photo: null, role: "Copy Editor", primarySection: "Section Editors", altSections: ["Reporters"], tags: ["Reporter"], bio: "Sophomore Maddy Schank is excited to return for another year of writing for The Octagon. In her free time, she enjoys reading, writing and watching videos on YouTube. Contact her at mschank28@scdsoctagon.org." },
  { name: "Ryan Xu",        photo: null, role: "Copy Editor", primarySection: "Section Editors", altSections: ["Technology Staff","Multimedia Staff"], tags: ["Technology Staff","Multimedia Editor","Reporter"] },
  { name: "Kate Barnes",    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7348123_570.jpg?resize=200,200", role: "News Editor",         primarySection: "Section Editors", bio: "Junior Kate Barnes is the news section editor for The Octagon and is looking forward to working with new staffers, something she has come to enjoy after three years in The Octagon. When she isn't writing about environmental issues and her favorite movies, she enjoys talking to her friends and reading. Contact her at kbarnes27@scdsstudent.org." },
  { name: "Jacob Rabe",     photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7029452_690.jpg?resize=200,200", role: "Feature Editor",       primarySection: "Section Editors", altSections: ["Page Editors"], tags: ["Page Editor"] },
  { name: "Parsiny Nijher", photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7535246_48.jpg?resize=200,200",  role: "Sports Editor",        primarySection: "Section Editors", altSections: ["Reporters"], tags: ["Reporter"], bio: "Sophomore Parsiny Nijher is entering her second year as an Octagon staffer. Previously a reporter, she has risen in the ranks to become the Octagon's Sports Section Editor. She enjoys watching sports, movies and sleeping. The sports she watches the most are basketball, football, and occasionally baseball (when there is absolutely nothing else to watch). Being an avid Sacramento Kings supporter since birth, she knows about struggle and how to write about painful topics. Contact her at pnijher28@scdsstudent.org." },
  { name: "Anika Nadgauda", photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5739564_255.jpg?resize=200,200", role: "A&E / Opinion Editor", primarySection: "Section Editors", altSections: ["Page Editors"], tags: ["Page Editor","Social Media Editor"], bio: "Anika Nadgauda is a current senior and has been a part of The Octagon for four years. Her favorite animal is the goose, and her favorite color is purple. She loves to read and crochet along with gardening — in past years she has grown a surplus of basil for bruschetta and a plethora of green apples for apple pie. Nadgauda also loves Taylor Swift and attended the Eras Tour. She has been at Country Day since the sixth grade and is excited to see what her final year will bring!" },

  // ── Technology Staff ──────────────────────────────────────────────────────
  { name: "Sid Shukla", photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6857756_142.jpg?resize=200,200", role: "Technology Staff", primarySection: "Technology Staff", altSections: ["Business Staff","Page Editors"], tags: ["Business Manager","Page Editor","Reporter"] },

  // ── Page Editors ──────────────────────────────────────────────────────────
  { name: "Lukas Chung",             photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7114686_810.jpg?resize=200,200", role: "Page Editor", primarySection: "Page Editors", altSections: ["Reporters"], tags: ["Reporter"], bio: "When you first walk into The Octagon room, the first thing you may notice is Junior Lukas Chung rummaging through the snack bin. As a second-year staffer, he has experience in saying that the snacks are definitely the best part of the Octagon. Be it in paste-up or the class after lunch, Lukas is almost always working on his next story while eating. Though rare, whenever he's not eating, he enjoys playing volleyball or the piano. Contact him at lchung@scdsstudent.org." },
  { name: "Jesse Dizon",             photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6242173_764.jpg?resize=200,200", role: "Page Editor", primarySection: "Page Editors", bio: "Jesse Dizon is currently a senior, soaking up her last months at Sacramento Country Day's very own newspaper. Jesse enjoys playing basketball, listening to artists such as Laufey, Beabadoobee and Clairo, and playing the piano. She holds a first degree black belt in taekwondo! Her favorite dessert is mango sticky rice, and her favorite ice cream flavor is Ben & Jerry's Chunky Monkey. If Jesse had to choose the best music genre right now, it would be bossa nova. She hopes to add more to the warm and positive environment already at Country Day. Contact at jdizon@scdsstudent.org." },
  { name: "Vivian Li",               photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6857377_874.jpg?resize=200,200", role: "Page Editor", primarySection: "Page Editors", altSections: ["Reporters"], tags: ["Reporter"], bio: "Sophomore Vivian \"Quobbieal\" Li, when not in class, can be found binge watching anime or aggressively petting her cat Lucky. She's spending her second year in the Octagon as a reporter and page editor, thrilled to see her friends and ready to venture into sophomore year. Contact her at wli28@scdsstudent.org." },
  { name: "Zachary Vando-Milberger", photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_4613392_393.jpg?resize=200,200", role: "Page Editor", primarySection: "Page Editors", altSections: ["Reporters"], tags: ["Reporter"] },
  { name: "Andrea Yue",              photo: null,                                                                                                   role: "Page Editor", primarySection: "Page Editors", altSections: ["Reporters"], tags: ["Reporter"] },

  // ── Reporters ─────────────────────────────────────────────────────────────
  { name: "Noor Alameri",          photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7139431_748.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters", bio: "Junior Noor Alameri is a second-year staffer on The Octagon. She most enjoys writing A&E and opinion stories, but hopes to expand her experience to include more news. When she isn't bothering her friends by talking about whatever new book she just read or movie she watched, she's trying to cook an edible meal, failing at it and then eating it anyway. Her ability to procrastinate any assignment, no matter how long she was given, is truly outstanding. Contact her at nalameri27@scdsstudent.org." },
  { name: "Chloey Fang",           photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7196347_644.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters", bio: "Freshman Chloey Fang spends most of her time listening to music while playing Roblox with her friends. When she's not doing that, she's probably out playing basketball, alternating between beating her brother one-on-one and attempting to shoot half-court shots. Her friends describe her as smart, funny, goofy and very talkative — once she starts talking, good luck getting her to stop. She joined The Octagon because she enjoys writing and thought it would be fun to turn that hobby into something useful for school. Contact her at cfang29@scdsstudent.org." },
  { name: "Trisha Gandhi",         photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_8312970_219.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters", bio: "Whenever freshman Trisha Gandhi isn't trying to catch up on school work, she is often spending time on the golf course or hanging out with friends. She enjoys the focus, independence and patience that golf brings — a mindset she carries into and out of school. As a member of The Octagon staff, she enjoys covering sports, feature stories, and student perspectives around campus. Contact her at tgandhi29@scdsstudent.org." },
  { name: "Lucas Holz",            photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7737056_70.jpg?resize=200,200",  role: "Reporter", primarySection: "Reporters" },
  { name: "Ammar Hussain",         photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6425432_560.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters" },
  { name: "Ethan Minton",          photo: null,                                                                                                   role: "Reporter", primarySection: "Reporters", bio: "Freshman Ethan Minton is excited for his first year of high school and to write for the Octagon. You can often find him on the edge of his seat watching the Sacramento Kings play (they usually lose). He loves writing — whether it's a book he never finishes, a script for an interview, or a sports article for his blog. When he's not writing or stressed about his sports team, he enjoys hiking, reading, and acting. He is currently on a quest to visit every U.S. national park. Contact him at eminton29@scdsstudent.org." },
  { name: "Maggie Nuñez-Aguilera", photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7595033_713.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters" },
  { name: "Parsa Salari",          photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6352338_182.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters", bio: "Sophomore Parsa Salari is about to start his fifth year at Country Day. He spends most of his time playing basketball or helping out around campus with student council. Salari is a massive fan of movies, especially dramas, comedies and superhero films — his current favorite is \"The Shawshank Redemption.\" When he's not watching films, you can find him playing basketball on the blacktop with his friends. Contact him at psalari28@scdsstudent.org." },
  { name: "Khivi Singh",           photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6375565_50.jpg?resize=200,200",  role: "Reporter", primarySection: "Reporters", bio: "Khivi Singh is a freshman at Country Day. She spends most of her time listening to music, studying, and winning debates with her siblings. She will most likely always be found working on homework, writing an upcoming article in the library, competing for Mock Trial or practicing for basketball. Singh is excited for extracurriculars, including clubs, trips, and dances, and is thrilled to meet new people and create new memories. Contact her at ksingh29@scdsstudent.org." },
  { name: "Susie Wang",            photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5729732_955.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters", bio: "Freshman Susie Wang is excited to start high school and meet new people. Her hobbies include art and shopping, and her favorite activity is volleyball. When you catch her with nothing to do, she will likely be playing Dress to Impress on Roblox or listening to The Weeknd and Frank Ocean. If you see her at Loehmann's Plaza, she is definitely getting Chipotle, Teaspoon or both. Contact her at swang29@scdsstudent.org." },
  { name: "Brenden Yu",            photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7889021_930.jpg?resize=200,200", role: "Reporter", primarySection: "Reporters", bio: "Sophomore Brenden Yu is usually eating. When not surrounded by numerous snacks and drinks, he enjoys talking about food, cooking and connecting people through the art of speech. As a rookie Octagon staffer, he is excited to venture into journalism in his second year at Sacramento Country Day. Outside of writing, Brenden is a proud member of the Country Day Mock Trial team and has sung with the Ragazzi Boys Chorus for 10 years. Having lived across the globe — the Bay Area, North Carolina, Taiwan, Switzerland and Italy — he aims to bring his international perspective to The Octagon. Contact him at byu28@scdsstudent.org." },

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
  return getArticles().filter((a) => a.author?.name?.toLowerCase() === name.toLowerCase());
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
      className="group p-0 w-full text-left bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-stone-300 hover:shadow-[0_8px_36px_rgba(0,0,0,0.11)] hover:-translate-y-1 transition-all duration-200 ease-out cursor-pointer flex flex-col"
    >
      {/* Photo */}
      <div className="relative aspect-square overflow-hidden bg-stone-100 shrink-0">
        {hasPhoto ? (
          <img
            src={member.photo!}
            alt={member.name}
            className="w-full h-full object-cover object-center group-hover:scale-[1.04] transition-transform duration-500 ease-out"
            referrerPolicy="no-referrer"
            onError={() => setErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-bold text-stone-300 select-none font-serif">
              {initials(member.name)}
            </span>
          </div>
        )}
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
