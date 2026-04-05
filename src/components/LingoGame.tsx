import { useState, useEffect, useCallback, useRef } from "react";
import LingoBoard from "./LingoBoard";
import Keyboard from "./Keyboard";
import WordSuggestionDialog from "./WordSuggestionDialog";
import ChallengerGame from "./ChallengerGame";
import { TileStatus } from "./LingoTile";
import { getRandomWordAsync, isValidWordAsync, suggestWord, WordLength } from "@/data/words";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import WinAnimation from "./WinAnimation";
import { usePlayer } from "@/hooks/usePlayer";
import { useGameResult, GameResultData } from "@/hooks/useGameResult";
import { Star, Flame, Award } from "lucide-react";

const MAX_GUESSES = 5;
const TIMER_SECONDS = 90;

interface LingoGameProps {
  wordLength: WordLength;
  onBack: () => void;
}

function evaluateGuess(guess: string, target: string): TileStatus[] {
  const result: TileStatus[] = Array(guess.length).fill("absent");
  const targetArr = target.split("");
  const guessArr = guess.split("");
  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === targetArr[i]) { result[i] = "correct"; targetArr[i] = "#"; guessArr[i] = "*"; }
  }
  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === "*") continue;
    const idx = targetArr.indexOf(guessArr[i]);
    if (idx !== -1) { result[i] = "present"; targetArr[idx] = "#"; }
  }
  return result;
}

