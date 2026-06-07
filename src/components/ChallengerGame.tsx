import { useState, useEffect, useCallback, useRef, ChangeEvent } from "react";
import Keyboard from "./Keyboard";
import { TileStatus } from "./LingoTile";
import { loadDutchWordsFromDB, WordLength } from "@/data/words";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { usePlayer } from "@/hooks/usePlayer";
import { useGameResult } from "@/hooks/useGameResult";
import { Star, Zap, Plus } from "lucide-react";
import WordDefinitionBubble from "./WordDefinitionBubble";
import PointsBreakdownCard from "./PointsBreakdownCard";
import { useWordDefinition } from "@/hooks/useWordDefinition";

const CHALLENGER_TIMER = 60;
const CHALLENGER_LEVELS: WordLength[] = [10, 12, 14];

const POINTS_TABLE = [500, 250, 150, 100, 60, 30];
const MAX_EXTRA_LETTERS = 5;

interface ChallengerGameProps {
  onComplete: () => void;
}

function getRevealedIndices(wordLength: number): Set<number> {
  const count = Math.ceil(wordLength * 0.25);
  const indices = new Set<number>([0]);
  const available = Array.from({ length: wordLength - 1 }, (_, i) => i + 1);
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  let idx = 0;
  while (indices.size < count && idx < available.length) {
    indices.add(available[idx]);
    idx++;
  }
  return indices;
}

function getUnrevealedIndices(word: string, revealed: Set<number>): number[] {
  return Array.from({ length: word.length }, (_, i) => i).filter(i => !revealed.has(i));
}

