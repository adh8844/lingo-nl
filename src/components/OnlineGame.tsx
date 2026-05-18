import { useState, useEffect, useCallback, useRef, ChangeEvent } from "react";
import LingoBoard from "./LingoBoard";
import Keyboard from "./Keyboard";
import WordSuggestionDialog from "./WordSuggestionDialog";
import { TileStatus } from "./LingoTile";
import { isValidWordAsync, suggestWord, rejectWordSuggestion, Language, WordLength } from "@/data/words";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import WinAnimation from "./WinAnimation";
import { OnlineMatch, MatchRound } from "@/hooks/useOnlineMatch";
import { playRoundWinSound, playRoundLoseSound } from "@/hooks/useSounds";
import { supabase } from "@/integrations/supabase/client";

const MAX_GUESSES = 5;
const WINS_TO_WIN = 5;

interface OnlineGameProps {
  match: OnlineMatch;
  currentRound: MatchRound | null;
  roundStartTime: number | null;
  opponentProgress: Record<number, number>;
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
  opponentProgress,
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
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [revealedRow, setRevealedRow] = useState<number | null>(null);
  const [letterStatuses, setLetterStatuses] = useState<Record<string, TileStatus>>({});
  const [timeLeft, setTimeLeft] = useState(match.timer_seconds);
  const [submitted, setSubmitted] = useState(false);
  const [roundTransition, setRoundTransition] = useState<string | null>(null);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  // Snapshot of the just-played round's word, so the reveal banner never leaks
  // the next round's word once `currentRound` updates via realtime.
  const [revealWord, setRevealWord] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRoundRef = useRef<string | null>(null);
  const prevWordRef = useRef<string>("");
  const lossShownForRoundRef = useRef<string | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [pendingWord, setPendingWord] = useState("");

  const isPlayer1 = playerId === match.player1_id;
  // Always show local player's score first ("you - opponent")
  const myWins = isPlayer1 ? match.player1_wins : match.player2_wins;
  const oppWins = isPlayer1 ? match.player2_wins : match.player1_wins;

  // Server-anchored start time: prefer the round's DB created_at so the timer
  // survives tab visibility changes / late realtime subscription.
  const roundServerStart = currentRound?.created_at
    ? new Date(currentRound.created_at).getTime()
    : (roundStartTime ?? null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);


  // Recompute timeLeft from the server-anchored start. Tick frequently so the
  // displayed value stays accurate even after a visibilitychange (browser
  // throttling) — the truth is always (timer_seconds - elapsed_since_start).
  const recomputeTimeLeft = useCallback(() => {
    if (!roundServerStart) return;
    const elapsed = Math.floor((Date.now() - roundServerStart) / 1000);
    const remaining = Math.max(0, match.timer_seconds - elapsed);
    setTimeLeft(remaining);
  }, [roundServerStart, match.timer_seconds]);

  const resumeTimer = useCallback(() => {
    if (timerRef.current) return;
    recomputeTimeLeft();
    timerRef.current = setInterval(recomputeTimeLeft, 500);
  }, [recomputeTimeLeft]);

  // Re-sync on tab visibility change so timer doesn't appear to "reset" when
  // returning to the tab after browser interval throttling.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") recomputeTimeLeft();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [recomputeTimeLeft]);

  // Detect that the current round has finished and we did NOT win → show loss message immediately
  // (so it appears at the same time as the winner's message, not 3s later when next round inserts).
  useEffect(() => {
    if (!currentRound) return;
    if (currentRound.status !== "finished") return;
    if (!currentRound.winner_id || currentRound.winner_id === playerId) return;
    if (lossShownForRoundRef.current === currentRound.id) return;
    lossShownForRoundRef.current = currentRound.id;
    stopTimer();
    setGameOver(true);
    setSubmitted(true);
    setRevealWord(currentRound.word);
    const msg = language === "nl"
      ? `${opponentName} was sneller! Het woord was: ${currentRound.word.toUpperCase()}`
      : `${opponentName} was faster! The word was: ${currentRound.word.toUpperCase()}`;
    setRoundTransition(msg);
    playRoundLoseSound();
    setTimeout(() => setRoundTransition(null), 3000);
  }, [currentRound?.id, currentRound?.status, currentRound?.winner_id, currentRound?.word, playerId, language, opponentName, stopTimer]);

