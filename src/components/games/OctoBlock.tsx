import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { RotateCcw, Eye, EyeOff, Check, Zap, Share2 } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

interface CellData {
  letter: string;          // correct answer letter
  isBlack: boolean;
  number?: number;         // clue number label (top-left)
  acrossClueIdx?: number;  // index into CLUES array
  downClueIdx?: number;
}

interface Clue {
  number: number;
  direction: "across" | "down";
  clue: string;
  answer: string;
  startRow: number;
  startCol: number;
}

/* ─────────────────────────────────────────────────────────────
   Puzzle Data
   ───────────────────────────────────────────────────────────── */

const CLUES: Clue[] = [
  { number: 1, direction: "across", clue: "What did seven do to nine?", answer: "ATE", startRow: 0, startCol: 0 },
  { number: 2, direction: "down", clue: '"They aren\'t paid enough" is a common phrase about this job.', answer: "TEACHERS", startRow: 0, startCol: 1 },
  { number: 3, direction: "down", clue: "The church bells ___ at noon", answer: "CHIME", startRow: 0, startCol: 3 },
  { number: 4, direction: "down", clue: "A self-service machine", answer: "VENDING", startRow: 0, startCol: 5 },
  { number: 5, direction: "across", clue: "Interactive Japanese grilling", answer: "TEPPANYAKI", startRow: 2, startCol: 0 },
  { number: 6, direction: "across", clue: "___ day celebrated every second Sunday of May", answer: "MOTHERS", startRow: 4, startCol: 0 },
  { number: 7, direction: "down", clue: "B.C.E: Before Common ___", answer: "ERA", startRow: 4, startCol: 7 },
  { number: 8, direction: "down", clue: "___ coin; a popular cryptocurrency", answer: "DOGE", startRow: 4, startCol: 9 },
  { number: 9, direction: "down", clue: "Dr. Bennet Omalu discovered this neurodegenerative disease.", answer: "CTE", startRow: 4, startCol: 11 },
];

const GRID_SIZE = 13;

/* ─────────────────────────────────────────────────────────────
   Build static grid (runs once)
   ───────────────────────────────────────────────────────────── */

function buildGrid(): CellData[][] {
  const grid: CellData[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ letter: "", isBlack: true }))
  );

  CLUES.forEach((clue, idx) => {
    for (let i = 0; i < clue.answer.length; i++) {
      const r = clue.direction === "across" ? clue.startRow : clue.startRow + i;
      const c = clue.direction === "across" ? clue.startCol + i : clue.startCol;
      if (r < GRID_SIZE && c < GRID_SIZE) {
        grid[r][c].isBlack = false;
        grid[r][c].letter = clue.answer[i];
        if (i === 0) grid[r][c].number = clue.number;
        if (clue.direction === "across") grid[r][c].acrossClueIdx = idx;
        else grid[r][c].downClueIdx = idx;
      }
    }
  });

  return grid;
}

const STATIC_GRID = buildGrid();

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

function getWordCells(row: number, col: number, dir: "across" | "down"): [number, number][] {
  // Walk backward to start of word
  let r = row, c = col;
  if (dir === "across") {
    while (c > 0 && !STATIC_GRID[r][c - 1].isBlack) c--;
  } else {
    while (r > 0 && !STATIC_GRID[r - 1][c].isBlack) r--;
  }
  const cells: [number, number][] = [];
  let cr = r, cc = c;
  while (cr < GRID_SIZE && cc < GRID_SIZE && !STATIC_GRID[cr][cc].isBlack) {
    cells.push([cr, cc]);
    if (dir === "across") cc++; else cr++;
  }
  return cells;
}

