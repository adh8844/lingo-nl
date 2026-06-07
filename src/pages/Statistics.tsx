import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import SEO from "@/components/SEO";
import { toast } from "sonner";
import { useCanViewPlayer } from "@/hooks/useCanViewPlayer";

interface LevelStats {
  level: number;
  totalGames: number;
  wins: number;
  avgAttempts: number;
  avgTime: number;
  bestTime: number;
  winRate: number;
}

const Statistics = () => {
  const navigate = useNavigate();
  const { playerId } = useParams<{ playerId?: string }>();
  const { player: currentPlayer, loading } = usePlayer();
  const [stats, setStats] = useState<LevelStats[]>([]);
  const [pointsChart, setPointsChart] = useState<{ date: string; points: number }[]>([]);
  const [playerName, setPlayerName] = useState<string>("");

  const targetId = playerId || currentPlayer?.id;
  const { allowed, checking: permChecking } = useCanViewPlayer(targetId);

  useEffect(() => {
    if (!permChecking && allowed === false) {
      toast.error("Geen toegang tot deze statistieken");
      navigate("/statistics", { replace: true });
    }
  }, [allowed, permChecking, navigate]);

  const loadStats = useCallback(async () => {
    if (!targetId) return;
    if (allowed !== true) return;

    // Load player name if viewing another player
    if (playerId && playerId !== currentPlayer?.id) {
      const { data: p } = await supabase.from("players").select("display_name").eq("id", playerId).single();
      if (p) setPlayerName(p.display_name);
    }

    const { data: games } = await supabase.rpc("get_own_games", { p_player_id: targetId });

    if (!games) return;

    const levelStats: LevelStats[] = [4, 5, 6].map(level => {
      const lg = (games as any[]).filter((g: any) => g.level === level);
      const wins = lg.filter((g: any) => g.solved);
      const avgAttempts = wins.length > 0 ? wins.reduce((s: number, g: any) => s + (g.attempts || 0), 0) / wins.length : 0;
      const avgTime = wins.length > 0 ? wins.reduce((s: number, g: any) => s + (g.duration_seconds || 0), 0) / wins.length : 0;
      const bestTime = wins.length > 0 ? Math.min(...wins.map((g: any) => g.duration_seconds || 999)) : 0;

      return {
        level,
        totalGames: lg.length,
        wins: wins.length,
        avgAttempts: Math.round(avgAttempts * 10) / 10,
        avgTime: Math.round(avgTime),
        bestTime,
        winRate: lg.length > 0 ? Math.round((wins.length / lg.length) * 100) : 0,
      };
    });

    setStats(levelStats);

    // Use server-side aggregation to avoid 1000-row limit
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - 29);
    const fromStr = fromDate.toISOString().split("T")[0];
    const toStr = today.toISOString().split("T")[0];

    const { data: pointsData } = await supabase.rpc("get_player_daily_points" as any, {
      p_id: targetId,
      from_date: fromStr,
      to_date: toStr,
    });

    const dayMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dayMap[d.toISOString().split("T")[0]] = 0;
    }
    if (pointsData) {
      (pointsData as any[]).forEach((p: any) => {
        if (dayMap[p.day] !== undefined) dayMap[p.day] = Number(p.total_points);
      });
    }
    setPointsChart(Object.entries(dayMap).map(([date, points]) => ({
      date: date.slice(5),
      points,
    })));
  }, [targetId, playerId, currentPlayer?.id]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">DINGOLINGO</div>
      </div>
    );
  }

  const isOwnProfile = !playerId || playerId === currentPlayer?.id;
  const title = isOwnProfile ? "Statistieken" : `Statistieken — ${playerName}`;

  return (
    <div className="min-h-screen flex flex-col items-center py-4 sm:py-8 px-3 sm:px-4">
      <SEO
        title={`Statistieken${playerName ? ` van ${playerName}` : ""} — DingoLingo`}
        description="Bekijk gedetailleerde Lingo statistieken: gemiddelde pogingen, snelste tijden, winpercentage en puntenverloop per spelniveau."
        path={playerId ? `/statistics/${playerId}` : "/statistics"}
      />
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm hover:brightness-110 transition-all">← Terug</button>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-primary truncate max-w-[60%] text-center">{title}</h1>
          <div className="w-16" />
        </div>

        {/* Level stats */}
        <div className="space-y-3 mb-6">
          {stats.map(s => (
            <div key={s.level} className="bg-card rounded-xl border border-border p-4">
              <p className="text-lg font-extrabold text-primary mb-2">{s.level}-letter Lingo</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Spellen</p>
                  <p className="font-bold">{s.totalGames}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Winstpercentage</p>
                  <p className="font-bold">{s.winRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gem. pogingen</p>
                  <p className="font-bold">{s.avgAttempts || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Beste tijd</p>
                  <p className="font-bold">{s.bestTime > 0 ? `${s.bestTime}s` : "-"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Points chart */}
        {pointsChart.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm font-extrabold text-foreground mb-3">Punten afgelopen 30 dagen</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pointsChart}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={30} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="points" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default Statistics;
