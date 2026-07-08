import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Trophy } from "lucide-react";
import { DocumentHead } from "@/components/seo/DocumentHead";

const superlatives = [
  { title: "Most likely to cure cancer", winner: "Rebecca", accent: "from-emerald-300 to-cyan-300" },
  { title: "Most likely to be a millionaire", winner: "Ashly", accent: "from-amber-300 to-orange-400" },
  { title: "Most likely to go viral", winner: "Riley", accent: "from-fuchsia-300 to-violet-400" },
  { title: "Best dressed", winner: "Ella H", accent: "from-rose-300 to-pink-400" },
  { title: "Best humor", winner: "Jake", accent: "from-lime-300 to-green-400" },
  { title: "Most likely to not study and get an A", winner: "Andrew", accent: "from-blue-300 to-indigo-400" },
  { title: "Most likely to be late for graduation", winner: "Itzel", accent: "from-yellow-200 to-amber-400" },
  { title: "Worst sleep schedule", winner: "Liam", accent: "from-slate-300 to-purple-400" },
  { title: "Worst case of senioritis", winner: "Rehan", accent: "from-red-300 to-orange-400" },
  { title: "Best bromance", winner: "Dylan + Kamron", accent: "from-sky-300 to-blue-500" },
];

export default function SeniorSuperlativesPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <DocumentHead
        title="Senior Superlatives"
        description="A cinematic senior superlatives feature from The Octagon."
        type="article"
      />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.35),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.25),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(251,191,36,0.22),transparent_34%)]" />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
          animate={{ rotate: -360 }}
          transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur transition hover:bg-white/15 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to The Octagon
        </Link>

        <section className="grid min-h-[70vh] items-center gap-10 py-16 lg:grid-cols-[1fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.32em] text-white/70 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Class of 2026
            </div>
            <h1 className="max-w-4xl font-serif text-6xl font-black leading-[0.9] tracking-tight text-white sm:text-7xl lg:text-8xl">
              Senior
              <span className="block bg-gradient-to-r from-amber-200 via-pink-200 to-sky-200 bg-clip-text text-transparent">
                Superlatives
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/70">
              A high-gloss awards wall for the tiny, funny truths the senior class voted into legend.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950">10 awards</span>
              <span className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/75">15 poll responses</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-amber-300/30 via-fuchsia-400/25 to-sky-300/30 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/50">Spotlight</p>
                  <h2 className="mt-1 font-serif text-3xl font-bold">Best Bromance</h2>
                </div>
                <Trophy className="h-10 w-10 text-amber-200" />
              </div>
              <div className="rounded-[2rem] bg-slate-950/70 p-8">
                <p className="text-sm uppercase tracking-[0.35em] text-sky-200/70">Winners</p>
                <p className="mt-5 bg-gradient-to-r from-sky-200 to-blue-400 bg-clip-text font-serif text-6xl font-black text-transparent">
                  Dylan + Kamron
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="pb-20">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/45">The Awards Board</p>
              <h2 className="mt-2 font-serif text-4xl font-bold">Voted most likely</h2>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {superlatives.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.04 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 backdrop-blur"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accent}`} />
                <div className="flex min-h-56 flex-col justify-between">
                  <p className="text-sm font-medium leading-6 text-white/65">{item.title}</p>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/35">Winner</p>
                    <h3 className="mt-3 font-serif text-4xl font-black leading-none text-white">{item.winner}</h3>
                  </div>
                </div>
                <div className={`absolute -bottom-16 -right-16 h-36 w-36 rounded-full bg-gradient-to-br ${item.accent} opacity-20 blur-2xl transition group-hover:opacity-40`} />
              </motion.article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
