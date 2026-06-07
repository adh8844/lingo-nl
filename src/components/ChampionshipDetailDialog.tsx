import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ChampionshipDetail {
  id: string;
  display_name: string;
  score: number;
  ranks: {
    points: number;
    streak: number;
    games: number;
    badges: number;
    challenges: number;
  };
  fallback_rank: number;
}

interface Props {
  detail: ChampionshipDetail | null;
  onClose: () => void;
  canView: boolean;
  onOpenProfile: (id: string) => void;
}

const ROWS: { key: keyof ChampionshipDetail["ranks"]; label: string; weight: number }[] = [
  { key: "points", label: "Punten", weight: 1 },
  { key: "streak", label: "Reeks", weight: 2 },
  { key: "games", label: "Spellen", weight: 4 },
  { key: "badges", label: "Badges", weight: 4 },
  { key: "challenges", label: "Uitdagingen", weight: 4 },
];

const ChampionshipDetailDialog = ({ detail, onClose, canView, onOpenProfile }: Props) => {
  if (!detail) return null;

  

  return (
    <Dialog open={!!detail} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <span translate="no">{detail.display_name}</span>
            <span className="text-muted-foreground font-normal text-sm ml-2">
              score {detail.score}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="font-mono text-xs sm:text-sm space-y-1">
          {ROWS.map((r) => {
            const rank = detail.ranks[r.key];
            const isFallback = rank === detail.fallback_rank;
            const product = rank * r.weight;
            return (
              <div key={r.key} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <span className="text-foreground">{r.label}</span>
                <span className={isFallback ? "text-muted-foreground italic" : ""}>
                  plaats {rank}
                  {isFallback ? " *" : ""}
                </span>
                <span className="text-muted-foreground">× {r.weight}</span>
                <span className="font-bold text-right w-8">{product}</span>
              </div>
            );
          })}
          <div className="border-t border-border my-2" />
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <span className="font-bold">Totaal</span>
            <span className="font-bold">
              {detail.score}
            </span>
          </div>

        </div>

        <p className="text-xs text-muted-foreground">
          * fallback-rang ({detail.fallback_rank}): speler heeft in deze categorie nog niets gescoord.
        </p>

        {canView && (
          <button
            onClick={() => onOpenProfile(detail.id)}
            className="mt-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all"
          >
            Profiel openen →
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChampionshipDetailDialog;
