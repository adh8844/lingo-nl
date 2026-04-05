import { useState, useEffect, useCallback, useRef } from "react";
import Keyboard from "./Keyboard";
import { TileStatus } from "./LingoTile";
import { loadDutchWordsFromDB, WordLength } from "@/data/words";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { usePlayer } from "@/hooks/usePlayer";
import { useGameResult } from "@/hooks/useGameResult";
import { Star, Zap } from "lucide-react";

const CHALLENGER_TIMER = 20;
const CHALLENGER_LEVELS: WordLength[] = [10, 12, 14];

interface ChallengerGameProps {
  onComplete: () => void;
}

function getRevealedIndices(wordLength: number): Set<number> {
  const count = Math.ceil(wordLength * 0.25);
  const indices = new Set<number>([0]); // First letter always included
  const available = Array.from({ length: wordLength - 1 }, (_, i) => i + 1);
  // Shuffle and pick
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

const ChallengerGame = ({ onComplete }: ChallengerGameProps) => {
  const [challengerLevel] = useState<WordLength>(() =>
    CHALLENGER_LEVELS[Math.floor(Math.random() * CHALLENGER_LEVELS.length)]
  );
  const [targetWord, setTargetWord] = useState("");
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CHALLENGER_TIMER);
  const [isLoading, setIsLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [tileStatuses, setTileStatuses] = useState<TileStatus[]>([]);
  const [pointsEarned, setPointsEarned] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const { player } = usePlayer();
  const { submitResult } = useGameResult();

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
      const revealed = getRevealedIndices(word.length);
      setRevealedIndices(revealed);

      // Build initial guess with revealed letters
      const initial = word.split("").map((c, i) => revealed.has(i) ? c : "").join("");
      setCurrentGuess(Array.from({ length: word.length }, (_, i) => revealed.has(i) ? word[i] : "").join(""));

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

  // Time up
  useEffect(() => {
    if (timeLeft === 0 && !gameOver) {
      stopTimer();
      handleSubmit(true);
    }
  }, [timeLeft, gameOver]);

  const handleSubmit = useCallback(async (timedOut = false) => {
    if (submitted || !player || !targetWord) return;
    setSubmitted(true);
    stopTimer();

    const guess = currentGuess.toLowerCase();
    const playerWon = !timedOut && guess === targetWord;
    setWon(playerWon);
    setGameOver(true);

    // Compute tile statuses
    const statuses: TileStatus[] = targetWord.split("").map((c, i) => {
      if (guess[i] === c) return "correct";
      if (guess[i] && targetWord.includes(guess[i])) return "present";
      return "absent";
    });
    setTileStatuses(statuses);

    if (playerWon) {
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result = await submitResult({
      player_id: player.id,
      level: challengerLevel,
      word: targetWord,
      attempts: 1,
      solved: playerWon,
      duration_seconds: duration,
      is_challenger: true,
    });
    if (result) {
      setPointsEarned(result.points_earned);
    }
  }, [submitted, player, targetWord, currentGuess, challengerLevel, submitResult, stopTimer]);

  const handleKey = useCallback((key: string) => {
    if (gameOver || submitted) return;
    if (key === "Enter") {
      // Check all positions are filled
      const filled = currentGuess.split("").every((c, i) => c !== "" && c !== " ");
      if (currentGuess.length === targetWord.length && filled) {
        handleSubmit();
      }
      return;
    }
    if (key === "Backspace") {
      // Find last non-revealed filled position
      const arr = currentGuess.split("");
      for (let i = arr.length - 1; i >= 0; i--) {
        if (!revealedIndices.has(i) && arr[i] !== "") {
          arr[i] = "";
          setCurrentGuess(arr.join(""));
          break;
        }
      }
      return;
    }
    if (/^[a-zA-Z]$/.test(key)) {
      const arr = currentGuess.split("");
      // Find first empty non-revealed position
      for (let i = 0; i < targetWord.length; i++) {
        if (!revealedIndices.has(i) && (arr[i] === "" || arr[i] === " " || !arr[i])) {
          arr[i] = key.toLowerCase();
          setCurrentGuess(arr.join(""));
          break;
        }
      }
    }
  }, [gameOver, submitted, currentGuess, targetWord, revealedIndices, handleSubmit]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      handleKey(e.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
      {/* Header */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-extrabold text-accent">CHALLENGER!</h2>
          <Zap className="w-6 h-6 text-accent" />
        </div>
        <p className="text-sm text-muted-foreground">{challengerLevel} letters · 1 poging · {CHALLENGER_TIMER}s</p>
        <p className="text-xs text-muted-foreground">Win 200 punten!</p>
      </div>

      {/* Timer */}
      <div className={`text-3xl font-extrabold tabular-nums ${timeLeft <= 5 ? "text-accent animate-pulse" : "text-foreground"}`}>
        ⏱ {formatTime(timeLeft)}
      </div>

      {/* Word tiles */}
      <div className="flex flex-wrap justify-center gap-1" style={{ maxWidth: `${Math.min(challengerLevel * 48, 600)}px` }}>
        {targetWord.split("").map((letter, i) => {
          const isRevealed = revealedIndices.has(i);
          const guessLetter = currentGuess[i] || "";
          const status = gameOver ? tileStatuses[i] : (isRevealed ? "correct" : undefined);

          return (
            <div
              key={i}
              className={`w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center text-sm sm:text-lg font-extrabold rounded-lg border-2 transition-all uppercase ${
                status === "correct"
                  ? "bg-tile-correct text-white border-tile-correct"
                  : status === "present"
                  ? "bg-tile-present text-white border-tile-present"
                  : status === "absent"
                  ? "bg-tile-absent text-white border-tile-absent"
                  : isRevealed
                  ? "bg-primary/20 border-primary text-primary"
                  : guessLetter
                  ? "bg-card border-foreground/40 text-foreground"
                  : "bg-card border-border text-muted-foreground"
              }`}
            >
              {isRevealed ? letter : guessLetter || ""}
            </div>
          );
        })}
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="flex flex-col items-center gap-3 animate-bounce-in">
          {won ? (
            <div className="text-center">
              <p className="text-2xl font-extrabold text-tile-correct">🎉 Challenger gewonnen!</p>
              <p className="text-lg font-bold text-primary mt-1"><Star className="inline w-5 h-5" /> +200 punten!</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xl font-bold text-accent">Helaas, niet gelukt!</p>
              <p className="text-muted-foreground mt-1">Het woord was: <span className="font-bold text-foreground uppercase">{targetWord}</span></p>
            </div>
          )}
          <button
            onClick={onComplete}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:brightness-110 transition-all active:scale-95"
          >
            Doorgaan
          </button>
        </div>
      )}

      {!gameOver && <Keyboard onKey={handleKey} letterStatuses={{}} />}
    </div>
  );
};

export default ChallengerGame;
