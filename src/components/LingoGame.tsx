import { useState, useEffect, useCallback, useRef } from "react";
import LingoBoard from "./LingoBoard";
import Keyboard from "./Keyboard";
import WordSuggestionDialog from "./WordSuggestionDialog";
import { TileStatus } from "./LingoTile";
import { getRandomWordAsync, isValidWordAsync, suggestWord, Language, WordLength } from "@/data/words";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { usePlayer } from "@/hooks/usePlayer";
import { usePoints, getTimerBonus } from "@/hooks/usePoints";

const MAX_GUESSES = 5;
const WINS_TO_WIN = 5;

type GameMode = "single" | "two-player";

interface LingoGameProps {
  language: Language;
  wordLength: WordLength;
  timerSeconds: number;
  gameMode: GameMode;
  onBack: () => void;
  currentStreak: number;
  bestStreak: number;
  onStreakUpdate: (newCurrent: number, newBest: number) => void;
}

function evaluateGuess(guess: string, target: string): TileStatus[] {
  const result: TileStatus[] = Array(guess.length).fill("absent");
  const targetArr = target.split("");
  const guessArr = guess.split("");

  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = "correct";
      targetArr[i] = "#";
      guessArr[i] = "*";
    }
  }

  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === "*") continue;
    const idx = targetArr.indexOf(guessArr[i]);
    if (idx !== -1) {
      result[i] = "present";
      targetArr[idx] = "#";
    }
  }

  return result;
}

