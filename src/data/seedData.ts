// Seed data for the newspaper website
// Realistic newsroom-style content with sections, authors, and articles

export interface Author {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  twitter?: string;
}

export interface Article {
  id: string;
  slug: string;
  headline: string;
  dek: string;
  body: string;
  image: string;
  imageCaption: string;
  section: string;
  author: Author;
  publishedAt: Date;
  updatedAt?: Date;
  readingTime: number;
  tags: string[];
  isBreaking?: boolean;
  isFeatured?: boolean;
  views?: number;
}

export interface Section {
  id: string;
  name: string;
  slug: string;
  description: string;
}

// Sections
export const sections: Section[] = [
  { id: "world", name: "World", slug: "world", description: "International news and global affairs" },
  { id: "us", name: "U.S.", slug: "us", description: "National news from across America" },
  { id: "politics", name: "Politics", slug: "politics", description: "Political news and analysis" },
  { id: "business", name: "Business", slug: "business", description: "Markets, economy, and corporate news" },
  { id: "technology", name: "Technology", slug: "technology", description: "Tech industry and innovation" },
  { id: "science", name: "Science", slug: "science", description: "Scientific discoveries and research" },
  { id: "health", name: "Health", slug: "health", description: "Medical news and wellness" },
  { id: "sports", name: "Sports", slug: "sports", description: "Sports news and analysis" },
  { id: "arts", name: "Arts", slug: "arts", description: "Culture, entertainment, and the arts" },
  { id: "opinion", name: "Opinion", slug: "opinion", description: "Editorials and op-eds" },
];

// Authors
export const authors: Author[] = [
  {
    id: "1",
    name: "Margaret Chen",
    role: "Senior International Correspondent",
    bio: "Margaret Chen has covered global affairs for over two decades, with postings in Beijing, London, and Cairo. She specializes in diplomatic relations and international security.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    twitter: "@margaretchen",
  },
  {
    id: "2",
    name: "David Okonkwo",
    role: "Technology Editor",
    bio: "David Okonkwo leads our technology coverage, focusing on the intersection of innovation and society. Previously at Wired and The Verge.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    twitter: "@dokonkwo",
  },
  {
    id: "3",
    name: "Sarah Mitchell",
    role: "White House Correspondent",
    bio: "Sarah Mitchell covers the White House and federal government. A Pulitzer finalist, she previously served as bureau chief in Washington.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    twitter: "@sarahmitchell",
  },
  {
    id: "4",
    name: "James Park",
    role: "Business Columnist",
    bio: "James Park writes about markets, economics, and the forces shaping global commerce. Former economist at the Federal Reserve.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
    twitter: "@jamespark_biz",
  },
  {
    id: "5",
    name: "Elena Rodriguez",
    role: "Science Reporter",
    bio: "Elena Rodriguez covers climate science, space exploration, and emerging research. PhD in Environmental Science from MIT.",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop",
    twitter: "@elenasci",
  },
];

