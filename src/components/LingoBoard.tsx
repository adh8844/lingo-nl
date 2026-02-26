import LingoTile, { TileStatus } from "./LingoTile";

interface LingoBoardProps {
  guesses: string[];
  statuses: TileStatus[][];
  currentGuess: string;
  currentRow: number;
  wordLength: number;
  maxGuesses: number;
  shaking: boolean;
  revealedRow: number | null;
}

const LingoBoard = ({
  guesses,
  statuses,
  currentGuess,
  currentRow,
  wordLength,
  maxGuesses,
  shaking,
  revealedRow,
}: LingoBoardProps) => {
  const rows = [];

  for (let i = 0; i < maxGuesses; i++) {
    const cells = [];
    for (let j = 0; j < wordLength; j++) {
      let letter = "";
      let status: TileStatus = "empty";

      if (i < guesses.length) {
        letter = guesses[i][j] || "";
        status = statuses[i]?.[j] || "absent";
      } else if (i === currentRow) {
        letter = currentGuess[j] || "";
        status = letter ? "filled" : "empty";
      }

      cells.push(
        <LingoTile
          key={`${i}-${j}`}
          letter={letter}
          status={status}
          delay={j * 100}
          revealed={revealedRow === i}
        />
      );
    }

    rows.push(
      <div
        key={i}
        className={`flex gap-1.5 ${i === currentRow && shaking ? "animate-shake" : ""}`}
      >
        {cells}
      </div>
    );
  }

  return <div className="flex flex-col gap-1.5">{rows}</div>;
};

export default LingoBoard;