  // Reset state when round changes (new round inserted)
  useEffect(() => {
    if (!currentRound || currentRound.id === prevRoundRef.current) return;

    const isFirstRound = prevRoundRef.current === null;
    prevRoundRef.current = currentRound.id;
    const wordForNext = currentRound.word;

    if (isFirstRound) {
      prevWordRef.current = wordForNext;
      resetBoard(currentRound);
      return;
    }

    // If we haven't shown a transition yet (e.g. both failed, or our loss-effect didn't fire),
    // show the previous word now.
    if (!roundTransition && lossShownForRoundRef.current !== prevRoundRef.current) {
      const prevWord = prevWordRef.current;
      setRevealWord(prevWord);
      const msg = language === "nl"
        ? `Het woord was: ${prevWord.toUpperCase()}`
        : `The word was: ${prevWord.toUpperCase()}`;
      setRoundTransition(msg);
      setTimeout(() => {
        setRoundTransition(null);
        prevWordRef.current = wordForNext;
        resetBoard(currentRound);
      }, 3000);
    } else {
      // Transition already showing — wait briefly then reset
      setTimeout(() => {
        setRoundTransition(null);
        prevWordRef.current = wordForNext;
        resetBoard(currentRound);
      }, 1500);
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
    setRevealWord("");
    setSubmitted(false);
    setSuggestionDialogOpen(false);
    setPendingWord("");

    stopTimer();
    // Anchor timer to the round's server-side created_at so it survives
    // tab hidden / network re-subscribe.
    const startMs = round.created_at ? new Date(round.created_at).getTime() : Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      setTimeLeft(Math.max(0, match.timer_seconds - elapsed));
    };
    tick();
    timerRef.current = setInterval(tick, 500);
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
        setShowWinAnimation(true);
      }
    }
  }, [match.status, match.winner_id, playerId, stopTimer]);

  const writeProgress = useCallback((attemptNumber: number, correctCount: number) => {
    if (!currentRound) return;
    supabase.from("match_round_progress").insert({
      round_id: currentRound.id,
      match_id: match.id,
      player_id: playerId,
      attempt_number: attemptNumber,
      correct_count: correctCount,
    }).then(() => {});
  }, [currentRound, match.id, playerId]);

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

    const correctCount = evaluation.filter(s => s === "correct").length;
    writeProgress(newGuesses.length, correctCount);

    if (guess === word) {
      stopTimer();
      setGameOver(true);
      setWon(true);
      setSubmitted(true);
      playRoundWinSound();
      const guessTimeMs = roundStartTime ? Date.now() - roundStartTime : 0;
      onSubmitGuessTime(guessTimeMs);
      // Show the word to the winner during the 3s gap before next round
      const msg = language === "nl"
        ? `Jij won deze ronde! 🎉 Het woord was: ${word.toUpperCase()}`
        : `You won this round! 🎉 The word was: ${word.toUpperCase()}`;
      setRoundTransition(msg);
      setTimeout(() => setRoundTransition(null), 3000);
    } else if (newGuesses.length >= MAX_GUESSES) {
      stopTimer();
      setGameOver(true);
      setSubmitted(true);
      onSubmitFailed();
    } else {
      setCurrentGuess(word[0]);
    }
  }, [word, guesses, statuses, letterStatuses, roundStartTime, onSubmitGuessTime, onSubmitFailed, stopTimer, writeProgress, language]);

  const handleInvalidGuess = useCallback((guess: string) => {
    const emptyStatuses: TileStatus[] = Array(wordLength).fill("absent");
    const newGuesses = [...guesses, guess.toLowerCase()];
    const newStatuses = [...statuses, emptyStatuses];
    setGuesses(newGuesses);
    setStatuses(newStatuses);
    setRevealedRow(guesses.length);
    setTimeout(() => setRevealedRow(null), 600);

    writeProgress(newGuesses.length, 0);

    if (newGuesses.length >= MAX_GUESSES) {
      stopTimer();
      setGameOver(true);
      setSubmitted(true);
      onSubmitFailed();
    } else {
      setCurrentGuess(word[0]);
    }
  }, [wordLength, guesses, statuses, word, stopTimer, onSubmitFailed, writeProgress]);

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
    const w = pendingWord;
    rejectWordSuggestion(w, wordLength, playerId).catch(() => {});
    toast.error(language === "nl" ? `"${w.toUpperCase()}" is afgewezen — beurt verloren!` : `"${w.toUpperCase()}" rejected — turn lost!`);
    handleInvalidGuess(w);
    resumeTimer();
  }, [language, pendingWord, wordLength, playerId, handleInvalidGuess, resumeTimer]);

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
          <div className="flex flex-col items-center">
            {isWinner && <p className="text-sm text-accent font-bold">+100 bonus ⭐</p>}
            {(() => {
              const myRoundWins = isPlayer1 ? match.player1_wins : match.player2_wins;
              return myRoundWins > 0 ? <p className="text-sm text-accent font-bold">+{myRoundWins * 20} ronde punten</p> : null;
            })()}
          </div>
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
        {(() => {
          const myRoundWins = isPlayer1 ? match.player1_wins : match.player2_wins;
          const roundPts = myRoundWins * 20;
          return (
            <div className="flex flex-col items-center gap-1">
              {isWinner && (
                <p className="text-sm text-accent font-bold">+100 bonus ⭐</p>
              )}
              {roundPts > 0 && (
                <p className="text-sm text-accent font-bold">+{roundPts} ronde punten</p>
              )}
              {isWinner && wasForfeit && !iForfeited && (
                <p className="text-xs text-muted-foreground">
                  {language === "nl" ? "(tegenstander heeft opgegeven)" : "(opponent forfeited)"}
                </p>
              )}
            </div>
          );
        })()}

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
      {showWinAnimation && <WinAnimation onDismiss={() => setShowWinAnimation(false)} />}
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

      <div className="flex items-start gap-2 sm:gap-3">
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
        <div className="flex flex-col gap-1 sm:gap-1.5 pt-0.5" aria-label={language === "nl" ? "Voortgang tegenstander" : "Opponent progress"}>
          {Array.from({ length: MAX_GUESSES }, (_, i) => {
            const attempt = i + 1;
            const correct = opponentProgress?.[attempt];
            const has = typeof correct === "number";
            return (
              <div
                key={i}
                className={`h-9 sm:h-12 min-w-[2rem] px-1.5 flex items-center justify-center rounded-md text-xs font-extrabold border ${
                  has
                    ? "bg-tile-correct/15 border-tile-correct/40 text-tile-correct"
                    : "bg-card/40 border-border/50 text-muted-foreground/40"
                }`}
                title={language === "nl" ? `Tegenstander poging ${attempt}` : `Opponent attempt ${attempt}`}
              >
                {has ? `🟩 ${correct}` : "·"}
              </div>
            );
          })}
        </div>
      </div>

      {!gameOver && !submitted && !suggestionDialogOpen && (
        <>
          <Keyboard onKey={handleKey} letterStatuses={letterStatuses} />
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

export default OnlineGame;
