import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

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
  const gridRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    if (completed) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime, completed]);

  // Completion check
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
    }
  }, [userInput]);

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

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-slate-300">
        <div className="flex items-baseline justify-between mb-4">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Octo-Block
          </h1>
          <div className="text-right">
            <div className="text-sm text-slate-500 mb-0.5">Time</div>
            <div className="text-xl font-mono font-semibold text-slate-900 tabular-nums">
              {formatTime(elapsed)}
            </div>
          </div>
        </div>
        {currentClue && (
          <div className="text-sm text-slate-700">
            <span className="font-semibold">{currentClue.number} {currentClue.direction === "across" ? "Across" : "Down"}:</span> {currentClue.clue}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 lg:gap-12">
        {/* Grid */}
        <div>
          <div
            ref={gridRef}
            className="relative bg-slate-900 p-[2px]"
            style={{ aspectRatio: "1", maxWidth: "100%" }}
          >
            <div
              className="grid h-full w-full bg-white"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                gap: "1px",
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

                  if (cell.isBlack) {
                    return <div key={key} className="bg-slate-900" />;
                  }

                  return (
                    <div
                      key={key}
                      onClick={() => handleCellClick(ri, ci)}
                      className={cn(
                        "relative flex items-center justify-center cursor-pointer bg-white border border-slate-300",
                        isSelected && "bg-blue-50 border-blue-500 border-2",
                        isHighlighted && !isSelected && "bg-blue-50/50",
                        isCorrect && "bg-[#6AAA64] border-[#6AAA64]",
                        isWrong && "bg-red-100 border-red-400"
                      )}
                    >
                      {cell.number && (
                        <span className="absolute top-0.5 left-1 text-[9px] sm:text-[10px] font-semibold text-slate-700 leading-none">
                          {cell.number}
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[clamp(14px,2.5vw,20px)] sm:text-[clamp(16px,2vw,22px)] font-bold leading-none text-slate-900",
                          isCorrect && "text-white",
                          isWrong && "text-red-700"
                        )}
                      >
                        {val}
                      </span>
                      {isSelected && (
                        <div
                          className={cn(
                            "absolute pointer-events-none",
                            direction === "across"
                              ? "bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                              : "top-0 bottom-0 right-0 w-0.5 bg-blue-500"
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
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleCheck}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Check
            </button>
            <button
              onClick={handleReveal}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Reveal
            </button>
          </div>
        </div>

        {/* Clues Panel */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Across</h2>
            <div className="space-y-1">
              {acrossClues.map(clue => {
                const isActive = currentClue?.number === clue.number && direction === "across";
                return (
                  <button
                    key={clue.number}
                    onClick={() => handleClueClick(clue)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-sm leading-snug transition-colors",
                      isActive
                        ? "bg-blue-50 text-slate-900 font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className="font-semibold mr-1.5">{clue.number}.</span>
                    {clue.clue}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Down</h2>
            <div className="space-y-1">
              {downClues.map(clue => {
                const isActive = currentClue?.number === clue.number && direction === "down";
                return (
                  <button
                    key={clue.number}
                    onClick={() => handleClueClick(clue)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-sm leading-snug transition-colors",
                      isActive
                        ? "bg-blue-50 text-slate-900 font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className="font-semibold mr-1.5">{clue.number}.</span>
                    {clue.clue}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Completion message */}
      {completed && (
        <div className="mt-8 p-6 bg-slate-50 border border-slate-300 text-center">
          <p className="text-lg font-semibold text-slate-900 mb-2">Puzzle complete!</p>
          <p className="text-sm text-slate-600">Time: {formatTime(elapsed)}</p>
        </div>
      )}
    </div>
  );
}