const LingoGame = ({ language, wordLength, timerSeconds, gameMode, onBack, currentStreak, bestStreak, onStreakUpdate }: LingoGameProps) => {
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<TileStatus[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [revealedRow, setRevealedRow] = useState<number | null>(null);
  const [letterStatuses, setLetterStatuses] = useState<Record<string, TileStatus>>({});
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Word suggestion dialog state
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [pendingWord, setPendingWord] = useState("");

  const { player } = usePlayer();

  // Two-player state
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [scores, setScores] = useState([0, 0]);
  const [roundMessage, setRoundMessage] = useState<string | null>(null);
  const [matchOver, setMatchOver] = useState(false);
  const [matchWinner, setMatchWinner] = useState<number | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(timerSeconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timerSeconds, stopTimer]);

  const resumeTimer = useCallback(() => {
    if (timerRef.current) return; // Already running
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startNewRound = useCallback(async () => {
    setIsLoading(true);
    const word = await getRandomWordAsync(language, wordLength);
    setTargetWord(word);
    setCurrentGuess(word[0]);
    setGuesses([]);
    setStatuses([]);
    setGameOver(false);
    setWon(false);
    setShaking(false);
    setRevealedRow(null);
    setLetterStatuses({});
    setRoundMessage(null);
    setIsLoading(false);
    startTimer();
  }, [language, wordLength, startTimer]);

  const startNewMatch = useCallback(async () => {
    setScores([0, 0]);
    setCurrentPlayer(1);
    setMatchOver(false);
    setMatchWinner(null);
    await startNewRound();
  }, [startNewRound]);

  useEffect(() => {
    startNewMatch();
    return () => stopTimer();
  }, [startNewMatch, stopTimer]);

  // Handle timer reaching zero
  useEffect(() => {
    if (timeLeft === 0 && !gameOver) {
      stopTimer();
      setGameOver(true);
      setCurrentGuess("");

      if (gameMode === "single") {
        onStreakUpdate(0, bestStreak);
      }

      if (gameMode === "two-player") {
        const otherPlayer = currentPlayer === 1 ? 2 : 1;
        setRoundMessage(
          language === "nl"
            ? `Tijd is op! Het woord was: ${targetWord.toUpperCase()}. Speler ${otherPlayer} is aan de beurt.`
            : `Time's up! The word was: ${targetWord.toUpperCase()}. Player ${otherPlayer}'s turn.`
        );
      }
    }
  }, [timeLeft, gameOver, gameMode, currentPlayer, language, targetWord, stopTimer, onStreakUpdate, bestStreak]);

  const fireConfetti = useCallback(() => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5 } }), 300);
  }, []);

  const handleRoundEnd = useCallback((playerWon: boolean) => {
    stopTimer();
    setGameOver(true);
    setCurrentGuess("");

    if (playerWon) {
      setWon(true);
      if (gameMode === "single") {
        const newCurrent = currentStreak + 1;
        const newBest = Math.max(bestStreak, newCurrent);
        onStreakUpdate(newCurrent, newBest);
      } else if (gameMode === "two-player") {
        const newScores = [...scores];
        newScores[currentPlayer - 1]++;
        setScores(newScores);

        if (newScores[currentPlayer - 1] >= WINS_TO_WIN) {
          setMatchOver(true);
          setMatchWinner(currentPlayer);
          fireConfetti();
        }
      }
    } else {
      if (gameMode === "single") {
        onStreakUpdate(0, bestStreak);
      }
      if (gameMode === "two-player") {
        const otherPlayer = currentPlayer === 1 ? 2 : 1;
        setRoundMessage(
          language === "nl"
            ? `Het woord was: ${targetWord.toUpperCase()}. Speler ${otherPlayer} is aan de beurt!`
            : `The word was: ${targetWord.toUpperCase()}. Player ${otherPlayer}'s turn!`
        );
      }
    }
  }, [stopTimer, gameMode, currentPlayer, language, targetWord, scores, fireConfetti, currentStreak, bestStreak, onStreakUpdate]);

  const handleInvalidGuess = useCallback((guess: string) => {
    const emptyStatuses: TileStatus[] = Array(wordLength).fill("absent");
    const newGuesses = [...guesses, guess.toLowerCase()];
    const newStatuses = [...statuses, emptyStatuses];

    setGuesses(newGuesses);
    setStatuses(newStatuses);
    setRevealedRow(guesses.length);
    setTimeout(() => setRevealedRow(null), 600);

    if (newGuesses.length >= MAX_GUESSES) {
      handleRoundEnd(false);
    } else {
      setCurrentGuess(targetWord[0]);
    }
  }, [wordLength, guesses, statuses, targetWord, handleRoundEnd]);

  const submitGuess = useCallback(async () => {
    if (currentGuess.length !== wordLength || isSubmitting) {
      if (currentGuess.length !== wordLength) {
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
      }
      return;
    }

    // For Dutch, validate against DB
    if (language === "nl") {
      setIsSubmitting(true);
      const valid = await isValidWordAsync(currentGuess, language, wordLength);
      setIsSubmitting(false);

      if (!valid) {
        // Pause timer while dialog is open
        stopTimer();
        setPendingWord(currentGuess.toLowerCase());
        setSuggestionDialogOpen(true);
        return;
      }
    } else {
      // English: basic validation
      if (!/^[a-z]+$/i.test(currentGuess)) {
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
        toast.error("Invalid word — turn lost!");
        handleInvalidGuess(currentGuess);
        return;
      }
    }

    // Valid word — evaluate
    const guess = currentGuess.toLowerCase();
    const evaluation = evaluateGuess(guess, targetWord);

    const newGuesses = [...guesses, guess];
    const newStatuses = [...statuses, evaluation];
    const rowIndex = guesses.length;

    setGuesses(newGuesses);
    setStatuses(newStatuses);
    setRevealedRow(rowIndex);

    const newLetterStatuses = { ...letterStatuses };
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const current = newLetterStatuses[letter];
      const newStatus = evaluation[i];
      if (newStatus === "correct") {
        newLetterStatuses[letter] = "correct";
      } else if (newStatus === "present" && current !== "correct") {
        newLetterStatuses[letter] = "present";
      } else if (!current) {
        newLetterStatuses[letter] = "absent";
      }
    }
    setLetterStatuses(newLetterStatuses);

    setTimeout(() => setRevealedRow(null), 600);

    if (guess === targetWord) {
      handleRoundEnd(true);
    } else if (newGuesses.length >= MAX_GUESSES) {
      handleRoundEnd(false);
    } else {
      setCurrentGuess(targetWord[0]);
    }
  }, [currentGuess, wordLength, language, targetWord, guesses, statuses, letterStatuses, handleRoundEnd, handleInvalidGuess, isSubmitting, stopTimer]);

  const processGuessAsValid = useCallback((guess: string) => {
    const evaluation = evaluateGuess(guess, targetWord);
    const newGuesses = [...guesses, guess];
    const newStatuses = [...statuses, evaluation];
    const rowIndex = guesses.length;

    setGuesses(newGuesses);
    setStatuses(newStatuses);
    setRevealedRow(rowIndex);

    const newLetterStatuses = { ...letterStatuses };
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const current = newLetterStatuses[letter];
      const newStatus = evaluation[i];
      if (newStatus === "correct") {
        newLetterStatuses[letter] = "correct";
      } else if (newStatus === "present" && current !== "correct") {
        newLetterStatuses[letter] = "present";
      } else if (!current) {
        newLetterStatuses[letter] = "absent";
      }
    }
    setLetterStatuses(newLetterStatuses);

    setTimeout(() => setRevealedRow(null), 600);

    if (guess === targetWord) {
      handleRoundEnd(true);
    } else if (newGuesses.length >= MAX_GUESSES) {
      handleRoundEnd(false);
    } else {
      setCurrentGuess(targetWord[0]);
    }
  }, [targetWord, guesses, statuses, letterStatuses, handleRoundEnd]);

  const handleSuggestionConfirm = useCallback(async () => {
    setSuggestionDialogOpen(false);
    const word = pendingWord;
    const success = await suggestWord(word, wordLength, player?.id);
    if (success) {
      toast.success(language === "nl" ? `"${word.toUpperCase()}" is toegevoegd!` : `"${word.toUpperCase()}" has been added!`);
    }
    // Treat as a valid guess — check letters against target
    processGuessAsValid(word);
    resumeTimer();
  }, [pendingWord, wordLength, player, language, processGuessAsValid, resumeTimer]);

  const handleSuggestionCancel = useCallback(() => {
    setSuggestionDialogOpen(false);
    toast.error(language === "nl" ? "Ongeldig woord — beurt verloren!" : "Invalid word — turn lost!");
    handleInvalidGuess(pendingWord);
    resumeTimer();
  }, [language, pendingWord, handleInvalidGuess, resumeTimer]);

  const handleKey = useCallback(
    (key: string) => {
      if (gameOver || suggestionDialogOpen) return;

      if (key === "Enter") {
        submitGuess();
        return;
      }

      if (key === "Backspace") {
        if (currentGuess.length > 1) {
          setCurrentGuess((prev) => prev.slice(0, -1));
        }
        return;
      }

      if (/^[a-zA-Z]$/.test(key) && currentGuess.length < wordLength) {
        setCurrentGuess((prev) => prev + key.toLowerCase());
      }
    },
    [gameOver, currentGuess, wordLength, submitGuess, suggestionDialogOpen]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      handleKey(e.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleNextAction = () => {
    if (matchOver) {
      startNewMatch();
      return;
    }
    if (gameMode === "two-player") {
      if (won) {
        startNewRound();
      } else {
        setCurrentPlayer((p) => (p === 1 ? 2 : 1));
        startNewRound();
      }
    } else {
      startNewRound();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg font-bold text-muted-foreground animate-pulse">
          {language === "nl" ? "Laden..." : "Loading..."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-lg mx-auto px-2 sm:px-4">
      {/* Word Suggestion Dialog */}
      <WordSuggestionDialog
        open={suggestionDialogOpen}
        word={pendingWord}
        language={language}
        onConfirm={handleSuggestionConfirm}
        onCancel={handleSuggestionCancel}
      />

      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
        >
          ← {language === "nl" ? "Terug" : "Back"}
        </button>
        <div className="flex items-center gap-4">
          {gameMode === "single" && (
            <div className="text-sm font-bold text-muted-foreground">
              🔥 {currentStreak}{bestStreak > 0 && <span className="ml-1 text-xs font-medium">(best: {bestStreak})</span>}
            </div>
          )}
          {gameMode === "two-player" && (
            <div className="text-sm font-bold text-primary">
              {language === "nl" ? `Speler ${currentPlayer}` : `Player ${currentPlayer}`}
              <span className="ml-2 text-muted-foreground font-medium">
                {scores[0]} - {scores[1]}
              </span>
            </div>
          )}
          <div
            className={`text-lg font-extrabold tabular-nums ${
              timeLeft <= 10 ? "text-accent animate-pulse" : "text-foreground"
            }`}
          >
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground font-medium">
        {wordLength} {language === "nl" ? "letters" : "letters"} · {language === "nl" ? "Nederlands" : "English"}
      </div>

      {/* Board */}
      <LingoBoard
        guesses={guesses}
        statuses={statuses}
        currentGuess={currentGuess}
        currentRow={guesses.length}
        wordLength={wordLength}
        maxGuesses={MAX_GUESSES}
        shaking={shaking}
        revealedRow={revealedRow}
      />

      {/* Game Over */}
      {gameOver && (
        <div className="flex flex-col items-center gap-3 animate-bounce-in">
          {matchOver && matchWinner ? (
            <div className="text-center">
              <p className="text-3xl font-extrabold text-tile-correct">
                🏆🎉{" "}
                {language === "nl"
                  ? `Speler ${matchWinner} wint de match!`
                  : `Player ${matchWinner} wins the match!`}
              </p>
              <p className="text-muted-foreground mt-2 text-lg font-bold">
                {scores[0]} - {scores[1]}
              </p>
            </div>
          ) : won ? (
            <p className="text-2xl font-extrabold text-tile-correct">
              {gameMode === "two-player"
                ? language === "nl"
                  ? `🎉 Speler ${currentPlayer} raadt het!`
                  : `🎉 Player ${currentPlayer} got it!`
                : language === "nl"
                ? "🎉 Gewonnen!"
                : "🎉 You won!"}
            </p>
          ) : (
            <div className="text-center">
              <p className="text-xl font-bold text-accent">
                {language === "nl" ? "Helaas!" : "Too bad!"}
              </p>
              <p className="text-muted-foreground mt-1">
                {roundMessage || (
                  <>
                    {language === "nl" ? "Het woord was:" : "The word was:"}{" "}
                    <span className="font-bold text-foreground uppercase">{targetWord}</span>
                  </>
                )}
              </p>
            </div>
          )}
          <button
            onClick={handleNextAction}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:brightness-110 transition-all active:scale-95"
          >
            {matchOver
              ? language === "nl"
                ? "Nieuwe match"
                : "New match"
              : gameMode === "two-player" && !won
              ? language === "nl"
                ? `Speler ${currentPlayer === 1 ? 2 : 1} →`
                : `Player ${currentPlayer === 1 ? 2 : 1} →`
              : language === "nl"
              ? "Volgende ronde"
              : "Next round"}
          </button>
        </div>
      )}

      {/* Keyboard */}
      {!gameOver && <Keyboard onKey={handleKey} letterStatuses={letterStatuses} />}
    </div>
  );
};

export default LingoGame;
