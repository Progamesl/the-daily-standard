import { useState, useCallback, useRef, useEffect } from "react";
import { Volume2, Square, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ListenButtonProps {
  title: string;
  text: string;
  className?: string;
}

/**
 * Voices worth using, best first.
 *
 * The browser is handed whatever voices the operating system has, and the
 * default is usually the oldest and most robotic one installed — on Windows
 * that's Microsoft David. Every platform ships something far better, so pick
 * deliberately rather than accepting the default: the neural voices Microsoft
 * ships with Windows 11, Google's voice on Chrome and Android, and Samantha,
 * which is what iOS and macOS read with.
 */
const PREFERRED = [
  /natural/i,                 // "Microsoft Ava (Natural)" and friends
  /google (us|uk) english/i,
  /^samantha$/i,
  /siri/i,
  /zira|aria|jenny|guy/i,
];

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
  if (!english.length) return null;
  for (const pattern of PREFERRED) {
    const hit = english.find((v) => pattern.test(v.name));
    if (hit) return hit;
  }
  // Remote voices are the network ones, which are consistently better than the
  // locally installed fallbacks.
  return english.find((v) => !v.localService) ?? english[0];
}

/**
 * Break the article into pieces small enough to speak.
 *
 * Chrome stops speaking a long utterance after roughly fifteen seconds and
 * gives no error, so an article handed over in one piece simply goes quiet
 * partway through the first paragraph. The median story here is about five
 * minutes of speech and the longest fifteen, so nearly every article was
 * affected. Feeding it a sentence or two at a time avoids the cut-off, and
 * splitting on sentence ends keeps the phrasing natural.
 */
function chunk(text: string, limit = 200): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (buf && (buf + s).length > limit) { out.push(buf.trim()); buf = ""; }
    // A single sentence longer than the limit is split at commas instead.
    if (s.length > limit) {
      for (const part of s.split(/(?<=,)\s*/)) {
        if (buf && (buf + part).length > limit) { out.push(buf.trim()); buf = ""; }
        buf += part;
      }
    } else buf += s;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

export function ListenButton({ title, text, className }: ListenButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const cancelled = useRef(false);

  const fullText = [title, text].filter(Boolean).join(". ");
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window && fullText.length > 0;

  // getVoices() is empty until the list arrives, which on Chrome is after an
  // event rather than on first call.
  useEffect(() => {
    if (!canSpeak) return;
    const load = () => setVoice(pickVoice(window.speechSynthesis.getVoices()));
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [canSpeak]);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    cancelled.current = true;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  }, []);

  const speak = useCallback(() => {
    if (!canSpeak) return;
    cancelled.current = false;
    window.speechSynthesis.cancel();

    const pieces = chunk(fullText);
    pieces.forEach((piece, i) => {
      const u = new SpeechSynthesisUtterance(piece);
      if (voice) u.voice = voice;
      u.rate = 0.98;
      u.pitch = 1;
      u.volume = 1;
      u.lang = voice?.lang ?? "en-US";
      if (i === pieces.length - 1) {
        u.onend = () => { if (!cancelled.current) { setIsPlaying(false); setIsPaused(false); } };
      }
      u.onerror = () => { setIsPlaying(false); setIsPaused(false); };
      window.speechSynthesis.speak(u);
    });
    setIsPlaying(true);
    setIsPaused(false);
  }, [canSpeak, fullText, voice]);

  const togglePause = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (isPaused) { window.speechSynthesis.resume(); setIsPaused(false); }
    else { window.speechSynthesis.pause(); setIsPaused(true); }
  }, [isPaused]);

  // Leaving the article should stop the audio; speech otherwise keeps playing
  // over whatever the reader opens next.
  useEffect(() => () => { cancelled.current = true; window.speechSynthesis?.cancel(); }, []);

  if (!canSpeak) return null;

  if (!isPlaying) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`gap-2 text-muted-foreground hover:text-foreground ${className ?? ""}`}
        onClick={speak}
        aria-label="Listen to this article"
      >
        <Volume2 className="h-4 w-4" />
        Listen
      </Button>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground"
        onClick={togglePause}
        aria-label={isPaused ? "Resume" : "Pause"}
      >
        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        {isPaused ? "Resume" : "Pause"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground"
        onClick={stop}
        aria-label="Stop listening"
      >
        <Square className="h-4 w-4 fill-current" />
        Stop
      </Button>
    </span>
  );
}
