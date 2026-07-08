/**
 * Prepare Issue 6 pasted stories for import.
 *
 * This file intentionally contains only the story copy, not the editor comments
 * that were included after each story in the pasted Google Docs text.
 *
 * Usage:
 *   node scripts/prepare-issue-6-stories.mjs
 *   npm run upload:import -- scripts/issue-6-prepared-stories.json --sync-r2
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const OUT = 'scripts/issue-6-prepared-stories.json';

const stories = [
  {
    id: 'issue-6-fatal-backcountry-avalanche-over-ski-week',
    slug: 'fatal-backcountry-avalanche-over-ski-week-dangers-of-skiing-in-tahoe',
    headline: 'Fatal backcountry avalanche over Ski Week, dangers of skiing in Tahoe',
    dek: 'A fatal Tahoe-area avalanche during Country Day\'s ski week highlights the risks of backcountry skiing and the importance of reading avalanche conditions.',
    section: 'us',
    authors: ['Kate Barnes', 'Ammar Hussain'],
    publishedAt: '2026-03-05T17:00:00.000Z',
    tags: ['Issue 6', 'News', 'Tahoe', 'Avalanche'],
    status: 'published',
    text: `
Junior Connor Hannafin and his family decided to cancel a planned trip to the Tahoe area over Sacramento Country Day's scheduled "ski week" (Feb. 16-20) due to news of the coming storm.

"My parents put on the weather news, which they never, ever put on," he said.

The storm - recorded by the UC Berkeley Central Sierra Snow Lab as the third heaviest five-day snowfall on record since 1970 - came after a dry start to the season, creating the perfect conditions for the deadliest avalanche (defined as a rapid flow of snow down a hill or mountainside) in modern California history.

The nine skiers killed by the avalanche were part of a group guided by Blackbird Mountain Guides, a company that offers "expertly guided backcountry skiing, alpine, and rock climbing adventures" in the United States and internationally. 12 clients booked the trip - a three-day backcountry excursion in the Castle Peak area - almost a year in advance, though one client backed out at the last minute, according to a Feb. 19 San Francisco Chronicle article asking "Why did skiers leave shelters in blizzard conditions?"

Head of High School Brooke Wells, who was skiing in Tahoe on Feb. 14 and 15, decided to return to Sacramento before the storm hit the evening of Feb. 15 to avoid the dangerous conditions. When he heard about the avalanche, he expressed feeling conflicted.

"I felt very sad, obviously. Frustrated, though. I don't understand. I don't think you should go into the backcountry under those conditions," he said. "I don't know why you would. It seems super clear that it was going to be very, very dangerous."

According to a Feb. 18 statement released by Blackbird Mountain Guides founder Zeb Blais, the trip's guides were all instructors with the American Institute for Avalanche Research and Education, as well as either "AMGA (American Mountain Guides Association) trained or certified in backcountry skiing."

Castle Peak, a popular recreational area 12 miles away from Truckee, Calif., is near Frog Lake and the remote huts where the group stayed throughout the trip, which lasted from Sunday, Feb. 15 to Tuesday, Feb. 17.

Feb. 15: Skiers embark despite forecast

15 skiers - 11 clients and four guides - left their vehicles parked at the Castle Peak Trailhead and embarked on the trip, each equipped with an avalanche beacon, probe and shovel in case of emergency, said survivors interviewed by the New York Times.

The trip entailed skiing and hiking to the Frog Lake huts, which the group would use as their base of operations for the rest of the trip. The guides planned where in the surrounding terrain the group would ski each day. The weather forecasted a large winter storm, with Caltrans warning travelers that "confidence in a major snowstorm is high" from Feb. 15 to Feb. 18. Though it was clear in the morning, snow began to fall the first night of the trip.

Feb. 16: Snow accumulates

In total, the Central Sierra Snow Lab reported 111 inches of snowfall for the Central Sierra Nevada area from Feb. 16-20 - the most snow over a 5-day period since 1982. The heavy snow began to accumulate on top of a weak layer of snow caused by an unusually warm and dry January recorded by the California Department of Water Resources, increasing the risk of avalanches.

Feb. 17: Group attempts retreat

Just 2.2 miles away from Castle Peak, Boreal Mountain resort recorded 30 inches of snowfall on Feb. 17, according to the Tahoe Daily Tribune. Amidst inclement weather and a "high" avalanche warning issued by the Sierra Avalanche Center for the Central Sierra Nevada area that same day, the group's guides were "in communication with senior guides at [the company's] base, to discuss conditions and routing based upon conditions," Blais said in his Feb. 18 statement.

The guides ultimately decided to cut the group's last day of skiing short and head back to the trailhead, taking a slightly different route to account for the risk of an avalanche, reported the New York Times.

The avalanche struck at around 11:30 a.m. on the north side of Perry's Peak, about a half-mile away from the Frog Lake huts. Twelve of the skiers were immediately swept away and buried. One managed to dig himself out of the snow and two skiers, who were further up the mountain, remained unaffected.

The three immediate survivors used their emergency equipment to locate and dig out three more surviving skiers, as well as uncover three deceased ones. Fear for the conditions caused the remaining skiers to retreat to a makeshift shelter and call emergency services using their beacons and iPhone S.O.S. functions.

First responders, hindered by poor conditions, reached the survivors around 5:30 p.m. and escorted them off the mountain. Two were hospitalized with non-life-threatening injuries.

Feb. 18: Eight found dead, one missing

On Feb. 18, eight members of the group were found dead in the snow - three guides and five clients. The ninth was missing and presumed dead until Feb. 21, when their body was recovered.

Risks of backcountry skiing

The group affected by this avalanche were backcountry skiers. Backcountry skiing is skiing in unpatrolled environments outside of resort boundaries. Instead of relying on ski lifts, backcountry skiers must access these areas by helicopter, snowcat or hiking. According to Shehnaz Hussain, a Country Day parent and a frequent backcountry skier, the main risk with backcountry skiing is that, unlike skiing in a resort, there is no avalanche mitigation, "so there's a greater chance that you'll get caught in the snowslide," she said.

Facts about avalanches

An avalanche can occur anywhere with consistent snowfall, though there are places and times where risk is increased.

When trying to avoid avalanches, it is important to understand when, where and how they happen. Avalanches typically happen on slopes with a degree of 30-45. If the slope is steeper than 45 degrees (or a slice of pie), it is rare for snow to accumulate due to the slope being so steep.

The most common types of avalanches are slab avalanches - a solid layer of snow breaks away and slides down. They are triggered when a weak layer beneath a solid layer of snow collapses, causing the entire block to slide.

There are two types of slab avalanches: wind slab, which is formed by wind transporting snow into dense packs on the sides of ridges, and storm slab, which occurs during or immediately after heavy snowfall when new snow does not bond well with the old surface.

Staying safe(r) in avalanche areas

When skiing, whether it is in the backcountry or in a resort, you should always check conditions before you go. Beware of heavy snowfall, high wind and rapid warming. New snow or rapid warming can result in higher avalanche risk.

On a day when avalanche risk is high, safety gear is necessary. You should always carry an avalanche beacon (transceiver), shovel and a probe, even when skiing in a resort. It is also important to spread out when skiing in a group so that in case there is an avalanche, multiple people do not get caught and can help whoever does.

Senior Dylan Corcoran has been snowboarding for nine years and frequently goes to Kirkwood Mountain Resort in Tahoe, where she sometimes hikes to nearby backcountry terrain.

"I haven't been in a big, life threatening avalanche, but I've seen some, heard some and I know people who have been," she said, adding that she's snowboarded in dangerous conditions like rain and lightning.

To stay safe, Corcoran advised skiers and snowboarders to "double and triple check weather on multiple platforms, and if you're second-guessing anything, don't do it."

"It is kind of stupid not to. You're just putting yourself and others at risk," she said.
`,
  },
  {
    id: 'issue-6-sacramento-educators-go-on-strike',
    slug: 'sacramento-educators-go-on-strike',
    headline: 'Sacramento Educators go on strike',
    dek: 'Teachers from Twin Rivers and Natomas Unified marched across Tower Bridge over pay, benefits and classroom conditions.',
    section: 'us',
    authors: ['Ryan Xu', 'Rehan Afzal'],
    publishedAt: '2026-03-07T17:00:00.000Z',
    tags: ['Issue 6', 'News', 'Education'],
    status: 'published',
    text: `
On March 12, teachers from the Sacramento area poured across Sacramento's Tower Bridge, bright red and yellow signs in hand, chanting: "We can't wait!" and "Union power!"

Hundreds of educators from Twin Rivers (TRUSD) and Natomas Unified (NUSD) school districts marched in protest of low wages, overcrowded classrooms and poor health insurance, according to the Sacramento Bee.

Twin Rivers teachers began their strike on March 5, 2026, with educators from Natomas joining on March 10. These mark the first teachers' strikes in the history of both districts.

The organizations leading the charge are the Natomas Teacher's Association (NTA) and Twin Rivers Unified Educators (TRUE). Both groups are labor unions representing the interests of local teachers.

Nico Vaccaro, President of the Natomas Teacher's Association and special education teacher at Inderkum High School, explained the issues that brought so many educators to the streets.

"We're out here to show solidarity with our fellow teachers in Twin Rivers Unified School District. We've been having many of the same issues with lack of affordable healthcare and non competitive salaries - we're seeing teachers leave year after year."

Over 100 teachers left Natomas Unified last year, many of them mid-year, causing instability in classrooms.

"We had over 20 vacancies just at the end of December last year. That means at any given day there could be 800 students in classrooms without a qualified teacher," Vaccaro said.

Colton Moeding, a junior at Foothill High School in the Twin Rivers Unified School District, voiced similar concerns.

"Our teachers do so much work for us; they're shaping our future generations, and when they're not present in class and teaching us, there's not a way to shape that future."

Kimberly Stepp is a third grade teacher at Witter Ranch Elementary School for NUSD in Natomas. Stepp has been a resident of Sacramento for 10 years and has also worked at TRUSD.

"We're out here fighting for our students. We're also out here fighting for our teachers. Some of us here work two to three jobs, and some are living worse than paycheck to paycheck," Stepp said.

NTA union representatives are asking for an 8.5% salary increase over two years, fully-funded Kaiser healthcare and limits on class sizes. In return, the district has offered a 4% raise over two years and fully paid health benefits for a cheaper plan, according to PBS KVIE.

In a video posted to NTA's Instagram on March 11, Natomas educator and executive bargaining team member Cass Hammer claimed that the total cost of salary adjustments and the hiring of additional educators to fully staff schools would amount to $14 million, while the school district claims the same actions would cost $35 million. At the same time, the school district holds a reserve of around $45 million. This is significantly more than the state required economic uncertainty reserve of $3.1 million, according to a financial report released by the district for 2024-2025.

According to Stepp, negotiations between union representatives and Natomas district officials have come to a standstill.

"The district is claiming they are waiting for us, but they have not reached out to go back to the table in two days."

At the time of writing, NUSD maintains that the results of an independent fact finding report show that "the District's offer is reasonable within the financial realities of Natomas Unified" according to an update posted to the school district website on March 12.

Educators like Stepp disagree with district claims.

"Students are what matter. They need to put the funds living in the district offices back into our classrooms. The amount many teachers spend out of their own pockets is insane," Stepp said.

According to the U.S. News & World Report, teachers in California and Michigan spend the most to "self-stock their classrooms," with the average teacher spending $459 annually, according to the Economic Policy Institute. Teachers in California spend an average of $664, according to the report.

Sacramento Country Day eighth grade English teacher Gary Wong contrasted his experience working in NUSD with his experience at Country Day: "When I taught at Inderkum over a decade ago, I had upwards of 36-40 kids per class period, and I taught five periods a day. That's close to 200 students. To put that into perspective, I teach about 60 students here at Country Day," Wong said. "Think of a public school teacher who teaches three times more students, grades three times more homework assignments and makes less than I do. Then you'll understand why they strike."

Country Day High School history teacher Ellen Willow, who formerly worked at public schools in the Sacramento area, also shared her thoughts on the issue.

"We certainly don't teach for the salaries we earn; we do it for a lot of other important reasons. Nonetheless, that's no reason to not pay teachers well, and importantly, adjust to inflation," Willow said.

Willow said that a friend who works at Twin Rivers mentioned that frequent staffing issues have heavily impacted the district.

"Teachers are leaving the district and going to other districts that pay better. My friend mentioned that there are around 80-90 permanent staffing shortages. There are real problems. These students, who are some of the most vulnerable in our community, are not getting the educational opportunities they deserve," Willow said.

Wong understands the struggles of public school teachers, having worked at schools with teachers unions.

"When public school teachers are not treated fairly, it is a failure of our community and of our system, and regardless of what kind of school I teach in, I am a part of that community and system first and foremost. While I may not reap the direct benefits of the Natomas and Twin Rivers strikes, I know that the benefits they secure help our community as a whole," Wong said.

Rebecca Henry, a teacher at Grant Union High School in TRUSD, notes that student learning has been negatively impacted by the current situation.

"This morning, one of my students told me that since teachers have been gone, 'it's like summer vacation started; we want to have it go all the way through until next year.' Are they learning anything? No," Henry said.
`,
  },
  {
    id: 'issue-6-round-table-college-admissions-advice',
    slug: 'round-table-college-admissions-advice',
    headline: 'Round Table: College Admissions Advice',
    dek: 'Country Day seniors and college counselor Alicia Perla discuss lessons from the college admissions process.',
    section: 'features',
    authors: ['Chloey Fang', 'Sid Shukla'],
    publishedAt: '2026-03-09T17:00:00.000Z',
    tags: ['Issue 6', 'Features', 'College'],
    status: 'published',
    text: `
The college application process is an exercise in both life examination and self-definition. It requires polish and vulnerability. It represents what is likely the most life-altering decision of your life so far.

And it's one that most high school seniors are asked to complete under deadline, without instruction - or arguably, transparency - and in full view of institutions they most want to impress.

Four Sacramento Country Day School seniors, who recently emerged from that process, sat down with college counselor Alicia Perla and two underclassmen, Saaketh Damaraju, '28 and Abby Hageman, '29, to discuss what they wish they had known - and in the case of the underclassmen, what they want to know.

Andrew Logan has committed to Stanford University to study biology. Rehan Afzal has committed to Rice University, where he plans to double major in philosophy and neuroscience. Ava Dunham applied as an aerospace engineering major and has not yet committed. Gavin Wang is still deciding where he will commit. The following conversation has been edited for length and clarity.

Damaraju: If you could go back to sophomore year knowing what you know now, what would you do differently?

Dunham: I think everything I did got me to where I am, so I wouldn't change it. But if I had to frame it as advice - utilize your summers. I took a class over the summer before junior year and burned out so badly I did nothing with the rest of it. I could have done a program, volunteer work, gotten a job - something that mattered that I could have put on my application.

Hageman: For those of you who have been accepted, what do you think made colleges choose you?

Afzal: It's impossible to know for certain. But I think it was the essays. Instead of telling a straightforward story, I went more metaphorical. Rice even sent a note back that echoed the same language I used on the Common App's future plans section. I chose "other" instead of a standard option and wrote something more specific. Maybe that was a factor.

Logan: Stanford's admissions office sent a note mentioning my essays and my biology extracurriculars specifically. So I'd guess a combination of those two contributed to my acceptance.

Dunham: I'll be honest, being a woman pursuing aerospace engineering is still an advantage at these programs. But I also made sure my application backed that up. I organized a women in STEM panel and kept up volunteer work that corroborated what I was arguing about myself. Demographic plus demonstrated commitment.

The Octagon: What's one thing about the college admissions process you wish someone had told you before you started?

Afzal: It's a lot more work than you think it is. The volume of writing you have to do in that time frame pretty much amounts to the work for an academic class, so you should prepare accordingly. When you're scheduling things, don't treat it like junior year where you can maximize the rigor of your curriculum.

Wang: I would say that SAT prep is something I probably should have started a bit earlier.

The Octagon: Do you think summer is the best time to work on essays?

Afzal: A lot of private college counselors tell their students to get all their writing done in the summer. From my experience, that's a really bad idea. Summer is a very creatively uninspiring time because all of your experiences and extracurriculars are not happening then. I found it harder to write during that time because you kind of have to force it.

Once school starts, you're more active in leadership roles and there's a lot more stimulus, which gives you more things to write about in your essays.

One thing that might be helpful, though, is keeping a journal. Writing down interesting things that happen to you could come in handy later when you're thinking about essay topics.

Dunham: I wrote the majority of my essays about things that happened during my junior year. I would agree with Rehan - I did not start writing my essays over the summer, and I wouldn't even come close to thinking about it during freshman or sophomore year.

The Octagon: What about people who struggle with writing?

Perla: I agree with Rehan that keeping a journal about essay prompts - especially the PIQs - can help. But for students who struggle with writing, starting earlier might actually be beneficial.

The senior self-evaluation includes the essay prompts, and it's meant to be done during the summer. I treated those prompts as a way to get ideas down. They don't need to be polished, but they help you start thinking about what you might eventually write about without feeling like everything has to be perfect.

The Octagon: Was there a moment in the process where you felt the advice you were given was just wrong?

Afzal: A lot of people understandably turn to social media and online resources for college admissions advice. But there's so much information at such a high volume and with pretty low reliability that it's very easy to get lost in it.

It's best to focus on portraying your authentic self and putting your best foot forward.

Logan: Similarly, there's a lot of pressure to do activities just for college applications. I think it's more important to explore your interests and find extracurriculars that genuinely matter to you. Colleges value that more than just racking up activities.

Wang: It's very hard to build a story like "this is exactly how I'm going to present myself to admissions officers" starting in sophomore or freshman year. It's much easier to do a lot of interesting things and then look back and shape them into a cohesive story. That comes across as much more authentic.

Dunham: For some activities I did, people told me, "You should write about this for college." I tried, but it didn't feel authentic. I ended up writing my personal statement and supplementals about things I actually cared about. You really have to write something that is actually you, not just a polished version of you.

The Octagon: To Ms. Perla, what mistakes do you see students make every year that could easily be avoided?

Perla: A lot of the information on social media is geared toward students at very large public schools, which isn't our situation. Because of that, much of the advice doesn't reflect our students' experiences.

Another common mistake happens when students start submitting applications. Suddenly they add a bunch of additional colleges at the last minute, and we end up reviewing many rushed applications. I understand that this comes from anxiety, but I don't think it has ever led to great results. Students should trust the work they've already done and not panic at the last minute.

The Octagon: What do students think matters most in college admissions compared to what actually matters most?

Perla: Many students think that taking as many AP or AT classes as possible will automatically get them into college, or that taking every AP exam will guarantee admission. While those things might help your GPA or earn you college credit, they're not guarantees.

The Octagon: How did you decide where to apply, and what advice would you give underclassmen?

Dunham: I compiled my list by cross-referencing several different sources based on my interests.

The summer before senior year, my mom and I looked at the "U.S. News & World Report" rankings for the best aerospace engineering schools and also found a list of which schools had produced the most astronauts. We cross-referenced those lists and created a list of 16 schools that I applied to. It was helpful because many of the schools overlapped, so I ended up applying to a lot of strong engineering programs.

My advice would be to submit applications as early as possible. I applied early action everywhere, which meant I got most of my decisions back early. Since I'm planning to move out of state, that also gives me more time to prepare for wherever I end up.

Afzal: In contrast with Ava's organized approach, mine was more haphazard.

I knew a few general things I liked. For example, I like Country Day and the experience I've had here. When I visited Rice University over the summer, it reminded me a lot of Country Day. They also had strong programs in the areas I'm interested in. The research opportunities, resources near the school, and overall culture all aligned with what I was looking for.

For other schools, I visited some of them and also did online research - things like whether the programs were interdisciplinary or whether they encouraged both STEM and the humanities.

I also looked at what current students were saying on forums. A combination of those resources helped me make my decisions.

Logan: My approach was kind of a mix between Ava's and Rehan's. I looked at rankings for strong biology programs, but I also looked at nearby internships and research opportunities. I chose Stanford partly because it's in the Bay Area, where there are a lot of biomedical engineering companies like Genentech.

Wang: I had a much less clear idea of what I wanted to study. I realized that what I really valued was keeping my options open. I looked for schools where I could explore many fields but still have strong opportunities if I decided to pursue one seriously. I also thought it would be interesting to live in a bigger city, so I applied to several schools in Boston and New York. Looking back, I think I focused a bit too much on the name value of the school itself. That was one of the mistakes I made.
`,
  },
  {
    id: 'issue-6-boys-volleyball-feature',
    slug: 'boys-volleyball-feature',
    headline: 'Boys Volleyball Feature',
    dek: 'The varsity boys volleyball team opened its season with a home win and a goal of chasing a league championship.',
    section: 'features',
    authors: ['Parsa Salari'],
    publishedAt: '2026-03-10T17:00:00.000Z',
    tags: ['Issue 6', 'Features', 'Sports', 'Volleyball'],
    status: 'published',
    text: `
Sacramento Country Day School's varsity boys volleyball team started the season with a home win.

This has the entire team focusing on one goal for the season: a league championship.

In the pre-season, the team added morning practices, which overlap with the basketball team's "Lab," basketball training sessions held the hour before school starts.

During these morning practices, the basketball season was still going. This caused the boys volleyball practice to be moved to mornings when there were home games. While this was a temporary arrangement it led to certain days of "Lab" being canceled as a result.

The Cavaliers won their first game against Aspire Alexander Twilight Secondary Academy on Feb. 26 - a home game where they ended the game with a set count of 3-0.

Coach Jason Kreps said that he's proud of how far the team has come since the 2023-24 season and that they've all improved tremendously.

"They've all grown and gotten better with the game in general," he said.

The first game of the season is great for getting a feel for what the team needs to work on for the future, Kreps added.

"It was just nice to get our feet wet, playing an actual game with a ref. Everyone got to play."

With practice making perfect, Kreps said, the team will only improve from here, especially given that the players didn't change much from last year.

"It just comes down to experience and playing, just like anything in life. The more you do it, the better you're gonna get...We only lost two seniors last year, Zealand Schroeder and Griffin Misquitta, so it's pretty much the same team," he said.

Kreps acknowledged small issues that can be fixed in practice.

"Cohesion, chemistry and the biggest thing for us is our attacking consistency," he said. "You're going to have errors in volleyball or any sport, but it's minimizing those and keeping those down."

Senior and captain Gavin Wang said "hanging up a banner in the gym" was a priority. That and "getting the younger members of the team to be more vocal right now."

Wang adds that the number of players on the team is their superpower. With 12 players (the average team has about 10 players), their energy is unmatched.

"We didn't have a ton of people, and I had to play essentially every position," Wang said. "This year, [junior] Jacob [Rabe] finally joined. And so, you know, we got a lot more depth in our pin hitters and [junior] Kevin Liu joined on as a middle as well. So we've got so many more options."

Wang expressed confidence, even after last year's seniors left.

"I really miss Griffin's energy coming off the bench, but I think we've got a very good shot this year."

The idea of leaving a legacy behind motivates Wang the most.

"I'm not going to be here for the younger guys next year. How do I leave a lasting impact? How do I make sure you know they're set for the next season?"

Freshman Preston Bounds said that he's excited to learn from upperclassmen and apply that to his playstyle as someone who is new to the sport.

"I'm most excited about learning from them and deciphering their wisdom," Bounds said. "I want to become a starter for the next season and just improve my skill."

Bounds also added that just showing up to games goes a long way.

"Bring positive energy and get loud, because a lot of the time other teams' student sections and parent sections are a lot bigger," Bounds stated. "Our parent section and our student section is really lackluster so if people do show up, bring friends."
`,
  },
  {
    id: 'issue-6-artists-of-country-day',
    slug: 'artists-of-country-day',
    headline: 'Artists of Country Day',
    dek: 'Three Country Day artists explain their techniques, inspirations and goals.',
    section: 'features',
    authors: ['Jacob Rabe', 'Parsiny Nijher'],
    publishedAt: '2026-03-12T17:00:00.000Z',
    tags: ['Issue 6', 'Features', 'Art'],
    status: 'published',
    text: `
One prefers self portraiture, giving her subjects one unique feature that she has made her signature. One acts on ideas that pop into his head out of nowhere, following those ideas into even a kitchen, if need be. A third is tasked with artwork to accompany editorials and features for the school newspaper. These are the artists of Sacramento Country Day, and here are their techniques, inspirations and artistic goals.

Claire Gemmell

A botany internship at California State University, Sacramento this year pulled Senior Claire Gemmell out of the art elective she'd taken every year since sixth grade - but not away from art.

"I've noticed that I've grown to drawing things I'm interested in," Gemmell said. "I drew a lot of animals early on because I was really interested in wildlife and a lot of birds. Now I'm more interested in botany, and so I'm drawing a lot of plants."

The two pursuits - drawing and her internship - feed into each other.

"It helps to draw plants to understand their structure," she said.

This year's Solar Regatta theme is based on the 80s Survivor hit "Eye of the Tiger." Gemmell sketched a design that's now painted on the boat - a tiger nested between leaves and flowers, resting along the hull.

She is also assigned editorial illustrations for The Octagon, a role she's held for roughly two and a half years. The work demands a different mode, however.

"It's a really good challenge," Gemmell said. "It's a lot different from the art I normally gravitate towards. My style for editorial drawings is much more cartoony than I normally go for, so it's a fun change of pace."

Gemmell plans to take on a mural on the exterior wall of Jane Bauman's classroom where seniors sit for lunch and breaks. Proposed by Head of High School, Brooke Wells, the mural would represent her class of 2026.

"I've been talking to people in our class, brainstorming ideas," she said. "It's still in progress."

This past summer, Gemmell attended the embARC Summer Design Academy at University of California Berkeley, where she produced 3D modeling and sculptural work. As no landscape architecture-specific programs showed up, Gemmell enrolled for its broader studies.

At embARC, she built 3D models both digitally and physically, learning the proper line weights to use when drawing layouts and plans for buildings.

"I thought I wanted to major in art in college a few years ago, but I started to gravitate towards architecture and then towards landscape architecture," Gemmell said.

As such, Gemmell has applied to landscape architecture programs for college - a field that "definitely has an artistic component," she said.

Amelia Dizon

Curly eyelashes, doll-like characteristics and her "weird" art all fill freshman Amelia Dizon's sketchbook, gifted to her by the Middle and High School Art teacher, Andy Cunningham.

The Country Day freshman creates self portraits with multiple mediums, including acrylic paint, colored pencil and sometimes charcoal.

Dizon started drawing self portraits in her eighth grade art class.

"I actually ended up really liking it. There was just something about drawing myself. It's interesting because I can make a lot of cool art surrounding me," Dizon said.

Dizon's artwork can be recognized by the signature eyelashes she draws on background characters in her self-portraits.

"I put her on a lot of my pieces because I think she's funny and cute," Dizon said. "I give her really long eyelashes because a lot of people told me that I have long eyelashes."

During the COVID-19 pandemic Dizon used the quarantine time to not only explore art in general, but her individual style and techniques as well. Her ample free time led Dizon to watch art tutorials on YouTube, where she learned to draw characters.

"I wanted to experiment. I wanted to be good at something, so I really wanted to practice drawing," Dizon said.

Dizon is still developing her style. She recently switched from more "cartoony" pieces to "realism" and wants to continue focusing on this element.

"I want to get good at portraits. I want them to be big pieces later. I'm still trying to work on getting it right," Dizon said. "In our art elective yesterday, I was trying to learn how to make a skin tone with Ms. Melissa. I was trying to perfect it to my skin tone. It's just hard to perfect it because shade matching is kind of difficult."

When Dizon finds herself becoming frustrated with her piece, she takes a step back to give the piece some room before returning to it.

"It definitely gets frustrating in the beginning process because that's where it tends to look the weirdest or the worst. I'll get kind of nervous like, 'oh my god, am I messing stuff up right now?' So I move on to do something else and kind of leave it for later," Dizon said.

Looking ahead, she wants to continue pursuing art through high school and into college.

"I've been looking at art colleges and they seem pretty cool. I want to major in something like art, because I feel it's my passion right now," Dizon said.

Currently Dizon remains in the art room, perfecting and adding to her art style. Dizon's process for this?

"I just pick up my pencil and I'll get at it." Dizon said.

William Aron

Sophomore William Aron says he "just listens to his ideas" and sees where it takes him.

Once he gets his main concept down, Aron allows himself to experiment further, creating a "self feeding loop" and always leaving room for improvement.

"I really like getting an idea going with it, working on it, improving it and all that," Aron said.

Starting from a young age, Aron has been a big fan of animation, which helped him gain an interest in art. Despite this, Aron doesn't see himself being an animator.

"I'm mainly a fan of animation and just seeing the creativity of others," Aron said. "I was listening to a song, "What Will Happen Will Happen" by Lemon Demon, and I was like, 'man, this sounds like break dance music.' Then I drew nine pictures of someone break dancing, and then put them over that song. But the working conditions of an artist, and especially an animator, are usually kind of controversial, so I don't think I'd see myself doing that."

Aron is the founder and president of the Art Club. He modeled the club after the club he was a part of in his middle school, Paso Verde.

"It really was just a small group of my buddies and I, and that was really fun, and I wanted to create a space like that here. The art club is open to anyone," Aron said.

When choosing a topic for a club meeting, Aron typically uses whatever pops into his head. In Art Club, members typically focus on a specific topic and draw around it. One memorable meeting was focused around Halloween where the members drew something that was spooky to them.

"A standout that I really like is someone who drew a job application," Aron said. "The fan favorite from the club is this thing called an exquisite corpse, where you section a paper into thirds, and someone draws the head, someone draws the torso, and someone draws the legs, but you don't see what the other person drew. At the end, you have this Frankenstein."

Aron is currently experimenting with what he calls a "bird's eye" perspective using references to help him sketch his pieces and create a draft, either digitally or physically. Digital drafts are typically quicker and more convenient for Aron.

Aron's references are typically media he consumes, which includes the character Ena from the animated YouTube series of the same name.

"I looked at different artworks of Ena to kind of just look at the geometry of the shape and kind of get an outline as well. The eyes specifically, are kind of triangular," Aron said.

Aron's last few projects have focused on spray painting, where he uses X-Acto knives to cut his self-created stencils from cardboard.

His advice to those interested in creating art? "Try stuff."

"Just act on [your ideas]," Aron said. "Use different materials, go to your drawer and pull out some sharpies or highlighters, or maybe the kitchen scissors."
`,
  },
  {
    id: 'issue-6-epstein-editorial',
    slug: 'epstein-editorial',
    headline: 'Epstein editorial',
    dek: 'The Octagon argues that young people should pay attention to the Epstein files, government transparency and accountability for powerful people.',
    section: 'opinion',
    authors: ['Staff'],
    publishedAt: '2026-03-13T17:00:00.000Z',
    tags: ['Issue 6', 'Opinion', 'Editorial'],
    status: 'published',
    text: `
The Jeffrey Epstein scandal remains pitifully underexamined.

We known as Generation Z - the very demographic at the core of the issue - fail to meet this crime with the ferocity we should. We stand to be victimized by a multi-layered coverup. We, who are already exploited by mass and social media, stand to be further exploited by laws our nation's leaders are pushing to enact now.

There's a lot that's necessary to know, and our generation hasn't been paying attention.

Still wondering why this "Jeffrey Epstein guy" matters?

The first reason to be alarmed: the elite and politically powerful are frantically concealing evidence and calling for legal changes to protect their actions.

The second: a sociocultural desensitization to facts that should inspire outrage. We have a civic responsibility to see past the coverup and work towards a future where we are protected.

The third: An increasing push for laws lowering the age of adult consent, arguing semantic evidence that raping teenagers is not "pedophilia."

The Epstein files were brought back into the public consciousness during Donald Trump's 2024 presidential campaign, when he campaigned on the release of the files, alongside numerous right-leaning media outlets and podcasts. When asked on Fox News if he would release the files as president, Trump's response was basically an affirmative shrug.

He replied, "Yeah, yeah I would."

On July 8, 2025, Trump said, "Are you still talking about Jeffrey Epstein?" when asked about the issue by reporters. On Feb. 21 in the same year, Attorney General Pam Bondi told Fox News reporters that the Jeffrey Epstein client list was "sitting on [her] desk right now to review." On July 6, the Department of Justice concluded that no such list existed.

Alexander Acosta served as the U.S. attorney for the Southern District of Florida in 2008 and faced criticism for his handling of the Epstein case. According to a 2019 article by Vicky Ward, Acosta said he was told to "leave it alone" when attempting to investigate Epstein. Acosta later denied being told that in a press conference.

In early 2024, Senior District judge for the Southern District of New York Loretta Preska ordered the release of court documents surrounding the case to the public. Given the extent of the media coverage, it would be difficult to find someone who doesn't recognize Epstein's name. For most people, however, that knowledge doesn't extend much further than simple recognition.

Due to the immense volume of information - over 3.5 million publicly released files, 2,000 videos and 36 known underage victims on record - it's impossible for most Americans to process the material. This results in vague generalities being recycled over and over again when the issue is brought up. The uninformed (and misinformed) are left with bits and pieces of a story that is egregious in its entirety, but less so in pieces. The situation is akin to putting together a jigsaw puzzle when blindfolded and missing half the pieces.

An individual sex trafficker? Horrible and disgusting, yes, but not totally out of the ordinary. Wealthy elite involved in a scandal? Not the first time that's happened.

But add allegations that range from child molestation to cannibalism? And a U.S. Department of Justice coverup? A prince being unprinced for charges of espionage involving the files? An Israeli prime minister who is alleged to have nearly strangled a minor?

That's media gold.

The Epstein Files Transparency Act (EFTA), signed into law in November 2025, mandates that the DOJ release all files relating to investigations into Epstein with an exception for illegal content such as child sexual abuse material. The law also mandates that victims are protected and requires a searchable digital release of the files within 30 days of the acts passing.

Files mentioning Donald Trump's name or containing his image were removed from the DOJ's Epstein Library altogether. Millions of records that should have been released within 30 days of the act's passage still remain classified. At the same time, names and pictures of victims have been exposed. The DOJ released files containing nude photos of women, which possibly include teenage girls, according to the British Broadcasting Corporation.

One of Epstein's victims described the sloppy release as "life threatening" and received death threats following the publication file's release.

With this in mind, it is time for the American people to ask who the government is protecting.

Why is the DOJ protecting a select group of rich, famous and powerful people in direct violation of federal law?

We, the next generation of Americans, are required to demand answers.

Not only were accusations of child rape, sex trafficking and cannibalism removed from the public eye, but there remains a systemic coverup and misdirection of public attention from the situation. Allegations of the rich and famous are not investigated, but rather swept under the rug. As Pam Bondi revealed in her testimony on her handling of the Epstein case (both times), her attitude toward prosecuting it is literally: "the Dow is over 50,000, right?"

Does this response anger you? How about a cabal of American elite that are repeatedly accused of child rape and get away with it? How about lawmakers and billionaires who contribute to political candidates associating with a known child sex offender - after he was convicted?

Mad yet?

If so, your outrage should not be directed solely against the content of the files and the obscenity of the crimes committed, but also at the American government's audacity to illegally suppress that information. We must not be the fools the Trump administration believes the U.S. to be.

The global consequences for the Epstein files have already begun. The CEO of Dubai's largest port to who Epstein sent an email saying that he "loved the torture video" was removed, and global partners suspended their investments. A Slovak national security adviser resigned over his ties to Epstein, and the former Prince Andrew is being investigated by the British government, albeit for "misconduct in public office" instead of sex offenses. Yet the United States' own justice department hasn't served an ounce of it.

In just a few short months, the class of 2026 will be attending (and paying tuition at) some of the country's most elite colleges. Buyer, beware. Prestige and research output aren't all that distinguish these schools. Part of the 2025 release of Epstein files included a harrowing number of high-level academicians from some of the most prestigious universities in the U.S., including Harvard University. Recently, Harvard economics professor Larry Summers opened one of his lectures by addressing his numerous appearances in the Epstein documents. From the recorded video of his speech, no student protested or walked out.

The slow, gradual release of the files, in clear violation of federal law, achieved precisely what American political elites wanted: a slow, deliberate trickle of information causing the American people and the press to fight over the little facts that were known. And desensitize the American public to those that have - and might come - out.

Since the 2024 increase in public interest in the Epstein case, there was an onslaught of internet memes and jokes surrounding the case. Open Instagram, and you'll find AI generated videos of Epstein gyrating or singing a popular song or satirical 'edits' showcasing Epstein's private island.

These jokes have serious implications. For many teenagers, online short-form content is a primary source of information about the real world. By the time news reaches U.S. teenagers through jokes and memes, the gravity of the scandal is squashed.

We must recognize such content doesn't just come from edgy meme accounts trying to be provocative. During the 2024 presidential election, the New York Times documented instances where the Russian government posted controversial internet content to sway public opinion.

An Epstein edit or meme may seem harmless at first, but the propagating source behind these jokes may be attempting to influence political discourse by desensitizing users to the situation.

Any attempt by the average American to improve cognitive security is dismissed by growing anti-intellectual movements as conspiratorial or elitist, useless for the everyday person. Worse, by inundating our minds with constant Instagram Reels, YouTube Shorts and X posts, we willingly give bad actors access and influence inside our minds.

So what do we, as young Americans, do about this system? Three things:

Read the files. With millions of documents available on the DOJ's website, that seems like a daunting task. However, there are resources to make this easier. Jmail.world is a website that organizes the most damning evidence from the Epstein case into an easily navigable platform, similar to gmail.com.

Attend the next "No Kings" event, scheduled March 28. Don't have a sign? Booths have all your materials waiting for you, just come with a slogan saying what you want done.

Vote. And while young people are famous for voting with their hearts? Vote smart. Research your candidates' positions on these files. Make your choice accordingly. Single-issue voters welcome, issue being accountability for those in power.

There is resistance to analyze the facts before us in any meaningful way. The federal government's hasty attempts at distracting from the Epstein files including using the department of homeland security, controversial geopolitics, and slow release of evidence expose a greater issue: the whole system is poisoned.

Thank you for your attention to this matter.

Factual timeline:

The horrifying story of Epstein's years-long organized child sexual abuse ring has been the subject of media coverage for over two decades.

Epstein first came under scrutiny in 2005 after a 14-year-old girl's family reported that she was sexually assaulted at his home. Police in Palm Beach, Fla., launched an investigation on grounds of unlawful sex with a minor, but Epstein ultimately was only convicted of soliciting prostitution, a far lesser charge.

In 2008, Epstein cut a secret deal with the federal government that barred them from prosecuting him, even though he was found guilty of child sex offenses by state governments.

Over the next ten years, Epstein was hit with an increasing number of victim accusations and criminal charges. In November 2018, a story in the Miami Herald uncovered a new set of developments that caused a surge in public interest once again.

The Herald found that the Trump Administration played a significant role in the poor handling of the Epstein case.

With that, the FBI opened up another investigation into Epstein, disregarding the previous agreement not to prosecute him. According to the New York City Medical Examiner's Office, Jeffrey Epstein committed suicide in 2019.
`,
  },
  {
    id: 'issue-6-my-angle-get-a-therapist',
    slug: 'my-angle-get-a-therapist',
    headline: 'My Angle: Get a Therapist',
    dek: 'Therapy should be treated as practical health care for anxiety, depression and stress.',
    section: 'opinion',
    authors: ['Anika Nadgauda'],
    publishedAt: '2026-03-14T17:00:00.000Z',
    tags: ['Issue 6', 'Opinion', 'Mental Health'],
    status: 'published',
    text: `
Are you tired of hearing things like "Everything will work out," or "Stop stressing so much," or "You're being too emotional?"

I was too.

The problem with these responses is that they treat mental health like a personality flaw instead of what it often is: a health issue. If you break a bone, you get an X-ray, a cast and physical therapy. If your teeth are crooked, you get braces. When your brain is under constant stress, anxiety or depression, the treatment is often therapy.

Mental health struggles are not just emotional; they are also biological. Conditions like anxiety and depression have both genetic and neurological components. According to the American Psychological Association, people with a family history of depression are two to three times more likely to experience it themselves.

Chronic stress can also physically affect the brain by increasing cortisol levels and altering how the brain regulates fear, memory and emotional responses.

Here is what I wish someone had told 11-year-old me when I first started struggling:

Needing help does not make you weak. Asking for help makes you strong.

Therapy will not fix everything but it will give you tools.

You are not too much. You are not a burden.

There is a version of you years from now who can breathe through the panic. I know because I am her.

I dealt with anxiety and depression and I had no way to describe what I was feeling. I just knew I felt wrong. I cried easily. I overthought everything. I felt like I was a burden for having feelings at all.

My first instinct was to lean on my friends. I remember calling one of them and crying so hard I could barely speak. She listened. She tried. Then she said something that hurt but was true. She basically told me I needed help beyond what she could give me.

She was right. Two teenage girls could not save each other. I am the daughter of two immigrants from India and the youngest of three daughters. In my mind my family was made of superheroes. They were resilient and disciplined and strong. I did not understand why I could not just push through like they did.

After a lot of hesitation I told my parents. At first they didn't understand. They weren't mean about it but they honestly just seemed confused.

In their generation therapy was associated with severe mental illness. I started questioning myself. Maybe I was being dramatic. Maybe I just needed to try harder. These questions spiraled in my head.

Then they surprised me. They brought it up again and suggested therapy. I was 11 years old. I remember feeling shocked and relieved at the same time.

That experience taught me an important lesson: finding the right therapist is a systemic process, not a magical one.

Just like buying a car, you have to compare options. Different therapists use different methods. Some focus on open conversation. Others use structured approaches like cognitive behavioral therapy (CBT) which focuses on identifying thought patterns and learning specific coping strategies.

I eventually tried two more therapists before finding one I connected with. What worked was a more structured approach and a therapist who explained the logic behind what we were doing. Instead of simply asking how I felt, she taught concrete skills.

Those skills included:

Breathing techniques to slow physical panic responses

Cognitive reframing, which means learning to challenge automatic negative thoughts

Journaling to organize overwhelming emotions

Boundary setting, so I could communicate needs without apologizing for them

Separating thoughts from facts, which helps stop spirals of catastrophic thinking

Those changes sound small, but they are not.

And if you won't take my word for it, take science's. According to the American Psychological Association about 75% of people who enter therapy show measurable improvement. Studies show that cognitive behavioral therapy can be as effective as medication for many people with anxiety and depression.

According to the American Psychological Association, many clients begin to see improvement within 15 to 20 sessions. Therapy is not just talking in circles. It is structured skill building that changes how you respond to your own mind.

Let's go through some of the common therapy myths.

Therapy's way too expensive. It's true that some specialists charge $150 to $200 per hour. That is real. But most insurance plans now cover mental health services and provide in network therapists at low or no cost. Additionally, according to the Sacramento Bee, California has a new mental health initiative: CalHOPE. CalHOPE has a $4.6 billion budget and was founded in June 2020.

CalHOPE aims to provide free mental health service for parents of kids as well as teenagers. Also, Community clinics exist for this exact reason. Cost can be a barrier but it is not always the dead end people assume.

Talking about your problems makes them worse. I understand why people think this. Saying something out loud can make it feel heavier at first. But research from the National Library of Medicine shows that naming emotions actually reduces their intensity.

In both studies done by the National Library of Medicine, it was found that affect labeling (putting emotions into words) significantly improved emotional regularity in both high and low stress situations.

Avoidance keeps anxiety alive. Processing experiences helps regulate stress over time. When you talk about something you are not making it bigger. You are making it manageable.

My therapist is judging me. I promise you they are not. Therapists train for years. They study human behavior, trauma coping strategies and emotional regulation. They have heard everything.

Their job is not to decide whether you are good or bad. Their job is to help you understand yourself without shame. If you ever feel judged you have the right to address it or find someone else.

It takes forever to get results. I will be honest. Therapy takes work. There are days when you leave feeling drained. There are days when you think nothing is changing. But studies show that about half of clients report meaningful progress within the first few months.

Growth is gradual and often quiet. It could look like one less panic attack. One healthier boundary. One moment where you choose a better response.

On the days when I felt stuck I would think about who I was before therapy. I would think about how scared I used to be of my own thoughts. Then I would notice something small. I could sit with discomfort a little longer. I could communicate instead of shutting down. I could challenge one negative belief instead of accepting it as truth. That is progress.

Therapy also changed how I show up for other people. In middle school my closest friend was struggling too. We tried to save each other. We both ended up exhausted. If your friend is truly struggling you are more likely to suggest therapy than simply be a shoulder to cry on. Another important point is gender. Historically, men have been far less likely to seek therapy due to stigma around masculinity and emotional expression. That trend is slowly changing as younger generations begin to view mental health support as a form of discipline rather than weakness. Emotional awareness is not the opposite of strength - it is part of it.

Finally, therapy does not always look the same for everyone. In addition to traditional talk therapy, many communities offer alternative approaches such as art therapy, music therapy and guided mindfulness programs. Even here in Sacramento there are clinics and wellness centers that provide these options locally.

And if nothing I said above works for you, try calling or texting 988. I know it's framed as a hotline or crisis line, but you can use it for everything. It is 100% free and anonymous, you can share as much or as little with professionals who care. If telling your parents seems like too much, don't worry because through 988 they will never know. You don't have to be in a state of pure crisis to use 988.

The key idea is simple: if something in your mind is consistently interfering with your life, it deserves the same attention you would give any other health problem.

I have been in therapy since eighth grade, and looking back, the biggest change was not that my problems disappeared. It was that I developed the ability to manage them.

Your brain is part of your health. Treat it that way.
`,
  },
  {
    id: 'issue-6-advice-column',
    slug: 'advice-column-divorce-jealousy',
    headline: 'Advice Column',
    dek: 'Zema Nasirov answers questions about navigating parents\' divorce and handling jealousy in friendships.',
    section: 'opinion',
    authors: ['Zema Nasirov'],
    publishedAt: '2026-03-15T17:00:00.000Z',
    tags: ['Issue 6', 'Opinion', 'Advice'],
    status: 'published',
    text: `
Q: My parents are getting a divorce and I'm feeling pressured to take sides. How do I navigate this without damaging my relationship with either of them?

Oftentimes, the tensions between parents going through divorce bleed onto kids. It's not fair and it's unfortunate, but there is always a way to navigate it.

First let's address the situation - you are either indirectly or directly being asked to choose between two people you love equally.

This may appear in different ways: one parent could vent to you about the faults of your other parent, or you could be looked to as a mediator to their conflicts. Regardless of how it manifests, you are under no obligation to hold the responsibility of mending their relationship. They are adults and you are not their therapist.

Miscommunication between your parents may be contributing to their arguments. Removing yourself from the equation not only protects your mental well-being, but may also force them to resolve their conflicts directly.

At the same time, it's nothing short of difficult to sit around and say nothing. It's completely natural to want to help solve a dispute.

One simple approach you could take is asking your parents to talk to each other. Something as simple as "I love you both, but I can't be in the middle of this," goes a long way.

Your parents also may not realize the impact their divorce or fighting has on you. It's always a good idea to speak up and advocate for yourself if you don't feel comfortable or safe. If you share how you feel with them, they may step back and make changes to how they have been handling their divorce.

You may want to consider talking to a neutral source about your situation, whether that be a school counselor or another trusted adult. Therapy may be another option in seeking support.

Regardless of how you decide to tackle this, it's important you don't hold it all on your own.

Navigating this situation won't eliminate the grief of a changed family, but it can, at least, ease the transition. Allow yourself to establish boundaries and love your parents equally without having the pressure to choose.

Q: I've been struggling with jealousy and find it hard to feel genuinely happy for my friends. How do I deal with this without it affecting my friendships?

Jealousy is one of the most universally shared feelings, yet it is often the least talked about. Being jealous doesn't make you a bad person. You've already done the work in addressing your own judgement.

Your reactions to your friends' success points to something you are searching for. That may be the goals they are aspiring to, or it could be a sense of progress you feel is missing from your own life.

It's easy to compare yourself and your timeline with those of others. But what you need to realize is you are only highlighting a part of their life that you long for. What you may not see is the struggle or self-doubt behind that moment.

No person is exactly like another. Not only is it unfair to compare yourself with other people's experience, but it's actually counterproductive.

You set the pace for your own timeline. Someone else reaching a milestone at a different time than you in no way pushes you further away from your own.

Friends are there to support and celebrate each other. I'm not asking you to pretend to be happy for them, but if you want to protect and maintain those relationships, you can't let your jealousy change how you treat them.

Your feelings are independent of their accomplishments. One day you will reach a point where you can watch your friends succeed without feeling a detriment. The work you are doing now by simply acknowledging it is already part of getting there.
`,
  },
  {
    id: 'issue-6-favorite-spots-for-lunch-off-campus',
    slug: 'favorite-spots-for-lunch-off-campus',
    headline: 'Favorite Spots for Lunch Off-Campus',
    dek: 'A review of Chipotle, Jamba, Teaspoon and Save Mart after an Octagon poll of students\' favorite off-campus lunch spots.',
    section: 'arts',
    authors: ['Maggie Nuñez-Aguilera'],
    publishedAt: '2026-03-16T17:00:00.000Z',
    tags: ['Issue 6', 'A&E', 'Food Review'],
    status: 'published',
    text: `
"As popular as it gets." That's an accurate twist on Chipotle's new ad slogan here at Sacramento Country Day where the 'fresh Tex-Mex' area not-so-fast food eatery topped our student poll on favorite places to eat lunch off campus.

On Feb. 25, The Octagon sent out a poll and 65 students responded. Chipotle took first place as the most popular restaurant as 56.9% of respondents chose it, then followed Jamba Juice with 44.6% of respondents selecting it, then Teaspoon with 40% of respondents, and finally Save Mart with 33.8% of students reporting it to be their favorite place to eat at Loehmann's Plaza.

I reviewed these four eateries to determine what was hyped-up and if any of it was deserved. I based my ratings not only on taste, but menu options, convenience and ambience.

Full disclosure: I'm a vegetarian, and have been for almost a decade. Additionally, my taste in food is anything but typical. My favorite flavors are sweet and salty, while my least favorite are sour and spicy. And finally, at least half of the quality lunch-hour experience for me is sitting down in a nice spot with my friends. Ergo, my ratings of these off-campus eateries may vary dramatically from yours as a result.

Teaspoon

Teaspoon is one of Loehmann Plaza's most recent additions, and also one of the most popular.

This place serves drinks including lemonade and coffee, but it specializes in boba. The drinks from Teaspoon that I have tried include their House Milk Tea, Liquid Gold and Silky Mango boba teas.

Despite frequenting Teaspoon often with my friends, I can't really say I love it. As someone who goes out to order boba milk tea at different places and often makes my own, I'm always slightly disappointed by Teaspoon's milk teas. They're extremely watered-down, so having a milk tea there isn't as filling as I expect it to be, leaving me hungry.

Now this would be less of an issue if Teaspoon served things to satisfy the hunger its teas left you with, but they don't. The only snack that you can satisfy your hunger with are macarons - $3.50 for 1 piece, and $17.25 for 6 pieces - and other expensive options such as $4.50 for a lemon bar and $5.00 for the coffee cake.

Teaspoon isn't a good place to get food, but it is a good drink place. There are so many drinks on their menu that I want to try, so I'll definitely be going back. The drink I had gets what earns a D, percentage-wise; D+ depending on the curve. 3/5.

Jamba

This is where I would go if I wanted to get a (just a) drink. Not only does Jamba Juice have the best smoothies at Loehmann's Plaza, they have the best drinks period. Jamba Juice has a drink for me regardless of my needs, whether that's protein (Protein Berry Workout), vegetables (Greens & Ginger) or something sweet (the Electric Ice!).

But this place actually does have snacks - supreme ones. Their cheesy pretzels and Belgian waffles serve as great complements to the variety of filling smoothies that they serve.

Some of my favorites include Peanut Butter Moo'd, Apple 'N Greens and PB & Banana Protein.

Another of my favorite things about the Jamba Juice menu is their monthly mystery, which is essentially a seasonal drink. My favorite is February's strawberries and chocolate smoothie because it's got a rich and smooth sweetness to it.

Jamba Juice also offers a 20% discount for students when showing a valid student ID - a perk Country Day students should look into the next time they go to Jamba. With this discount, you can get a large drink ($11) for the price of a small one ($9).

Given Jamba Juice's elite menu and strategic affordability, Jamba Juice might be my favorite place to get lunch off-campus.

5/5.

Save Mart

I was reluctant to add Save Mart to the poll of eateries in Loehmann's Plaza, but due to popular demand, I added it a day after the initial publication of the poll.

Compared to other places that serve food in Loehmann's Plaza, Save Mart is different. It's not a typical sit-down restaurant with service; It's a grocery store, which is why I didn't initially include it. To me, this serves as both a pro and a con. On one hand, this makes Save Mart more cost-efficient. You don't have to break the bank every time you eat there. On the other hand, it doesn't really make for an enjoyable lunch experience; you have to find that experience elsewhere. Point being, I'm somebody who likes to sit down when I eat, and unlike other upscale grocery stores (Bel Air, Safeway) Save Mart doesn't have any place to sit down (the tables outside belong to other restaurants). My favorite thing about lunch is relaxing, sitting down and catching up with my friends. Save Mart isn't really the best place to do that.

Additionally, Save Mart as an eatery is a wildcard; it's literally a grocery store. With a place that has all the food options a group of friends could ever want, it seems like you can't go wrong with choosing Save Mart food-wise. But unless your idea of an off-campus lunch experience is grocery shopping, Save Mart's a bust.

2/5.

Chipotle

Chipotle was ranked #1 eatery at Loehmann's Plaza, but also ranked #1 overall by high school, receiving votes from 57% of poll takers. If I had to guess why that is, I would say because of its universal cuisine. Chipotle has something for everybody - or almost everybody.

For being an eatery based on consumer customization, Chipotle doesn't have many options for me as a vegetarian. For protein, one of the options is the plant-based sofritas, but they suck. For a Mexican-American chain, the sofritas are oddly-seasoned. Neither my American nor Mexican taste buds approve. I don't know a single person who would eat this protein, vegetarian or not.

On the other hand, the beans are actually good. They have a nice kick to them that most people like, but for me, it's a little much to enjoy. I'll eat them, but not happily.

I've had subpar experiences not only with the food at Chipotle, but also with the service. Last time I went to Chipotle, I asked a question about the black beans; the person helping me answered, and proceeded to add them to my bowl without asking.

On a more positive note, one thing I genuinely enjoy at Chipotle is their drinks. They have multiple drink options, including hibiscus lemonade, mandarin agua fresca and berry agua fresca, all of which I really like. They're refreshing, sweet and altogether pleasant to drink.

The aspect that I would say I like the most about Chipotle is its nutritional value. Chipotle has options (even if they're not the best) for protein, vegetables, healthy fat and other nutrients your body needs. As somebody who reflects on whether my body's nutritional needs are met, this is one thing Chipotle is doing right.

The ability to choose what you want and how much you want really appeals to a lot of people, including my vegetarian self.

3/5.
`,
  },
  {
    id: 'issue-6-brent-faiyaz-icon',
    slug: 'brent-faiyaz-icon',
    headline: 'Brent Faiyaz\'s: "Icon"',
    dek: 'A review of Brent Faiyaz\'s album "Icon," from the overhyped hit "have to." to the standout "pure fantasy."',
    section: 'arts',
    authors: ['Khivi Singh'],
    publishedAt: '2026-03-18T17:00:00.000Z',
    tags: ['Issue 6', 'A&E', 'Music Review'],
    status: 'published',
    text: `
Christopher Brent Wood is better known as Brent Faiyaz ("faiyaz" is Arabic for leader). The American singer/songwriter and record producer is also an "octuple platinum" certified artist, a 2018 Grammy nominee, 2022 American Music Award nominee and Black Entertainment Network's Best Male R&B Pop Artist (2023, 2024).

Born and raised in Columbia, Md. by an African American mother and a Dominican father, Faiyaz's parents gave him the gift of a keyboard at age 6. His family did not remain supportive of his musical aspirations, forcing him to leave home at age 18 and "thug it," according to Faiyaz.

His career began with the release of his first extended play entitled "Black Child." Faiyaz's rise to fame came with his Grammy nomination in 2018 for his feature on the song "Crew" with fellow American rapper and singer GoldLink.

On "Icon," his third studio album, Faiyaz explores more mature themes such as the stress surrounding commitment and true love. The former 'male manipulator' becoming husband material is demonstrated in his song titles. The combination of all lowercase titles and periods at the end of each song name represent a more vulnerable and intimate side of the music.

The night before the original release date, Faiyaz sent a text message to his production team, telling them that he couldn't release the album the next day. He had a lead single and music video that he let go of as well. He then sent his team a recording of his now hit song "have to." On various social media platforms such as Instagram, YouTube and TikTok, fans attribute the delay of the album to a sudden creative awakening within Faiyaz as well as strategic movement to keep fans guessing and not to collide with other artists' new releases.

The album produced "have to.," a No. 1 hit on Billboard's Adult R&B chart before the album's release.

Of the "Icon" release on Feb 13, Variety reported: "The man is such a gifted singer and songwriter that he could probably sneeze and it would sound soulful." Pitchfork, in an otherwise scathing review Faiyaz called out publicly, singled out one song ("butterflies.") as being honest about "the frightening thrill of commitment."

Impressed with the album overall, three songs stand out to me: an overhyped hit, a deeply introspective track and what I consider to be a perfect classic.

"have to."

2/5

Here it is. The song that changed "Icon." The song that sparked Faiyaz's creativity. The song that won the hearts of thousands, but not mine.

Released on Oct. 31, prior to the full album drop, "have to." rose to fame quickly, ranking No. 1 on Billboard's Adult R&B Songs Chart on Feb. 7, 2026.

In it, Faiyaz describes the struggle he faces with managing his busy schedule with his search for a committed relationship.

He sings: "I'm in a race with time to get where I belong / 'Cause it feels so right after all these nights alone / Dreaming about touching down, I can't sleep till you touch me, baby, when? / Can you make it feel good before I leave again?"

Using travel-themed metaphors, Faiyaz shares his struggle to find time for intimate relationships due to his fast-paced life.

A lack of strong vocals detracts from the sweet meaning and somewhat catchy beat of this song. Faiyaz's voice in this song is not pure; its pitch has been altered and dueted with his usual singing voice, creating an underwhelming overlapping effect.

"have to." is not going on my "have to listen to" list. I can't believe his production crew heard it and decided to release the album.

"butterflies."

4/5

I have been in love with "butterflies." since the very first time I heard it.

In "butterflies.," Faiyaz puts his heart onto paper. Deeply in love, Faiyaz opens the song with the overthinking we do in this state. He feels skeptical about addressing his feelings with his woman of interest. Faiyaz is fearful of pushing her away with his confessions, and as a result, he attempts to come off subtle.

He sings: "Maybe it's a little bit rushed / But I'm falling in love / Hope that's not too much, but this isn't a crush."

His lyrics are sensitive and sweet, moving the listener to feel the love that Faiyaz has for the woman.

The song continues with Faiyaz questioning the woman, asking how she feels about him. He feels intense anticipation for love as well as a looming feeling of apprehension.

He sings: "How do you feel? / Is it anything like I feel? / Is it anything like I feel?" Every time I hear this line, my heart beats fast as I can feel Faiyaz yearning for love through the music.

From there, the music fades out, and for a moment, there is silence. During that pause, Faiyaz ceases to overthink, and brings us, the listeners, into the eye of his hurricane. This is brilliant, as listeners can directly experience the anxiety that Faiyaz couples with his love.

Then, an unpredictable beat switch occurs, marking a change in Faiyaz's attitude. He suddenly loses all anxiety and seems to be in a state of sheer admiration of the girl.

He sings "You are, are / Superwoman / Somehow you're perfect but don't try to be."

He not only loves the girl he is singing about, but is in love with the way she carries herself, to the point that he is inspired by her. He feels that a woman like her is rare.

While I appreciate Faiyaz's idolization of the girl he loves, the beat switch is awkward and incongruous with the first half of the song. Ultimately, it prevents the song from earning a 5.

Overall, this song is a perfect example of Faiyaz's careful lyricism and effortless rapture. The meaningful lyrics behind the lackadaisical and aloof beat make the song engaging. Besides the beat switch, every part of this song feels intentional and impactful.

"pure fantasy."

5/5

"pure fantasy." is Faiyaz's attempt at blending beautiful vocals, emotional delivery, rich lyrics and classic '80s and '90s R&B song-style.

He succeeds.

In this song, Faiyaz indirectly describes what an icon looks like in his mind.

When thinking of an icon, he himself doesn't come to mind. However, the woman he loves does.

Faiyaz describes this woman as his icon and role model.

He sings: "And when you walk the town / People always stop and stare / And I love when you come around."

He admires her so much, and despite his unprecedented levels of success, he still feels deep respect and admiration for her even though she is an ordinary girl.

Similarly, in the chorus, Faiyaz sings: "You're all I need / Girl, it's pure / Pure fantasy."

He truly believes that she could be his forever, and he imagines a reality with her as his icon, describing it as "pure fantasy." These lyrics combined with rich music also highlight Faiyaz's growth and transition from singing about toxic relationships and insecurity to commitment and authentic love.

In this song, fans note that Faiyaz seems to mimic early-80s Michael Jackson, specifically noting a similar style to the song "Human Nature." Faiyaz himself, however, has not confirmed inspiration from Michael Jackson. He specifically puts himself into the shoes of an icon - singing with a moody and contemplative flair.

What really sets this song over the top is the applause that is featured in the beginning, middle and end of the song.

Initially, the applause seems off and sticks out like a sore thumb. However, after thinking through the meaning of the song, I couldn't appreciate the creative touch of the applause more. It is precisely what makes this song so unique and special.

Before this song, I had fantasies of a song with strong vocal presence, classic R&B style and effortless grace. "pure fantasy." has turned my fantasies to reality.

By the album's end, the No. 1 hit was a big zero to my ears, "butterflies" was a beaut and "pure fantasy" was a very real expression of a life-changing love.

Overall, "Icon" earned 4 stars from me. I was not overwhelmed by it, but I was enraptured by Faiyaz's ability to make me feel just as anxious and in love as he is through his lyrics and music.

I anticipate this album to live up to its title.
`,
  },
];

const existingAuthors = {
  'Kate Barnes': {
    id: 'kate-barnes',
    name: 'Kate Barnes',
    role: 'News Editor',
    bio: "Junior Kate Barnes is the news section editor for The Octagon and is looking forward to working with new staffers, something she has come to enjoy after three years in The Octagon. When she isn't writing about environmental issues and her favorite movies, she enjoys talking to her friends and reading. Contact her at kbarnes27@scdsstudent.org.",
    image: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7348123_570.jpg?resize=200,200',
    email: 'kbarnes27@scdsstudent.org',
    twitter: '',
  },
  'Ammar Hussain': {
    id: 'ammar-hussain',
    name: 'Ammar Hussain',
    role: 'Reporter',
    bio: 'Ammar is a sophomore at our school with a passion for skiing. When he is not hitting the slopes, he is perfecting his skills and bringing the same dedication to his writing for The Octagon.',
    image: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6425432_560.jpg?resize=200,200',
    email: '',
    twitter: '',
  },
  'Ryan Xu': {
    id: 'ryan-xu',
    name: 'Ryan Xu',
    role: 'Copy Editor',
    bio: '',
    image: '',
    email: '',
    twitter: '',
  },
  'Rehan Afzal': {
    id: 'rehan-afzal',
    name: 'Rehan Afzal',
    role: 'Editor-in-Chief',
    bio: "Senior Rehan Afzal keeps himself occupied by participating in mock trial, taking photos and most importantly, managing his sidekick, sophomore Sid Shukla. Contact him at rafzal26@scdsstudent.org.",
    image: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5696833_216.jpg?resize=200,200',
    email: 'rafzal26@scdsstudent.org',
    twitter: '',
  },
  'Chloey Fang': {
    id: 'chloey-fang',
    name: 'Chloey Fang',
    role: 'Reporter',
    bio: 'Freshman Chloey Fang spends most of her time listening to music while playing Roblox with her friends. Contact her at cfang29@scdsstudent.org.',
    image: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7196347_644.jpg?resize=200,200',
    email: 'cfang29@scdsstudent.org',
    twitter: '',
  },
  'Sid Shukla': {
    id: 'sid-shukla',
    name: 'Sid Shukla',
    role: 'Technology Staff',
    bio: '',
    image: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6857756_142.jpg?resize=200,200',
    email: '',
    twitter: '',
  },
  'Parsa Salari': {
    id: 'parsa-salari',
    name: 'Parsa Salari',
    role: 'Reporter',
    bio: 'Sophomore Parsa Salari is about to start his fifth year at Country Day. Contact him at psalari28@scdsstudent.org.',
    image: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6352338_182.jpg?resize=200,200',
    email: 'psalari28@scdsstudent.org',
    twitter: '',
  },
  'Jacob Rabe': {
    id: 'jacob-rabe',
    name: 'Jacob Rabe',
    role: 'Feature Editor',
    bio: '',
    image: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7029452_690.jpg?resize=200,200',
    email: '',
    twitter: '',
  },
  'Parsiny Nijher': {
    id: 'parsiny-nijher',
    name: 'Parsiny Nijher',
    role: 'Sports Editor',
    bio: "Sophomore Parsiny Nijher is entering her second year as an Octagon staffer. Previously a reporter, she has risen in the ranks to become the Octagon's Sports Section Editor.",
    image: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7535246_48.jpg?resize=200,200',
    email: 'pnijher28@scdsstudent.org',
    twitter: '',
  },
  Staff: {
    id: 'the-octagon-staff',
    name: 'Staff',
    role: 'Editorial Board',
    bio: 'The Octagon editorial staff.',
    image: 'https://ui-avatars.com/api/?name=Staff&size=200',
    email: '',
    twitter: '',
  },
  'Anika Nadgauda': {
    id: 'anika-nadgauda',
    name: 'Anika Nadgauda',
    role: 'A&E / Opinion Editor',
    bio: 'Anika Nadgauda is a current senior and has been a part of The Octagon for four years.',
    image: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_5739564_255.jpg?resize=200,200',
    email: '',
    twitter: '',
  },
  'Zema Nasirov': {
    id: 'zema-nasirov',
    name: 'Zema Nasirov',
    role: 'Editor-in-Chief',
    bio: '',
    image: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_4613340_941.jpg?resize=200,200',
    email: '',
    twitter: '',
  },
  'Maggie Nuñez-Aguilera': {
    id: 'maggie-nuez-aguilera',
    name: 'Maggie Nuñez-Aguilera',
    role: 'Reporter',
    bio: '',
    image: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_7595033_713.jpg?resize=200,200',
    email: '',
    twitter: '',
  },
  'Khivi Singh': {
    id: 'khivi-singh',
    name: 'Khivi Singh',
    role: 'Reporter',
    bio: 'Khivi Singh is a freshman at Country Day. Contact her at ksingh29@scdsstudent.org.',
    image: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1072/user/large_user_6375565_50.jpg?resize=200,200',
    email: 'ksingh29@scdsstudent.org',
    twitter: '',
  },
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textToHtml(text) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const escaped = escapeHtml(block).replace(/\n/g, ' ');
      if (/^(Feb\. \d+|Risks of backcountry skiing|Facts about avalanches|Staying safe\(r\) in avalanche areas|Claire Gemmell|Amelia Dizon|William Aron|Factual timeline:|Teaspoon|Jamba|Save Mart|Chipotle|"have to\."|"butterflies\."|"pure fantasy\.")$/.test(block)) {
        return `<h2>${escaped}</h2>`;
      }
      return `<p>${escaped}</p>`;
    })
    .join('\n');
}

function wordsFromText(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function articleAuthor(names) {
  if (names.length === 1) return existingAuthors[names[0]];

  const name = names.join(' and ');
  const id = names.map(authorName => existingAuthors[authorName]?.id || slugify(authorName)).join('-and-');
  return {
    id,
    name,
    role: 'Student Journalist',
    bio: '',
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200`,
    email: '',
    twitter: '',
  };
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function toArticle(story) {
  const body = textToHtml(story.text);
  const now = new Date().toISOString();
  const author = articleAuthor(story.authors);

  return {
    id: `upload_${story.slug}`,
    slug: story.slug,
    headline: story.headline,
    dek: story.dek,
    body,
    image: '',
    images: [],
    imageCaption: '',
    section: story.section,
    author,
    publishedAt: story.publishedAt,
    updatedAt: now,
    readingTime: Math.max(1, Math.ceil(wordsFromText(story.text) / 225)),
    tags: story.tags,
    status: story.status,
    priority: 'normal',
    featured: false,
    isCinematic: false,
    internalNotes: [
      {
        id: `note_issue_6_${story.slug}`,
        authorId: 'system',
        authorName: 'Issue 6 upload tooling',
        type: 'note',
        createdAt: now,
        content: 'Prepared from pasted Issue 6 copy. Editor comments were intentionally excluded. Add hero image/caption before or after import if available.',
      },
    ],
    revisions: [],
    wordCount: wordsFromText(story.text),
  };
}

const articles = stories.map(toArticle);
const authors = {};

for (const story of stories) {
  const combinedAuthor = articleAuthor(story.authors);
  authors[combinedAuthor.id] = combinedAuthor;

  for (const authorName of story.authors) {
    const author = existingAuthors[authorName];
    if (author) authors[author.id] = author;
  }
}

const prepared = {
  generatedAt: new Date().toISOString(),
  sourceManifest: 'chat-paste:issue-6',
  sourceDir: null,
  fetchGoogleDocs: false,
  issue: 'Issue 6',
  publishDateRange: {
    start: '2026-03-05',
    end: '2026-03-18',
  },
  articles,
  authors,
  unresolved: [],
  skipped: [],
  summary: {
    preparedArticles: articles.length,
    published: articles.filter(article => article.status === 'published').length,
    draft: articles.filter(article => article.status === 'draft').length,
    commentsExcluded: true,
  },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(prepared, null, 2)}\n`);

console.log(`Prepared ${articles.length} Issue 6 stories.`);
console.log(`Wrote ${OUT}`);
