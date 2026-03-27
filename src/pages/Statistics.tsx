import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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
  const { player, loading } = usePlayer();
  const [stats, setStats] = useState<LevelStats[]>([]);
  const [pointsChart, setPointsChart] = useState<{ date: string; points: number }[]>([]);

  const loadStats = useCallback(async () => {
    if (!player) return;

    const { data: games } = await supabase
      .from("games" as any)
      .select("level, solved, attempts, duration_seconds, played_at, points_earned")
      .eq("player_id", player.id);

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

    // Points per day chart (last 30 days)
    const { data: pointsData } = await supabase
      .from("points_log" as any)
      .select("points, created_at")
      .eq("player_id", player.id)
      .order("created_at", { ascending: true });

    if (pointsData) {
      const dayMap: Record<string, number> = {};
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dayMap[d.toISOString().split("T")[0]] = 0;
      }
      (pointsData as any[]).forEach((p: any) => {
        const day = new Date(p.created_at).toISOString().split("T")[0];
        if (dayMap[day] !== undefined) dayMap[day] += p.points;
      });
      setPointsChart(Object.entries(dayMap).map(([date, points]) => ({
        date: date.slice(5),
        points,
      })));
    }
  }, [player]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">LINGO</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-4 sm:py-8 px-3 sm:px-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/")} className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm hover:brightness-110 transition-all">← Terug</button>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">Statistieken</h1>
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
