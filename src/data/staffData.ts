/**
 * Canonical staff list for The Octagon 2026-2027.
 * Used by:
 *  - StaffPage (public directory)
 *  - adminDataService (auto-seeds admin authors on first launch)
 *
 * Returning staffers keep the photo, bio and email they already had. Class
 * years have been moved on one year — every bio last year agreed with the
 * graduation year in the writer's email address (kbarnes27 was a junior in
 * 2025-26, cfang29 a freshman, and so on across twelve people), so a
 * sophomore in that file is a junior in this one.
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
    name: "Kate Barnes",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7348123_570.jpg?resize=200,200",
    role: "Editor-in-Chief",
    primarySection: "Editors-in-Chief",
    bio: "Senior Kate Barnes is an editor-in-chief of The Octagon and is looking forward to working with new staffers, something she has come to enjoy after four years in The Octagon. When she isn't writing about environmental issues and her favorite movies, she enjoys talking to her friends and reading. Contact her at kbarnes27@scdsstudent.org.",
    email: "kbarnes27@scdsstudent.org",
  },
  {
    name: "Jacob Rabe",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7029452_690.jpg?resize=200,200",
    role: "Editor-in-Chief",
    primarySection: "Editors-in-Chief",
    altSections: ["Page Editors"],
    tags: ["Page Editor"],
  },
  {
    name: "Parsiny Nijher",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7535246_48.jpg?resize=200,200",
    role: "Editor-in-Chief",
    primarySection: "Editors-in-Chief",
    altSections: ["Reporters"],
    tags: ["Reporter"],
    bio: "Junior Parsiny Nijher is entering her third year as an Octagon staffer. She started as a reporter, rose to sports section editor and is now one of The Octagon's editors-in-chief. She enjoys watching sports, movies and sleeping (who doesn’t). The sports she watches the most are basketball, football, and occasionally baseball (when there is absolutely nothing else to watch). Being an avid Sacramento Kings supporter since birth, she knows about struggle and how to write about painful topics. Through this knowledge, she became a member of the Octagon and plans to stay throughout her duration of high school, unless kicked out. If anyone needs to email Parsiny for any reason, email her at, pnijher28@scdsstudent.org.",
    email: "pnijher28@scdsstudent.org",
  },
  {
    name: "Lukas Chung",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7114686_810.jpg?resize=200,200",
    role: "Editor-in-Chief",
    primarySection: "Editors-in-Chief",
    altSections: ["Reporters"],
    tags: ["Reporter"],
    bio: "When you first walk into The Octagon room, the first thing you may notice is senior Lukas Chung rummaging through the snack bin. Contact him at lchung@scdsstudent.org.",
    email: "lchung@scdsstudent.org",
  },

  // ── Section Editors ───────────────────────────────────────────────────────
  {
    name: "Maggie Nuñez-Aguilera",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7595033_713.jpg?resize=200,200",
    role: "Photo Editor",
    primarySection: "Section Editors",
    altSections: ["Photographers", "Reporters"],
    tags: ["Photographer", "Reporter"],
  },
  {
    name: "Susie Wang",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5729732_955.jpg?resize=200,200",
    role: "Social Media Editor",
    primarySection: "Section Editors",
    altSections: ["Graphic Artists", "Reporters"],
    tags: ["Graphic Editor", "Reporter"],
    bio: "Sophomore Susie Wang is entering her second year on The Octagon. Contact her at swang29@scdsstudent.org.",
    email: "swang29@scdsstudent.org",
  },
  {
    name: "Maddy Schank",
    photo: null,
    role: "Copy Editor",
    primarySection: "Section Editors",
    altSections: ["Technology Staff", "Reporters"],
    tags: ["Technology Assistant", "Reporter"],
    bio: "Junior Maddy Schank is excited to return for another year of writing for The Octagon. In her free time, she enjoys reading, writing and watching videos on YouTube. Contact her at mschank28@scdsoctagon.org.",
    email: "mschank28@scdsoctagon.org",
  },

  // ── Technology Staff ──────────────────────────────────────────────────────
  {
    name: "Sid Shukla",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6857756_142.jpg?resize=200,200",
    role: "Business & Technology Manager",
    primarySection: "Technology Staff",
    altSections: ["Business Staff", "Reporters"],
    tags: ["Business Manager", "Reporter"],
    bio: "this guys the goat.",
  },

  // ── Business Staff ────────────────────────────────────────────────────────
  {
    name: "Brenden Yu",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7889021_930.jpg?resize=200,200",
    role: "Business Staff",
    primarySection: "Business Staff",
    altSections: ["Reporters"],
    tags: ["Reporter"],
    bio: "Junior Brenden Yu is usually eating. When not surrounded by numerous snacks and drinks, he enjoys talking about food, cooking and connecting people through the art of speech. Now in his second year on The Octagon, he is excited to keep venturing into journalism and reporting at Sacramento Country Day. Outside of writing, Brenden is a proud member of the Country Day Mock Trial team and DECA chapter. Brenden also can't be without his love for music, singing with the Ragazzi Boys Chorus for 10 years and counting. Having lived across the globe, including in the Bay Area, North Carolina, Taiwan, Switzerland and Italy, he aims to bring his international perspective to The Octagon and Country Day community. You can reach him at byu28@scdsstudent.org — and yes, it's normal to be eagerly awaiting a reply.",
    email: "byu28@scdsstudent.org",
  },
  {
    name: "Parsa Salari",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6352338_182.jpg?resize=200,200",
    role: "Business Staff",
    primarySection: "Business Staff",
    altSections: ["Reporters"],
    tags: ["Reporter"],
    bio: "Junior Parsa Salari is about to start his sixth year at Country Day. He spends most of his time playing basketball or helping out around campus with the student council. Salari is a massive fan of movies, especially dramas, comedies and superhero films. His current favorite is “The Shawshank Redemption.” When he is not watching his favorite movies and shows, you can find him playing basketball on the blacktop with his friends whenever he’s free. Contact him at psalari28@scdsstudent.org",
    email: "psalari28@scdsstudent.org",
  },
  {
    name: "Ammar Hussain",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6425432_560.jpg?resize=200,200",
    role: "Business Staff",
    primarySection: "Business Staff",
    altSections: ["Reporters"],
    tags: ["Reporter"],
    bio: "Ammar is a junior at our school with a passion for skiing. When he’s not hitting the slopes, he’s perfecting his skills and bringing the same dedication to his writing for The Octagon. Known for his enthusiasm and precision, Ammar takes every project he works on with care and creativity.",
  },

  // ── Graphic Artists ───────────────────────────────────────────────────────
  {
    name: "Amelia Dizon",
    photo: null,
    role: "Graphic Editor",
    primarySection: "Graphic Artists",
  },

  // ── Reporters ─────────────────────────────────────────────────────────────
  {
    name: "Ayaan Ahsan Mian",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
  },
  {
    name: "Noor Alameri",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7139431_748.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Senior Noor Alameri is a third-year staffer on The Octagon. She most enjoys writing A&E and opinion stories, but hopes to expand her writing experience this year to include more news. When she isn’t bothering her friends by talking incessantly about whatever new book she just read or movie she watched, she’s trying to cook an edible meal, failing at it and then eating it anyway. Although her cooking skills may be subpar, her ability to procrastinate any assignment, no matter how long she was given to do it, is truly outstanding. Contact her at nalameri27@scdsstudent.org.",
    email: "nalameri27@scdsstudent.org",
  },
  {
    name: "Stephanie Auron",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
  },
  {
    name: "Adelyne Chu",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
  },
  {
    name: "Chloey Fang",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7196347_644.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Sophomore Chloey Fang spends most of her time listening to music while playing Roblox with her friends. Contact her at cfang29@scdsstudent.org.",
    email: "cfang29@scdsstudent.org",
  },
  {
    name: "Trisha Gandhi",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_8312970_219.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Whenever sophomore Trisha Gandhi isn't trying to catch up on school work, she is often spending time on the golf course or hanging out with friends. She enjoys the focus, independence and patience which has become one of her main interests in and out of school. As a member of The Octagon staff, she enjoys covering sports, feature stories, and student perspectives around campus. If you ever have any story ideas or need to contact her, you can reach her at tgandhi29@scdsstudent.org.",
    email: "tgandhi29@scdsstudent.org",
  },
  {
    name: "Simran Heyer",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
  },
  {
    name: "Eisa Hussain",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
  },
  {
    name: "AJ Jhand",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
  },
  {
    name: "Mason Jung",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
  },
  {
    name: "Lorie Li",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
  },
  {
    name: "Vivian Li",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6857377_874.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Junior Vivian Li, when not in class, can be found binge watching anime or aggressively petting her cat Lucky. Contact her at wli28@scdsstudent.org.",
    email: "wli28@scdsstudent.org",
  },
  {
    name: "Ethan Minton",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Sophomore Ethan Minton is entering his second year writing for The Octagon. Contact him at eminton29@scdsstudent.org.",
    email: "eminton29@scdsstudent.org",
  },
  {
    name: "Nivaar Nijher",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
  },
  {
    name: "Sofiya Sanghvi",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
  },
  {
    name: "Aniket Sarkar",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
  },
  {
    name: "Khivi Singh",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6375565_50.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
    bio: "Khivi Singh is a sophomore at Country Day. Contact her at ksingh29@scdsstudent.org.",
    email: "ksingh29@scdsstudent.org",
  },
  {
    name: "Zachary Vando-Milberger",
    photo: "https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_4613392_393.jpg?resize=200,200",
    role: "Reporter",
    primarySection: "Reporters",
  },
  {
    name: "Vivian Wang",
    photo: null,
    role: "Reporter",
    primarySection: "Reporters",
  },
];

/** Generate a stable slug-style ID from a staff member name */
export function staffId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