// Articles
export const articles: Article[] = [
  {
    id: "1",
    slug: "global-climate-summit-breakthrough",
    headline: "World Leaders Reach Historic Climate Agreement at Geneva Summit",
    dek: "The landmark accord commits major economies to aggressive emissions targets and establishes a $100 billion fund for developing nations",
    body: `In a dramatic conclusion to two weeks of intense negotiations, world leaders emerged from the Geneva Climate Summit early Thursday morning with what many are calling the most significant environmental agreement in a generation.

The accord, signed by representatives of 195 nations, commits the world's largest economies to reducing carbon emissions by 60 percent by 2035—far exceeding previous targets. Perhaps more significantly, the agreement establishes a new $100 billion annual fund to help developing nations transition to clean energy.

"This is the moment the world chose its future," said United Nations Secretary-General António Guterres, visibly emotional as he addressed reporters. "Today, we have shown that when humanity works together, no challenge is insurmountable."

The agreement comes after years of stalled talks and growing pressure from scientists warning that the window to prevent catastrophic warming was rapidly closing. Just last month, a UN panel reported that global temperatures had already risen 1.4 degrees Celsius above pre-industrial levels.

The summit's success hinged on a last-minute breakthrough between the United States and China, whose negotiators worked through the night to resolve disputes over verification mechanisms and financial commitments. Secretary of State Katherine Brooks called the agreement "a new chapter in international cooperation."

However, the accord has already drawn criticism from some environmental groups who argue the targets don't go far enough. "Sixty percent by 2035 sounds impressive, but the science tells us we need to move faster," said Greenpeace International director Maria Santos. "We should be celebrating, but we can't afford to be complacent."

Implementation will be the true test. The agreement includes robust monitoring provisions, with countries required to submit detailed progress reports every two years. Nations that fall short of targets will face financial penalties under a new enforcement mechanism.

Markets reacted positively to the news, with renewable energy stocks surging in early trading. Solar and wind companies saw gains of 8 to 12 percent, while traditional energy stocks declined modestly.`,
    image: "https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=1200&h=800&fit=crop",
    imageCaption: "Delegates applaud after the signing of the Geneva Climate Accord on Thursday morning.",
    section: "world",
    author: authors[0],
    publishedAt: new Date("2024-03-14T06:30:00Z"),
    readingTime: 8,
    tags: ["Climate", "Geneva Summit", "Environment", "International"],
    isFeatured: true,
    isBreaking: true,
    views: 245000,
  },
  {
    id: "2",
    slug: "fed-interest-rate-decision",
    headline: "Federal Reserve Signals Pause in Rate Hikes Amid Cooling Inflation",
    dek: "The central bank held rates steady for the third consecutive meeting as officials see encouraging signs in recent economic data",
    body: `The Federal Reserve kept its benchmark interest rate unchanged Wednesday, signaling that its aggressive campaign to combat inflation may be nearing an end as price pressures continue to ease.

The decision to hold the federal funds rate at 5.25 to 5.5 percent—the highest level in 22 years—was widely expected by markets. But investors focused intently on Chair Jerome Powell's suggestion that the Fed may not need to raise rates further.

"We believe that our policy rate may be at or near its peak for this tightening cycle," Powell said at his post-meeting press conference. "But we need to see more progress before we can confidently say that inflation is on a sustainable path back to 2 percent."

Recent data has bolstered the case for patience. The Consumer Price Index rose just 3.2 percent in October from a year earlier, down from a peak of 9.1 percent in June 2022. Core inflation, which excludes volatile food and energy prices, has also shown steady improvement.

The labor market, while still robust, has begun to show signs of cooling. Job openings have declined, and wage growth has moderated—developments that could further ease price pressures without triggering a recession.

Financial markets rallied on the news, with the S&P 500 climbing 1.3 percent and Treasury yields falling sharply. Traders now see a high probability that the Fed will begin cutting rates by mid-2024.`,
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=800&fit=crop",
    imageCaption: "Federal Reserve Chair Jerome Powell speaks to reporters following the policy meeting.",
    section: "business",
    author: authors[3],
    publishedAt: new Date("2024-03-13T19:00:00Z"),
    readingTime: 6,
    tags: ["Federal Reserve", "Interest Rates", "Economy", "Inflation"],
    views: 89000,
  },
  {
    id: "3",
    slug: "breakthrough-cancer-treatment",
    headline: "New Cancer Treatment Shows Remarkable Results in Clinical Trials",
    dek: "Patients with advanced solid tumors saw significant tumor reduction using a novel targeted therapy approach",
    body: `A groundbreaking cancer treatment has shown exceptional promise in late-stage clinical trials, offering hope to patients with cancers that have resisted conventional therapies.

The treatment, developed by researchers at Memorial Sloan Kettering Cancer Center in collaboration with pharmaceutical company Novaris, uses a new class of targeted therapy that attacks tumors while largely sparing healthy tissue.

In Phase III trials involving 1,200 patients with advanced solid tumors, 68 percent showed significant tumor reduction, with 23 percent achieving complete remission. Side effects were notably milder than those associated with traditional chemotherapy.

"These results exceed our most optimistic projections," said Dr. Amanda Foster, who led the research team. "We're seeing responses in patients who had exhausted all other treatment options."

The therapy works by targeting a specific protein mutation found in approximately 15 percent of solid tumors. Unlike chemotherapy, which attacks all rapidly dividing cells, this approach precisely targets cancer cells while minimizing damage to healthy tissue.

The FDA has granted the treatment breakthrough therapy designation, potentially accelerating its path to approval. Novaris expects to submit its application for approval within six months.`,
    image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=1200&h=800&fit=crop",
    imageCaption: "Researchers at Memorial Sloan Kettering developed the new targeted cancer therapy.",
    section: "health",
    author: authors[4],
    publishedAt: new Date("2024-03-13T14:00:00Z"),
    readingTime: 5,
    tags: ["Cancer", "Medical Research", "Clinical Trials", "Healthcare"],
    views: 156000,
  },
  {
    id: "4",
    slug: "artificial-intelligence-regulation",
    headline: "Congress Advances Sweeping AI Regulation Bill",
    dek: "The bipartisan legislation would establish federal oversight of artificial intelligence systems and require safety testing",
    body: `Congress took a major step toward regulating artificial intelligence Thursday, as a Senate committee advanced landmark legislation that would establish federal oversight of AI systems used in critical decisions affecting Americans' lives.

The Artificial Intelligence Safety and Innovation Act, which passed the Commerce Committee on a bipartisan 18-8 vote, would require companies to test AI systems for bias and safety before deployment in areas like hiring, lending, and healthcare.

"This is the most significant technology legislation since the creation of the internet," said Senator Maria Cantwell, who co-authored the bill with Republican Senator Ted Cruz. "We're setting guardrails while preserving innovation."

The legislation would create a new AI Safety Board within the Commerce Department, empowered to investigate complaints and issue fines for violations. Companies deploying high-risk AI systems would be required to maintain detailed records and submit to regular audits.

Tech industry groups have offered qualified support, preferring federal regulation to a patchwork of state laws. However, some worry the requirements could slow development at a time when the U.S. is racing to maintain its lead over China in AI capabilities.

Civil liberties organizations praised the bill's focus on preventing algorithmic discrimination but called for stronger enforcement mechanisms. The full Senate is expected to vote on the measure next month.`,
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=800&fit=crop",
    imageCaption: "The Capitol building where lawmakers are debating AI regulation.",
    section: "politics",
    author: authors[2],
    publishedAt: new Date("2024-03-13T11:30:00Z"),
    readingTime: 6,
    tags: ["Artificial Intelligence", "Congress", "Regulation", "Technology"],
    views: 78000,
  },
  {
    id: "5",
    slug: "space-exploration-mars-mission",
    headline: "NASA Unveils Ambitious Plan for Crewed Mars Mission by 2035",
    dek: "The agency's new roadmap includes lunar base construction and development of advanced propulsion systems",
    body: `NASA announced an ambitious timeline Thursday to land humans on Mars by 2035, unveiling a detailed roadmap that builds on the Artemis lunar program and calls for significant advances in spacecraft technology.

The plan, presented to Congress by NASA Administrator Bill Nelson, envisions using the Moon as a proving ground for the technologies and procedures needed for the 18-month round trip to Mars.

"Going to Mars is the next giant leap for humanity," Nelson told the House Science Committee. "And we now have a clear path to get there."

The roadmap calls for establishing a permanent lunar base by 2028, which would serve as a testing ground for life support systems, habitats, and propulsion technologies. New nuclear thermal propulsion engines would cut the travel time to Mars roughly in half compared to conventional rockets.

The estimated cost of $150 billion over 15 years has drawn scrutiny from some lawmakers, though the plan enjoys bipartisan support. Private partnerships with SpaceX and Blue Origin would help share costs and accelerate development.

International partners including the European Space Agency and Japan's JAXA have expressed interest in participating in the Mars mission, potentially sharing costs and contributing specialized technologies.`,
    image: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1200&h=800&fit=crop",
    imageCaption: "An artist's rendering of a future Mars base, part of NASA's long-term vision.",
    section: "science",
    author: authors[4],
    publishedAt: new Date("2024-03-12T16:00:00Z"),
    readingTime: 5,
    tags: ["NASA", "Mars", "Space Exploration", "Science"],
    views: 134000,
  },
  {
    id: "6",
    slug: "tech-giant-antitrust-ruling",
    headline: "Federal Court Rules Against Tech Giant in Landmark Antitrust Case",
    dek: "The decision could force significant changes to how major technology platforms operate and compete",
    body: `A federal judge dealt a major blow to one of Silicon Valley's most powerful companies Monday, ruling that it had illegally maintained monopoly power over the digital advertising market.

The ruling, which follows a multi-year investigation by the Department of Justice, found that the company had engaged in a pattern of anticompetitive behavior, including acquiring potential rivals and using its dominant position to disadvantage competitors.

Judge Eleanor Price wrote in her 247-page decision that the company's practices had "substantially harmed competition and consumers" in the $300 billion digital advertising industry.

The ruling opens the door to potential remedies that could include forcing the company to sell off parts of its advertising business. A separate hearing on remedies is scheduled for next month.

"Today's decision vindicates years of investigation and litigation," said Attorney General Merrick Garland. "It sends a clear message that no company, no matter how powerful, is above the law."

The company said it would appeal, calling the decision "fundamentally flawed." Legal experts said the case could take years to fully resolve.`,
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=800&fit=crop",
    imageCaption: "The ruling could reshape the digital advertising industry.",
    section: "technology",
    author: authors[1],
    publishedAt: new Date("2024-03-12T10:00:00Z"),
    readingTime: 5,
    tags: ["Antitrust", "Technology", "Regulation", "Business"],
    views: 67000,
  },
  {
    id: "7",
    slug: "championship-final-thriller",
    headline: "Dramatic Overtime Victory Caps Historic Championship Run",
    dek: "A stunning comeback in the final minutes delivered the franchise its first title in 40 years",
    body: `In a finish for the ages, the home team completed a remarkable comeback Sunday night, erasing a 14-point fourth-quarter deficit to claim the championship in overtime before a delirious crowd.

The winning shot came with just 0.3 seconds remaining in overtime, a contested three-pointer that sent the arena into pandemonium and ended a four-decade title drought for the storied franchise.

"I've dreamed of this moment since I was a kid," said the game's MVP, who finished with 42 points, 11 rebounds, and 8 assists. "To do it here, in front of these fans—there are no words."

The victory capped an improbable playoff run that saw the team overcome a 3-1 series deficit in the conference finals. Critics had written them off multiple times throughout the postseason.

An estimated 2 million fans are expected to attend Wednesday's championship parade through downtown, with the city already preparing for one of the largest celebrations in its history.`,
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=800&fit=crop",
    imageCaption: "Fans erupted as the winning shot fell, ending decades of waiting.",
    section: "sports",
    author: authors[0],
    publishedAt: new Date("2024-03-11T23:30:00Z"),
    readingTime: 4,
    tags: ["Basketball", "Championship", "Sports"],
    views: 312000,
  },
  {
    id: "8",
    slug: "broadway-revival-review",
    headline: "A Stunning Revival Breathes New Life Into a Classic",
    dek: "Director's bold reimagining transforms a beloved musical into an urgent meditation on contemporary America",
    body: `The revival of this beloved American musical, now playing at the Gerald Schoenfeld Theatre, is nothing less than a revelation. Director Sarah Benson has stripped away decades of accumulated tradition to reveal the work's beating heart—and what she finds there is more urgent and more moving than we might have imagined.

The production's visual vocabulary is stunning: a unit set of weathered wood and rusted metal that suggests both a Depression-era dust bowl and a post-industrial present. Lighting designer Jennifer Tipton bathes the stage in hues of amber and smoke, creating an atmosphere of perpetual twilight.

But it's the performances that elevate this revival into the realm of the unforgettable. In the leading role, the star delivers a performance of such raw emotional power that the audience sits in stunned silence at the final curtain.

The supporting cast is equally strong, with standout turns that find new depths in familiar roles. The production's orchestrations have been thoughtfully reduced, placing greater emphasis on the lyrics and allowing intimate moments to land with devastating impact.

This is one of those rare theatrical events that reminds us why we go to the theater at all.`,
    image: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&h=800&fit=crop",
    imageCaption: "The stunning revival is now playing on Broadway.",
    section: "arts",
    author: authors[0],
    publishedAt: new Date("2024-03-11T09:00:00Z"),
    readingTime: 6,
    tags: ["Broadway", "Theater", "Review", "Arts"],
    views: 45000,
  },
  {
    id: "9",
    slug: "housing-market-shifts",
    headline: "Housing Market Shows Signs of Stabilization After Turbulent Year",
    dek: "Home prices have leveled off in many markets as mortgage rates begin to ease from their recent peaks",
    body: `The housing market is showing signs of stabilization after a tumultuous period marked by soaring prices and sharply higher mortgage rates, according to new data released Tuesday.

Home prices, which had fallen in many markets after hitting record highs in 2022, have begun to level off. The S&P CoreLogic Case-Shiller Index showed prices unchanged in January compared to December, the first flat reading in over a year.

Mortgage rates have also pulled back from their October peaks, with the average 30-year fixed rate falling to 6.7 percent from above 8 percent. The decline has brought some buyers back to the market, though activity remains well below pre-pandemic levels.

"We're seeing the beginning of a new equilibrium," said Lawrence Yun, chief economist at the National Association of Realtors. "It's not a buyer's market or a seller's market—it's more balanced than it's been in years."

Housing inventory remains tight in many areas, particularly for entry-level homes. New construction has picked up but remains insufficient to address the long-term shortage of affordable housing.`,
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=800&fit=crop",
    imageCaption: "The housing market is finding a new equilibrium after a volatile period.",
    section: "business",
    author: authors[3],
    publishedAt: new Date("2024-03-11T08:00:00Z"),
    readingTime: 5,
    tags: ["Housing", "Real Estate", "Economy", "Markets"],
    views: 56000,
  },
  {
    id: "10",
    slug: "education-policy-debate",
    headline: "States Diverge on Education Standards as Federal Role Shrinks",
    dek: "A patchwork of policies is emerging as states take different approaches to curriculum and testing",
    body: `A growing divide in education policy is emerging across the country, as states chart increasingly different courses on curriculum, testing, and school funding in the absence of strong federal direction.

The divergence has accelerated since the pandemic, which disrupted traditional schooling and intensified debates over what children should learn and how their progress should be measured.

Some states have moved to eliminate standardized testing requirements, arguing that the tests narrow curriculum and cause undue stress. Others have strengthened testing regimes, citing the need to identify learning loss and hold schools accountable.

Curriculum battles have been particularly intense, with states taking sharply different approaches to teaching history, science, and social issues. The debates have drawn parents, activists, and politicians into contentious school board meetings across the country.

Education researchers warn that the widening gaps could have long-term consequences for student mobility and national competitiveness. "We're essentially running 50 different education experiments," said Stanford professor Linda Darling-Hammond. "The outcomes are going to vary enormously."`,
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=800&fit=crop",
    imageCaption: "Education policy varies widely across states.",
    section: "us",
    author: authors[2],
    publishedAt: new Date("2024-03-10T12:00:00Z"),
    readingTime: 6,
    tags: ["Education", "Policy", "States", "Schools"],
    views: 34000,
  },
  {
    id: "11",
    slug: "opinion-democracy-tech",
    headline: "Technology Can Strengthen Democracy—If We Let It",
    dek: "The tools exist to make civic participation easier and more meaningful. The question is whether we have the will to use them.",
    body: `We live in an age of unprecedented connectivity, yet civic engagement in many democracies has never felt more strained. Voter turnout remains stubbornly low in many elections. Trust in institutions has eroded. The public square has fragmented into a thousand algorithmically curated bubbles.

It doesn't have to be this way.

The same technologies that have disrupted so much of modern life could, if thoughtfully deployed, reinvigorate democratic participation. We have the tools to make voting easier, to make government more transparent, to give citizens meaningful input into the decisions that affect their lives.

Some jurisdictions are already experimenting. Estonia has pioneered secure online voting. Taiwan has used digital platforms to build consensus on contentious policy issues. Cities around the world are using participatory budgeting to give residents direct say over how public funds are spent.

But realizing technology's democratic potential requires intentional choices. It requires investing in digital infrastructure and literacy. It requires designing systems that are accessible to all, not just the technically sophisticated. Most importantly, it requires political will.

The future of democracy is not predetermined. It is ours to shape.`,
    image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&h=800&fit=crop",
    imageCaption: "Technology could strengthen democratic participation.",
    section: "opinion",
    author: authors[1],
    publishedAt: new Date("2024-03-10T07:00:00Z"),
    readingTime: 7,
    tags: ["Opinion", "Democracy", "Technology", "Civic Engagement"],
    views: 28000,
  },
  {
    id: "12",
    slug: "quantum-computing-milestone",
    headline: "Quantum Computing Reaches New Milestone in Error Correction",
    dek: "Researchers demonstrate a key step toward practical quantum computers that could revolutionize computing",
    body: `Scientists have achieved a major breakthrough in quantum computing, demonstrating for the first time that error correction—long the field's Achilles' heel—can work well enough to make practical quantum computers feasible.

The achievement, published Thursday in the journal Nature, shows that quantum bits, or qubits, can be protected from the environmental noise that has limited their usefulness. The technique could eventually enable quantum computers to tackle problems far beyond the reach of classical machines.

"This is the moment we've been working toward for 25 years," said Dr. John Preskill, a Caltech physicist who coined the term "quantum supremacy." "It's like landing on the moon for quantum computing."

Quantum computers harness the strange properties of quantum mechanics to perform certain calculations exponentially faster than classical computers. But qubits are notoriously fragile, losing their quantum properties—a process called decoherence—in fractions of a second.

The new research shows that by encoding information across many physical qubits, researchers can detect and correct errors faster than they accumulate. The team demonstrated the technique using Google's Sycamore processor.

Commercial applications remain years away, but the breakthrough opens a clear path toward quantum computers powerful enough to revolutionize drug discovery, materials science, cryptography, and artificial intelligence.`,
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&h=800&fit=crop",
    imageCaption: "A quantum processor represents a new milestone in computing.",
    section: "science",
    author: authors[4],
    publishedAt: new Date("2024-03-09T15:00:00Z"),
    readingTime: 5,
    tags: ["Quantum Computing", "Science", "Technology", "Research"],
    views: 89000,
  },
];

// Helper functions
export const getArticleBySlug = (slug: string): Article | undefined => {
  return articles.find((article) => article.slug === slug);
};

export const getArticlesBySection = (sectionSlug: string): Article[] => {
  return articles.filter((article) => article.section === sectionSlug);
};

export const getFeaturedArticle = (): Article | undefined => {
  return articles.find((article) => article.isFeatured);
};

export const getBreakingNews = (): Article[] => {
  return articles.filter((article) => article.isBreaking);
};

export const getMostPopular = (limit: number = 5): Article[] => {
  return [...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, limit);
};

export const getLatestArticles = (limit: number = 10): Article[] => {
  return [...articles]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
};

export const getTopStories = (limit: number = 4): Article[] => {
  return articles
    .filter((article) => !article.isFeatured)
    .slice(0, limit);
};

export const getSectionBySlug = (slug: string): Section | undefined => {
  return sections.find((section) => section.slug === slug);
};

export const getAuthorById = (id: string): Author | undefined => {
  return authors.find((author) => author.id === id);
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
};
