import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, RotateCcw, Eye, Sparkles, Trophy } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

interface CellData {
  letter: string;
  isBlack: boolean;
  number?: number;
  acrossClueIdx?: number;
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
   Build static grid
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
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];
  const pieces = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 10,
      duration: 2 + Math.random() * 1.5,
      rotation: Math.random() * 360,
      drift: -40 + Math.random() * 80,
    })), []
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: p.size,
            height: p.size * 0.7,
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

  // Timer
  useEffect(() => {
    if (completed) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime, completed]);

  // Completion check
  useEffect(() => {
    if (revealed) return;
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
      setTimeout(() => setShowConfetti(false), 4000);
    }
  }, [userInput, revealed]);

  // Highlighted word cells
  const highlightedCells = useMemo(() => {
    if (!selectedCell) return new Set<string>();
    const cells = getWordCells(selectedCell[0], selectedCell[1], direction);
    return new Set(cells.map(([r, c]) => `${r}-${c}`));
  }, [selectedCell, direction]);

  // Current clue
  const currentClue = useMemo(() => {
    if (!selectedCell) return null;
    return getClueForCell(selectedCell[0], selectedCell[1], direction) ?? null;
  }, [selectedCell, direction]);

  // Cell click
  const handleCellClick = useCallback((row: number, col: number) => {
    if (STATIC_GRID[row][col].isBlack || completed) return;
    if (selectedCell && selectedCell[0] === row && selectedCell[1] === col) {
      setDirection(d => d === "across" ? "down" : "across");
    } else {
      setSelectedCell([row, col]);
    }
  }, [selectedCell, completed]);

  // Clue click
  const handleClueClick = useCallback((clue: Clue) => {
    setSelectedCell([clue.startRow, clue.startCol]);
    setDirection(clue.direction);
  }, []);

  // Keyboard
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!selectedCell || completed) return;
    const [row, col] = selectedCell;

    if (e.key === "Tab") {
      e.preventDefault();
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
      setTimeout(() => setRecentlyFilled(null), 150);

      const cells = getWordCells(row, col, direction);
      const idx = cells.findIndex(([r, c]) => r === row && c === col);
      for (let i = idx + 1; i < cells.length; i++) {
        const [nr, nc] = cells[i];
        if (!userInput[`${nr}-${nc}`]) {
          setSelectedCell([nr, nc]);
          return;
        }
      }
      if (idx + 1 < cells.length) {
        setSelectedCell(cells[idx + 1]);
      }
    }
  }, [selectedCell, direction, userInput, completed]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const handleCheck = () => {
    setChecked(true);
    setTimeout(() => setChecked(false), 2000);
  };

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

  const handleReset = () => {
    setUserInput({});
    setSelectedCell(null);
    setCompleted(false);
    setChecked(false);
    setRevealed(false);
    setShowConfetti(false);
  };

  const acrossClues = useMemo(() => CLUES.filter(c => c.direction === "across").sort((a, b) => a.number - b.number), []);
  const downClues = useMemo(() => CLUES.filter(c => c.direction === "down").sort((a, b) => a.number - b.number), []);

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

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="text-2xl font-black text-white tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>8</span>
              </div>
              <div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-0.5">
                  Octo-Block
                </h1>
                <p className="text-sm text-slate-500">The Octagon Crossword</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-medium">Time</div>
                <div className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {formatTime(elapsed)}
                </div>
              </div>
              {completed && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white shadow-lg">
                  <Trophy className="h-5 w-5" />
                  <span className="font-semibold">Complete!</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
              <span>{filledCells} of {totalCells} cells</span>
              <span className="font-medium">{progressPct}%</span>
            </div>
          </div>

          {/* Current clue */}
          {currentClue && (
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white text-sm font-bold shadow-sm">
                  {currentClue.number}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  {currentClue.direction === "across" ? "Across" : "Down"}
                </span>
              </div>
              <p className="text-slate-800 font-medium leading-relaxed">{currentClue.clue}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">
          {/* Grid */}
          <div>
            <div
              ref={gridRef}
              className="relative bg-slate-900 rounded-2xl p-1.5 shadow-2xl"
              style={{ aspectRatio: "1", maxWidth: "100%" }}
            >
              <div
                className="grid h-full w-full bg-white rounded-xl"
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
                    const justFilled = recentlyFilled === key;

                    if (cell.isBlack) {
                      return <div key={key} className="bg-slate-900 rounded-sm" />;
                    }

                    return (
                      <div
                        key={key}
                        onClick={() => handleCellClick(ri, ci)}
                        className={cn(
                          "relative flex items-center justify-center cursor-pointer bg-white rounded-sm transition-all duration-200",
                          "border-2",
                          isSelected
                            ? "border-indigo-500 bg-indigo-50 shadow-md scale-105 z-10"
                            : isHighlighted
                            ? "border-purple-300 bg-purple-50"
                            : "border-slate-200",
                          isCorrect && "bg-emerald-100 border-emerald-400",
                          isWrong && "bg-red-100 border-red-400",
                          justFilled && "animate-cell-pop"
                        )}
                      >
                        {cell.number && (
                          <span className="absolute top-0.5 left-1 text-[10px] sm:text-[11px] font-bold text-slate-600 leading-none">
                            {cell.number}
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-[clamp(16px,2.5vw,22px)] sm:text-[clamp(18px,2vw,24px)] font-bold leading-none transition-colors",
                            isCorrect ? "text-emerald-700" : isWrong ? "text-red-700" : "text-slate-900"
                          )}
                        >
                          {val}
                        </span>
                        {isSelected && (
                          <div
                            className={cn(
                              "absolute pointer-events-none rounded-sm",
                              direction === "across"
                                ? "bottom-0 left-0 right-0 h-1 bg-indigo-500"
                                : "top-0 bottom-0 right-0 w-1 bg-indigo-500"
                            )}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all shadow-sm"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                onClick={handleCheck}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                Check
              </button>
              <button
                onClick={handleReveal}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all shadow-sm"
              >
                <Eye className="h-4 w-4" />
                Reveal
              </button>
            </div>
          </div>

          {/* Clues Panel */}
          <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto styled-scrollbar pr-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-indigo-500" />
                Across
              </h2>
              <div className="space-y-1.5">
                {acrossClues.map(clue => {
                  const isActive = currentClue?.number === clue.number && direction === "across";
                  return (
                    <button
                      key={clue.number}
                      onClick={() => handleClueClick(clue)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg text-sm leading-snug transition-all duration-200",
                        isActive
                          ? "bg-indigo-50 border-2 border-indigo-300 text-slate-900 font-medium shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 border-2 border-transparent"
                      )}
                    >
                      <span className="font-bold text-indigo-600 mr-2">{clue.number}.</span>
                      {clue.clue}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-purple-500" />
                Down
              </h2>
              <div className="space-y-1.5">
                {downClues.map(clue => {
                  const isActive = currentClue?.number === clue.number && direction === "down";
                  return (
                    <button
                      key={clue.number}
                      onClick={() => handleClueClick(clue)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg text-sm leading-snug transition-all duration-200",
                        isActive
                          ? "bg-purple-50 border-2 border-purple-300 text-slate-900 font-medium shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 border-2 border-transparent"
                      )}
                    >
                      <span className="font-bold text-purple-600 mr-2">{clue.number}.</span>
                      {clue.clue}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS */}
      <style>{`
        @keyframes cell-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .animate-cell-pop {
          animation: cell-pop 0.15s ease-out;
        }
        @keyframes confetti {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) translateX(var(--drift, 0px)) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
        .styled-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .styled-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .styled-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 6px;
        }
        .styled-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </>
  );
}
