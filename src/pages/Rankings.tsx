import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";
import { usePresence } from "@/hooks/usePresence";
import { useOnlineMatch } from "@/hooks/useOnlineMatch";
import ChallengeDialog from "@/components/ChallengeDialog";

type Tab = "overview" | "points" | "streak" | "games";
type PointsSub = "total" | "today";
type GamesSub = "total" | "today";

interface PlayerRow {
  id: string;
  display_name: string;
  player_code: string;
  current_streak: number;
  best_streak: number;
  points: number;
}

interface RankEntry {
  id: string;
  display_name: string;
  value: number;
  secondary?: string; // e.g. "(nu 4)"
}

// Returns "YYYY-MM-DD" for today in Europe/Amsterdam
const amsterdamTodayStr = () => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA gives YYYY-MM-DD
};

// Returns ISO timestamp string for start-of-today in Europe/Amsterdam
const amsterdamStartOfTodayISO = () => {
  const dateStr = amsterdamTodayStr();
  // Determine current Amsterdam offset (CET/CEST) by formatting with timeZoneName
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam",
    timeZoneName: "shortOffset",
  }).formatToParts(new Date());
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+1";
  const m = tzName.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/);
  const hours = m ? parseInt(m[1], 10) : 1;
  const mins = m && m[2] ? parseInt(m[2], 10) : 0;
  const sign = hours >= 0 ? "+" : "-";
  const hh = String(Math.abs(hours)).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  return `${dateStr}T00:00:00${sign}${hh}:${mm}`;
};

