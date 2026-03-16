import { useState, useEffect, useCallback, useRef } from "react";
import LingoBoard from "./LingoBoard";
import Keyboard from "./Keyboard";
import { TileStatus } from "./LingoTile";
import { isValidWordAsync, Language, WordLength } from "@/data/words";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { OnlineMatch, MatchRound } from "@/hooks/useOnlineMatch";

const MAX_GUESSES = 5;
const WINS_TO_WIN = 5;

interface OnlineGameProps {
  match: OnlineMatch;
  currentRound: MatchRound | null;
  roundStartTime: number | null;
  playerId: string;
  opponentName: string;
  onSubmitGuessTime: (timeMs: number) => void;
  onSubmitFailed: () => void;
  onLeave: () => void;
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

const OnlineGame = ({
  match,
  currentRound,
  roundStartTime,
  playerId,
  opponentName,
  onSubmitGuessTime,
  onSubmitFailed,
  onLeave,
}: OnlineGameProps) => {
  const language = match.language as Language;
  const wordLength = match.word_length as WordLength;
  const word = currentRound?.word || "";

  const [guesses, setGuesses] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<TileStatus[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [revealedRow, setRevealedRow] = useState<number | null>(null);
  const [letterStatuses, setLetterStatuses] = useState<Record<string, TileStatus>>({});
  const [timeLeft, setTimeLeft] = useState(match.timer_seconds);
  const [submitted, setSubmitted] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRoundRef = useRef<string | null>(null);

  const isPlayer1 = playerId === match.player1_id;

  // Reset state when round changes
  useEffect(() => {
    if (!currentRound || currentRound.id === prevRoundRef.current) return;
    prevRoundRef.current = currentRound.id;

    setGuesses([]);
    setStatuses([]);
    setCurrentGuess(currentRound.word[0] || "");
    setGameOver(false);
    setWon(false);
    setShaking(false);
    setRevealedRow(null);
    setLetterStatuses({});
    setTimeLeft(match.timer_seconds);
    setSubmitted(false);
    setWaitingForOpponent(false);

    // Start timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
  }, [currentRound?.id, match.timer_seconds]);

  // Cleanup timer
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Timer expiry
  useEffect(() => {
    if (timeLeft === 0 && !gameOver && !submitted) {
      if (timerRef.current) clearInterval(timerRef.current);
      setGameOver(true);
      setSubmitted(true);
      onSubmitFailed();
      setWaitingForOpponent(true);
    }
  }, [timeLeft, gameOver, submitted, onSubmitFailed]);

  // Check if round is finished (opponent also submitted)
  useEffect(() => {
    if (!currentRound) return;
    const myTime = isPlayer1 ? currentRound.player1_guess_time_ms : currentRound.player2_guess_time_ms;
    const opTime = isPlayer1 ? currentRound.player2_guess_time_ms : currentRound.player1_guess_time_ms;

    if (myTime !== null && opTime !== null && currentRound.status === "finished") {
      setWaitingForOpponent(false);
    }
  }, [currentRound, isPlayer1]);

  // Check match finished
  useEffect(() => {
    if (match.status === "finished" && match.winner_id) {
      if (match.winner_id === playerId) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
    }
  }, [match.status, match.winner_id, playerId]);

  const submitGuess = useCallback(async () => {
    if (currentGuess.length !== wordLength || submitted) return;

    // Validate word
    if (language === "nl") {
      const valid = await isValidWordAsync(currentGuess, language, wordLength);
      if (!valid) {
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
        toast.error(language === "nl" ? "Ongeldig woord!" : "Invalid word!");
        return;
      }
    }

    const guess = currentGuess.toLowerCase();
    const evaluation = evaluateGuess(guess, word);

    const newGuesses = [...guesses, guess];
    const newStatuses = [...statuses, evaluation];
    setGuesses(newGuesses);
    setStatuses(newStatuses);
    setRevealedRow(guesses.length);

    const newLetterStatuses = { ...letterStatuses };
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const current = newLetterStatuses[letter];
      const newStatus = evaluation[i];
      if (newStatus === "correct") newLetterStatuses[letter] = "correct";
      else if (newStatus === "present" && current !== "correct") newLetterStatuses[letter] = "present";
      else if (!current) newLetterStatuses[letter] = "absent";
    }
    setLetterStatuses(newLetterStatuses);
    setTimeout(() => setRevealedRow(null), 600);

    if (guess === word) {
      // Won this round!
      if (timerRef.current) clearInterval(timerRef.current);
      setGameOver(true);
      setWon(true);
      setSubmitted(true);

      const guessTimeMs = roundStartTime ? Date.now() - roundStartTime : 0;
      onSubmitGuessTime(guessTimeMs);
      setWaitingForOpponent(true);
    } else if (newGuesses.length >= MAX_GUESSES) {
      // Used all guesses
      if (timerRef.current) clearInterval(timerRef.current);
      setGameOver(true);
      setSubmitted(true);
      onSubmitFailed();
      setWaitingForOpponent(true);
    } else {
      setCurrentGuess(word[0]);
    }
  }, [currentGuess, wordLength, language, word, guesses, statuses, letterStatuses, roundStartTime, onSubmitGuessTime, onSubmitFailed, submitted]);

  const handleKey = useCallback((key: string) => {
    if (gameOver || submitted) return;

    if (key === "Enter") {
      submitGuess();
      return;
    }
    if (key === "Backspace") {
      if (currentGuess.length > 1) {
        setCurrentGuess(prev => prev.slice(0, -1));
      }
      return;
    }
    if (/^[a-zA-Z]$/.test(key) && currentGuess.length < wordLength) {
      setCurrentGuess(prev => prev + key.toLowerCase());
    }
  }, [gameOver, submitted, currentGuess, wordLength, submitGuess]);

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

  if (match.status === "finished") {
    const isWinner = match.winner_id === playerId;
    return (
      <div className="flex flex-col items-center gap-4 py-8 animate-bounce-in">
        <p className="text-3xl font-extrabold">
          {isWinner ? "🏆🎉" : "😔"}
        </p>
        <p className="text-2xl font-extrabold text-foreground">
          {isWinner
            ? language === "nl" ? "Je hebt gewonnen!" : "You won!"
            : language === "nl" ? `${opponentName} wint!` : `${opponentName} wins!`}
        </p>
        <p className="text-lg font-bold text-muted-foreground">
          {match.player1_wins} - {match.player2_wins}
        </p>
        <p className="text-sm text-accent font-bold">
          {isWinner ? "+10 ⭐" : ""}
        </p>
        <button
          onClick={onLeave}
          className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:brightness-110 transition-all"
        >
          {language === "nl" ? "Terug" : "Back"}
        </button>
      </div>
    );
  }

  if (!currentRound || !word) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg font-bold text-muted-foreground animate-pulse">
          {language === "nl" ? "Wachten op ronde..." : "Waiting for round..."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-lg mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <button
          onClick={onLeave}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
        >
          ← {language === "nl" ? "Verlaat" : "Leave"}
        </button>
        <div className="flex items-center gap-4">
          <div className="text-sm font-bold text-primary">
            vs {opponentName}
            <span className="ml-2 text-muted-foreground font-medium">
              {match.player1_wins} - {match.player2_wins}
            </span>
          </div>
          <div className={`text-lg font-extrabold tabular-nums ${timeLeft <= 10 ? "text-accent animate-pulse" : "text-foreground"}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground font-medium">
        {language === "nl" ? `Ronde ${match.current_round}` : `Round ${match.current_round}`} · {wordLength} {language === "nl" ? "letters" : "letters"}
      </div>

      {waitingForOpponent && (
        <div className="px-4 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent font-bold text-sm animate-pulse">
          {language === "nl" ? "Wachten op tegenstander..." : "Waiting for opponent..."}
        </div>
      )}

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

      {gameOver && !waitingForOpponent && (
        <div className="flex flex-col items-center gap-2 animate-bounce-in">
          {won ? (
            <p className="text-xl font-extrabold text-tile-correct">
              {language === "nl" ? "✓ Geraden!" : "✓ Guessed!"}
            </p>
          ) : (
            <p className="text-xl font-bold text-accent">
              {language === "nl" ? `Het woord was: ${word.toUpperCase()}` : `The word was: ${word.toUpperCase()}`}
            </p>
          )}
        </div>
      )}

      {!gameOver && !submitted && <Keyboard onKey={handleKey} letterStatuses={letterStatuses} />}
    </div>
  );
};

export default OnlineGame;
