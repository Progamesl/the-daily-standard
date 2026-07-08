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

export type PilotArticleBlock =
  | {
      type: "heading";
      text: string;
    }
  | {
      type: "paragraph";
      text: string;
      sourceIds?: string[];
    }
  | {
      type: "pullquote";
      quote: string;
      attribution: string;
    }
  | {
      type: "stat-strip";
      statIndexes: number[];
    }
  | {
      type: "chart";
      chartId: "comparison" | "trend";
    }
  | {
      type: "source-note";
      title: string;
      text: string;
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
  articleBlocks: PilotArticleBlock[];
  sources: PilotSource[];
  charts: {
    comparison: PilotChart;
    trend: PilotChart;
  };
  methodology: string;
};

export const interactiveNewsPilot: InteractiveNewsPilot = {
  kicker: "Interactive News",
  headline: "Online Sports Gambling Must Be Regulated",
  dek:
    "Country Day students report seeing betting ads and placing bets, while national data shows online sportsbooks have become a growing public-health concern.",
  byline: "Ethan Minton",
  date: "May 7, 2026",
  editorNote:
    "Editor preview: this version preserves the full article while embedding source cards, poll results and charts inside the story flow.",
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
  articleBlocks: [
    {
      type: "paragraph",
      text:
        "Ryan Hobbs, Sacramento Country Day middle school dean of students, is worried about his students' attitudes toward sports betting. While he has not witnessed students placing sports bets, he has seen kids as young as 11 joking about doing so.",
    },
    {
      type: "pullquote",
      quote:
        "One of the kids in my elective pulled up all of the prop bets for the Super Bowl, and students were taking turns saying what they would have bet for each of the prop bets.",
      attribution: "Ryan Hobbs, middle school dean of students",
    },
    {
      type: "paragraph",
      text:
        "U.S. adults have a substantial gambling problem. The National Council on Problem Gambling estimates that 2.5 million adults likely suffer from gambling disorder, and a UC San Diego-led study found that online searches for gambling-addiction help increased by about 23% nationally after the expansion of legalized sports betting in 2018.",
      sourceIds: ["ncpg", "ucsd"],
    },
    {
      type: "stat-strip",
      statIndexes: [1],
    },
    {
      type: "chart",
      chartId: "trend",
    },
    {
      type: "paragraph",
      text:
        "Hobbs said he is concerned about the negative effects Cavaliers joking about the issue today could have on their futures.",
    },
    {
      type: "pullquote",
      quote:
        "You can't just let kids loose on this stuff, right? Gambling ruins people's lives. In an alternate future where it is a problem, schools should handle it the same way as a kid doing drugs.",
      attribution: "Ryan Hobbs",
    },
    {
      type: "heading",
      text: "A new age of sports gambling",
    },
    {
      type: "paragraph",
      text:
        "Sports gambling has existed for millennia, from people wagering on chariot races in the sixth century B.C.E. to sports leagues in the 21st century. In May 2018, the Supreme Court overturned the Professional and Amateur Sports Protection Act, opening the door for states to legalize online sports gambling for adults.",
      sourceIds: ["ucsd"],
    },
    {
      type: "paragraph",
      text:
        "Now, professional sports leagues such as the NFL and NBA partner with betting platforms including FanDuel and DraftKings. Sports that prohibit their own players, coaches and staff from betting increasingly push betting commercials and content across social media and television.",
    },
    {
      type: "paragraph",
      text:
        "Sophomore Lucas Holz, a sports fan, said he has seen many sports-betting ads and is concerned about how betting companies sell their products. On TikTok, he said, videos promote how much viewers can win, not the potential losses that come with betting. He said a betting ad can seem to appear every three scrolls.",
    },
    {
      type: "heading",
      text: "Increase in underage sports gambling",
    },
    {
      type: "paragraph",
      text:
        "The issue of underage sports gambling is present even in California, where most forms of sports gambling remain illegal. An increasing number of teens use apps like PrizePicks or crypto-based sites to bet on player props, wagers on individual player statistics or milestones rather than a game's final outcome.",
      sourceIds: ["cal-ag"],
    },
    {
      type: "source-note",
      title: "What California says about player-prop products",
      text:
        "California Attorney General Rob Bonta concluded in a 2025 legal opinion that paid daily fantasy sports games played by people physically located in California constitute sports wagering under state law.",
      sourceIds: ["cal-ag"],
    },
    {
      type: "paragraph",
      text:
        "USA Today reported that, since 2023, DraftKings had 620 reports of suspected underage activity in Ohio, accounting for $2.78 million in wagers. FanDuel had 162 underage reports, accounting for $63,152 in bets.",
      sourceIds: ["usa-today"],
    },
    {
      type: "stat-strip",
      statIndexes: [2],
    },
    {
      type: "paragraph",
      text:
        "USA Today investigative reporter Nick Penzenstadler described how minors can get around safeguards by borrowing or stealing identifying information, or by uploading a parent's or older sibling's identification.",
      sourceIds: ["usa-today"],
    },
    {
      type: "paragraph",
      text:
        "A 2024 Redwood High School survey in Larkspur, California, found that nearly three-fourths of male students and one-fourth of female students had placed a sports bet online despite being underage. Some Redwood students anonymously described using VPNs to claim they were located elsewhere.",
    },
    {
      type: "paragraph",
      text:
        "Forty-three Country Day high school students filled out a similar Octagon poll on March 24. About half, 51%, reported placing a sports bet. Additionally, 42% said they had seen more than 11 sports-betting ads per day, and 88% had come across at least one per day.",
      sourceIds: ["octagon-poll"],
    },
    {
      type: "chart",
      chartId: "comparison",
    },
    {
      type: "heading",
      text: "Legislation and action",
    },
    {
      type: "paragraph",
      text:
        "Sites like Kalshi and Polymarket, considered prediction markets, are still permitted to operate in California. Both platforms cater to younger audiences through paid creator promotion and TikTok-style, high-volume ads.",
    },
    {
      type: "paragraph",
      text:
        "Polymarket came under scrutiny after offering betting on when U.S. soldiers shot down in Iran would be rescued, according to NBC News. Kalshi also faced backlash after refusing to pay out $54 million in bets related to the removal of Iran's Ayatollah Ali Khamenei.",
    },
    {
      type: "paragraph",
      text:
        "California legislators Pilar Schiavo and Mia Bonta plan to introduce Assembly Bill 2617, the Protecting Kids From Online Gambling Act. The bill would ban platforms like FanDuel and DraftKings from marketing to minors or allowing them to play.",
      sourceIds: ["bill"],
    },
    {
      type: "source-note",
      title: "What editors should verify before publication",
      text:
        "The bill reference, Redwood High School survey, Journal of Behavioral Addictions figures, Center for Public Justice claim and American Institute for Boys and Men debt figure should be linked or rechecked before this interactive is published outside editor review.",
      sourceIds: ["source-note"],
    },
    {
      type: "paragraph",
      text:
        "The California Office of Problem Gambling identifies warning signs such as playing longer than intended, constantly checking a phone, feeling pulled back in when trying to stop, or feeling stressed, irritated or restless when not playing.",
    },
    {
      type: "paragraph",
      text:
        "The National Council on Problem Gambling provides resources for people struggling with gambling problems, including answers to common questions, a gambling behavior self-assessment, treatment information and the National Problem Gambling Helpline at 1-800-MY-RESET.",
      sourceIds: ["ncpg"],
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
