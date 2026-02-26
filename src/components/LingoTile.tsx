import { cn } from "@/lib/utils";

export type TileStatus = "empty" | "filled" | "correct" | "present" | "absent";

interface LingoTileProps {
  letter: string;
  status: TileStatus;
  delay?: number;
  revealed?: boolean;
  size?: "sm" | "md";
}

const LingoTile = ({ letter, status, delay = 0, revealed = false, size = "md" }: LingoTileProps) => {
  const sizeClasses = size === "sm" 
    ? "w-10 h-10 text-lg" 
    : "w-12 h-12 sm:w-14 sm:h-14 text-xl sm:text-2xl";

  return (
    <div
      className={cn(
        sizeClasses,
        "flex items-center justify-center rounded-lg font-extrabold uppercase select-none transition-colors duration-300 border-2",
        status === "empty" && "bg-tile-empty border-secondary",
        status === "filled" && "bg-tile-filled border-muted-foreground/40 animate-pop",
        status === "correct" && "bg-tile-correct border-tile-correct text-primary-foreground",
        status === "present" && "bg-tile-present border-tile-present text-primary-foreground",
        status === "absent" && "bg-tile-absent border-tile-absent text-muted-foreground",
        revealed && "animate-flip"
      )}
      style={{ animationDelay: revealed ? `${delay}ms` : undefined }}
    >
      {letter}
    </div>
  );
};

export default LingoTile;