function getClueForCell(row: number, col: number, dir: "across" | "down"): Clue | undefined {
  const wordCells = getWordCells(row, col, dir);
  if (wordCells.length === 0) return undefined;
  const [sr, sc] = wordCells[0];
  return CLUES.find(c => c.direction === dir && c.startRow === sr && c.startCol === sc);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────────────────────
   Confetti Effect
   ───────────────────────────────────────────────────────────── */

function Confetti() {
  const colors = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
  const pieces = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      duration: 1.5 + Math.random() * 2,
      rotation: Math.random() * 360,
      drift: -30 + Math.random() * 60,
    })), []
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: "2px",
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--drift": `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────────────────── */

export function OctoBlock() {
  const [userInput, setUserInput] = useState<Record<string, string>>({});
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [completed, setCompleted] = useState(false);
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recentlyFilled, setRecentlyFilled] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Timer ────────────────────────────────────────────
  useEffect(() => {
    if (completed) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime, completed]);

  // ── Completion check ─────────────────────────────────
  useEffect(() => {
    let allCorrect = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = STATIC_GRID[r][c];
        if (!cell.isBlack) {
          const val = userInput[`${r}-${c}`]?.toUpperCase() || "";
          if (val !== cell.letter) { allCorrect = false; break; }
        }
      }
      if (!allCorrect) break;
    }
    if (allCorrect && Object.keys(userInput).length > 0) {
      setCompleted(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [userInput]);

  // ── Highlighted word cells ───────────────────────────
  const highlightedCells = useMemo(() => {
    if (!selectedCell) return new Set<string>();
    const cells = getWordCells(selectedCell[0], selectedCell[1], direction);
    return new Set(cells.map(([r, c]) => `${r}-${c}`));
  }, [selectedCell, direction]);

  // ── Current clue ─────────────────────────────────────
  const currentClue = useMemo(() => {
    if (!selectedCell) return null;
    return getClueForCell(selectedCell[0], selectedCell[1], direction) ?? null;
  }, [selectedCell, direction]);

  // ── Cell click ───────────────────────────────────────
  const handleCellClick = useCallback((row: number, col: number) => {
    if (STATIC_GRID[row][col].isBlack || completed) return;
    if (selectedCell && selectedCell[0] === row && selectedCell[1] === col) {
      // Toggle direction on re-click
      setDirection(d => d === "across" ? "down" : "across");
    } else {
      setSelectedCell([row, col]);
    }
  }, [selectedCell, completed]);

  // ── Clue click ───────────────────────────────────────
  const handleClueClick = useCallback((clue: Clue) => {
    setSelectedCell([clue.startRow, clue.startCol]);
    setDirection(clue.direction);
  }, []);

  // ── Keyboard ─────────────────────────────────────────
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!selectedCell || completed) return;
    const [row, col] = selectedCell;

    if (e.key === "Tab") {
      e.preventDefault();
      // Move to next clue
      const currentClue = getClueForCell(row, col, direction);
      if (!currentClue) return;
      const sameDir = CLUES.filter(c => c.direction === direction).sort((a, b) => a.number - b.number);
      const idx = sameDir.findIndex(c => c.number === currentClue.number);
      const next = sameDir[(idx + (e.shiftKey ? -1 : 1) + sameDir.length) % sameDir.length];
      setSelectedCell([next.startRow, next.startCol]);
      return;
    }

    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      const key = `${row}-${col}`;
      if (userInput[key]) {
        setUserInput(prev => { const n = { ...prev }; delete n[key]; return n; });
      } else {
        // Move back
        const cells = getWordCells(row, col, direction);
        const idx = cells.findIndex(([r, c]) => r === row && c === col);
        if (idx > 0) {
          const [pr, pc] = cells[idx - 1];
          setSelectedCell([pr, pc]);
          setUserInput(prev => { const n = { ...prev }; delete n[`${pr}-${pc}`]; return n; });
        }
      }
      return;
    }

    if (e.key === " ") {
      e.preventDefault();
      setDirection(d => d === "across" ? "down" : "across");
      return;
    }

    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const dirs: Record<string, [number, number, "across" | "down"]> = {
        ArrowLeft: [0, -1, "across"], ArrowRight: [0, 1, "across"],
        ArrowUp: [-1, 0, "down"], ArrowDown: [1, 0, "down"],
      };
      const [dr, dc, newDir] = dirs[e.key];
      setDirection(newDir);
      let nr = row + dr, nc = col + dc;
      while (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        if (!STATIC_GRID[nr][nc].isBlack) { setSelectedCell([nr, nc]); break; }
        nr += dr; nc += dc;
      }
      return;
    }

    if (/^[A-Za-z]$/.test(e.key)) {
      e.preventDefault();
      const letter = e.key.toUpperCase();
      const key = `${row}-${col}`;
      setUserInput(prev => ({ ...prev, [key]: letter }));
      setRecentlyFilled(key);
      setTimeout(() => setRecentlyFilled(null), 200);

      // Auto-advance
      const cells = getWordCells(row, col, direction);
      const idx = cells.findIndex(([r, c]) => r === row && c === col);
      // Find next empty cell in word, or just next cell
      for (let i = idx + 1; i < cells.length; i++) {
        const [nr, nc] = cells[i];
        if (!userInput[`${nr}-${nc}`]) {
          setSelectedCell([nr, nc]);
          return;
        }
      }
      // If all filled, move to next cell anyway
      if (idx + 1 < cells.length) {
        setSelectedCell(cells[idx + 1]);
      }
    }
  }, [selectedCell, direction, userInput, completed]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // ── Check answers ────────────────────────────────────
  const handleCheck = () => {
    setChecked(true);
    setTimeout(() => setChecked(false), 3000);
  };

  // ── Reveal all ───────────────────────────────────────
  const handleReveal = () => {
    const all: Record<string, string> = {};
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!STATIC_GRID[r][c].isBlack) {
          all[`${r}-${c}`] = STATIC_GRID[r][c].letter;
        }
      }
    }
    setUserInput(all);
    setRevealed(true);
  };

  // ── Reset ────────────────────────────────────────────
  const handleReset = () => {
    setUserInput({});
    setSelectedCell(null);
    setCompleted(false);
    setChecked(false);
    setRevealed(false);
  };

  // ── Share ────────────────────────────────────────────
  const handleShare = () => {
    const text = `🧩 Octo-Block — The Octagon\n⏱ ${formatTime(elapsed)}\n\nPlay at scdsoctagon.net/secretstuff`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  // ── Separated clues ─────────────────────────────────
  const acrossClues = useMemo(() => CLUES.filter(c => c.direction === "across").sort((a, b) => a.number - b.number), []);
  const downClues = useMemo(() => CLUES.filter(c => c.direction === "down").sort((a, b) => a.number - b.number), []);

  // ── Clue progress (how many letters filled per clue) ─
  const clueProgress = useMemo(() => {
    const map: Record<string, number> = {};
    CLUES.forEach(clue => {
      let filled = 0;
      for (let i = 0; i < clue.answer.length; i++) {
        const r = clue.direction === "across" ? clue.startRow : clue.startRow + i;
        const c = clue.direction === "across" ? clue.startCol + i : clue.startCol;
        if (userInput[`${r}-${c}`]) filled++;
      }
      map[`${clue.direction}-${clue.number}`] = Math.round((filled / clue.answer.length) * 100);
    });
    return map;
  }, [userInput]);

  const totalCells = useMemo(() => {
    let count = 0;
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (!STATIC_GRID[r][c].isBlack) count++;
    return count;
  }, []);

  const filledCells = Object.keys(userInput).length;
  const progressPct = Math.round((filledCells / totalCells) * 100);

  return (
    <>
      {showConfetti && <Confetti />}

      {/* ── Completion overlay ── */}
      {completed && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-md mx-4 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 mb-2">Brilliant!</h2>
            <p className="text-slate-500 mb-6">You solved today's Octo-Block</p>
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold font-mono text-slate-900">{formatTime(elapsed)}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Time</div>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <div className="text-3xl font-bold font-mono text-slate-900">{totalCells}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Cells</div>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 transition-colors"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button
                onClick={() => { setCompleted(false); handleReset(); }}
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-full font-semibold hover:bg-slate-50 transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="select-none">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tighter" style={{ fontFamily: "'Georgia', serif" }}>8</span>
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
                Octo-Block
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 uppercase tracking-[0.2em] font-medium mt-0.5">
                The Octagon Crossword
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Timer */}
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-mono font-bold text-slate-900 tabular-nums">
                {formatTime(elapsed)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="mb-6">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-slate-400">{filledCells} / {totalCells} cells</span>
            <span className="text-[11px] text-slate-400 font-medium">{progressPct}%</span>
          </div>
        </div>

        {/* ── Current clue banner ── */}
        <div className="mb-5 bg-white rounded-xl border border-slate-200 px-4 sm:px-5 py-3 sm:py-3.5 shadow-sm min-h-[52px] flex items-center gap-3">
          {currentClue ? (
            <>
              <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-bold">
                {currentClue.number}{currentClue.direction === "across" ? "A" : "D"}
              </span>
              <span className="text-sm sm:text-[15px] text-slate-700 font-medium leading-snug">{currentClue.clue}</span>
            </>
          ) : (
            <span className="text-sm text-slate-400 italic">Select a cell to begin</span>
          )}
        </div>

        {/* ── Main layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">

          {/* ── Grid ── */}
          <div>
            <div
              ref={gridRef}
              className="relative bg-slate-900 rounded-xl p-[3px] sm:p-1 shadow-xl"
              style={{ aspectRatio: "1" }}
            >
              <div
                className="grid h-full w-full"
                style={{
                  gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                  gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                  gap: "2px",
                }}
              >
                {STATIC_GRID.map((row, ri) =>
                  row.map((cell, ci) => {
                    const key = `${ri}-${ci}`;
                    const val = userInput[key]?.toUpperCase() || "";
                    const isSelected = selectedCell?.[0] === ri && selectedCell?.[1] === ci;
                    const isHighlighted = highlightedCells.has(key);
                    const isCorrect = checked && val && val === cell.letter;
                    const isWrong = checked && val && val !== cell.letter;
                    const isRevealed = revealed && val === cell.letter;
                    const justFilled = recentlyFilled === key;

                    if (cell.isBlack) {
                      return <div key={key} className="bg-slate-900" />;
                    }

                    return (
                      <div
                        key={key}
                        onClick={() => handleCellClick(ri, ci)}
                        className={cn(
                          "relative flex items-center justify-center cursor-pointer transition-colors duration-150",
                          // Base
                          "bg-white",
                          // Highlighted word
                          isHighlighted && !isSelected && "bg-indigo-50",
                          // Selected cell
                          isSelected && "bg-amber-100 ring-2 ring-amber-400 ring-inset z-10",
                          // Check feedback
                          isCorrect && "bg-emerald-50",
                          isWrong && "bg-red-50",
                          // Pop animation
                          justFilled && "animate-cell-pop",
                        )}
                      >
                        {/* Clue number */}
                        {cell.number && (
                          <span className="absolute top-[1px] left-[2px] sm:top-[2px] sm:left-[3px] text-[7px] sm:text-[9px] font-bold text-slate-500 leading-none select-none">
                            {cell.number}
                          </span>
                        )}

                        {/* Letter */}
                        <span
                          className={cn(
                            "text-[clamp(10px,2.8vw,22px)] sm:text-[clamp(12px,2.2vw,24px)] font-bold leading-none select-none",
                            isCorrect ? "text-emerald-600" : isWrong ? "text-red-500" : isRevealed ? "text-indigo-500" : "text-slate-900"
                          )}
                        >
                          {val}
                        </span>

                        {/* Direction indicator on selected cell */}
                        {isSelected && (
                          <div className={cn(
                            "absolute pointer-events-none",
                            direction === "across"
                              ? "bottom-[2px] left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-amber-500"
                              : "right-[2px] top-1/2 -translate-y-1/2 h-3 w-[2px] rounded-full bg-amber-500"
                          )} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Toolbar ── */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
              <button
                onClick={handleCheck}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm"
              >
                <Check className="h-3.5 w-3.5" /> Check
              </button>
              <button
                onClick={handleReveal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm"
              >
                {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                Reveal
              </button>
              <div className="flex-1" />
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:bg-slate-700 transition-colors shadow-sm"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            </div>

            {/* ── Keyboard hint ── */}
            <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">Space</kbd> to toggle direction</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">Tab</kbd> next clue</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">↑↓←→</kbd> navigate</span>
            </div>
          </div>

          {/* ── Clues Panel ── */}
          <div className="lg:max-h-[calc(100vw-2rem)] lg:overflow-y-auto styled-scrollbar space-y-6">
            {/* Across */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2.5 flex items-center gap-2">
                <span className="w-1 h-3.5 rounded-full bg-indigo-500" />
                Across
              </h3>
              <div className="space-y-1">
                {acrossClues.map(clue => {
                  const isActive = currentClue?.number === clue.number && direction === "across";
                  const pct = clueProgress[`across-${clue.number}`] ?? 0;
                  return (
                    <button
                      key={clue.number}
                      onClick={() => handleClueClick(clue)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition-all duration-150 relative overflow-hidden group",
                        isActive
                          ? "bg-indigo-50 ring-1 ring-indigo-200"
                          : "hover:bg-slate-50"
                      )}
                    >
                      {/* progress background */}
                      <div
                        className={cn("absolute inset-0 transition-all duration-500", isActive ? "bg-indigo-100/50" : "bg-slate-100/0 group-hover:bg-slate-50")}
                        style={{ width: `${pct}%` }}
                      />
                      <span className="relative z-10 flex items-start gap-2">
                        <span className={cn("font-bold shrink-0 w-5 text-right tabular-nums", isActive ? "text-indigo-600" : "text-slate-400")}>
                          {clue.number}
                        </span>
                        <span className={cn("leading-snug", isActive ? "text-indigo-900 font-medium" : "text-slate-600", pct === 100 && "line-through opacity-50")}>
                          {clue.clue}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Down */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2.5 flex items-center gap-2">
                <span className="w-1 h-3.5 rounded-full bg-purple-500" />
                Down
              </h3>
              <div className="space-y-1">
                {downClues.map(clue => {
                  const isActive = currentClue?.number === clue.number && direction === "down";
                  const pct = clueProgress[`down-${clue.number}`] ?? 0;
                  return (
                    <button
                      key={clue.number}
                      onClick={() => handleClueClick(clue)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition-all duration-150 relative overflow-hidden group",
                        isActive
                          ? "bg-purple-50 ring-1 ring-purple-200"
                          : "hover:bg-slate-50"
                      )}
                    >
                      <div
                        className={cn("absolute inset-0 transition-all duration-500", isActive ? "bg-purple-100/50" : "bg-slate-100/0 group-hover:bg-slate-50")}
                        style={{ width: `${pct}%` }}
                      />
                      <span className="relative z-10 flex items-start gap-2">
                        <span className={cn("font-bold shrink-0 w-5 text-right tabular-nums", isActive ? "text-purple-600" : "text-slate-400")}>
                          {clue.number}
                        </span>
                        <span className={cn("leading-snug", isActive ? "text-purple-900 font-medium" : "text-slate-600", pct === 100 && "line-through opacity-50")}>
                          {clue.clue}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Custom CSS for animations ── */}
      <style>{`
        @keyframes cell-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .animate-cell-pop {
          animation: cell-pop 0.2s ease-out;
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) translateX(var(--drift, 0px)) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation: confetti-fall 3s ease-out forwards;
        }
        .styled-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .styled-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .styled-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .styled-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </>
  );
}
