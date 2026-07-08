export type PilotSource = {
  id: string;
  label: string;
  title: string;
  url: string;
  note: string;
};

export type PilotStat = {
  value: string;
  label: string;
  context: string;
  sourceId: string;
};

export type PilotSection = {
  eyebrow: string;
  title: string;
  body: string;
  sourceIds: string[];
};

export type PilotChart = {
  id: string;
  title: string;
  dek: string;
  sourceId: string;
  note: string;
  xKey: string;
  valueKey: string;
  valueLabel: string;
  valueSuffix?: string;
  data: Array<Record<string, string | number>>;
};

export type InteractiveNewsPilot = {
  kicker: string;
  headline: string;
  dek: string;
  byline: string;
  date: string;
  editorNote: string;
  heroStat: PilotStat;
  stats: PilotStat[];
  sections: PilotSection[];
  sources: PilotSource[];
  charts: {
    comparison: PilotChart;
    trend: PilotChart;
  };
  methodology: string;
};

export const interactiveNewsPilot: InteractiveNewsPilot = {
  kicker: "Interactive News Lab",
  headline: "How sports betting reaches students before they can legally bet",
  dek:
    "Country Day students report seeing betting ads and placing bets, while national data shows online sportsbooks have become a growing public-health concern.",
  byline: "Ethan Minton and The Octagon News Lab",
  date: "Issue 10 interactive draft",
  editorNote:
    "Professional prototype based on the draft story “Online Sports Gambling Must Be Regulated.” The page keeps source context visible so the story can rely less on repetitive attribution language.",
  heroStat: {
    value: "51%",
    label: "of Octagon poll respondents said they had placed a sports bet",
    context: "based on 43 Country Day high school responses collected March 24",
    sourceId: "octagon-poll",
  },
  stats: [
    {
      value: "88%",
      label: "saw at least one sports-betting ad per day",
      context: "in the same Country Day poll of 43 high school students",
      sourceId: "octagon-poll",
    },
    {
      value: "23%",
      label: "increase in gambling-addiction help searches",
      context: "nationally after the 2018 Murphy v. NCAA decision, according to UC San Diego researchers",
      sourceId: "ucsd",
    },
    {
      value: "$2.78M",
      label: "in suspected underage DraftKings wagers",
      context: "reported to Ohio regulators since 2023, according to a USA Today investigation",
      sourceId: "usa-today",
    },
  ],
  sections: [
    {
      eyebrow: "Local signal",
      title: "The school angle is not whether students know betting exists. It is how normal it feels.",
      body:
        "In the Octagon poll, half of respondents said they had placed a sports bet, and nearly nine in 10 said they saw at least one sports-betting ad per day. Those numbers do not prove a campus-wide rate, but they show why the issue belongs in a student newspaper.",
      sourceIds: ["octagon-poll", "source-note"],
    },
    {
      eyebrow: "Public-health frame",
      title: "The national evidence points to online access, not just old-fashioned gambling.",
      body:
        "A UC San Diego-led study connected the expansion of online sportsbooks with a national increase in searches for gambling-addiction help. The National Council on Problem Gambling also identifies sports bettors, online gamblers, young adults and males as higher-risk groups.",
      sourceIds: ["ucsd", "ncpg"],
    },
    {
      eyebrow: "Regulation",
      title: "California’s rules are complicated, and students can still encounter betting-like products.",
      body:
        "Sports betting remains illegal in California, but fantasy and prediction-market products complicate the picture. A 2025 California attorney general opinion concluded that paid daily fantasy sports games constitute unlawful sports wagering under state law.",
      sourceIds: ["cal-ag", "bill"],
    },
  ],
  sources: [
    {
      id: "octagon-poll",
      label: "Campus poll",
      title: "The Octagon high school poll",
      url: "#methodology",
      note:
        "Forty-three Country Day high school students responded on March 24. The poll is useful for a student-angle signal, not a scientific estimate of the whole student body.",
    },
    {
      id: "ucsd",
      label: "Study",
      title: "UC San Diego / JAMA Internal Medicine sports-betting study",
      url: "https://today.ucsd.edu/story/study-reveals-surge-in-gambling-addiction-following-legalization-of-sports-betting",
      note:
        "Researchers analyzed Google searches from 2016 through June 2024 and found a 23% national increase in gambling-addiction help-seeking after sportsbooks expanded.",
    },
    {
      id: "ncpg",
      label: "Public health",
      title: "National Council on Problem Gambling NGAGE 3.0",
      url: "https://www.ncpgambling.org/training/ngage-survey/ngage-3/",
      note:
        "The council estimates 2.5 million U.S. adults likely suffer from gambling disorder and identifies online gamblers and sports bettors as higher-risk groups.",
    },
    {
      id: "usa-today",
      label: "Investigation",
      title: "USA Today underage sportsbook investigation",
      url: "https://usatoday.com/story/news/investigations/2026/02/03/draftkings-fanduel-betting-apps-busting-kids/88378160007/",
      note:
        "USA Today reviewed suspected fraud reports and reported underage activity on major sportsbook apps, including DraftKings and FanDuel figures from Ohio regulators.",
    },
    {
      id: "cal-ag",
      label: "Legal opinion",
      title: "California attorney general opinion on daily fantasy sports",
      url: "https://oag.ca.gov/system/files/attachments/press-docs/23-1001.pdf",
      note:
        "The July 2025 opinion concluded that daily fantasy sports games played by people physically located in California violate Penal Code section 337a.",
    },
    {
      id: "bill",
      label: "Legislation",
      title: "Protecting Kids From Online Gambling Act reference",
      url: "#methodology",
      note:
        "The draft story references proposed California legislation aimed at restricting marketing and access for minors. Link to the bill text before publication.",
    },
    {
      id: "source-note",
      label: "Methodology",
      title: "How this interactive handles evidence",
      url: "#methodology",
      note:
        "Local poll results are separated from national research and legal sources so readers can see what each piece of evidence can and cannot prove.",
    },
  ],
  charts: {
    comparison: {
      id: "campus-poll",
      title: "What Country Day respondents reported",
      dek: "A quick view of the Octagon poll results used in the story.",
      sourceId: "octagon-poll",
      note:
        "The poll had 43 high school respondents. It should be described as a voluntary campus poll, not a representative survey.",
      xKey: "group",
      valueKey: "percent",
      valueLabel: "Share of respondents",
      valueSuffix: "%",
      data: [
        { group: "Placed a bet", percent: 51 },
        { group: "11+ ads/day", percent: 42 },
        { group: "At least 1 ad/day", percent: 88 },
      ],
    },
    trend: {
      id: "sportsbooks-growth",
      title: "Legal sports wagering grew rapidly after 2018",
      dek: "The national context helps explain why student exposure to betting products has increased.",
      sourceId: "ucsd",
      note:
        "UC San Diego researchers reported sports wagers rising from $4.9 billion in 2017 to $121.1 billion in 2023; 94% of 2023 wagers were placed online.",
      xKey: "year",
      valueKey: "wagers",
      valueLabel: "Sports wagers",
      valueSuffix: "B",
      data: [
        { year: "2017", wagers: 4.9 },
        { year: "2023", wagers: 121.1 },
      ],
    },
  },
  methodology:
    "The local findings come from an Octagon poll of 43 Country Day high school students conducted March 24. Because the poll was voluntary and limited in size, the results should be used as evidence of student exposure and behavior among respondents, not as a schoolwide prevalence estimate. National figures come from the National Council on Problem Gambling, UC San Diego-led research, USA Today reporting and California legal documents. Before publication, editors should verify every number against the linked source, add the exact poll question wording and link the California bill text referenced in the draft.",
};
