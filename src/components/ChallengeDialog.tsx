import { useState } from "react";
import { toast } from "sonner";
import { WordLength } from "@/data/words";

interface ChallengeDialogProps {
  targetId: string;
  targetName: string;
  onSend: (playerId: string, timer: number, wordLength: number, language: string) => Promise<any>;
  onClose: () => void;
}

const TIMER_OPTIONS = [30, 60, 90, 120];

const ChallengeDialog = ({ targetId, targetName, onSend, onClose }: ChallengeDialogProps) => {
  const [timer, setTimer] = useState(60);
  const [wordLength, setWordLength] = useState<WordLength>(5);
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    const res = await onSend(targetId, timer, wordLength, "nl");
    setSending(false);
    if (res) {
      toast.success("Uitdaging verstuurd!");
      onClose();
    } else {
      toast.error("Kon uitdaging niet versturen");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-card border border-border p-4 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-xs text-muted-foreground">Uitdagen</p>
          <p className="font-extrabold text-foreground" translate="no">{targetName}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium w-14">Timer:</span>
          <div className="flex gap-1 flex-wrap">
            {TIMER_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTimer(t)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  timer === t ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium w-14">Letters:</span>
          <div className="flex gap-1">
            {([4, 5, 6] as WordLength[]).map((l) => (
              <button
                key={l}
                onClick={() => setWordLength(l)}
                className={`w-8 h-8 rounded text-xs font-bold transition-all ${
                  wordLength === l ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm"
          >
            Annuleren
          </button>
          <button
            onClick={send}
            disabled={sending}
            className="flex-1 px-3 py-2 rounded-lg bg-accent text-accent-foreground font-bold text-sm disabled:opacity-50"
          >
            {sending ? "..." : "⚔️ Verstuur"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeDialog;
