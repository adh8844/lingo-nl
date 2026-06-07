import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";
import { usePresence } from "@/hooks/usePresence";
import { useOnlineMatch } from "@/hooks/useOnlineMatch";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useIsTeacher } from "@/hooks/useIsTeacher";
import ChallengeDialog from "@/components/ChallengeDialog";
import SEO from "@/components/SEO";
import ChampionshipDetailDialog, {
  type ChampionshipDetail,
} from "@/components/ChampionshipDetailDialog";

type Tab = "championship" | "points" | "streak" | "games" | "badges" | "challenges";
type PointsSub = "total" | "today";
type GamesSub = "total" | "today";
type StreakSub = "max" | "current";

interface PlayerRow {
  id: string;
  display_name: string;
  player_code: string;
  current_streak: number;
  best_streak: number;
  points: number;
  school_id: string | null;
}

interface RankEntry {
  id: string;
  display_name: string;
  value: number;
  secondary?: string;
}

const PAGE_SIZE = 10;

const amsterdamTodayStr = () => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
};

const amsterdamStartOfTodayISO = () => {
  const dateStr = amsterdamTodayStr();
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
  const { isAdmin } = useIsAdmin();
  const { isTeacher } = useIsTeacher();
  const [tab, setTab] = useState<Tab>("points");
  const [pointsSub, setPointsSub] = useState<PointsSub>("total");
  const [gamesSub, setGamesSub] = useState<GamesSub>("total");
  const [streakSub, setStreakSub] = useState<StreakSub>("max");

  const [allPlayers, setAllPlayers] = useState<PlayerRow[]>([]);
  const [pointsToday, setPointsToday] = useState<RankEntry[]>([]);
  const [gamesTotal, setGamesTotal] = useState<RankEntry[]>([]);
  const [gamesToday, setGamesToday] = useState<RankEntry[]>([]);
  const [badgesList, setBadgesList] = useState<RankEntry[]>([]);
  const [challengesList, setChallengesList] = useState<RankEntry[]>([]);

  const { onlinePlayers } = usePresence(player?.id);
  const { activeMatch, sendChallenge } = useOnlineMatch(player?.id);
  const onlineMap = useMemo(
    () => new Map(onlinePlayers.map((p) => [p.player_id, p])),
    [onlinePlayers],
  );
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

  const mySchoolId: string | null = (player as any)?.school_id ?? null;

  const loadAllPlayers = useCallback(async () => {
    const { data } = await supabase
      .from("players")
      .select("id, display_name, player_code, current_streak, best_streak, points, school_id")
      .limit(500);
    if (data)
      setAllPlayers(
        data.map((p: any) => ({ ...p, points: p.points ?? 0, school_id: p.school_id ?? null })),
      );
  }, []);

  const namesFor = async (ids: string[]) => {
    if (ids.length === 0) return new Map<string, { name: string; school_id: string | null }>();
    const { data } = await supabase
      .from("players")
      .select("id, display_name, school_id")
      .in("id", ids);
    return new Map<string, { name: string; school_id: string | null }>(
      (data || []).map((p: any) => [p.id, { name: p.display_name, school_id: p.school_id ?? null }]),
    );
  };

  const buildList = async (rows: { player_id: string; value: number }[]): Promise<RankEntry[]> => {
    const ids = rows.map((r) => r.player_id);
    const info = await namesFor(ids);
    return rows
      .map((r) => {
        const i = info.get(r.player_id);
        return {
          id: r.player_id,
          display_name: i?.name || "?",
          value: r.value,
          _school: i?.school_id ?? null,
        };
      })
      .filter((e) => e.value > 0 && e._school === mySchoolId)
      .map(({ _school, ...rest }) => rest)
      .sort((a, b) => b.value - a.value);
  };

  const loadPointsToday = useCallback(async () => {
    const start = amsterdamStartOfTodayISO();
    const { data } = await supabase.rpc("get_points_in_range", { p_start: start });
    const rows = (data || []).map((r: any) => ({
      player_id: r.player_id,
      value: Number(r.total_points),
    }));
    setPointsToday(await buildList(rows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySchoolId]);

  const loadGamesTotal = useCallback(async () => {
    const { data } = await supabase.rpc("get_games_count_total");
    const rows = (data || []).map((r: any) => ({
      player_id: r.player_id,
      value: Number(r.games_count),
    }));
    setGamesTotal(await buildList(rows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySchoolId]);

  const loadGamesToday = useCallback(async () => {
    const start = amsterdamStartOfTodayISO();
    const { data } = await supabase.rpc("get_games_count_in_range", { p_start: start });
    const rows = (data || []).map((r: any) => ({
      player_id: r.player_id,
      value: Number(r.games_count),
    }));
    setGamesToday(await buildList(rows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySchoolId]);

  const loadBadges = useCallback(async () => {
    const { data } = await supabase.rpc("get_badges_count_total");
    const rows = (data || []).map((r: any) => ({
      player_id: r.player_id,
      value: Number(r.badges_count),
    }));
    setBadgesList(await buildList(rows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySchoolId]);

  const loadChallenges = useCallback(async () => {
    const { data } = await supabase.rpc("get_completed_matches_count_total");
    const rows = (data || []).map((r: any) => ({
      player_id: r.player_id,
      value: Number(r.matches_count),
    }));
    setChallengesList(await buildList(rows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySchoolId]);

  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [loadingSection, setLoadingSection] = useState<Record<string, boolean>>({});

  const ensureLoaded = useCallback(
    async (key: string, loader: () => Promise<void>) => {
      if (loaded[key] || loadingSection[key]) return;
      setLoadingSection((s) => ({ ...s, [key]: true }));
      try {
        await loader();
        setLoaded((s) => ({ ...s, [key]: true }));
      } finally {
        setLoadingSection((s) => ({ ...s, [key]: false }));
      }
    },
    [loaded, loadingSection],
  );

  // Load data only when a tab is selected — first paint, then fetch.
  useEffect(() => {
    if (tab === "points") {
      void ensureLoaded("players", loadAllPlayers);
      void ensureLoaded("pointsToday", loadPointsToday);
    } else if (tab === "streak") {
      void ensureLoaded("players", loadAllPlayers);
    } else if (tab === "games") {
      void ensureLoaded("gamesTotal", loadGamesTotal);
      void ensureLoaded("gamesToday", loadGamesToday);
    } else if (tab === "badges") {
      void ensureLoaded("badges", loadBadges);
    } else if (tab === "challenges") {
      void ensureLoaded("challenges", loadChallenges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const sameCircle = (p: PlayerRow) => (p.school_id ?? null) === mySchoolId;

  const pointsTotalList: RankEntry[] = useMemo(
    () =>
      [...allPlayers]
        .filter(sameCircle)
        .map((p) => ({ id: p.id, display_name: p.display_name, value: p.points }))
        .sort((a, b) => b.value - a.value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allPlayers, mySchoolId],
  );

  const maxStreakList: RankEntry[] = useMemo(
    () =>
      [...allPlayers]
        .filter(sameCircle)
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
        .sort((a, b) => b.value - a.value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allPlayers, mySchoolId],
  );

  const currentStreakList: RankEntry[] = useMemo(
    () =>
      [...allPlayers]
        .filter(sameCircle)
        .map((p) => ({
          id: p.id,
          display_name: p.display_name,
          value: p.current_streak || 0,
        }))
        .filter((e) => e.value > 0)
        .sort((a, b) => b.value - a.value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allPlayers, mySchoolId],
  );

  // Pagination state: page index per (tab+sub) key. Resets when key changes.
  const pageKey =
    tab === "points"
      ? `points:${pointsSub}`
      : tab === "games"
        ? `games:${gamesSub}`
        : tab === "streak"
          ? `streak:${streakSub}`
          : tab;
  const [pageMap, setPageMap] = useState<Record<string, number>>({});
  const page = pageMap[pageKey] ?? 0;
  const setPage = (p: number) => setPageMap((s) => ({ ...s, [pageKey]: p }));

  const playerSchoolMap = useMemo(() => {
    const m = new Map<string, string | null>();
    allPlayers.forEach((p) => m.set(p.id, p.school_id));
    return m;
  }, [allPlayers]);

  const canView = useCallback(
    (id: string) => {
      if (!player) return false;
      if (id === player.id) return true;
      if (isAdmin) return true;
      if (isTeacher && player.school_id) {
        const s = playerSchoolMap.get(id);
        return !!s && s === player.school_id;
      }
      return false;
    },
    [player, isAdmin, isTeacher, playerSchoolMap],
  );

  const goToProfile = (id: string) => {
    if (canView(id)) navigate(`/profile/${id}`);
  };

  const nameClass = (id: string, isMe: boolean) => {
    const base = `font-bold truncate ${isMe ? "text-primary" : "text-foreground"}`;
    return canView(id) ? `${base} cursor-pointer hover:underline` : base;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">DINGOLINGO</div>
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
              className={nameClass(entry.id, isMe)}
              translate="no"
              onClick={() => goToProfile(entry.id)}
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

  const tabs: { key: Tab; icon: string; title: string }[] = [
    { key: "points", icon: "⭐", title: "Aantal punten" },
    { key: "streak", icon: "🔥", title: "Reeks" },
    { key: "games", icon: "🎯", title: "Aantal spellen" },
    { key: "badges", icon: "🏅", title: "Badges" },
    { key: "challenges", icon: "⚔️", title: "Uitdagingen" },
  ];
  const currentTabTitle = tabs.find((t) => t.key === tab)?.title ?? "";

  const activeList: RankEntry[] =
    tab === "points"
      ? pointsSub === "total"
        ? pointsTotalList
        : pointsToday
      : tab === "streak"
        ? streakSub === "max"
          ? maxStreakList
          : currentStreakList
        : tab === "games"
          ? gamesSub === "total"
            ? gamesTotal
            : gamesToday
          : tab === "badges"
            ? badgesList
            : challengesList;

  const valueIcon =
    tab === "points" ? "⭐" : tab === "streak" ? "🔥" : tab === "games" ? "🎮" : tab === "badges" ? "🏅" : "⚔️";

  const tabLoadingKey =
    tab === "points"
      ? pointsSub === "total"
        ? "players"
        : "pointsToday"
      : tab === "streak"
        ? "players"
        : tab === "games"
          ? gamesSub === "total"
            ? "gamesTotal"
            : "gamesToday"
          : tab === "badges"
            ? "badges"
            : "challenges";
  const isTabLoading = !!loadingSection[tabLoadingKey] && !loaded[tabLoadingKey];

  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageItems = activeList.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col items-center py-4 sm:py-8 px-3 sm:px-4">
      <SEO
        title="Ranglijst — DingoLingo woordspel"
        description="Bekijk de Lingo ranglijst: top spelers, dagelijkse punten, streaks, badges en uitdagingen. Klim mee in het Nederlandse woordspel."
        path="/rankings"
      />
      <div className="w-full max-w-lg flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={() => navigate("/spelen")}
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
            aria-label={t.title}
            title={t.title}
            className={`flex-shrink-0 px-2.5 py-2 rounded-lg font-bold text-xs transition-all ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:brightness-110"
            }`}
          >
            <span>{t.icon}</span>
          </button>
        ))}
      </div>

      <div className="w-full max-w-lg flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="text-lg font-bold text-foreground">
            {tabs.find((t) => t.key === tab)?.icon} {currentTabTitle}
          </h2>
          {tab === "points" && (
            <div className="flex gap-1">
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
          )}
          {tab === "games" && (
            <div className="flex gap-1">
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
          )}
          {tab === "streak" && (
            <div className="flex gap-1">
              {(["max", "current"] as StreakSub[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStreakSub(s)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    streakSub === s
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-secondary-foreground hover:brightness-110"
                  }`}
                >
                  {s === "max" ? "Maximaal" : "Huidige" }
                </button>
              ))}
            </div>
          )}
        </div>

        {isTabLoading ? (
          <div className="flex flex-col gap-1.5 py-2">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-secondary/40 animate-pulse" />
            ))}
          </div>
        ) : activeList.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nog geen data</p>
        ) : (
          <>
            {pageItems.map((e, i) => renderRow(e, pageStart + i, valueIcon))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  onClick={() => setPage(Math.max(0, safePage - 1))}
                  disabled={safePage === 0}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-bold text-xs hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Vorige
                </button>
                <span className="text-xs text-muted-foreground font-medium">
                  Pagina {safePage + 1} van {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-bold text-xs hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Volgende →
                </button>
              </div>
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