const Rankings = () => {
  const navigate = useNavigate();
  const { player, loading } = usePlayer();
  const [tab, setTab] = useState<Tab>("overview");
  const [pointsSub, setPointsSub] = useState<PointsSub>("total");
  const [gamesSub, setGamesSub] = useState<GamesSub>("total");

  const [allPlayers, setAllPlayers] = useState<PlayerRow[]>([]);
  const [pointsToday, setPointsToday] = useState<RankEntry[]>([]);
  const [gamesTotal, setGamesTotal] = useState<RankEntry[]>([]);
  const [gamesToday, setGamesToday] = useState<RankEntry[]>([]);

  const { onlinePlayers } = usePresence(player?.id);
  const { activeMatch, sendChallenge } = useOnlineMatch(player?.id);
  const onlineMap = new Map(onlinePlayers.map((p) => [p.player_id, p]));
  const onlineIds = new Set(onlinePlayers.map((p) => p.player_id));
  const [challengeTarget, setChallengeTarget] = useState<{ id: string; name: string } | null>(null);

  const openChallenge = (id: string, name: string) => {
    if (!player || id === player.id) return;
    const op = onlineMap.get(id);
    if (!op) return;
    if (op.status === "in_game") return;
    setChallengeTarget({ id, name });
  };

  useEffect(() => {
    if (activeMatch) navigate("/online-match");
  }, [activeMatch, navigate]);

  const loadAllPlayers = useCallback(async () => {
    const { data } = await supabase.from("players").select("*").limit(500);
    if (data) setAllPlayers(data.map((p) => ({ ...p, points: p.points ?? 0 })));
  }, []);

  const loadPointsToday = useCallback(async () => {
    const start = amsterdamStartOfTodayISO();
    const { data: logs } = await supabase
      .from("points_log")
      .select("player_id, points")
      .gte("created_at", start);
    if (!logs) return;
    const sums: Record<string, number> = {};
    logs.forEach((l: any) => {
      sums[l.player_id] = (sums[l.player_id] || 0) + (l.points || 0);
    });
    const ids = Object.keys(sums);
    if (ids.length === 0) {
      setPointsToday([]);
      return;
    }
    const { data: players } = await supabase
      .from("players")
      .select("id, display_name")
      .in("id", ids);
    const list: RankEntry[] = (players || [])
      .map((p: any) => ({ id: p.id, display_name: p.display_name, value: sums[p.id] || 0 }))
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value);
    setPointsToday(list);
  }, []);

  const loadGamesTotal = useCallback(async () => {
    // Fetch all game player_ids — paginate to bypass 1000-row default
    const counts: Record<string, number> = {};
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("games")
        .select("player_id")
        .range(from, from + pageSize - 1);
      if (error || !data || data.length === 0) break;
      data.forEach((g: any) => {
        counts[g.player_id] = (counts[g.player_id] || 0) + 1;
      });
      if (data.length < pageSize) break;
      from += pageSize;
    }
    // Tel ook online uitdagingsrondes mee — paginate
    let rFrom = 0;
    while (true) {
      const { data, error } = await supabase
        .from("match_rounds")
        .select("match_id, online_matches!inner(player1_id, player2_id)")
        .eq("status", "finished")
        .range(rFrom, rFrom + pageSize - 1);
      if (error || !data || data.length === 0) break;
      data.forEach((r: any) => {
        const m = r.online_matches;
        if (!m) return;
        counts[m.player1_id] = (counts[m.player1_id] || 0) + 1;
        counts[m.player2_id] = (counts[m.player2_id] || 0) + 1;
      });
      if (data.length < pageSize) break;
      rFrom += pageSize;
    }
    const ids = Object.keys(counts);
    if (ids.length === 0) {
      setGamesTotal([]);
      return;
    }
    const { data: players } = await supabase
      .from("players")
      .select("id, display_name")
      .in("id", ids);
    const list: RankEntry[] = (players || [])
      .map((p: any) => ({ id: p.id, display_name: p.display_name, value: counts[p.id] || 0 }))
      .sort((a, b) => b.value - a.value);
    setGamesTotal(list);
  }, []);

  const loadGamesToday = useCallback(async () => {
    const start = amsterdamStartOfTodayISO();
    const { data } = await supabase
      .from("games")
      .select("player_id, played_at")
      .gte("played_at", start);
    const counts: Record<string, number> = {};
    (data || []).forEach((g: any) => {
      counts[g.player_id] = (counts[g.player_id] || 0) + 1;
    });
    // Voeg uitdagingsrondes van vandaag toe
    const { data: rounds } = await supabase
      .from("match_rounds")
      .select("match_id, created_at, online_matches!inner(player1_id, player2_id)")
      .eq("status", "finished")
      .gte("created_at", start);
    (rounds || []).forEach((r: any) => {
      const m = r.online_matches;
      if (!m) return;
      counts[m.player1_id] = (counts[m.player1_id] || 0) + 1;
      counts[m.player2_id] = (counts[m.player2_id] || 0) + 1;
    });
    const ids = Object.keys(counts);
    if (ids.length === 0) {
      setGamesToday([]);
      return;
    }
    const { data: players } = await supabase
      .from("players")
      .select("id, display_name")
      .in("id", ids);
    const list: RankEntry[] = (players || [])
      .map((p: any) => ({ id: p.id, display_name: p.display_name, value: counts[p.id] || 0 }))
      .sort((a, b) => b.value - a.value);
    setGamesToday(list);
  }, []);

  // Load everything on mount (Overzicht needs all)
  useEffect(() => {
    loadAllPlayers();
    loadPointsToday();
    loadGamesTotal();
    loadGamesToday();
  }, [loadAllPlayers, loadPointsToday, loadGamesTotal, loadGamesToday]);

  // Derived lists
  const pointsTotalList: RankEntry[] = [...allPlayers]
    .map((p) => ({ id: p.id, display_name: p.display_name, value: p.points }))
    .sort((a, b) => b.value - a.value);

  const maxStreakList: RankEntry[] = [...allPlayers]
    .map((p) => {
      const max = Math.max(p.best_streak || 0, p.current_streak || 0);
      return {
        id: p.id,
        display_name: p.display_name,
        value: max,
        secondary: `nu ${p.current_streak || 0}`,
      };
    })
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);

  const currentStreakList: RankEntry[] = [...allPlayers]
    .map((p) => ({ id: p.id, display_name: p.display_name, value: p.current_streak || 0 }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">LINGO</div>
      </div>
    );
  }

  const medal = (i: number) =>
    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;

  const renderRow = (entry: RankEntry, i: number, icon: string) => {
    const isMe = player?.id === entry.id;
    const op = onlineMap.get(entry.id);
    const isOnline = !!op;
    const canChallenge = isOnline && !isMe && op?.status !== "in_game";
    return (
      <div
        key={entry.id}
        className={`flex items-center justify-between px-3 sm:px-4 py-2.5 rounded-lg text-sm ${
          isMe ? "bg-primary/15 border border-primary/30" : "bg-secondary/60"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-muted-foreground font-bold w-6 sm:w-8 text-right shrink-0">
            {medal(i)}
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            {isOnline && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
            <span
              className={`font-bold truncate cursor-pointer hover:underline ${isMe ? "text-primary" : "text-foreground"}`}
              translate="no"
              onClick={() => navigate(`/profile/${entry.id}`)}
            >
              {entry.display_name}
              {isMe && <span className="text-xs text-muted-foreground ml-1">(jij)</span>}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {entry.secondary && (
            <span className="text-xs text-muted-foreground">({entry.secondary})</span>
          )}
          <span className="font-extrabold">
            {icon} {entry.value}
          </span>
          {canChallenge && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openChallenge(entry.id, entry.display_name);
              }}
              title="Uitdagen"
              className="ml-1 px-2 py-1 rounded-md bg-primary text-primary-foreground font-bold text-xs hover:brightness-110"
            >
              ⚔️
            </button>
          )}
        </div>
      </div>
    );
  };

  const MiniCard = ({
    title,
    icon,
    valueIcon,
    list,
    onTitleClick,
  }: {
    title: string;
    icon: string;
    valueIcon: string;
    list: RankEntry[];
    onTitleClick?: () => void;
  }) => (
    <div className="rounded-lg bg-card/60 border border-border p-3 flex flex-col gap-2">
      <button
        type="button"
        onClick={onTitleClick}
        className="flex items-center gap-1.5 font-bold text-sm text-foreground hover:text-primary hover:underline text-left"
      >
        <span>{icon}</span>
        <span>{title}</span>
      </button>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">Nog geen data</p>
      ) : (
        <div className="flex flex-col gap-1">
          {list.slice(0, 3).map((e, i) => {
            const isMe = player?.id === e.id;
            const op = onlineMap.get(e.id);
            const isOnline = !!op;
            const canChallenge = isOnline && !isMe && op?.status !== "in_game";
            return (
              <div
                key={e.id}
                onContextMenu={(ev) => {
                  if (canChallenge) {
                    ev.preventDefault();
                    openChallenge(e.id, e.display_name);
                  }
                }}
                className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
                  isMe ? "bg-primary/15 border border-primary/30" : "bg-secondary/40"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-5 text-right shrink-0">{medal(i)}</span>
                  {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
                  <span
                    className={`font-bold truncate cursor-pointer hover:underline ${isMe ? "text-primary" : "text-foreground"}`}
                    translate="no"
                    onClick={() => navigate(`/profile/${e.id}`)}
                  >
                    {e.display_name}
                  </span>
                </div>
                <span className="font-extrabold shrink-0">
                  {valueIcon} {e.value}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "📊 Overzicht" },
    { key: "points", label: "⭐ Punten" },
    { key: "streak", label: "🔥 Reeks" },
    { key: "games", label: "🎮 # Spellen" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center py-4 sm:py-8 px-3 sm:px-4">
      <div className="w-full max-w-lg flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={() => navigate("/")}
          className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm hover:brightness-110 transition-all"
        >
          ← Terug
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
          🏆 Rankings
        </h1>
        <div className="w-16" />
      </div>

      <div className="flex gap-1 mb-4 w-full max-w-lg overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-2.5 py-2 rounded-lg font-bold text-xs transition-all ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:brightness-110"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-lg flex flex-col gap-2">
        {tab === "overview" && (
          <>
          {(() => {
            const onlineList = allPlayers.filter((p) => onlineIds.has(p.id));
            if (onlineList.length === 0) return null;
            return (
              <div className="rounded-lg bg-card/60 border border-border p-3 flex flex-col gap-2 mb-1">
                <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Online ({onlineList.length})</span>
                </div>
                <div className="flex flex-col gap-1">
                  {onlineList.map((p) => {
                    const isMe = player?.id === p.id;
                    const op = onlineMap.get(p.id);
                    const canChallenge = !isMe && op?.status !== "in_game";
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
                          isMe ? "bg-primary/15 border border-primary/30" : "bg-secondary/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                          <span
                            className={`font-bold truncate cursor-pointer hover:underline ${isMe ? "text-primary" : "text-foreground"}`}
                            translate="no"
                            onClick={() => navigate(`/profile/${p.id}`)}
                          >
                            {p.display_name}
                            {isMe && <span className="text-xs text-muted-foreground ml-1">(jij)</span>}
                          </span>
                        </div>
                        {canChallenge && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openChallenge(p.id, p.display_name);
                            }}
                            title="Uitdagen"
                            className="ml-1 px-2 py-1 rounded-md bg-primary text-primary-foreground font-bold text-xs hover:brightness-110"
                          >
                            ⚔️
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MiniCard title="Punten totaal" icon="⭐" valueIcon="⭐" list={pointsTotalList} onTitleClick={() => { setTab("points"); setPointsSub("total"); }} />
            <MiniCard title="Dagscore" icon="⭐" valueIcon="⭐" list={pointsToday} onTitleClick={() => { setTab("points"); setPointsSub("today"); }} />
            <MiniCard title="Max. reeks" icon="🔥" valueIcon="🔥" list={maxStreakList} onTitleClick={() => setTab("streak")} />
            <MiniCard title="Huidige reeks" icon="🔥" valueIcon="🔥" list={currentStreakList} onTitleClick={() => setTab("streak")} />
            <MiniCard title="# Spellen totaal" icon="🎯" valueIcon="🎮" list={gamesTotal} onTitleClick={() => { setTab("games"); setGamesSub("total"); }} />
            <MiniCard title="# Spellen vandaag" icon="🎯" valueIcon="🎮" list={gamesToday} onTitleClick={() => { setTab("games"); setGamesSub("today"); }} />
          </div>
          </>
        )}

        {tab === "points" && (
          <>
            <div className="flex gap-1 mb-2">
              {(["total", "today"] as PointsSub[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setPointsSub(s)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    pointsSub === s
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-secondary-foreground hover:brightness-110"
                  }`}
                >
                  {s === "total" ? "Totaal" : "Vandaag"}
                </button>
              ))}
            </div>
            {(pointsSub === "total" ? pointsTotalList : pointsToday).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nog geen data</p>
            ) : (
              (pointsSub === "total" ? pointsTotalList : pointsToday).map((e, i) =>
                renderRow(e, i, "⭐"),
              )
            )}
          </>
        )}

        {tab === "streak" && (
          <>
            {maxStreakList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nog geen data</p>
            ) : (
              maxStreakList.map((e, i) => renderRow(e, i, "🔥"))
            )}
          </>
        )}

        {tab === "games" && (
          <>
            <div className="flex gap-1 mb-2">
              {(["total", "today"] as GamesSub[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setGamesSub(s)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    gamesSub === s
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-secondary-foreground hover:brightness-110"
                  }`}
                >
                  {s === "total" ? "Totaal" : "Vandaag"}
                </button>
              ))}
            </div>
            {(gamesSub === "total" ? gamesTotal : gamesToday).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nog geen data</p>
            ) : (
              (gamesSub === "total" ? gamesTotal : gamesToday).map((e, i) =>
                renderRow(e, i, "🎮"),
              )
            )}
          </>
        )}
      </div>

      {challengeTarget && (
        <ChallengeDialog
          targetId={challengeTarget.id}
          targetName={challengeTarget.name}
          onSend={sendChallenge}
          onClose={() => setChallengeTarget(null)}
        />
      )}
    </div>
  );
};

export default Rankings;
