import { useState } from "react";
import { OnlinePlayer } from "@/hooks/usePresence";
import { OnlineChallenge } from "@/hooks/useOnlineMatch";
import { Language, WordLength } from "@/data/words";
import { toast } from "sonner";

interface OnlineLobbyProps {
  playerId: string;
  onlinePlayers: OnlinePlayer[];
  pendingChallenges: OnlineChallenge[];
  onChallenge: (playerId: string, timer: number, wordLength: number, language: string) => Promise<any>;
  onAccept: (challenge: OnlineChallenge) => Promise<any>;
  onDecline: (challengeId: string) => void;
  language: Language;
}

const TIMER_OPTIONS = [30, 60, 90, 120];

const OnlineLobby = ({
  playerId,
  onlinePlayers,
  pendingChallenges,
  onChallenge,
  onAccept,
  onDecline,
  language,
}: OnlineLobbyProps) => {
  const [challengingId, setChallengingId] = useState<string | null>(null);
  const [challengeTimer, setChallengeTimer] = useState(60);
  const [challengeWordLength, setChallengeWordLength] = useState<WordLength>(5);
  const [challengeLang, setChallengeLang] = useState<Language>(language);
  const [sending, setSending] = useState(false);

  const handleSendChallenge = async (targetId: string) => {
    setSending(true);
    const result = await onChallenge(targetId, challengeTimer, challengeWordLength, challengeLang);
    setSending(false);
    if (result) {
      toast.success(language === "nl" ? "Uitdaging verstuurd!" : "Challenge sent!");
      setChallengingId(null);
    } else {
      toast.error(language === "nl" ? "Kon uitdaging niet versturen" : "Could not send challenge");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Pending challenges */}
      {pendingChallenges.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-accent">
            {language === "nl" ? "🎯 Uitdagingen" : "🎯 Challenges"}
          </p>
          {pendingChallenges.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-accent/10 border border-accent/20"
            >
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-sm">
                  {c.challenger_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {c.word_length} {language === "nl" ? "letters" : "letters"} · {c.timer_seconds}s · {c.language === "nl" ? "🇳🇱" : "🇬🇧"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onAccept(c)}
                  className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground font-bold text-xs hover:brightness-110 transition-all"
                >
                  ✓ {language === "nl" ? "Accepteer" : "Accept"}
                </button>
                <button
                  onClick={() => onDecline(c.id)}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-bold text-xs hover:brightness-110 transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Online players */}
      <p className="text-sm font-bold text-muted-foreground">
        🟢 {language === "nl" ? "Online spelers" : "Online players"} ({onlinePlayers.length})
      </p>

      {onlinePlayers.length === 0 ? (
        <p className="text-center text-muted-foreground py-6 text-sm">
          {language === "nl"
            ? "Geen andere spelers online op dit moment"
            : "No other players online right now"}
        </p>
      ) : (
        onlinePlayers.map((p) => (
          <div key={p.player_id}>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground text-sm">{p.display_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">⭐ {p.points} pts</span>
                </div>
              </div>
              <button
                onClick={() => setChallengingId(challengingId === p.player_id ? null : p.player_id)}
                disabled={p.status === "in_game"}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:brightness-110 transition-all disabled:opacity-50"
              >
                {p.status === "in_game"
                  ? language === "nl" ? "In spel" : "In game"
                  : language === "nl" ? "⚔️ Uitdagen" : "⚔️ Challenge"}
              </button>
            </div>

            {/* Challenge settings */}
            {challengingId === p.player_id && (
              <div className="mt-2 p-3 rounded-lg bg-card border border-border flex flex-col gap-3">
                {/* Timer */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium w-14">Timer:</span>
                  <div className="flex gap-1">
                    {TIMER_OPTIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setChallengeTimer(t)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                          challengeTimer === t
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Word length */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium w-14">
                    {language === "nl" ? "Letters:" : "Length:"}
                  </span>
                  <div className="flex gap-1">
                    {([4, 5, 6] as WordLength[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => setChallengeWordLength(l)}
                        className={`w-8 h-8 rounded text-xs font-bold transition-all ${
                          challengeWordLength === l
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium w-14">
                    {language === "nl" ? "Taal:" : "Lang:"}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setChallengeLang("nl")}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        challengeLang === "nl"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      🇳🇱 NL
                    </button>
                    <button
                      onClick={() => setChallengeLang("en")}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        challengeLang === "en"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      🇬🇧 EN
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleSendChallenge(p.player_id)}
                  disabled={sending}
                  className="w-full px-4 py-2 rounded-lg bg-accent text-accent-foreground font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {sending
                    ? "..."
                    : language === "nl" ? "⚔️ Verstuur uitdaging" : "⚔️ Send challenge"}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default OnlineLobby;
