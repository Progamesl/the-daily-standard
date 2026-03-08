import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, RotateCcw, Lightbulb, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Cell {
  row: number;
  col: number;
  letter: string;
  isBlack: boolean;
  number?: number;
  isAcross?: boolean;
  isDown?: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  isCorrect: boolean;
  isIncorrect: boolean;
}

interface Clue {
  number: number;
  direction: "across" | "down";
  clue: string;
  answer: string;
  startRow: number;
  startCol: number;
}

// Sample crossword data - replace with real data later
const SAMPLE_CLUES: Clue[] = [
  {
    number: 1,
    direction: "across",
    clue: "What did seven do to nine?",
    answer: "ATE",
    startRow: 0,
    startCol: 0,
  },
  {
    number: 2,
    direction: "down",
    clue: '"They aren\'t paid enough" is a common phrase about this job.',
    answer: "TEACHERS",
    startRow: 0,
    startCol: 1,
  },
  {
    number: 3,
    direction: "down",
    clue: "The church bells ___ at noon",
    answer: "CHIME",
    startRow: 0,
    startCol: 3,
  },
  {
    number: 4,
    direction: "down",
    clue: "A self-service machine",
    answer: "VENDING",
    startRow: 0,
    startCol: 5,
  },
  {
    number: 5,
    direction: "across",
    clue: "Interactive Japanese grilling",
    answer: "TEPPANYAKI",
    startRow: 2,
    startCol: 0,
  },
  {
    number: 6,
    direction: "across",
    clue: "___ day celebrated every second Sunday of May",
    answer: "MOTHERS",
    startRow: 4,
    startCol: 0,
  },
  {
    number: 7,
    direction: "down",
    clue: "B.C.E: Before Common ___",
    answer: "ERA",
    startRow: 4,
    startCol: 7,
  },
  {
    number: 8,
    direction: "down",
    clue: "___ coin; a popular cryptocurrency",
    answer: "DOGE",
    startRow: 4,
    startCol: 9,
  },
  {
    number: 9,
    direction: "down",
    clue: "Dr. Bennet Omalu discovered this neurodegenerative disease.",
    answer: "CTE",
    startRow: 4,
    startCol: 11,
  },
];

const GRID_SIZE = 13;

