import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Feather } from "lucide-react";
import { DocumentHead } from "@/components/seo/DocumentHead";

const poems = [
  {
    eyebrow: "Poem 1",
    title: "The Peace of the Wild Things",
    author: "Wendell Berry",
    tone: "from-emerald-200 to-teal-400",
    text: "When despair for the world grows in me\nand I wake in the night at the least sound\nin fear of what my life and my children's lives may be,\nI go and lie down where the wood drake\nrests in his beauty on the water, and the great heron feeds.\nI come into the peace of wild things\nwho do not tax their lives with forethought\nof grief. I come into the presence of still water.\nAnd I feel above me the day-blind stars\nwaiting with their light. For a time\nI rest in the grace of the world, and am free.",
  },
  {
    eyebrow: "Poem 2",
    title: "Those Winter Sundays",
    author: "Robert Hayden",
    tone: "from-blue-200 to-indigo-400",
    text: "Sundays too my father got up early\nand put his clothes on in the blueblack cold,\nthen with cracked hands that ached\nfrom labor in the weekday weather made\nbanked fires blaze. No one ever thanked him.\n\nI'd wake and hear the cold splintering, breaking.\nWhen the rooms were warm, he'd call,\nand slowly I would rise and dress,\nfearing the chronic angers of that house,\n\nSpeaking indifferently to him,\nwho had driven out the cold\nand polished my good shoes as well.\nWhat did I know, what did I know\nof love's austere and lonely offices?",
  },
  {
    eyebrow: "Poem 3",
    title: "Every Day We Are Learning",
    author: "Amanda Gorman",
    tone: "from-amber-200 to-orange-400",
    text: "Every day we are learning\nHow to live with essence, not ease.\nHow to move with haste, never hate.\nHow to leave this pain that is beyond us\nBehind us.\nJust like a skill or any art,\nWe cannot possess hope without practicing it.\nIt is the most fundamental craft we demand of ourselves.",
  },
  {
    eyebrow: "Poem 4",
    title: "Spring is like a perhaps hand",
    author: "E.E. Cummings",
    tone: "from-pink-200 to-fuchsia-400",
    text: "Spring is like a perhaps hand\n(which comes carefully\nout of Nowhere)arranging\na window,into which people look(while\npeople stare\narranging and changing placing\ncarefully there a strange\nthing and a known thing here)and\n\nchanging everything carefully\n\nspring is like a perhaps\nHand in a window\n(carefully to\nand fro moving New and\nOld things,while\npeople stare carefully\nmoving a perhaps\nfraction of flower here placing\nan inch of air there)and\n\nwithout breaking anything.",
  },
];

export default function PoemsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0b1020] text-white">
      <DocumentHead
        title="Poems for the Page"
        description="A cinematic poetry gallery from The Octagon."
        type="article"
      />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(45,212,191,0.24),transparent_30%),radial-gradient(circle_at_70%_35%,rgba(244,114,182,0.18),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.16),transparent_34%)]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/10 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur transition hover:bg-white/15 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to The Octagon
        </Link>

        <section className="py-16 text-center sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-4xl"
          >
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.32em] text-white/70 backdrop-blur">
              <BookOpen className="h-4 w-4" />
              Mr. Wells' selections
            </div>
            <h1 className="font-serif text-6xl font-black leading-[0.92] tracking-tight sm:text-7xl lg:text-8xl">
              Poems for
              <span className="block bg-gradient-to-r from-teal-200 via-amber-100 to-pink-200 bg-clip-text text-transparent">
                the Page
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/68">
              A quiet gallery for four poems, staged with motion, light and room for the original line breaks to breathe.
            </p>
          </motion.div>
        </section>

        <section className="grid gap-8 pb-24">
          {poems.map((poem, index) => (
            <motion.article
              key={poem.title}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.7, delay: index * 0.05 }}
              className="relative overflow-hidden rounded-[2.25rem] border border-white/12 bg-white/[0.075] p-6 backdrop-blur-xl sm:p-8 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-10"
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${poem.tone}`} />
              <div className="mb-8 lg:mb-0">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <Feather className="h-6 w-6 text-white/80" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/45">{poem.eyebrow}</p>
                <h2 className="mt-3 font-serif text-4xl font-black leading-tight text-white">{poem.title}</h2>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-white/45">By {poem.author}</p>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-6 sm:p-8">
                <pre className="whitespace-pre-wrap font-serif text-lg leading-9 text-white/82 sm:text-xl">{poem.text}</pre>
              </div>
            </motion.article>
          ))}
        </section>
      </div>
    </main>
  );
}
