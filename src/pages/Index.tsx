import { useState, useEffect, useCallback } from "react";
import LingoGame from "@/components/LingoGame";
import PlayerSetup from "@/components/PlayerSetup";
import Leaderboard from "@/components/Leaderboard";
import { usePlayer } from "@/hooks/usePlayer";
import { Language, WordLength } from "@/data/words";

type GameMode = "single" | "two-player";

const TIMER_OPTIONS = [30, 60, 90, 120] as const;

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [language, setLanguage] = useState<Language>("nl");
  const [wordLength, setWordLength] = useState<WordLength>(5);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [gameMode, setGameMode] = useState<GameMode>("single");

  const { player, loading, createPlayer, updateStreak, refreshPlayer } = usePlayer();

  // Derive streaks from player (cloud) or fallback to localStorage
  const currentStreak = player?.current_streak ?? 0;
  const bestStreak = player?.best_streak ?? 0;

  // Also keep localStorage in sync for offline play
  useEffect(() => {
    if (player) {
      localStorage.setItem("lingo-current-streak", String(player.current_streak));
      localStorage.setItem("lingo-best-streak", String(player.best_streak));
    }
  }, [player]);

  const handleStreakUpdate = useCallback(
    async (newCurrent: number, newBest: number) => {
      if (player) {
        await updateStreak(newCurrent, newBest);
      }
      localStorage.setItem("lingo-current-streak", String(newCurrent));
      localStorage.setItem("lingo-best-streak", String(newBest));
    },
    [player, updateStreak]
  );

  const handleBack = useCallback(() => {
    setGameStarted(false);
    refreshPlayer();
  }, [refreshPlayer]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">LINGO</div>
      </div>
    );
  }

  if (gameStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center py-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary mb-6">
          LINGO
        </h1>
        <LingoGame
          language={language}
          wordLength={wordLength}
          timerSeconds={timerSeconds}
          gameMode={gameMode}
          onBack={handleBack}
          currentStreak={currentStreak}
          bestStreak={bestStreak}
          onStreakUpdate={handleStreakUpdate}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-8 animate-bounce-in">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tighter text-primary">
            LINGO
          </h1>
          <p className="text-muted-foreground text-lg">
            Raad het woord · Guess the word
          </p>
        </div>

        {/* Player setup or welcome */}
        {!player ? (
          <PlayerSetup language={language} onCreatePlayer={async (name) => { await createPlayer(name); }} />
        ) : (
          <>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {language === "nl" ? "Welkom terug," : "Welcome back,"}
              </p>
              <p className="text-xl font-extrabold text-foreground">{player.display_name}</p>
            </div>

            {/* Language selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage("nl")}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                  language === "nl"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:brightness-110"
                }`}
              >
                🇳🇱 Nederlands
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                  language === "en"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:brightness-110"
                }`}
              >
                🇬🇧 English
              </button>
            </div>

            {/* Word length selector */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground font-medium">
                {language === "nl" ? "Aantal letters" : "Word length"}
              </p>
              <div className="flex gap-2">
                {([4, 5, 6] as WordLength[]).map((len) => (
                  <button
                    key={len}
                    onClick={() => setWordLength(len)}
                    className={`w-14 h-14 rounded-lg font-extrabold text-xl transition-all active:scale-95 ${
                      wordLength === len
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "bg-secondary text-secondary-foreground hover:brightness-110"
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer selector */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground font-medium">
                {language === "nl" ? "Timer (seconden)" : "Timer (seconds)"}
              </p>
              <div className="flex gap-2">
                {TIMER_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setTimerSeconds(sec)}
                    className={`w-14 h-14 rounded-lg font-extrabold text-lg transition-all active:scale-95 ${
                      timerSeconds === sec
                        ? "bg-accent text-accent-foreground shadow-lg shadow-accent/30"
                        : "bg-secondary text-secondary-foreground hover:brightness-110"
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>

            {/* Game mode selector */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground font-medium">
                {language === "nl" ? "Spelmodus" : "Game mode"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setGameMode("single")}
                  className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                    gameMode === "single"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:brightness-110"
                  }`}
                >
                  👤 Solo
                </button>
                <button
                  onClick={() => setGameMode("two-player")}
                  className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                    gameMode === "two-player"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:brightness-110"
                  }`}
                >
                  {language === "nl" ? "👥 Twee spelers" : "👥 Two players"}
                </button>
              </div>
            </div>

            {/* Best Streak */}
            {bestStreak > 0 && (
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm text-muted-foreground font-medium">
                  {language === "nl" ? "Beste reeks" : "Best streak"}
                </p>
                <p className="text-3xl font-extrabold text-primary">🔥 {bestStreak}</p>
              </div>
            )}

            {/* Leaderboard */}
            <Leaderboard player={player} language={language} />

            {/* Start button */}
            <button
              onClick={() => setGameStarted(true)}
              className="px-10 py-3.5 bg-accent text-accent-foreground font-extrabold text-lg rounded-xl hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-accent/30"
            >
              {language === "nl" ? "Start!" : "Play!"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
