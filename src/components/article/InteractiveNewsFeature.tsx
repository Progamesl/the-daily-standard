import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, ExternalLink, Link as LinkIcon } from "lucide-react";
import { DocumentHead } from "@/components/seo/DocumentHead";
import {
  interactiveNewsPilot,
  type InteractiveNewsPilot,
  type PilotArticleBlock,
  type PilotChart,
  type PilotSource,
} from "@/data/interactiveNewsPilot";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function sourceLabel(source?: PilotSource) {
  return source ? `${source.label}: ${source.title}` : "Source";
}

function SourceLink({ source }: { source?: PilotSource }) {
  if (!source) return null;

  return (
    <a
      href={source.url}
      target={source.url.startsWith("#") ? undefined : "_blank"}
      rel={source.url.startsWith("#") ? undefined : "noreferrer"}
      className="inline-flex items-center gap-1 border-b border-[#8f2b1f]/35 font-sans text-xs font-bold uppercase tracking-[0.14em] text-[#8f2b1f] hover:border-[#8f2b1f]"
    >
      {source.label}
      {source.url.startsWith("#") ? <LinkIcon className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
    </a>
  );
}

function SourceCard({
  source,
  active,
  onFocus,
}: {
  source: PilotSource;
  active: boolean;
  onFocus: (id: string) => void;
}) {
  return (
    <a
      href={source.url}
      target={source.url.startsWith("#") ? undefined : "_blank"}
      rel={source.url.startsWith("#") ? undefined : "noreferrer"}
      onMouseEnter={() => onFocus(source.id)}
      onFocus={() => onFocus(source.id)}
      className={`block border p-4 transition-colors duration-200 ${
        active
          ? "border-[#8f2b1f] bg-[#fff9ec]"
          : "border-[#1b160f]/15 bg-[#f7f0e0] hover:border-[#1b160f]/35"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#8f2b1f]">{source.label}</p>
        {source.url.startsWith("#") ? <LinkIcon className="h-4 w-4 text-[#8f2b1f]" /> : <ExternalLink className="h-4 w-4 text-[#8f2b1f]" />}
      </div>
      <h3 className="mt-2 font-serif text-lg font-bold leading-tight text-[#1b160f]">{source.title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#4a4033]">{source.note}</p>
    </a>
  );
}

function InlineStatStrip({
  story,
  statIndexes,
  getSource,
}: {
  story: InteractiveNewsPilot;
  statIndexes: number[];
  getSource: (id: string) => PilotSource | undefined;
}) {
  const stats = statIndexes.map((index) => story.stats[index]).filter(Boolean);

  if (!stats.length) return null;

  return (
    <aside className="my-8 grid gap-4 sm:grid-cols-2">
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="border-l-4 border-[#8f2b1f] bg-[#fbf4e5] p-5 shadow-[5px_5px_0_rgba(27,22,15,0.08)]"
        >
          <p className="font-serif text-5xl font-black leading-none tracking-[-0.05em] text-[#1b160f]">{stat.value}</p>
          <h3 className="mt-3 text-sm font-black uppercase leading-6 tracking-[0.15em] text-[#1b160f]">{stat.label}</h3>
          <p className="mt-3 text-sm leading-6 text-[#4a4033]">{stat.context}</p>
          <div className="mt-4">
            <SourceLink source={getSource(stat.sourceId)} />
          </div>
        </motion.div>
      ))}
    </aside>
  );
}

function SourceButtons({
  sourceIds,
  getSource,
  onFocus,
}: {
  sourceIds?: string[];
  getSource: (id: string) => PilotSource | undefined;
  onFocus: (id: string) => void;
}) {
  if (!sourceIds?.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {sourceIds.map((sourceId) => (
        <button
          key={sourceId}
          type="button"
          onClick={() => onFocus(sourceId)}
          className="border border-[#8f2b1f]/35 px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#8f2b1f] transition-colors hover:border-[#8f2b1f] hover:bg-[#fff9ec]"
        >
          {sourceLabel(getSource(sourceId))}
        </button>
      ))}
    </div>
  );
}

function ChartShell({
  chart,
  source,
  children,
}: {
  chart: PilotChart;
  source?: PilotSource;
  children: React.ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE }}
      className="border border-[#1b160f]/20 bg-[#fbf4e5] p-5 sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-3 border-b border-[#1b160f]/15 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-serif text-2xl font-black leading-tight tracking-[-0.03em] text-[#1b160f]">{chart.title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4a4033]">{chart.dek}</p>
        </div>
        <SourceLink source={source} />
      </div>
      <div className="h-[280px] w-full sm:h-[330px]">{children}</div>
      <p className="mt-4 border-t border-[#1b160f]/15 pt-3 text-xs leading-5 text-[#6b5f4c]">{chart.note}</p>
    </motion.article>
  );
}

function ComparisonChart({ chart, source }: { chart: PilotChart; source?: PilotSource }) {
  const suffix = chart.valueSuffix ?? "";

  return (
    <ChartShell chart={chart} source={source}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart.data} margin={{ top: 10, right: 10, left: -18, bottom: 8 }}>
          <CartesianGrid stroke="#ded1b9" vertical={false} />
          <XAxis dataKey={chart.xKey} tickLine={false} axisLine={false} tick={{ fill: "#4a4033", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#4a4033", fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "rgba(143,43,31,0.08)" }}
            contentStyle={{ background: "#fff9ec", border: "1px solid #8f2b1f", borderRadius: 0 }}
            formatter={(value) => [`${value}${suffix}`, chart.valueLabel]}
          />
          <Bar dataKey={chart.valueKey} fill="#8f2b1f" radius={[0, 0, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function TrendChart({ chart, source }: { chart: PilotChart; source?: PilotSource }) {
  const suffix = chart.valueSuffix ?? "";

  return (
    <ChartShell chart={chart} source={source}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chart.data} margin={{ top: 10, right: 18, left: -16, bottom: 8 }}>
          <CartesianGrid stroke="#ded1b9" vertical={false} />
          <XAxis dataKey={chart.xKey} tickLine={false} axisLine={false} tick={{ fill: "#4a4033", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#4a4033", fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: "#fff9ec", border: "1px solid #8f2b1f", borderRadius: 0 }}
            formatter={(value) => [`${value}${suffix}`, chart.valueLabel]}
          />
          <Line type="monotone" dataKey={chart.valueKey} stroke="#8f2b1f" strokeWidth={3} dot={{ fill: "#1b160f", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function ArticleBlock({
  block,
  story,
  getSource,
  onFocusSource,
}: {
  block: PilotArticleBlock;
  story: InteractiveNewsPilot;
  getSource: (id: string) => PilotSource | undefined;
  onFocusSource: (id: string) => void;
}) {
  if (block.type === "heading") {
    return (
      <h2 className="mt-12 border-t border-[#1b160f]/20 pt-8 font-serif text-4xl font-black leading-tight tracking-[-0.04em] text-[#1b160f] sm:text-5xl">
        {block.text}
      </h2>
    );
  }

  if (block.type === "paragraph") {
    return (
      <section>
        <p className="font-serif text-[1.35rem] leading-9 text-[#2f281f]">{block.text}</p>
        <SourceButtons sourceIds={block.sourceIds} getSource={getSource} onFocus={onFocusSource} />
      </section>
    );
  }

  if (block.type === "pullquote") {
    return (
      <aside className="my-8 border-y border-[#1b160f]/25 py-7">
        <p className="font-serif text-3xl font-black italic leading-tight tracking-[-0.04em] text-[#1b160f] sm:text-4xl">
          “{block.quote}”
        </p>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-[#8f2b1f]">{block.attribution}</p>
      </aside>
    );
  }

  if (block.type === "stat-strip") {
    return <InlineStatStrip story={story} statIndexes={block.statIndexes} getSource={getSource} />;
  }

  if (block.type === "chart") {
    const chart = story.charts[block.chartId];
    const source = getSource(chart.sourceId);

    return block.chartId === "comparison" ? <ComparisonChart chart={chart} source={source} /> : <TrendChart chart={chart} source={source} />;
  }

  return (
    <aside className="my-8 border border-[#1b160f]/20 bg-[#f7f0e0] p-5">
      <p className="text-xs font-black uppercase tracking-[0.26em] text-[#8f2b1f]">Evidence note</p>
      <h3 className="mt-2 font-serif text-2xl font-black leading-tight tracking-[-0.03em] text-[#1b160f]">{block.title}</h3>
      <p className="mt-3 text-sm leading-7 text-[#3f362b]">{block.text}</p>
      <SourceButtons sourceIds={block.sourceIds} getSource={getSource} onFocus={onFocusSource} />
    </aside>
  );
}

export function InteractiveNewsFeature({ story = interactiveNewsPilot }: { story?: InteractiveNewsPilot }) {
  const [activeSource, setActiveSource] = useState(story.heroStat.sourceId);
  const sourceMap = useMemo(() => new Map(story.sources.map((source) => [source.id, source])), [story.sources]);
  const getSource = (id: string) => sourceMap.get(id);

  return (
    <main className="min-h-screen bg-[#efe6d3] text-[#1b160f]">
      <DocumentHead title={story.headline} description={story.dek} type="article" />

      <div className="pointer-events-none fixed inset-0 opacity-[0.12] [background-image:linear-gradient(90deg,rgba(27,22,15,.07)_1px,transparent_1px),linear-gradient(rgba(27,22,15,.05)_1px,transparent_1px)] [background-size:82px_82px]" />

      <header className="relative z-10 border-b border-[#1b160f]/15 bg-[#efe6d3]/95 px-5 py-4 backdrop-blur-sm sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#1b160f] hover:text-[#8f2b1f]"
        >
          <ArrowLeft className="h-4 w-4" />
          The Octagon
        </Link>
      </header>

      <article className="relative z-10">
        <section className="mx-auto grid max-w-[1240px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-16">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.42em] text-[#8f2b1f]">{story.kicker}</p>
            <h1 className="mt-5 max-w-4xl font-serif text-[clamp(3rem,8vw,7.5rem)] font-black leading-[0.9] tracking-[-0.055em]">
              {story.headline}
            </h1>
            <p className="mt-6 max-w-2xl font-serif text-xl leading-8 text-[#3f362b] sm:text-2xl">{story.dek}</p>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-y border-[#1b160f]/20 py-4 text-sm text-[#4a4033]">
              <span className="font-bold text-[#1b160f]">{story.byline}</span>
              <span>{story.date}</span>
            </div>
            <p className="mt-5 max-w-2xl border-l-4 border-[#8f2b1f] pl-4 text-sm leading-6 text-[#4a4033]">
              {story.editorNote}
            </p>
          </div>

          <aside className="border border-[#1b160f] bg-[#fbf4e5] p-5 shadow-[8px_8px_0_rgba(27,22,15,0.12)]">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-[#8f2b1f]">Why this matters</p>
            <p className="mt-4 font-serif text-6xl font-black leading-none tracking-[-0.06em]">{story.heroStat.value}</p>
            <h2 className="mt-4 text-base font-black uppercase leading-6 tracking-[0.16em]">{story.heroStat.label}</h2>
            <p className="mt-4 text-sm leading-6 text-[#4a4033]">{story.heroStat.context}</p>
            <div className="mt-5">
              <SourceLink source={getSource(story.heroStat.sourceId)} />
            </div>
          </aside>
        </section>

        <section className="mx-auto grid max-w-[1240px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-7">
            <div className="border-b border-[#1b160f]/20 pb-6">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[#8f2b1f]">Full Article</p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#4a4033]">
                The reporting below is the article itself. Graphics and source cards appear where they clarify the evidence.
              </p>
            </div>

            {story.articleBlocks.map((block, index) => (
              <motion.div
                key={`${block.type}-${index}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <ArticleBlock block={block} story={story} getSource={getSource} onFocusSource={setActiveSource} />
              </motion.div>
            ))}

            <section id="methodology" className="border border-[#1b160f]/20 bg-[#f7f0e0] p-6">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[#8f2b1f]">Methodology</p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#3f362b]">{story.methodology}</p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="border-t-4 border-[#1b160f] bg-[#efe6d3] pt-5">
              <h2 className="font-serif text-3xl font-black tracking-[-0.04em]">Sources</h2>
              <p className="mt-2 text-sm leading-6 text-[#4a4033]">
                Evidence stays visible so attribution can move out of the sentence and into the interface.
              </p>
              <div className="mt-5 grid gap-3">
                {story.sources.map((source) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    active={source.id === activeSource}
                    onFocus={setActiveSource}
                  />
                ))}
              </div>
            </div>
          </aside>
        </section>
      </article>
    </main>
  );
}

export default InteractiveNewsFeature;