export function OctoBlock() {
  const [cells, setCells] = useState<Cell[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [currentDirection, setCurrentDirection] = useState<"across" | "down">("across");
  const [userInput, setUserInput] = useState<Record<string, string>>({});
  const [showHints, setShowHints] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // Initialize grid
  useEffect(() => {
    const newCells: Cell[][] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      newCells[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        newCells[row][col] = {
          row,
          col,
          letter: "",
          isBlack: true,
          isSelected: false,
          isHighlighted: false,
          isCorrect: false,
          isIncorrect: false,
        };
      }
    }

    // Place clues on grid
    SAMPLE_CLUES.forEach((clue) => {
      const answer = clue.answer.toUpperCase();
      for (let i = 0; i < answer.length; i++) {
        const row = clue.direction === "across" ? clue.startRow : clue.startRow + i;
        const col = clue.direction === "across" ? clue.startCol + i : clue.startCol;

        if (row < GRID_SIZE && col < GRID_SIZE) {
          newCells[row][col].isBlack = false;
          newCells[row][col].letter = answer[i];
          if (i === 0) {
            newCells[row][col].number = clue.number;
          }
          if (clue.direction === "across") {
            newCells[row][col].isAcross = true;
          } else {
            newCells[row][col].isDown = true;
          }
        }
      }
    });

    setCells(newCells);
    setStartTime(new Date());
  }, []);

  // Timer
  useEffect(() => {
    if (!startTime || completed) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, completed]);

  // Check completion
  useEffect(() => {
    if (cells.length === 0) return;

    let allFilled = true;
    let allCorrect = true;

    cells.forEach((row) => {
      row.forEach((cell) => {
        if (!cell.isBlack) {
          const key = `${cell.row}-${cell.col}`;
          const input = userInput[key]?.toUpperCase() || "";
          if (!input) {
            allFilled = false;
          }
          if (input && input !== cell.letter) {
            allCorrect = false;
          }
        }
      });
    });

    if (allFilled && allCorrect) {
      setCompleted(true);
    }
  }, [userInput, cells]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (cells[row]?.[col]?.isBlack) return;

    const cell = cells[row][col];
    const wasSelected = selectedCell?.row === row && selectedCell?.col === col;
    const newDirection = wasSelected && currentDirection === "across" ? "down" : "across";

    setSelectedCell({ row, col });
    setCurrentDirection(newDirection);
  }, [cells, selectedCell, currentDirection]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!selectedCell || completed) return;

    const cell = cells[selectedCell.row][selectedCell.col];
    const key = `${selectedCell.row}-${selectedCell.col}`;

    if (e.key === "Backspace" || e.key === "Delete") {
      setUserInput((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      // Move to previous cell
      if (currentDirection === "across") {
        if (selectedCell.col > 0 && !cells[selectedCell.row][selectedCell.col - 1].isBlack) {
          setSelectedCell({ row: selectedCell.row, col: selectedCell.col - 1 });
        }
      } else {
        if (selectedCell.row > 0 && !cells[selectedCell.row - 1][selectedCell.col].isBlack) {
          setSelectedCell({ row: selectedCell.row - 1, col: selectedCell.col });
        }
      }
    } else if (e.key.match(/^[A-Za-z]$/)) {
      const letter = e.key.toUpperCase();
      setUserInput((prev) => ({ ...prev, [key]: letter }));

      // Auto-advance to next cell
      if (currentDirection === "across") {
        let nextCol = selectedCell.col + 1;
        while (nextCol < GRID_SIZE && cells[selectedCell.row][nextCol].isBlack) {
          nextCol++;
        }
        if (nextCol < GRID_SIZE) {
          setSelectedCell({ row: selectedCell.row, col: nextCol });
        }
      } else {
        let nextRow = selectedCell.row + 1;
        while (nextRow < GRID_SIZE && cells[nextRow][selectedCell.col].isBlack) {
          nextRow++;
        }
        if (nextRow < GRID_SIZE) {
          setSelectedCell({ row: nextRow, col: selectedCell.col });
        }
      }
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      setCurrentDirection("across");
      if (e.key === "ArrowLeft" && selectedCell.col > 0) {
        let nextCol = selectedCell.col - 1;
        while (nextCol >= 0 && cells[selectedCell.row][nextCol].isBlack) {
          nextCol--;
        }
        if (nextCol >= 0) {
          setSelectedCell({ row: selectedCell.row, col: nextCol });
        }
      } else if (e.key === "ArrowRight" && selectedCell.col < GRID_SIZE - 1) {
        let nextCol = selectedCell.col + 1;
        while (nextCol < GRID_SIZE && cells[selectedCell.row][nextCol].isBlack) {
          nextCol++;
        }
        if (nextCol < GRID_SIZE) {
          setSelectedCell({ row: selectedCell.row, col: nextCol });
        }
      }
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      setCurrentDirection("down");
      if (e.key === "ArrowUp" && selectedCell.row > 0) {
        let nextRow = selectedCell.row - 1;
        while (nextRow >= 0 && cells[nextRow][selectedCell.col].isBlack) {
          nextRow--;
        }
        if (nextRow >= 0) {
          setSelectedCell({ row: nextRow, col: selectedCell.col });
        }
      } else if (e.key === "ArrowDown" && selectedCell.row < GRID_SIZE - 1) {
        let nextRow = selectedCell.row + 1;
        while (nextRow < GRID_SIZE && cells[nextRow][selectedCell.col].isBlack) {
          nextRow++;
        }
        if (nextRow < GRID_SIZE) {
          setSelectedCell({ row: nextRow, col: selectedCell.col });
        }
      }
    }
  }, [selectedCell, cells, currentDirection, completed]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  // Highlight current word
  useEffect(() => {
    if (!selectedCell) return;

    const newCells = cells.map((row) =>
      row.map((cell) => ({ ...cell, isHighlighted: false }))
    );

    const cell = cells[selectedCell.row][selectedCell.col];
    const clue = SAMPLE_CLUES.find(
      (c) =>
        c.number === cell.number &&
        ((currentDirection === "across" && c.direction === "across") ||
          (currentDirection === "down" && c.direction === "down"))
    );

    if (clue) {
      for (let i = 0; i < clue.answer.length; i++) {
        const row = clue.direction === "across" ? clue.startRow : clue.startRow + i;
        const col = clue.direction === "across" ? clue.startCol + i : clue.startCol;
        if (row < GRID_SIZE && col < GRID_SIZE) {
          newCells[row][col].isHighlighted = true;
        }
      }
    }

    setCells(newCells);
  }, [selectedCell, currentDirection]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentClue = selectedCell
    ? SAMPLE_CLUES.find(
        (c) =>
          c.number === cells[selectedCell.row][selectedCell.col].number &&
          ((currentDirection === "across" && c.direction === "across") ||
            (currentDirection === "down" && c.direction === "down"))
      )
    : null;

  const acrossClues = SAMPLE_CLUES.filter((c) => c.direction === "across").sort(
    (a, b) => a.number - b.number
  );
  const downClues = SAMPLE_CLUES.filter((c) => c.direction === "down").sort(
    (a, b) => a.number - b.number
  );

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 sm:p-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-2xl font-bold text-white">8</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
                Octo-Block
              </h2>
            </div>
            <p className="text-white/90 text-sm">
              The Octagon's signature crossword puzzle
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-white/80 text-xs uppercase tracking-wider mb-1">Time</div>
              <div className="text-2xl font-bold text-white font-mono">
                {formatTime(elapsedTime)}
              </div>
            </div>
            {completed && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Trophy className="h-5 w-5 text-yellow-300" />
                <span className="text-white font-semibold">Complete!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Crossword Grid */}
          <div className="lg:col-span-2">
            <div
              ref={gridRef}
              className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200"
              style={{
                aspectRatio: "1",
                maxWidth: "100%",
              }}
            >
              <div className="grid gap-0.5 h-full" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                {cells.map((row, rowIdx) =>
                  row.map((cell, colIdx) => {
                    const key = `${rowIdx}-${colIdx}`;
                    const input = userInput[key]?.toUpperCase() || "";
                    const isCorrect = input === cell.letter;
                    const isIncorrect = input && input !== cell.letter;

                    return (
                      <div
                        key={key}
                        onClick={() => handleCellClick(rowIdx, colIdx)}
                        className={cn(
                          "aspect-square flex items-center justify-center text-sm font-bold transition-all cursor-pointer relative",
                          cell.isBlack
                            ? "bg-slate-900"
                            : cn(
                                "bg-white border-2",
                                cell.isSelected
                                  ? "border-indigo-500 ring-4 ring-indigo-200 z-10"
                                  : cell.isHighlighted
                                  ? "border-purple-300 bg-purple-50"
                                  : "border-slate-300",
                                isCorrect && "bg-green-50 border-green-400",
                                isIncorrect && "bg-red-50 border-red-400"
                              )
                        )}
                      >
                        {cell.number && (
                          <span className="absolute top-0.5 left-0.5 text-[8px] font-bold text-slate-600">
                            {cell.number}
                          </span>
                        )}
                        {!cell.isBlack && (
                          <span
                            className={cn(
                              "text-lg font-bold",
                              isCorrect ? "text-green-700" : isIncorrect ? "text-red-700" : "text-slate-900"
                            )}
                          >
                            {input || ""}
                          </span>
                        )}
                        {cell.isSelected && (
                          <div
                            className={cn(
                              "absolute inset-0 border-2 border-dashed animate-pulse",
                              currentDirection === "across"
                                ? "border-indigo-400"
                                : "border-purple-400"
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUserInput({});
                  setSelectedCell(null);
                  setStartTime(new Date());
                  setElapsedTime(0);
                  setCompleted(false);
                }}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHints(!showHints)}
                className="gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                {showHints ? "Hide" : "Show"} Hints
              </Button>
            </div>
          </div>

          {/* Clues Panel */}
          <div className="space-y-6">
            {/* Current Clue */}
            {currentClue && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border-2 border-indigo-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    {currentDirection === "across" ? "Across" : "Down"}
                  </span>
                  <span className="text-2xl font-bold text-indigo-900">{currentClue.number}</span>
                </div>
                <p className="text-slate-700 font-medium">{currentClue.clue}</p>
                {showHints && (
                  <div className="mt-3 pt-3 border-t border-indigo-200">
                    <p className="text-xs text-indigo-600">
                      Answer: <span className="font-mono font-bold">{currentClue.answer}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* All Clues */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Across
                </h3>
                <div className="space-y-2">
                  {acrossClues.map((clue) => {
                    const isActive =
                      currentClue?.number === clue.number && currentDirection === "across";
                    return (
                      <button
                        key={clue.number}
                        onClick={() => {
                          setSelectedCell({ row: clue.startRow, col: clue.startCol });
                          setCurrentDirection("across");
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-all text-sm",
                          isActive
                            ? "bg-indigo-100 border-2 border-indigo-400 font-semibold"
                            : "bg-slate-50 border border-slate-200 hover:bg-slate-100"
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Down
                </h3>
                <div className="space-y-2">
                  {downClues.map((clue) => {
                    const isActive =
                      currentClue?.number === clue.number && currentDirection === "down";
                    return (
                      <button
                        key={clue.number}
                        onClick={() => {
                          setSelectedCell({ row: clue.startRow, col: clue.startCol });
                          setCurrentDirection("down");
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-all text-sm",
                          isActive
                            ? "bg-purple-100 border-2 border-purple-400 font-semibold"
                            : "bg-slate-50 border border-slate-200 hover:bg-slate-100"
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
      </div>
    </div>
  );
}
