import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LingoGame from "@/components/LingoGame";
import { usePlayer } from "@/hooks/usePlayer";
import { WordLength } from "@/data/words";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Star, Flame, Trophy, User, BarChart3, BookOpen, LogOut, Shield, Bug } from "lucide-react";
import DingoMascot from "@/components/DingoMascot";
import SEO from "@/components/SEO";
import { useIsAdmin } from "@/hooks/useIsAdmin";

declare const __BUILD_TIMESTAMP__: string;

const Index = () => {
  const navigate = useNavigate();
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<WordLength>(4);
  const { player, session, loading, refreshPlayer, signOut } = usePlayer();
  const { isAdmin } = useIsAdmin();


  const [unlockProgress, setUnlockProgress] = useState({
    fourLetterPoints: 0,
    badgeCount: 0,
    badgeCategories: 0,
    firstAttemptWins: 0,
    totalPoints: 0,
    rareBadgeCount: 0,
    normalBadgeCount: 0,
    hasOpDreef: false,
  });

  const loadUnlockProgress = useCallback(async () => {
    if (!player) return;
    // Skip heavy queries when both levels are already unlocked — progress UI not shown.
    if (player.unlocked_5letter && player.unlocked_6letter) return;

    const [fgRes, badgesRes, defsRes, faRes] = await Promise.all([
      supabase.from("games" as any).select("points_earned").eq("player_id", player.id).eq("level", 4),
      supabase.from("player_badges" as any).select("badge_id").eq("player_id", player.id),
      supabase.from("badges" as any).select("id, category, is_rare"),
      supabase.from("games" as any).select("id", { count: "exact", head: true }).eq("player_id", player.id).eq("solved", true).eq("attempts", 1),
    ]);

    const fourLetterPoints = (fgRes.data || []).reduce((s: number, g: any) => s + (g.points_earned || 0), 0);
    const badgeIds = new Set((badgesRes.data || []).map((b: any) => b.badge_id));
    const cats = new Set<string>();
    let rare = 0, normal = 0;
    (defsRes.data || []).forEach((b: any) => {
      if (badgeIds.has(b.id)) {
        cats.add(b.category);
        if (b.is_rare) rare++; else normal++;
      }
    });

    setUnlockProgress({
      fourLetterPoints,
      badgeCount: badgeIds.size,
      badgeCategories: cats.size,
      firstAttemptWins: faRes.count || 0,

      totalPoints: player.points || 0,
      rareBadgeCount: rare,
      normalBadgeCount: normal,
      hasOpDreef: badgeIds.has("op_dreef"),
    });
  }, [player]);

  useEffect(() => {
    if (player) loadUnlockProgress();
  }, [player, loadUnlockProgress]);

  const handleBack = useCallback(() => {
    setGameStarted(false);
    refreshPlayer();
    loadUnlockProgress();
  }, [refreshPlayer, loadUnlockProgress]);

  useEffect(() => {
    if (!loading && !session) {
      navigate("/", { replace: true });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">DINGOLINGO</div>
      </div>
    );
  }

  if (gameStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center py-4 sm:py-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-4 sm:mb-6">
          <span className="text-primary">Dingo</span><span className="text-primary">Lingo</span>
        </h1>
        <LingoGame wordLength={selectedLevel} onBack={handleBack} />
      </div>
    );
  }

  const is5Unlocked = player?.unlocked_5letter ?? false;
  const is6Unlocked = player?.unlocked_6letter ?? false;

  const renderLevelCard = (level: WordLength, label: string, unlocked: boolean) => {
    const canPlay = level === 4 || unlocked;

    return (
      <button
        key={level}
        onClick={() => {
          if (canPlay) {
            setSelectedLevel(level);
            setGameStarted(true);
          }
        }}
        disabled={!canPlay}
        className={`relative flex flex-col items-center gap-2 p-5 sm:p-6 rounded-2xl border-2 transition-all w-full ${
          canPlay
            ? "bg-card border-primary/30 hover:border-primary hover:shadow-lg hover:shadow-primary/20 active:scale-95 cursor-pointer"
            : "bg-card/50 border-border opacity-70 cursor-not-allowed"
        }`}
      >
        {!canPlay && <Lock className="absolute top-3 right-3 w-5 h-5 text-muted-foreground" />}
        <span className={`text-4xl sm:text-5xl font-extrabold ${canPlay ? "text-primary" : "text-muted-foreground"}`}>
          {level}
        </span>
        <span className={`text-sm font-bold ${canPlay ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>

        {/* Unlock progress for level 5 */}
        {level === 5 && !unlocked && player && (
          <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5 w-full text-left">
            <p>{unlockProgress.fourLetterPoints}/250 punten</p>
            <p>
              {unlockProgress.badgeCount}/4 badges ({unlockProgress.badgeCategories}/2 cat.)
            </p>
            <p>{unlockProgress.firstAttemptWins}/5 eerste pogingen</p>
          </div>
        )}

        {/* Unlock progress for level 6 */}
        {level === 6 && !unlocked && player && (
          <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5 w-full text-left">
            <p>
              {unlockProgress.totalPoints >= 600 ? "✓" : "✗"} {unlockProgress.totalPoints}/600 punten
            </p>
            <p>
              {unlockProgress.rareBadgeCount >= 1 || unlockProgress.normalBadgeCount >= 8 ? "✓" : "✗"}{" "}
              {unlockProgress.rareBadgeCount}★ zeldzaam / {unlockProgress.normalBadgeCount}/8 normaal
            </p>
            <p>{unlockProgress.hasOpDreef ? "✓" : "✗"} Op dreef badge</p>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-3 sm:px-4 py-6 sm:py-0">
      <SEO
        title="Spelen — DingoLingo Lingo online in het Nederlands"
        description="Speel DingoLingo Lingo online: kies 4, 5 of 6 letters, raad het Nederlandse woord, verdien badges en klim op de ranglijst."
        path="/spelen"
      />
      <div className="flex flex-col items-center gap-5 sm:gap-8 animate-bounce-in w-full max-w-md">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tighter flex items-end leading-none">
            <span className="text-primary">Dingo</span>
            <span className="text-primary ml-2 sm:ml-3 md:ml-4">L</span>
            <DingoMascot size={72} className="mx-[-3px] mb-[2px] hidden md:block" />
            <DingoMascot size={56} className="mx-[-3px] mb-[2px] hidden sm:block md:hidden" />
            <DingoMascot size={44} className="mx-[-3px] mb-[2px] block sm:hidden" />
            <span className="text-primary">ngo</span>
          </h1>
          <p className="text-muted-foreground text-lg">Raad het woord</p>
        </div>

        {!player ? (
          <div className="text-muted-foreground">Profiel laden...</div>
        ) : (
          <>
            {/* Player info */}
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Welkom terug,</p>
                <p className="font-extrabold text-foreground" translate="no">
                  {player.display_name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-primary">
                  <Star className="inline w-4 h-4 mr-0.5" />
                  {player.points}
                </span>
                <span className="font-extrabold text-accent">
                  <Flame className="inline w-4 h-4 mr-0.5" />
                  {player.current_streak}
                </span>
              </div>
            </div>

            {/* Level cards */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {renderLevelCard(4, "Vier letters", true)}
              {renderLevelCard(5, "Vijf letters", is5Unlocked)}
              {renderLevelCard(6, "Zes letters", is6Unlocked)}
            </div>

            {/* Navigation */}
            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                onClick={() => navigate("/profile")}
                className="flex flex-col items-center gap-1 px-3 py-3 bg-secondary text-secondary-foreground font-bold text-xs rounded-xl hover:brightness-110 transition-all active:scale-95"
              >
                <User className="w-5 h-5" />
                Profiel
              </button>
              <button
                onClick={() => navigate("/rankings")}
                className="flex flex-col items-center gap-1 px-3 py-3 bg-secondary text-secondary-foreground font-bold text-xs rounded-xl hover:brightness-110 transition-all active:scale-95"
              >
                <Trophy className="w-5 h-5" />
                Ranglijst
              </button>
              <button
                onClick={() => navigate("/statistics")}
                className="flex flex-col items-center gap-1 px-3 py-3 bg-secondary text-secondary-foreground font-bold text-xs rounded-xl hover:brightness-110 transition-all active:scale-95"
              >
                <BarChart3 className="w-5 h-5" />
                Statistieken
              </button>
              <button
                onClick={() => navigate("/spelregels")}
                className="flex flex-col items-center gap-1 px-3 py-3 bg-secondary text-secondary-foreground font-bold text-xs rounded-xl hover:brightness-110 transition-all active:scale-95"
              >
                <BookOpen className="w-5 h-5" />
                Spelregels
              </button>
            </div>

            {/* Admin link */}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            )}

            {/* Support + Uitloggen */}
            <div className="flex gap-2 w-full">
              <button
                onClick={() => {
                  const width = 625;
                  const height = 750;
                  const left = window.screenLeft + (window.outerWidth - width) / 2;
                  const top = window.screenTop + (window.outerHeight - height) / 2;
                  const features = `width=${width},height=${height},left=${left},top=${top},location=no,menubar=no,toolbar=no,status=no,resizable=yes`;
                  window.open(
                    "https://bugs2prompt.najra.app/report/51554d9b-bff3-4248-a801-b358614ea99e",
                    "bugReport",
                    features
                  );
                }}
                className="flex items-center justify-center gap-2 flex-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Bug className="w-4 h-4" />
                Werkt iets niet?
              </button>
              <button
                onClick={signOut}
                className="flex items-center justify-center gap-2 flex-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Uitloggen
              </button>
            </div>
          </>
        )}
      </div>
      <p className="mt-6 text-[10px] text-muted-foreground/50">
        Laatst bijgewerkt:{" "}
        {new Date(__BUILD_TIMESTAMP__).toLocaleString("nl-NL", {
          timeZone: "Europe/Amsterdam",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}{" "}
        CET
      </p>
    </div>
  );
};

export default Index;
