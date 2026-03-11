/**
 * Canonical staff list for The Octagon 2025-2026.
 * Used by:
 *  - StaffPage (public directory)
 *  - adminDataService (auto-seeds admin authors on first launch)
 */

export interface StaffMember {
  name: string;
  photo?: string | null;
  role: string;
  bio?: string;
  tags?: string[];
  primarySection: string;
  altSections?: string[];
  email?: string;
}

export const ALL_MEMBERS: StaffMember[] = [
  // ── Editors-in-Chief ──────────────────────────────────────────────────────
  {
    name: "Rehan Afzal",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5696833_216.jpg?resize=200,200",
    role: "Editor-in-Chief",
    primarySection: "Editors-in-Chief",
    altSections: ["Photographers", "Multimedia Staff"],
    tags: ["Photo Editor", "Page Editor", "Photographer", "Multimedia"],
    bio: "Senior Rehan Afzal keeps himself occupied by participating in mock trial, taking photos and most importantly, managing his sidekick, sophomore Sid Shukla. His busy schedule includes long hours spent at school, and even night shifts due to procrastinating the day’s homework. After a hard day of “work”, Rehan likes to relax by going to the driving range with his dad, or hitting the gym and benching 405 lbs. Contact him at rafzal26@scdsstudent.org.",
    email: "rafzal26@scdsstudent.org",
  },
  {
    name: "Eesha Dhawan",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5652069_971.jpg?resize=200,200",
    role: "Editor-in-Chief",
    primarySection: "Editors-in-Chief",
  },
  {
    name: "Anisha Mondal",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7137947_730.jpg?resize=200,200",
    role: "Editor-in-Chief",
    primarySection: "Editors-in-Chief",
    altSections: ["Page Editors"],
    tags: ["Page Editor"],
  },
  {
    name: "Zema Nasirov",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_4613340_941.jpg?resize=200,200",
    role: "Editor-in-Chief",
    primarySection: "Editors-in-Chief",
    altSections: ["Photographers", "Graphic Artists"],
    tags: ["Page Editor", "Photographer", "Graphic Artist"],
  },

  // ── Section Editors ───────────────────────────────────────────────────────
  {
    name: "Maddy Schank",
    photo: null,
    role: "Copy Editor",
    primarySection: "Section Editors",
    altSections: ["Reporters"],
    tags: ["Reporter"],
    bio: "Sophomore Maddy Schank is excited to return for another year of writing for The Octagon. In her free time, she enjoys reading, writing and watching videos on YouTube. Contact her at mschank28@scdsoctagon.org.",
    email: "mschank28@scdsoctagon.org",
  },
  {
    name: "Ryan Xu",
    photo: null,
    role: "Copy Editor",
    primarySection: "Section Editors",
    altSections: ["Technology Staff", "Multimedia Staff"],
    tags: ["Technology Staff", "Multimedia Editor", "Reporter"],
  },
  {
    name: "Kate Barnes",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7348123_570.jpg?resize=200,200",
    role: "News Editor",
    primarySection: "Section Editors",
    bio: "Junior Kate Barnes is the news section editor for The Octagon and is looking forward to working with new staffers, something she has come to enjoy after three years in The Octagon. When she isn't writing about environmental issues and her favorite movies, she enjoys talking to her friends and reading. Contact her at kbarnes27@scdsstudent.org.",
    email: "kbarnes27@scdsstudent.org",
  },
  {
    name: "Jacob Rabe",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7029452_690.jpg?resize=200,200",
    role: "Feature Editor",
    primarySection: "Section Editors",
    altSections: ["Page Editors"],
    tags: ["Page Editor"],
  },
  {
    name: "Parsiny Nijher",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7535246_48.jpg?resize=200,200",
    role: "Sports Editor",
    primarySection: "Section Editors",
    altSections: ["Reporters"],
    tags: ["Reporter"],
    bio: "Sophomore Parsiny Nijher is entering her second year as an Octagon staffer. Previously she was a reporter, but now has risen in the ranks to become the Octagon’s Sports Section Editor. She enjoys watching sports, movies and sleeping (who doesn’t). The sports she watches the most are basketball, football, and occasionally baseball (when there is absolutely nothing else to watch). Being an avid Sacramento Kings supporter since birth, she knows about struggle and how to write about painful topics. Through this knowledge, she became a member of the Octagon and plans to stay throughout her duration of high school, unless kicked out. If anyone needs to email Parsiny for any reason, email her at, pnijher28@scdsstudent.org.",
    email: "pnijher28@scdsstudent.org",
  },
  {
    name: "Anika Nadgauda",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5739564_255.jpg?resize=200,200",
    role: "A&E / Opinion Editor",
    primarySection: "Section Editors",
    altSections: ["Page Editors"],
    tags: ["Page Editor", "Social Media Editor"],
    bio: "Anika Nadgauda is a current senior and has been a part of The Octagon for four years. Her favorite animal is the goose, and her favorite color is purple. She loves to read and crochet along with gardening.",
  },

  // ── Technology Staff ──────────────────────────────────────────────────────
  {
    name: "Sid Shukla",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6857756_142.jpg?resize=200,200",
    role: "Technology Staff",
    primarySection: "Technology Staff",
    bio: "this guys the goat.",
    altSections: ["Business Staff", "Page Editors"],
    tags: ["Business Manager", "Page Editor", "Reporter"],
  },

  // ── Page Editors ──────────────────────────────────────────────────────────
  {
    name: "Lukas Chung",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7114686_810.jpg?resize=200,200",
    role: "Page Editor",
    primarySection: "Page Editors",
    altSections: ["Reporters"],
    tags: ["Reporter"],
    bio: "When you first walk into The Octagon room, the first thing you may notice is Junior Lukas Chung rummaging through the snack bin. Contact him at lchung@scdsstudent.org.",
    email: "lchung@scdsstudent.org",
  },
  {
    name: "Jesse Dizon",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6242173_764.jpg?resize=200,200",
    role: "Page Editor",
    primarySection: "Page Editors",
    bio: "Jesse Dizon is currently a senior, soaking up her last months at Sacramento Country Day's very own newspaper. Contact at jdizon@scdsstudent.org.",
    email: "jdizon@scdsstudent.org",
  },
  {
    name: "Vivian Li",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6857377_874.jpg?resize=200,200",
    role: "Page Editor",
    primarySection: "Page Editors",
    altSections: ["Reporters"],
    tags: ["Reporter"],
    bio: "Sophomore Vivian Li, when not in class, can be found binge watching anime or aggressively petting her cat Lucky. Contact her at wli28@scdsstudent.org.",
    email: "wli28@scdsstudent.org",
  },
  {
    name: "Zachary Vando-Milberger",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_4613392_393.jpg?resize=200,200",
    role: "Page Editor",
    primarySection: "Page Editors",
    altSections: ["Reporters"],
    tags: ["Reporter"],
  },
  {
    name: "Andrea Yue",
    photo: null,
    role: "Page Editor",
    primarySection: "Page Editors",
    altSections: ["Reporters"],
    tags: ["Reporter"],
  },

  // ── Reporters ─────────────────────────────────────────────────────────────
  {
    name: "Noor Alameri",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7139431_748.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Junior Noor Alameri is a second-year staffer on The Octagon. She most enjoys writing A&E and opinion stories, but hopes to expand her writing experience this year to include more news. When she isn’t bothering her friends by talking incessantly about whatever new book she just read or movie she watched, she’s trying to cook an edible meal, failing at it and then eating it anyway. Although her cooking skills may be subpar, her ability to procrastinate any assignment, no matter how long she was given to do it, is truly outstanding. Contact her at nalameri27@scdsstudent.org.",
    email: "nalameri27@scdsstudent.org",
  },
  {
    name: "Chloey Fang",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7196347_644.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Freshman Chloey Fang spends most of her time listening to music while playing Roblox with her friends. Contact her at cfang29@scdsstudent.org.",
    email: "cfang29@scdsstudent.org",
  },
  {
    name: "Trisha Gandhi",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_8312970_219.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Whenever freshman Trisha Gandhi isn't trying to catch up on school work, she is often spending time on the golf course or hanging out with friends. She enjoys the focus, independence and patience which has become one of her main interests in and out of school. As a member of The Octagon staff, she enjoys covering sports, feature stories, and student perspectives around campus. If you ever have any story ideas or need to contact her, you can reach her at tgandhi29@scdsstudent.org.",
    email: "tgandhi29@scdsstudent.org",
  },
  {
    name: "Lucas Holz",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7737056_70.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Lucas, the youngest of the Holz brothers, is a great fencer whose focus and precision shine both on the strip and in his writing. A dedicated and creative member of The Octagon staff, he brings energy, skill, and a unique perspective to every story.",
  },
  {
    name: "Ammar Hussain",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6425432_560.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Ammar is a sophomore at our school with a passion for skiing. When he’s not hitting the slopes, he’s perfecting his skills and bringing the same dedication to his writing for The Octagon. Known for his enthusiasm and precision, Ammar takes every project he works on with care and creativity.",
  },
  {
    name: "Ethan Minton",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Freshman Ethan Minton is excited for his first year of high school and to write for the Octagon. Contact him at eminton29@scdsstudent.org.",
    email: "eminton29@scdsstudent.org",
  },
  {
    name: "Maggie Nuñez-Aguilera",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7595033_713.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
  },
  {
    name: "Parsa Salari",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6352338_182.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Sophomore Parsa Salari is about to start his fifth year at Country Day. Contact him at psalari28@scdsstudent.org.",
    email: "psalari28@scdsstudent.org",
  },
  {
    name: "Khivi Singh",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6375565_50.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Khivi Singh is a freshman at Country Day. Contact her at ksingh29@scdsstudent.org.",
    email: "ksingh29@scdsstudent.org",
  },
  {
    name: "Susie Wang",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5729732_955.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Freshman Susie Wang is excited to start high school and meet new people. Contact her at swang29@scdsstudent.org.",
    email: "swang29@scdsstudent.org",
  },
  {
    name: "Brenden Yu",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7889021_930.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Sophomore Brenden Yu is usually eating. When not surrounded by numerous snacks and drinks, he enjoys talking about food, cooking and connecting people through the art of speech. As a rookie Octagon staffer, he is excited to venture into journalism and reporting in his second year at Sacramento Country Day. Outside of writing, Brenden is a proud member of the Country Day Mock Trial team and DECA chapter. Brenden also can't be without his love for music, singing with the Ragazzi Boys Chorus for 10 years and counting. Having lived across the globe, including in the Bay Area, North Carolina, Taiwan, Switzerland and Italy, he aims to bring his international perspective to The Octagon and Country Day community. You can reach him at byu28@scdsstudent.org — and yes, it's normal to be eagerly awaiting a reply.",
    email: "byu28@scdsstudent.org",
  },

  // ── Graphic Artists ───────────────────────────────────────────────────────
  {
    name: "Claire Gemmell",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_4613323_272.jpg?resize=200,200",
    role: "Graphic Artist",
    primarySection: "Graphic Artists",
  },
  {
    name: "Gavin Wang",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5692514_791.jpg?resize=200,200",
    role: "Graphic Artist",
    primarySection: "Graphic Artists",
  },
];

/** Generate a stable slug-style ID from a staff member name */
export function staffId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
