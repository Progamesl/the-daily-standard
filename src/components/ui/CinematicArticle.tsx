import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Article, formatDate } from '@/data/seedData';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User } from 'lucide-react';

interface CinematicArticleProps {
  article: Article;
}

export function CinematicArticle({ article }: CinematicArticleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-slate-950 overflow-hidden">
      {/* Cinematic Hero */}
      <div className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <motion.div 
          style={{ y, scale }}
          className="absolute inset-0 z-0"
        >
          <img 
            src={article.image} 
            alt={article.headline}
            className="w-full h-full object-cover brightness-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />
        </motion.div>

        <motion.div 
          style={{ opacity }}
          className="relative z-10 max-w-5xl px-6 text-center"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Badge className="bg-violet-600 hover:bg-violet-700 text-white border-none px-4 py-1 mb-6 text-xs uppercase tracking-[0.2em]">
              {article.section}
            </Badge>
          </motion.div>

          <motion.h1 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-5xl md:text-8xl font-serif font-bold text-white mb-8 tracking-tight leading-[0.9]"
          >
            {article.headline}
          </motion.h1>

          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-6 text-slate-300 text-sm md:text-base font-medium"
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-violet-400" />
              <span>By {article.author.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-violet-400" />
              <span>{formatDate(article.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-violet-400" />
              <span>{article.readingTime} min read</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Scroll</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-violet-500 to-transparent animate-pulse" />
        </motion.div>
      </div>

      {/* Article Content */}
      <div className="relative z-20 bg-slate-950 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          {/* Glassmorphic Dek/Summary */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="relative -mt-32 mb-20 p-8 md:p-12 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl"
          >
            <p className="text-2xl md:text-3xl text-slate-200 font-serif leading-relaxed italic">
              {article.dek}
            </p>
          </motion.div>

          <div 
            className="prose prose-invert prose-xl max-w-none 
              prose-headings:font-serif prose-headings:text-white prose-headings:tracking-tight
              prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-8
              prose-a:text-violet-400 hover:prose-a:text-violet-300
              prose-blockquote:border-violet-500 prose-blockquote:bg-white/5 prose-blockquote:p-6 prose-blockquote:rounded-xl prose-blockquote:text-slate-200 prose-blockquote:italic
              selection:bg-violet-500/30 selection:text-white"
            dangerouslySetInnerHTML={{ __html: article.body }}
          />

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-2">
              {article.tags.map(tag => (
                <span key={tag} className="text-xs uppercase tracking-widest text-slate-500 hover:text-violet-400 transition-colors">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Gradient Orb */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full -z-10 pointer-events-none" />
    </div>
  );
}
