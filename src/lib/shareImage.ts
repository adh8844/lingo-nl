import type { TileStatus } from "@/components/LingoTile";
import dingoSrc from "@/assets/dingo-final-zittend-cool.png";

const MAX_ROWS = 5;

// Match the app's CSS tokens (src/index.css)
const COLORS = {
  bg: "hsl(230, 25%, 12%)",
  card: "hsl(230, 20%, 18%)",
  primary: "hsl(45, 100%, 55%)",
  foreground: "hsl(45, 100%, 96%)",
  muted: "hsl(230, 10%, 55%)",
  tileEmpty: "hsl(230, 20%, 20%)",
  tileEmptyBorder: "hsl(230, 20%, 24%)",
  tileCorrect: "hsl(145, 65%, 42%)",
  tilePresent: "hsl(45, 100%, 55%)",
  tileAbsent: "hsl(230, 15%, 28%)",
  tileText: "hsl(230, 25%, 12%)",
  tileAbsentText: "hsl(230, 10%, 70%)",
};

let dingoImg: HTMLImageElement | null = null;
const loadDingo = (): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    if (dingoImg && dingoImg.complete) return resolve(dingoImg);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      dingoImg = img;
      resolve(img);
    };
    img.onerror = reject;
    img.src = dingoSrc;
  });

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface RenderResultOptions {
  guesses: string[];
  statuses: TileStatus[][];
  wordLength: number;
  title: string;
  subtitle?: string;
}

export async function renderResultImage(opts: RenderResultOptions): Promise<Blob> {
  const { guesses, statuses, wordLength, title, subtitle } = opts;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = 720;
  const TILE = 84;
  const GAP = 10;
  const boardW = wordLength * TILE + (wordLength - 1) * GAP;
  const padX = 60;
  const headerH = 200;
  const boardH = MAX_ROWS * TILE + (MAX_ROWS - 1) * GAP;
  const footerH = 140;
  const H = headerH + boardH + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, COLORS.bg);
  grad.addColorStop(1, "hsl(230, 25%, 9%)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle card frame
  ctx.fillStyle = "hsla(45, 100%, 55%, 0.04)";
  roundRect(ctx, 24, 24, W - 48, H - 48, 24);
  ctx.fill();

  // Header: mascot + wordmark
  try {
    const dingo = await loadDingo();
    const dSize = 110;
    ctx.drawImage(dingo, padX, 50, dSize, dSize);
  } catch {
    /* ignore missing mascot */
  }

  ctx.fillStyle = COLORS.primary;
  ctx.font = "900 56px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("DingoLingo", padX + 130, 60);

  ctx.fillStyle = COLORS.muted;
  ctx.font = "600 22px system-ui, -apple-system, sans-serif";
  ctx.fillText(title, padX + 130, 128);

  // Board (centered)
  const boardX = (W - boardW) / 2;
  const boardY = headerH;

  ctx.font = `900 ${Math.floor(TILE * 0.5)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let r = 0; r < MAX_ROWS; r++) {
    const guess = guesses[r] ?? "";
    const rowStatuses = statuses[r];
    for (let c = 0; c < wordLength; c++) {
      const x = boardX + c * (TILE + GAP);
      const y = boardY + r * (TILE + GAP);
      const letter = guess[c]?.toUpperCase() ?? "";
      const status: TileStatus = rowStatuses?.[c] ?? "empty";

      let fill = COLORS.tileEmpty;
      let stroke = COLORS.tileEmptyBorder;
      let textColor = COLORS.foreground;
      if (status === "correct") {
        fill = COLORS.tileCorrect;
        stroke = COLORS.tileCorrect;
        textColor = COLORS.tileText;
      } else if (status === "present") {
        fill = COLORS.tilePresent;
        stroke = COLORS.tilePresent;
        textColor = COLORS.tileText;
      } else if (status === "absent") {
        fill = COLORS.tileAbsent;
        stroke = COLORS.tileAbsent;
        textColor = COLORS.tileAbsentText;
      }

      // Tile shadow
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = fill;
      roundRect(ctx, x, y, TILE, TILE, 12);
      ctx.fill();
      ctx.restore();

      ctx.lineWidth = 3;
      ctx.strokeStyle = stroke;
      roundRect(ctx, x, y, TILE, TILE, 12);
      ctx.stroke();

      if (letter) {
        ctx.fillStyle = textColor;
        ctx.fillText(letter, x + TILE / 2, y + TILE / 2 + 2);
      }
    }
  }

  // Footer
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (subtitle) {
    ctx.fillStyle = COLORS.foreground;
    ctx.font = "700 24px system-ui, -apple-system, sans-serif";
    ctx.fillText(subtitle, W / 2, headerH + boardH + 52);
  }

  ctx.fillStyle = COLORS.primary;
  ctx.font = "800 26px system-ui, -apple-system, sans-serif";
  ctx.fillText("lingo.najra.app", W / 2, H - 38);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}
