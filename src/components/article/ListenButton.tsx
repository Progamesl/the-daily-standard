import { useState, useCallback, useRef, useEffect } from "react";
import { Volume2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ListenButtonProps {
  title: string;
  text: string;
  className?: string;
}

export function ListenButton({ title, text, className }: ListenButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const fullText = [title, text].filter(Boolean).join(". ");
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window && fullText.length > 0;

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (!canSpeak) return;
    if (isPlaying) {
      stop();
      return;
    }
    const u = new SpeechSynthesisUtterance(fullText);
    u.rate = 0.95;
    u.pitch = 1;
    u.volume = 1;
    u.lang = "en-US";
    u.onend = () => setIsPlaying(false);
    u.onerror = () => setIsPlaying(false);
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
    setIsPlaying(true);
  }, [canSpeak, fullText, isPlaying, stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  if (!canSpeak) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`gap-2 text-muted-foreground hover:text-foreground ${className ?? ""}`}
      onClick={toggle}
      aria-label={isPlaying ? "Stop listening" : "Listen to article"}
    >
      {isPlaying ? (
        <>
          <Square className="h-4 w-4 fill-current" />
          Stop
        </>
      ) : (
        <>
          <Volume2 className="h-4 w-4" />
          Listen
        </>
      )}
    </Button>
  );
}