const LingoGame = ({ wordLength, onBack }: LingoGameProps) => {
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<TileStatus[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [revealedRow, setRevealedRow] = useState<number | null>(null);
  const [letterStatuses, setLetterStatuses] = useState<Record<string, TileStatus>>({});
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameResult, setGameResult] = useState<GameResultData | null>(null);
  const [showChallenger, setShowChallenger] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const firstGreenAttemptRef = useRef<number | null>(null);

  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [pendingWord, setPendingWord] = useState("");

  const { player } = usePlayer();
  const { submitResult } = useGameResult();

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(TIMER_SECONDS);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
    }, 1000);
  }, [stopTimer]);

  const resumeTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
    }, 1000);
  }, []);

  const startNewRound = useCallback(async () => {
    setIsLoading(true);
    const word = await getRandomWordAsync("nl", wordLength);
    setTargetWord(word);
    setCurrentGuess(word[0]);
    setGuesses([]);
    setStatuses([]);
    setGameOver(false);
    setWon(false);
    setShaking(false);
    setRevealedRow(null);
    setLetterStatuses({});
    setGameResult(null);
    firstGreenAttemptRef.current = null;
    setIsLoading(false);
    startTimer();
  }, [wordLength, startTimer]);

  useEffect(() => {
    startNewRound();
    return () => stopTimer();
  }, [startNewRound, stopTimer]);

  useEffect(() => {
    if (timeLeft === 0 && !gameOver) {
      stopTimer();
      setGameOver(true);
      setCurrentGuess("");
      processGameEnd(false, guesses.length);
    }
  }, [timeLeft, gameOver]);

  const processGameEnd = useCallback(async (solved: boolean, attemptCount: number) => {
    if (!player) return;
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    if (solved) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setShowWinAnimation(true);
    }
    const result = await submitResult({
      player_id: player.id,
      level: wordLength,
      word: targetWord,
      attempts: attemptCount,
      solved,
      duration_seconds: duration,
      first_green_attempt: firstGreenAttemptRef.current,
    });
    if (result) {
      setGameResult(result);
    }
  }, [player, wordLength, targetWord, submitResult]);

  const handleRoundEnd = useCallback((playerWon: boolean, attemptCount: number) => {
    stopTimer();
    setGameOver(true);
    setWon(playerWon);
    setCurrentGuess("");
    processGameEnd(playerWon, attemptCount);
  }, [stopTimer, processGameEnd]);

  const handleInvalidGuess = useCallback((guess: string) => {
    const emptyStatuses: TileStatus[] = Array(wordLength).fill("absent");
    const newGuesses = [...guesses, guess.toLowerCase()];
    const newStatuses = [...statuses, emptyStatuses];
    setGuesses(newGuesses);
    setStatuses(newStatuses);
    setRevealedRow(guesses.length);
    setTimeout(() => setRevealedRow(null), 600);
    if (newGuesses.length >= MAX_GUESSES) {
      handleRoundEnd(false, newGuesses.length);
    } else {
      setCurrentGuess(targetWord[0]);
    }
  }, [wordLength, guesses, statuses, targetWord, handleRoundEnd]);

  const processGuessAsValid = useCallback((guess: string) => {
    const evaluation = evaluateGuess(guess, targetWord);
    const newGuesses = [...guesses, guess];
    const newStatuses = [...statuses, evaluation];
    const rowIndex = guesses.length;

    // Track first green attempt
    if (evaluation.some(s => s === "correct") && firstGreenAttemptRef.current === null) {
      firstGreenAttemptRef.current = rowIndex + 1;
    }

    setGuesses(newGuesses);
    setStatuses(newStatuses);
    setRevealedRow(rowIndex);

    const newLetterStatuses = { ...letterStatuses };
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const current = newLetterStatuses[letter];
      const ns = evaluation[i];
      if (ns === "correct") newLetterStatuses[letter] = "correct";
      else if (ns === "present" && current !== "correct") newLetterStatuses[letter] = "present";
      else if (!current) newLetterStatuses[letter] = "absent";
    }
    setLetterStatuses(newLetterStatuses);
    setTimeout(() => setRevealedRow(null), 600);

    if (guess === targetWord) {
      handleRoundEnd(true, newGuesses.length);
    } else if (newGuesses.length >= MAX_GUESSES) {
      handleRoundEnd(false, newGuesses.length);
    } else {
      setCurrentGuess(targetWord[0]);
    }
  }, [targetWord, guesses, statuses, letterStatuses, handleRoundEnd]);

  const submitGuess = useCallback(async () => {
    if (currentGuess.length !== wordLength || isSubmitting) {
      if (currentGuess.length !== wordLength) {
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
      }
      return;
    }
    setIsSubmitting(true);
    const valid = await isValidWordAsync(currentGuess, "nl", wordLength);
    setIsSubmitting(false);
    if (!valid) {
      stopTimer();
      setPendingWord(currentGuess.toLowerCase());
      setSuggestionDialogOpen(true);
      return;
    }
    processGuessAsValid(currentGuess.toLowerCase());
  }, [currentGuess, wordLength, isSubmitting, stopTimer, processGuessAsValid]);

  const handleSuggestionConfirm = useCallback(async () => {
    setSuggestionDialogOpen(false);
    const w = pendingWord;
    const result = await suggestWord(w, wordLength, player?.id);
    if (result.rejected) {
      toast.error(`"${w.toUpperCase()}" is eerder afgekeurd en kan niet worden toegevoegd.`);
      resumeTimer();
      return;
    }
    if (result.success) {
      toast.success(`"${w.toUpperCase()}" is voorgesteld ter goedkeuring!`);
    } else {
      toast.error("Woord kon niet worden voorgesteld.");
    }
    processGuessAsValid(w);
    resumeTimer();
  }, [pendingWord, wordLength, player, processGuessAsValid, resumeTimer]);

  const handleSuggestionCancel = useCallback(() => {
    setSuggestionDialogOpen(false);
    toast.error("Ongeldig woord — beurt verloren!");
    handleInvalidGuess(pendingWord);
    resumeTimer();
  }, [pendingWord, handleInvalidGuess, resumeTimer]);

  const handleKey = useCallback((key: string) => {
    if (gameOver || suggestionDialogOpen) return;
    if (key === "Enter") { submitGuess(); return; }
    if (key === "Backspace") { if (currentGuess.length > 1) setCurrentGuess(prev => prev.slice(0, -1)); return; }
    if (/^[a-zA-Z]$/.test(key) && currentGuess.length < wordLength) {
      setCurrentGuess(prev => prev + key.toLowerCase());
    }
  }, [gameOver, currentGuess, wordLength, submitGuess, suggestionDialogOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      handleKey(e.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg font-bold text-muted-foreground animate-pulse">Laden...</div>
      </div>
    );
  }

  if (showChallenger) {
    return (
      <ChallengerGame
        onComplete={() => {
          setShowChallenger(false);
          startNewRound();
        }}
      />
    );
  }

  const handleNextRound = () => {
    if (gameResult?.trigger_challenger) {
      setShowChallenger(true);
    } else {
      startNewRound();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-lg mx-auto px-2 sm:px-4">
      {showWinAnimation && <WinAnimation onDismiss={() => setShowWinAnimation(false)} />}
      <WordSuggestionDialog open={suggestionDialogOpen} word={pendingWord} language="nl" onConfirm={handleSuggestionConfirm} onCancel={handleSuggestionCancel} />

      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">← Terug</button>
        <div className="flex items-center gap-4">
          {gameResult && (
            <span className="text-sm font-bold text-primary"><Star className="inline w-4 h-4 mr-0.5" />{gameResult.new_total_points}</span>
          )}
          <span className="text-sm font-bold text-muted-foreground"><Flame className="inline w-4 h-4 mr-0.5" />{gameResult?.current_streak ?? player?.current_streak ?? 0}</span>
          <div className={`text-lg font-extrabold tabular-nums ${timeLeft <= 10 ? "text-accent animate-pulse" : "text-foreground"}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground font-medium">{wordLength} letters · Nederlands</div>

      <LingoBoard guesses={guesses} statuses={statuses} currentGuess={currentGuess} currentRow={guesses.length} wordLength={wordLength} maxGuesses={MAX_GUESSES} shaking={shaking} revealedRow={revealedRow} />

      {/* Game Over */}
      {gameOver && (
        <div className="flex flex-col items-center gap-3 animate-bounce-in w-full">
          {won ? (
            <div className="text-center">
              <p className="text-2xl font-extrabold text-tile-correct">🎉 Gewonnen!</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xl font-bold text-accent">Helaas!</p>
              <p className="text-muted-foreground mt-1">Het woord was: <span className="font-bold text-foreground uppercase">{targetWord}</span></p>
            </div>
          )}

          {/* Points breakdown */}
          {gameResult && (
            <div className="w-full max-w-xs bg-card rounded-xl border border-border p-3 space-y-1.5">
              {gameResult.points_breakdown.map((p, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{p.reason}</span>
                  <span className={`font-bold ${p.points >= 0 ? "text-primary" : "text-accent"}`}>{p.points >= 0 ? "+" : ""}{p.points}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-extrabold pt-1.5 border-t border-border">
                <span>Totaal</span>
                <span className={`${gameResult.points_earned >= 0 ? "text-primary" : "text-accent"}`}>{gameResult.points_earned >= 0 ? "+" : ""}{gameResult.points_earned} <Star className="inline w-3 h-3" /></span>
              </div>
            </div>
          )}

          {/* Badges earned */}
          {gameResult?.badges_earned && gameResult.badges_earned.length > 0 && (
            <div className="w-full max-w-xs space-y-1.5">
              {gameResult.badges_earned.map((badge, i) => (
                <div key={i} className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
                  <Award className="w-5 h-5 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-accent">{badge.name} {badge.is_rare && "★"}</p>
                    <p className="text-xs text-muted-foreground">{badge.category}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Challenger notification */}
          {gameResult?.trigger_challenger && (
            <div className="w-full max-w-xs bg-accent/10 border-2 border-accent rounded-xl p-3 text-center animate-pulse">
              <p className="text-lg font-extrabold text-accent">⚡ CHALLENGER!</p>
              <p className="text-xs text-muted-foreground mt-1">25 games gespeeld — tijd voor een uitdaging!</p>
            </div>
          )}

          <button onClick={handleNextRound} className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:brightness-110 transition-all active:scale-95">
            {gameResult?.trigger_challenger ? "⚡ Start Challenger" : "Volgende ronde"}
          </button>
        </div>
      )}

      {!gameOver && <Keyboard onKey={handleKey} letterStatuses={letterStatuses} />}
    </div>
  );
};

export default LingoGame;
