import { useState } from "react";
import { ChevronDown, Star } from "lucide-react";
import type { GameResultData } from "@/hooks/useGameResult";

interface PointsBreakdownCardProps {
  gameResult: Pick<GameResultData, "points_earned" | "points_breakdown">;
}

const PointsBreakdownCard = ({ gameResult }: PointsBreakdownCardProps) => {
  const [open, setOpen] = useState(false);
  const total = gameResult.points_earned;
  const totalClass = total >= 0 ? "text-primary" : "text-accent";
  const sign = total >= 0 ? "+" : "";

  return (
    <div className="w-full max-w-xs bg-card rounded-xl border border-border p-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex justify-between items-center text-sm font-extrabold focus:outline-none"
      >
        <span className="flex items-center gap-1.5">
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
          Totaal
        </span>
        <span className={totalClass}>
          {sign}
          {total} <Star className="inline w-3 h-3" />
        </span>
      </button>

      {open && gameResult.points_breakdown && gameResult.points_breakdown.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border space-y-1.5">
          {gameResult.points_breakdown.map((p, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{p.reason}</span>
              <span className={`font-bold ${p.points >= 0 ? "text-primary" : "text-accent"}`}>
                {p.points >= 0 ? "+" : ""}
                {p.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PointsBreakdownCard;
