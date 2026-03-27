import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";
import { Star, Flame, Trophy, Award, Clock, Moon, Sun, Sparkles, Calendar, Swords, Zap, Target, Crown, HandshakeIcon, Users, PartyPopper, Medal, Footprints, Waves, Brain, Timer, Gem, ShieldCheck, ScrollText, Library } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  category: string;
  description: string;
  points: number;
  is_rare: boolean;
}

const CATEGORIES = ["Tijd", "Reeks", "Vaardigheid", "Sociaal", "Uithoudingsvermogen", "Prestige"];

const BADGE_ICONS: Record<string, React.ReactNode> = {
  nachtuil: <Moon className="w-6 h-6" />,
  vroege_vogel: <Sun className="w-6 h-6" />,
  maneschijn: <Sparkles className="w-6 h-6" />,
  weekendstrijder: <Calendar className="w-6 h-6" />,
  op_dreef: <Flame className="w-6 h-6" />,
  niet_te_stoppen: <Zap className="w-6 h-6" />,
  ijzersterk: <ShieldCheck className="w-6 h-6" />,
  maandmaster: <Crown className="w-6 h-6" />,
  supersnel: <Timer className="w-6 h-6" />,
  vlekkeloos: <Target className="w-6 h-6" />,
  comeback: <Swords className="w-6 h-6" />,
  meesterspeler: <Trophy className="w-6 h-6" />,
  fair_play: <HandshakeIcon className="w-6 h-6" />,
  werver: <Users className="w-6 h-6" />,
  feestbeest: <PartyPopper className="w-6 h-6" />,
  uitdager: <Medal className="w-6 h-6" />,
  marathonloper: <Footprints className="w-6 h-6" />,
  golfrijder: <Waves className="w-6 h-6" />,
  onvermoeibaar: <Brain className="w-6 h-6" />,
  tijdloze: <Clock className="w-6 h-6" />,
  alleskunner: <Gem className="w-6 h-6" />,
  veteraan: <ScrollText className="w-6 h-6" />,
  legend: <Star className="w-6 h-6" />,
  verzamelaar: <Library className="w-6 h-6" />,
};

const Profile = () => {
  const navigate = useNavigate();
  const { player, loading } = usePlayer();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());

  const loadBadges = useCallback(async () => {
    if (!player) return;
    const { data: badges } = await supabase.from("badges").select("*");
    if (badges) setAllBadges(badges as unknown as Badge[]);

    const { data: earned } = await supabase.from("player_badges" as any).select("badge_id").eq("player_id", player.id);
    if (earned) setEarnedBadgeIds(new Set(earned.map((e: any) => e.badge_id)));
  }, [player]);

  useEffect(() => { loadBadges(); }, [loadBadges]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">LINGO</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Maak eerst een speler aan</p>
        <button onClick={() => navigate("/")} className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg">Terug</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-4 sm:py-8 px-3 sm:px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/")} className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm hover:brightness-110 transition-all">← Terug</button>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">Profiel</h1>
          <div className="w-16" />
        </div>

        {/* Player info */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-6">
          <p className="text-2xl font-extrabold text-foreground mb-3" translate="no">{player.display_name}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Punten</p>
                <p className="font-extrabold text-foreground">{player.points}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Reeks</p>
                <p className="font-extrabold text-foreground">{player.current_streak} / {player.best_streak}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Spellen</p>
                <p className="font-extrabold text-foreground">{player.total_games_played}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Speeltijd</p>
                <p className="font-extrabold text-foreground">{Math.round(player.total_hours_played || 0)}u</p>
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <h2 className="text-lg font-extrabold text-foreground mb-3">
          <Award className="inline w-5 h-5 mr-1 text-accent" />
          Badges ({earnedBadgeIds.size}/{allBadges.length})
        </h2>

        {CATEGORIES.map(category => {
          const categoryBadges = allBadges.filter(b => b.category === category);
          if (categoryBadges.length === 0) return null;

          return (
            <div key={category} className="mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{category}</p>
              <div className="grid grid-cols-2 gap-2">
                {categoryBadges.map(badge => {
                  const earned = earnedBadgeIds.has(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`rounded-xl border p-3 transition-all ${
                        earned
                          ? badge.is_rare
                            ? "bg-accent/10 border-accent/30"
                            : "bg-primary/10 border-primary/30"
                          : "bg-card/50 border-border opacity-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <p className={`text-sm font-bold ${earned ? "text-foreground" : "text-muted-foreground"}`}>
                          {earned ? badge.name : "???"}
                          {badge.is_rare && " ★"}
                        </p>
                        <span className="text-[10px] font-bold text-primary">+{badge.points}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{earned ? badge.description : "???"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Profile;
