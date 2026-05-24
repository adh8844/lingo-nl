import { useState } from "react";
import { Share2, Download, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { renderResultImage } from "@/lib/shareImage";
import type { TileStatus } from "@/components/LingoTile";

const GAME_URL = "https://lingo.najra.app";

interface ShareResultButtonProps {
  guesses: string[];
  statuses: TileStatus[][];
  wordLength: number;
  solved: boolean;
  mode: "solo" | "online";
  extra?: {
    attempts?: number;
    opponentName?: string;
    score?: string;
  };
  className?: string;
}

const buildText = (p: ShareResultButtonProps): { title: string; caption: string } => {
  if (p.mode === "online") {
    const opp = p.extra?.opponentName ?? "mijn tegenstander";
    const score = p.extra?.score ? ` (${p.extra.score})` : "";
    return {
      title: `Online overwinning ⚔️${score}`,
      caption: `Ik won mijn DingoLingo wedstrijd tegen ${opp}${score} ⚔️🏆\nSpeel mee op ${GAME_URL}`,
    };
  }
  const attempts = p.extra?.attempts ?? p.guesses.length;
  if (p.solved) {
    return {
      title: `Gekraakt in ${attempts}/5 · ${p.wordLength} letters`,
      caption: `Ik kraakte het DingoLingo woord in ${attempts}/5! 🎯\nSpeel mee op ${GAME_URL}`,
    };
  }
  return {
    title: `${p.wordLength} letters — niet gehaald 💀`,
    caption: `Ik ging onderuit bij DingoLingo 💀 — speel jij beter?\n${GAME_URL}`,
  };
};

const ShareResultButton = (props: ShareResultButtonProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { title, caption } = buildText(props);

  const generate = async () => {
    setLoading(true);
    try {
      const b = await renderResultImage({
        guesses: props.guesses,
        statuses: props.statuses,
        wordLength: props.wordLength,
        title,
      });
      setBlob(b);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(b));
    } catch (e) {
      toast.error("Afbeelding genereren mislukt");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    setOpen(true);
    if (!blob) await generate();
  };

  const handleClose = (next: boolean) => {
    setOpen(next);
    if (!next && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setBlob(null);
    }
  };

  const handleNativeShare = async () => {
    if (!blob) return;
    const file = new File([blob], "dingolingo.png", { type: "image/png" });
    const data: ShareData = { title: "DingoLingo", text: caption, files: [file] };
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(data);
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "DingoLingo", text: caption });
        return;
      }
      throw new Error("no share");
    } catch {
      // user cancelled or unsupported — fall back silently
    }
  };

  const handleDownload = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dingolingo.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Afbeelding gedownload");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success("Tekst gekopieerd");
    } catch {
      toast.error("Kopiëren mislukt");
    }
  };

  const enc = encodeURIComponent(caption);
  const encUrl = encodeURIComponent(GAME_URL);
  const shareLinks = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}&quote=${enc}` },
  ];

  return (
    <>
      <Button
        type="button"
        onClick={handleOpen}
        variant="secondary"
        className={`gap-2 font-bold ${props.className ?? ""}`}
      >
        <Share2 className="w-4 h-4" />
        Deel resultaat
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deel je DingoLingo resultaat</DialogTitle>
            <DialogDescription className="text-xs">
              Download de afbeelding en voeg hem toe aan je post — of gebruik directe deelopties.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center bg-background/50 rounded-lg overflow-hidden border border-border min-h-[200px]">
            {loading && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
            {!loading && previewUrl && (
              <img
                src={previewUrl}
                alt="Resultaat preview"
                className="w-full h-auto"
              />
            )}
          </div>

          <div className="bg-muted/40 rounded-lg p-3 text-sm text-muted-foreground whitespace-pre-line">
            {caption}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button onClick={handleNativeShare} disabled={!blob} className="gap-2 font-bold">
                <Share2 className="w-4 h-4" />
                Delen
              </Button>
            )}
            <Button onClick={handleDownload} disabled={!blob} variant="secondary" className="gap-2 font-bold">
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button onClick={handleCopy} variant="secondary" className="gap-2 font-bold col-span-2">
              <Copy className="w-4 h-4" />
              Kopieer tekst
            </Button>
          </div>

          <div className="flex gap-2 justify-center pt-1">
            {shareLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:brightness-110 transition"
              >
                {l.label}
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShareResultButton;