const ChallengerGame = ({ onComplete }: ChallengerGameProps) => {
  const [challengerLevel] = useState<WordLength>(() =>
    CHALLENGER_LEVELS[Math.floor(Math.random() * CHALLENGER_LEVELS.length)]
  );
  const [targetWord, setTargetWord] = useState("");
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [guessArr, setGuessArr] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CHALLENGER_TIMER);
  const [isLoading, setIsLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [tileStatuses, setTileStatuses] = useState<TileStatus[]>([]);
  const [gameResult, setGameResult] = useState<import("@/hooks/useGameResult").GameResultData | null>(null);
  const [extraLettersUsed, setExtraLettersUsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const targetWordRef = useRef("");
  const revealedRef = useRef<Set<number>>(new Set());
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const { player } = usePlayer();
  const { submitResult } = useGameResult();
  const wordDef = useWordDefinition(targetWord, challengerLevel);

  const currentPoints = POINTS_TABLE[Math.min(extraLettersUsed, POINTS_TABLE.length - 1)];

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const words = await loadDutchWordsFromDB(challengerLevel);
      if (words.length === 0) {
        toast.error("Geen woorden beschikbaar voor challenger!");
        onComplete();
        return;
      }
      const word = words[Math.floor(Math.random() * words.length)].toLowerCase();
      setTargetWord(word);
      targetWordRef.current = word;
      const revealed = getRevealedIndices(word.length);
      setRevealedIndices(revealed);
      revealedRef.current = revealed;

      setGuessArr(Array.from({ length: word.length }, (_, i) => revealed.has(i) ? word[i] : ""));

      setIsLoading(false);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    };
    init();
    return () => stopTimer();
  }, [challengerLevel, stopTimer]);

  useEffect(() => {
    if (timeLeft === 0 && !gameOver) {
      stopTimer();
      handleSubmit(true);
    }
  }, [timeLeft, gameOver]);

  const addExtraLetter = useCallback(() => {
    if (extraLettersUsed >= MAX_EXTRA_LETTERS || gameOver || submitted) return;
    const word = targetWordRef.current;
    const revealed = revealedRef.current;
    const unrevealed = getUnrevealedIndices(word, revealed);
    if (unrevealed.length === 0) return;

    const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const newRevealed = new Set(revealed);
    newRevealed.add(randomIdx);
    setRevealedIndices(newRevealed);
    revealedRef.current = newRevealed;

    setGuessArr(prev => {
      const arr = [...prev];
      arr[randomIdx] = word[randomIdx];
      return arr;
    });

    setExtraLettersUsed(prev => prev + 1);
  }, [extraLettersUsed, gameOver, submitted]);

  const handleSubmit = useCallback(async (timedOut = false) => {
    if (submitted || !player || !targetWordRef.current) return;
    setSubmitted(true);
    stopTimer();

    const word = targetWordRef.current;
    const guess = guessArr.map(c => c || "").join("").toLowerCase();
    const playerWon = !timedOut && guess === word;
    setWon(playerWon);
    setGameOver(true);

    const statuses: TileStatus[] = word.split("").map((c, i) => {
      if (guessArr[i]?.toLowerCase() === c) return "correct";
      return "absent";
    });
    setTileStatuses(statuses);

    if (playerWon) {
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }

    const earnedPoints = playerWon ? POINTS_TABLE[Math.min(extraLettersUsed, POINTS_TABLE.length - 1)] : 0;

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result = await submitResult({
      player_id: player.id,
      level: challengerLevel,
      word: word,
      attempts: 1,
      solved: playerWon,
      duration_seconds: duration,
      is_challenger: true,
      challenger_points: earnedPoints,
    });
    if (result) {
      setGameResult(result);
    }
  }, [submitted, player, guessArr, challengerLevel, extraLettersUsed, submitResult, stopTimer]);

  const handleKey = useCallback((key: string) => {
    if (gameOver || submitted) return;
    const word = targetWordRef.current;
    const revealed = revealedRef.current;
    if (key === "Enter") {
      const filled = guessArr.every((c) => c !== "");
      if (guessArr.length === word.length && filled) {
        handleSubmit();
      }
      return;
    }
    if (key === "Backspace") {
      setGuessArr(prev => {
        const arr = [...prev];
        for (let i = arr.length - 1; i >= 0; i--) {
          if (!revealed.has(i) && arr[i] !== "") {
            arr[i] = "";
            return arr;
          }
        }
        return prev;
      });
      return;
    }
    if (/^[a-zA-Z]$/.test(key)) {
      setGuessArr(prev => {
        const arr = [...prev];
        for (let i = 0; i < word.length; i++) {
          if (!revealed.has(i) && !arr[i]) {
            arr[i] = key.toLowerCase();
            return arr;
          }
        }
        return prev;
      });
    }
  }, [gameOver, submitted, guessArr, handleSubmit]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (hiddenInputRef.current && document.activeElement === hiddenInputRef.current) return;
      handleKey(e.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  const handleHiddenInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > 0) {
      const lastChar = val[val.length - 1];
      if (/^[a-zA-Z]$/.test(lastChar)) {
        handleKey(lastChar);
      }
    }
    e.target.value = "";
  }, [handleKey]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Zap className="w-12 h-12 text-accent animate-pulse" />
        <div className="text-2xl font-extrabold text-accent animate-pulse">CHALLENGER!</div>
        <div className="text-muted-foreground">Laden...</div>
      </div>
    );
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-3xl mx-auto px-2">
      {/* Hidden input for native mobile keyboard */}
      <input
        ref={hiddenInputRef}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        style={{ position: "absolute", top: -9999, left: -9999 }}
        onInput={handleHiddenInput}
        onKeyDown={(e) => {
          if (e.key === "Backspace" || e.key === "Enter") {
            e.preventDefault();
            handleKey(e.key);
          }
        }}
      />

      {/* Header */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-extrabold text-accent">CHALLENGER!</h2>
          <Zap className="w-6 h-6 text-accent" />
        </div>
        <p className="text-sm text-muted-foreground">{challengerLevel} letters · 1 poging · {CHALLENGER_TIMER}s</p>
      </div>

      {/* Timer */}
      <div className={`text-3xl font-extrabold tabular-nums ${timeLeft <= 10 ? "text-accent animate-pulse" : "text-foreground"}`}>
        ⏱ {formatTime(timeLeft)}
      </div>

      {/* Points indicator */}
      {!gameOver && (
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
          <Star className="w-5 h-5 text-primary" />
          <span className="text-lg font-extrabold text-primary">{currentPoints} punten</span>
          {extraLettersUsed > 0 && (
            <span className="text-xs text-muted-foreground">({extraLettersUsed}/{MAX_EXTRA_LETTERS} letters gebruikt)</span>
          )}
        </div>
      )}

      {/* Word tiles */}
      <div className="flex flex-nowrap justify-center gap-0.5 sm:gap-1 w-full overflow-x-auto">
        {targetWord.split("").map((letter, i) => {
          const isRevealed = revealedIndices.has(i);
          const guessLetter = guessArr[i] || "";
          const displayLetter = isRevealed ? letter : guessLetter;
          const status = gameOver ? tileStatuses[i] : (isRevealed ? "correct" : undefined);

          return (
            <div
              key={i}
              className={`min-w-[1.75rem] w-7 h-9 sm:min-w-[2.25rem] sm:w-9 sm:h-11 flex items-center justify-center text-xs sm:text-base font-extrabold rounded-md sm:rounded-lg border-2 transition-all uppercase flex-shrink-0 ${
                status === "correct"
                  ? "bg-tile-correct text-white border-tile-correct"
                  : status === "absent"
                  ? "bg-tile-absent text-white border-tile-absent"
                  : isRevealed
                  ? "bg-primary/20 border-primary text-primary"
                  : guessLetter
                  ? "bg-card border-foreground/40 text-foreground"
                  : "bg-card border-border text-muted-foreground"
              }`}
            >
              {displayLetter}
            </div>
          );
        })}
      </div>

      {/* Add letter button */}
      {!gameOver && extraLettersUsed < MAX_EXTRA_LETTERS && (
        <button
          onClick={addExtraLetter}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground font-bold rounded-lg hover:brightness-110 transition-all active:scale-95 border border-border"
        >
          <Plus className="w-4 h-4" />
          Voeg letter toe
          <span className="text-xs text-muted-foreground ml-1">
            (daarna {POINTS_TABLE[Math.min(extraLettersUsed + 1, POINTS_TABLE.length - 1)]} pts)
          </span>
        </button>
      )}

      {/* Game Over */}
      {gameOver && (
        <div className="flex flex-col items-center gap-3 animate-bounce-in">
          {won ? (
            <div className="text-center">
              <p className="text-2xl font-extrabold text-tile-correct">🎉 Challenger gewonnen!</p>
              {extraLettersUsed > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{extraLettersUsed} extra letter{extraLettersUsed > 1 ? "s" : ""} gebruikt</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xl font-bold text-accent">Helaas, niet gelukt!</p>
              <p className="text-muted-foreground mt-1">Het woord was: <span className="font-bold text-foreground uppercase">{targetWord}</span></p>
            </div>
          )}
          {gameResult && <PointsBreakdownCard gameResult={gameResult} />}
          <WordDefinitionBubble
            word={targetWord}
            definition={wordDef.definition}
            example={wordDef.example}
            loading={wordDef.loading}
          />
          <button
            onClick={onComplete}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:brightness-110 transition-all active:scale-95"
          >
            Doorgaan
          </button>
        </div>
      )}

      {!gameOver && (
        <>
          <Keyboard onKey={handleKey} letterStatuses={{}} />
          <button
            onClick={() => hiddenInputRef.current?.focus()}
            className="text-xs text-muted-foreground underline py-1"
          >
            ⌨️ Open toetsenbord
          </button>
        </>
      )}
    </div>
  );
};

export default ChallengerGame;
