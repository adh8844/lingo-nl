import { useState, useEffect, useCallback, useRef } from "react";
import LingoBoard from "./LingoBoard";
import Keyboard from "./Keyboard";
import WordSuggestionDialog from "./WordSuggestionDialog";
import { TileStatus } from "./LingoTile";
import { isValidWordAsync, suggestWord, Language, WordLength } from "@/data/words";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { OnlineMatch, MatchRound } from "@/hooks/useOnlineMatch";
import { playRoundWinSound, playRoundLoseSound } from "@/hooks/useSounds";

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
  onRequestRematch: () => void;
  onDeclineRematch: () => void;
  onForfeit: () => void;
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
  onRequestRematch,
  onDeclineRematch,
  onForfeit,
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
  const [roundTransition, setRoundTransition] = useState<string | null>(null);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRoundRef = useRef<string | null>(null);

  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [pendingWord, setPendingWord] = useState("");

  const isPlayer1 = playerId === match.player1_id;

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const resumeTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
    }, 1000);
  }, []);

  // Reset state when round changes
  useEffect(() => {
    if (!currentRound || currentRound.id === prevRoundRef.current) return;

    const wasPlaying = prevRoundRef.current !== null && !gameOver && !submitted;
    prevRoundRef.current = currentRound.id;

    if (wasPlaying) {
      stopTimer();
      setRoundTransition(language === "nl" ? `${opponentName} was sneller!` : `${opponentName} was faster!`);
      playRoundLoseSound();

      setTimeout(() => {
        setRoundTransition(null);
        resetBoard(currentRound);
      }, 1500);
    } else {
      resetBoard(currentRound);
    }
  }, [currentRound?.id]);

  const resetBoard = useCallback((round: MatchRound) => {
    setGuesses([]);
    setStatuses([]);
    setCurrentGuess(round.word[0] || "");
    setGameOver(false);
    setWon(false);
    setShaking(false);
    setRevealedRow(null);
    setLetterStatuses({});
    setTimeLeft(match.timer_seconds);
    setSubmitted(false);
    setSuggestionDialogOpen(false);
    setPendingWord("");

    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
    }, 1000);
  }, [match.timer_seconds, stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  useEffect(() => {
    if (timeLeft === 0 && !gameOver && !submitted) {
      stopTimer();
      setGameOver(true);
      setSubmitted(true);
      onSubmitFailed();
    }
  }, [timeLeft, gameOver, submitted, onSubmitFailed, stopTimer]);

  // Check match finished
  useEffect(() => {
    if (match.status === "finished" && match.winner_id) {
      stopTimer();
      if (match.winner_id === playerId && !match.forfeited_by) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
    }
  }, [match.status, match.winner_id, playerId, stopTimer]);

  const processGuess = useCallback((guess: string) => {
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
      const ns = evaluation[i];
      if (ns === "correct") newLetterStatuses[letter] = "correct";
      else if (ns === "present" && current !== "correct") newLetterStatuses[letter] = "present";
      else if (!current) newLetterStatuses[letter] = "absent";
    }
    setLetterStatuses(newLetterStatuses);
    setTimeout(() => setRevealedRow(null), 600);

    if (guess === word) {
      stopTimer();
      setGameOver(true);
      setWon(true);
      setSubmitted(true);
      playRoundWinSound();
      const guessTimeMs = roundStartTime ? Date.now() - roundStartTime : 0;
      onSubmitGuessTime(guessTimeMs);
    } else if (newGuesses.length >= MAX_GUESSES) {
      stopTimer();
      setGameOver(true);
      setSubmitted(true);
      onSubmitFailed();
    } else {
      setCurrentGuess(word[0]);
    }
  }, [word, guesses, statuses, letterStatuses, roundStartTime, onSubmitGuessTime, onSubmitFailed, stopTimer]);

  const handleInvalidGuess = useCallback((guess: string) => {
    const emptyStatuses: TileStatus[] = Array(wordLength).fill("absent");
    const newGuesses = [...guesses, guess.toLowerCase()];
    const newStatuses = [...statuses, emptyStatuses];
    setGuesses(newGuesses);
    setStatuses(newStatuses);
    setRevealedRow(guesses.length);
    setTimeout(() => setRevealedRow(null), 600);

    if (newGuesses.length >= MAX_GUESSES) {
      stopTimer();
      setGameOver(true);
      setSubmitted(true);
      onSubmitFailed();
    } else {
      setCurrentGuess(word[0]);
    }
  }, [wordLength, guesses, statuses, word, stopTimer, onSubmitFailed]);

  const submitGuess = useCallback(async () => {
    if (currentGuess.length !== wordLength || submitted) return;

    if (language === "nl") {
      const valid = await isValidWordAsync(currentGuess, language, wordLength);
      if (!valid) {
        stopTimer();
        setPendingWord(currentGuess.toLowerCase());
        setSuggestionDialogOpen(true);
        return;
      }
    }

    processGuess(currentGuess.toLowerCase());
  }, [currentGuess, wordLength, language, submitted, processGuess, stopTimer]);

  const handleSuggestionConfirm = useCallback(async () => {
    setSuggestionDialogOpen(false);
    const w = pendingWord;
    const result = await suggestWord(w, wordLength, playerId);
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
    processGuess(w);
    resumeTimer();
  }, [pendingWord, wordLength, playerId, processGuess, resumeTimer]);

  const handleSuggestionCancel = useCallback(() => {
    setSuggestionDialogOpen(false);
    toast.error(language === "nl" ? "Ongeldig woord — beurt verloren!" : "Invalid word — turn lost!");
    handleInvalidGuess(pendingWord);
    resumeTimer();
  }, [language, pendingWord, handleInvalidGuess, resumeTimer]);

  const handleKey = useCallback((key: string) => {
    if (gameOver || submitted || suggestionDialogOpen || roundTransition || showForfeitConfirm) return;

    if (key === "Enter") { submitGuess(); return; }
    if (key === "Backspace") {
      if (currentGuess.length > 1) setCurrentGuess(prev => prev.slice(0, -1));
      return;
    }
    if (/^[a-zA-Z]$/.test(key) && currentGuess.length < wordLength) {
      setCurrentGuess(prev => prev + key.toLowerCase());
    }
  }, [gameOver, submitted, currentGuess, wordLength, submitGuess, suggestionDialogOpen, roundTransition, showForfeitConfirm]);

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

  const handleLeaveClick = () => {
    if (match.status === "finished") {
      onLeave();
      return;
    }
    setShowForfeitConfirm(true);
  };

  const handleConfirmForfeit = () => {
    setShowForfeitConfirm(false);
    onForfeit();
  };

  // Match finished - show result
  if (match.status === "finished") {
    const isWinner = match.winner_id === playerId;
    const wasForfeit = !!match.forfeited_by;
    const iForfeited = match.forfeited_by === playerId;
    const m = match as any;
    const myRematch = isPlayer1 ? m.rematch_player1 : m.rematch_player2;
    const opRematch = isPlayer1 ? m.rematch_player2 : m.rematch_player1;

    // Opponent declined rematch
    if (opRematch === false) {
      return (
        <div className="flex flex-col items-center gap-4 py-8 animate-bounce-in">
          <p className="text-2xl font-extrabold text-foreground">{isWinner ? "🏆🎉" : "😔"}</p>
          <p className="text-xl font-extrabold text-foreground">
            {language === "nl" ? `${opponentName} wil niet opnieuw spelen` : `${opponentName} doesn't want a rematch`}
          </p>
          <button onClick={onLeave} className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:brightness-110 transition-all">
            {language === "nl" ? "Terug naar Rankings" : "Back to Rankings"}
          </button>
        </div>
      );
    }

    // Waiting for opponent
    if (myRematch === true && opRematch !== true) {
      return (
        <div className="flex flex-col items-center gap-4 py-8 animate-bounce-in">
          <p className="text-2xl font-extrabold">{isWinner ? "🏆🎉" : "😔"}</p>
          <p className="text-xl font-extrabold text-foreground">
            {match.player1_wins} - {match.player2_wins}
          </p>
          <p className="text-sm text-accent font-bold">{isWinner ? "+10 ⭐" : ""}</p>
          <div className="px-4 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent font-bold text-sm animate-pulse">
            {language === "nl" ? "Wachten op tegenstander..." : "Waiting for opponent..."}
          </div>
        </div>
      );
    }

    // Both agreed
    if (myRematch === true && opRematch === true) {
      return (
        <div className="flex flex-col items-center gap-4 py-8 animate-bounce-in">
          <div className="text-lg font-bold text-muted-foreground animate-pulse">
            {language === "nl" ? "Nieuwe match starten..." : "Starting new match..."}
          </div>
        </div>
      );
    }

    // Show result + rematch buttons
    return (
      <div className="flex flex-col items-center gap-4 py-8 animate-bounce-in">
        <p className="text-3xl font-extrabold">{isWinner ? "🏆🎉" : "😔"}</p>
        <p className="text-2xl font-extrabold text-foreground">
          {wasForfeit
            ? iForfeited
              ? language === "nl" ? "Je hebt opgegeven" : "You forfeited"
              : language === "nl" ? `${opponentName} heeft opgegeven` : `${opponentName} forfeited`
            : isWinner
              ? language === "nl" ? "Je hebt gewonnen!" : "You won!"
              : language === "nl" ? `${opponentName} wint!` : `${opponentName} wins!`}
        </p>
        <p className="text-lg font-bold text-muted-foreground">
          {match.player1_wins} - {match.player2_wins}
        </p>
        {isWinner && (
          <p className="text-sm text-accent font-bold">+10 ⭐</p>
        )}
        {!isWinner && wasForfeit && (
          <p className="text-sm text-muted-foreground font-bold">
            {language === "nl" ? `${opponentName} ontvangt +10 ⭐` : `${opponentName} receives +10 ⭐`}
          </p>
        )}
        {isWinner && wasForfeit && !iForfeited && (
          <p className="text-sm text-accent font-bold">
            {language === "nl" ? "Tegenstander heeft opgegeven — jij ontvangt +10 ⭐" : "Opponent forfeited — you receive +10 ⭐"}
          </p>
        )}

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { setRematchRequested(true); onRequestRematch(); }}
            disabled={rematchRequested}
            className="px-6 py-2.5 bg-accent text-accent-foreground font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
          >
            {language === "nl" ? "⚔️ Opnieuw spelen" : "⚔️ Play again"}
          </button>
          <button
            onClick={() => { onDeclineRematch(); onLeave(); }}
            className="px-6 py-2.5 bg-secondary text-secondary-foreground font-bold rounded-lg hover:brightness-110 transition-all"
          >
            {language === "nl" ? "Terug" : "Back"}
          </button>
        </div>
      </div>
    );
  }

  // Forfeit confirmation dialog
  if (showForfeitConfirm) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 animate-bounce-in">
        <p className="text-xl font-extrabold text-foreground">
          {language === "nl" ? "Wil je dit spel beëindigen?" : "Do you want to end this game?"}
        </p>
        <p className="text-sm text-muted-foreground">
          {language === "nl"
            ? `${opponentName} ontvangt 10 punten als je stopt.`
            : `${opponentName} will receive 10 points if you quit.`}
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={handleConfirmForfeit}
            className="px-6 py-2.5 bg-destructive text-destructive-foreground font-bold rounded-lg hover:brightness-110 transition-all"
          >
            {language === "nl" ? "Ja, stoppen" : "Yes, quit"}
          </button>
          <button
            onClick={() => setShowForfeitConfirm(false)}
            className="px-6 py-2.5 bg-secondary text-secondary-foreground font-bold rounded-lg hover:brightness-110 transition-all"
          >
            {language === "nl" ? "Nee, doorgaan" : "No, continue"}
          </button>
        </div>
      </div>
    );
  }

  // Round transition overlay
  if (roundTransition) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 animate-bounce-in">
        <p className="text-xl font-extrabold text-accent">{roundTransition}</p>
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          {language === "nl" ? "Volgende ronde..." : "Next round..."}
        </p>
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
          onClick={handleLeaveClick}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
        >
          ← {language === "nl" ? "Terug" : "Back"}
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

      {gameOver && submitted && (
        <div className="px-4 py-2 rounded-lg bg-tile-correct/10 border border-tile-correct/20 text-tile-correct font-bold text-sm">
          {won
            ? language === "nl" ? "✓ Geraden! Volgende ronde..." : "✓ Guessed! Next round..."
            : language === "nl" ? `Het woord was: ${word.toUpperCase()}` : `The word was: ${word.toUpperCase()}`}
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

      {!gameOver && !submitted && !suggestionDialogOpen && <Keyboard onKey={handleKey} letterStatuses={letterStatuses} />}
    </div>
  );
};

export default OnlineGame;
