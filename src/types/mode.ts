// Game modes for DingoLingo educatieve rebrand.
//
// - "leren":     geen timer, geen snelheidsbonus, vriendelijke woordenpool (default voor leerlingen)
// - "oefenen":   180s timer, gevorderde pool
// - "klassiek":  90s timer, volledige pool (oude standaardspel)
// - "uitdaging": 60s timer, inclusief moeilijkere woorden
export type GameMode = "leren" | "oefenen" | "klassiek" | "uitdaging";

export const MODE_TIMER: Record<GameMode, number | null> = {
  leren: null,
  oefenen: 180,
  klassiek: 90,
  uitdaging: 60,
};

export const MODE_LABEL: Record<GameMode, string> = {
  leren: "Leren",
  oefenen: "Oefenen",
  klassiek: "Klassiek",
  uitdaging: "Uitdaging",
};

export const MODE_DESCRIPTION: Record<GameMode, string> = {
  leren: "Geen tijdsdruk. Vriendelijke woorden om mee te starten.",
  oefenen: "3 minuten per ronde. Bouw rustig je woordenschat op.",
  klassiek: "90 seconden. Het klassieke Lingo-spel.",
  uitdaging: "60 seconden. Inclusief lastigere woorden.",
};

export const DEFAULT_MODE: GameMode = "leren";
