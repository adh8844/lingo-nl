import { cn } from "@/lib/utils";
import { TileStatus } from "./LingoTile";
import { Delete } from "lucide-react";

interface KeyboardProps {
  onKey: (key: string) => void;
  letterStatuses: Record<string, TileStatus>;
}

const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["Enter", "z", "x", "c", "v", "b", "n", "m", "⌫"],
];

const Keyboard = ({ onKey, letterStatuses }: KeyboardProps) => {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {ROWS.map((row, i) => (
        <div key={i} className="flex gap-1">
          {row.map((key) => {
            const status = letterStatuses[key];
            const isSpecial = key === "Enter" || key === "⌫";

            return (
              <button
                key={key}
                onClick={() => onKey(key === "⌫" ? "Backspace" : key)}
                className={cn(
                  "flex items-center justify-center rounded-md font-bold uppercase transition-all duration-150 active:scale-95",
                  isSpecial ? "px-3 sm:px-4 h-12 text-xs sm:text-sm" : "w-8 sm:w-10 h-12 text-sm sm:text-base",
                  !status && "bg-secondary text-secondary-foreground hover:brightness-110",
                  status === "correct" && "bg-tile-correct text-primary-foreground",
                  status === "present" && "bg-tile-present text-primary-foreground",
                  status === "absent" && "bg-tile-absent text-muted-foreground",
                )}
              >
                {key === "⌫" ? <Delete className="w-5 h-5" /> : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Keyboard;
