import { useState, useEffect, useCallback } from "react";
import LingoBoard from "./LingoBoard";
import Keyboard from "./Keyboard";
import { TileStatus } from "./LingoTile";
import { getRandomWord, isValidWord, Language, WordLength } from "@/data/words";
import { toast } from "sonner";

const MAX_GUESSES = 5;

interface LingoGameProps {
  language: Language;
  wordLength: WordLength;
  onBack: () => void;
}

function evaluateGuess(guess: string, target: string): TileStatus[] {
  const result: TileStatus[] = Array(guess.length).fill("absent");
  const targetArr = target.split("");
  const guessArr = guess.split("");

  // First pass: correct positions
  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = "correct";
      targetArr[i] = "#";
      guessArr[i] = "*";
    }
  }

  // Second pass: present but wrong position
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

const LingoGame = ({ language, wordLength, onBack }: LingoGameProps) => {
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<TileStatus[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [revealedRow, setRevealedRow] = useState<number | null>(null);
  const [letterStatuses, setLetterStatuses] = useState<Record<string, TileStatus>>({});

  const startNewGame = useCallback(() => {
    const word = getRandomWord(language, wordLength);
    setTargetWord(word);
    // In Lingo, the first letter is revealed
    setCurrentGuess(word[0]);
    setGuesses([]);
    setStatuses([]);
    setGameOver(false);
    setWon(false);
    setShaking(false);
    setRevealedRow(null);
    setLetterStatuses({});
  }, [language, wordLength]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const submitGuess = useCallback(() => {
    if (currentGuess.length !== wordLength) {
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      return;
    }

    if (!isValidWord(currentGuess, language, wordLength)) {
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      toast.error(language === "nl" ? "Ongeldig woord" : "Invalid word");
      return;
    }

    const guess = currentGuess.toLowerCase();
    const evaluation = evaluateGuess(guess, targetWord);

    const newGuesses = [...guesses, guess];
    const newStatuses = [...statuses, evaluation];
    const rowIndex = guesses.length;

    setGuesses(newGuesses);
    setStatuses(newStatuses);
    setRevealedRow(rowIndex);

    // Update keyboard letter statuses
    const newLetterStatuses = { ...letterStatuses };
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const current = newLetterStatuses[letter];
      const newStatus = evaluation[i];
      // Priority: correct > present > absent
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
      setGameOver(true);
      setWon(true);
      setCurrentGuess("");
    } else if (newGuesses.length >= MAX_GUESSES) {
      setGameOver(true);
      setCurrentGuess("");
    } else {
      // In Lingo, first letter is always given
      setCurrentGuess(targetWord[0]);
    }
  }, [currentGuess, wordLength, language, targetWord, guesses, statuses, letterStatuses]);

  const handleKey = useCallback(
    (key: string) => {
      if (gameOver) return;

      if (key === "Enter") {
        submitGuess();
        return;
      }

      if (key === "Backspace") {
        // Don't delete the first letter (it's given)
        if (currentGuess.length > 1) {
          setCurrentGuess((prev) => prev.slice(0, -1));
        }
        return;
      }

      if (/^[a-zA-Z]$/.test(key) && currentGuess.length < wordLength) {
        setCurrentGuess((prev) => prev + key.toLowerCase());
      }
    },
    [gameOver, currentGuess, wordLength, submitGuess]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      handleKey(e.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
        >
          ← {language === "nl" ? "Terug" : "Back"}
        </button>
        <div className="text-sm text-muted-foreground font-medium">
          {wordLength} {language === "nl" ? "letters" : "letters"} · {language === "nl" ? "Nederlands" : "English"}
        </div>
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
          {won ? (
            <p className="text-2xl font-extrabold text-tile-correct">
              {language === "nl" ? "🎉 Gewonnen!" : "🎉 You won!"}
            </p>
          ) : (
            <div className="text-center">
              <p className="text-xl font-bold text-accent">
                {language === "nl" ? "Helaas!" : "Too bad!"}
              </p>
              <p className="text-muted-foreground mt-1">
                {language === "nl" ? "Het woord was:" : "The word was:"}{" "}
                <span className="font-bold text-foreground uppercase">{targetWord}</span>
              </p>
            </div>
          )}
          <button
            onClick={startNewGame}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:brightness-110 transition-all active:scale-95"
          >
            {language === "nl" ? "Opnieuw spelen" : "Play again"}
          </button>
        </div>
      )}

      {/* Keyboard */}
      {!gameOver && <Keyboard onKey={handleKey} letterStatuses={letterStatuses} />}
    </div>
  );
};

export default LingoGame;
