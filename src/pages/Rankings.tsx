import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";
import { usePresence } from "@/hooks/usePresence";
import { useOnlineMatch } from "@/hooks/useOnlineMatch";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useIsTeacher } from "@/hooks/useIsTeacher";
import ChallengeDialog from "@/components/ChallengeDialog";
import SEO from "@/components/SEO";

type Tab = "overview" | "points" | "streak" | "games" | "badges" | "challenges";
type PointsSub = "total" | "today";
type GamesSub = "total" | "today";
type StreakSub = "max" | "current";
type DaySub = "today" | "yesterday";

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

// Returns [startISO, endISO] for yesterday in Europe/Amsterdam
const amsterdamYesterdayRangeISO = () => {
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
  const today = amsterdamTodayStr();
  const d = new Date(today + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  const y = d.toISOString().slice(0, 10);
  return [`${y}T00:00:00${sign}${hh}:${mm}`, `${today}T00:00:00${sign}${hh}:${mm}`];
};

const Rankings = () => {
  const navigate = useNavigate();
  const { player, loading } = usePlayer();
  const { isAdmin } = useIsAdmin();
  const { isTeacher } = useIsTeacher();
  const [tab, setTab] = useState<Tab>("overview");
  const [pointsSub, setPointsSub] = useState<PointsSub>("total");
  const [gamesSub, setGamesSub] = useState<GamesSub>("total");
  const [streakSub, setStreakSub] = useState<StreakSub>("max");
  const [daySub, setDaySub] = useState<DaySub>("today");

  const [allPlayers, setAllPlayers] = useState<PlayerRow[]>([]);
  const [pointsToday, setPointsToday] = useState<RankEntry[]>([]);
  const [gamesTotal, setGamesTotal] = useState<RankEntry[]>([]);
  const [gamesToday, setGamesToday] = useState<RankEntry[]>([]);
  const [badgesList, setBadgesList] = useState<RankEntry[]>([]);
  const [challengesList, setChallengesList] = useState<RankEntry[]>([]);
  const [championsToday, setChampionsToday] = useState<{ label: string; entry: RankEntry | null; icon: string }[]>([]);
  const [championsYesterday, setChampionsYesterday] = useState<{ label: string; entry: RankEntry | null; icon: string }[]>([]);

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
    const { data } = await supabase
      .from("players")
      .select("id, display_name, player_code, current_streak, best_streak, points, school_id")
      .limit(500);
    if (data) setAllPlayers(data.map((p: any) => ({ ...p, points: p.points ?? 0, school_id: p.school_id ?? null })));
  }, []);

  // Helper: fetch display names + school_id for a set of player ids
  const namesFor = async (ids: string[]) => {
    if (ids.length === 0) return new Map<string, { name: string; school_id: string | null }>();
    const { data } = await supabase
      .from("players")
      .select("id, display_name, school_id")
      .in("id", ids);
    return new Map<string, { name: string; school_id: string | null }>(
      (data || []).map((p: any) => [p.id, { name: p.display_name, school_id: p.school_id ?? null }])
    );
  };

  const mySchoolId: string | null = (player as any)?.school_id ?? null;

  const buildList = async (
    rows: { player_id: string; value: number }[]
  ): Promise<RankEntry[]> => {
    const ids = rows.map((r) => r.player_id);
    const info = await namesFor(ids);
    return rows
      .map((r) => {
        const i = info.get(r.player_id);
        return { id: r.player_id, display_name: i?.name || "?", value: r.value, _school: i?.school_id ?? null };
      })
      .filter((e) => e.value > 0 && e._school === mySchoolId)
      .map(({ _school, ...rest }) => rest)
      .sort((a, b) => b.value - a.value);
  };

  const loadPointsToday = useCallback(async () => {
    const start = amsterdamStartOfTodayISO();
    const { data } = await supabase.rpc("get_points_in_range", { p_start: start });
    const rows = (data || []).map((r: any) => ({ player_id: r.player_id, value: Number(r.total_points) }));
    setPointsToday(await buildList(rows));
  }, []);

  const loadGamesTotal = useCallback(async () => {
    const { data } = await supabase.rpc("get_games_count_total");
    const rows = (data || []).map((r: any) => ({ player_id: r.player_id, value: Number(r.games_count) }));
    setGamesTotal(await buildList(rows));
  }, []);

  const loadGamesToday = useCallback(async () => {
    const start = amsterdamStartOfTodayISO();
    const { data } = await supabase.rpc("get_games_count_in_range", { p_start: start });
    const rows = (data || []).map((r: any) => ({ player_id: r.player_id, value: Number(r.games_count) }));
    setGamesToday(await buildList(rows));
  }, []);

  const loadBadges = useCallback(async () => {
    const { data } = await supabase.rpc("get_badges_count_total");
    const rows = (data || []).map((r: any) => ({ player_id: r.player_id, value: Number(r.badges_count) }));
    setBadgesList(await buildList(rows));
  }, []);

  const loadChallenges = useCallback(async () => {
    const { data } = await supabase.rpc("get_completed_matches_count_total");
    const rows = (data || []).map((r: any) => ({ player_id: r.player_id, value: Number(r.matches_count) }));
    setChallengesList(await buildList(rows));
  }, []);

  const computeChampionsForRange = useCallback(async (startISO: string, endISO?: string): Promise<{ label: string; entry: RankEntry | null; icon: string }[]> => {
    const args = endISO ? { p_start: startISO, p_end: endISO } : { p_start: startISO };

    const topRpc = async (
      fn: "get_points_in_range" | "get_games_count_in_range" | "get_badges_count_in_range" | "get_completed_matches_count_in_range",
      valueKey: "total_points" | "games_count" | "badges_count" | "matches_count",
      label: string,
      icon: string
    ) => {
      const { data } = await supabase.rpc(fn, args as any);
      const rows = (data || []).map((r: any) => ({ player_id: r.player_id, value: Number(r[valueKey]) }));
      const list = await buildList(rows);
      return { label, entry: list[0] ?? null, icon };
    };

    return Promise.all([
      topRpc("get_points_in_range", "total_points", "Dagscore", "⭐"),
      topRpc("get_games_count_in_range", "games_count", "# Spellen", "🎮"),
      topRpc("get_badges_count_in_range", "badges_count", "Badges", "🏅"),
      topRpc("get_completed_matches_count_in_range", "matches_count", "Uitdagingen", "⚔️"),
    ]);
  }, []);

  const loadChampions = useCallback(async () => {
    const todayStart = amsterdamStartOfTodayISO();
    const [yStart, yEnd] = amsterdamYesterdayRangeISO();
    const [today, yest] = await Promise.all([
      computeChampionsForRange(todayStart),
      computeChampionsForRange(yStart, yEnd),
    ]);
    setChampionsToday(today);
    setChampionsYesterday(yest);
  }, [computeChampionsForRange]);



  // Track which sections have been loaded and which are expanded
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
    [loaded, loadingSection]
  );

  const toggleExpand = useCallback(
    (key: string, loader: () => Promise<void>) => {
      setExpanded((s) => {
        const next = !s[key];
        if (next) void ensureLoaded(key, loader);
        return { ...s, [key]: next };
      });
    },
    [ensureLoaded]
  );

  // Immediate loads: players (for online list) + champions (Dagkanjers)
  useEffect(() => {
    void ensureLoaded("players", loadAllPlayers);
    void ensureLoaded("champions", loadChampions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When user opens a non-overview tab, ensure its data is loaded
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


  // Derived lists — restricted to caller's school circle
  const sameCircle = (p: PlayerRow) => (p.school_id ?? null) === mySchoolId;

  const pointsTotalList: RankEntry[] = [...allPlayers]
    .filter(sameCircle)
    .map((p) => ({ id: p.id, display_name: p.display_name, value: p.points }))
    .sort((a, b) => b.value - a.value);

  const maxStreakList: RankEntry[] = [...allPlayers]
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
    .sort((a, b) => b.value - a.value);

  const currentStreakList: RankEntry[] = [...allPlayers]
    .filter(sameCircle)
    .map((p) => ({ id: p.id, display_name: p.display_name, value: p.current_streak || 0 }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">DINGOLINGO</div>
      </div>
    );
  }

  const medal = (i: number) =>
    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;

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
    [player, isAdmin, isTeacher, playerSchoolMap]
  );

  const goToProfile = (id: string) => {
    if (canView(id)) navigate(`/profile/${id}`);
  };

  const nameClass = (id: string, isMe: boolean) => {
    const base = `font-bold truncate ${isMe ? "text-primary" : "text-foreground"}`;
    return canView(id) ? `${base} cursor-pointer hover:underline` : base;
  };

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
                className="flex items-center justify-between px-2 py-1.5 rounded text-xs bg-secondary/40"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-5 text-right shrink-0">{medal(i)}</span>
                  {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
                  <span
                    className={nameClass(e.id, isMe)}
                    translate="no"
                    onClick={() => goToProfile(e.id)}
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

  const MergedCard = ({
    title,
    icon,
    valueIcon,
    tabs: subTabs,
    activeKey,
    onTabChange,
    list,
    onTitleClick,
  }: {
    title: string;
    icon: string;
    valueIcon: string;
    tabs: { key: string; label: string }[];
    activeKey: string;
    onTabChange: (key: string) => void;
    list: RankEntry[];
    onTitleClick?: () => void;
  }) => (
    <div className="rounded-lg bg-card/60 border border-border p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onTitleClick}
          className="flex items-center gap-1.5 font-bold text-sm text-foreground hover:text-primary hover:underline text-left"
        >
          <span>{icon}</span>
          <span>{title}</span>
        </button>
        <div className="flex gap-1">
          {subTabs.map((s) => (
            <button
              key={s.key}
              onClick={() => onTabChange(s.key)}
              className={`px-2 py-1 rounded font-bold text-xs transition-all ${
                activeKey === s.key
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-secondary-foreground hover:brightness-110"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
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
                className="flex items-center justify-between px-2 py-1.5 rounded text-xs bg-secondary/40"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-5 text-right shrink-0">{medal(i)}</span>
                  {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
                  <span
                    className={nameClass(e.id, isMe)}
                    translate="no"
                    onClick={() => goToProfile(e.id)}
                  >
                    {e.display_name}
                  </span>
                  {e.secondary && (
                    <span className="text-xs text-muted-foreground shrink-0">({e.secondary})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-extrabold shrink-0">
                    {valueIcon} {e.value}
                  </span>
                  {canChallenge && (
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        openChallenge(e.id, e.display_name);
                      }}
                      title="Uitdagen"
                      className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-bold text-xs hover:brightness-110"
                    >
                      ⚔️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const CollapsibleSection = ({
    title,
    isOpen,
    isLoading,
    onToggle,
    headerExtra,
    children,
  }: {
    title: string;
    isOpen: boolean;
    isLoading: boolean;
    onToggle: () => void;
    headerExtra?: ReactNode;
    children: ReactNode;
  }) => (
    <div className="rounded-lg bg-card/60 border border-border overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 font-bold text-sm text-foreground hover:bg-secondary/30 transition-colors text-left cursor-pointer select-none"
      >
        <span className="flex-1">{title}</span>
        {isOpen && headerExtra && (
          <span onClick={(e) => e.stopPropagation()} className="flex items-center">
            {headerExtra}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
      </div>
      <div
        className={`grid transition-all duration-200 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3">
            {isLoading ? (
              <div className="flex flex-col gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-7 rounded bg-secondary/40 animate-pulse" />
                ))}
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const SubTabs = ({
    tabs: subTabs,
    activeKey,
    onTabChange,
  }: {
    tabs: { key: string; label: string }[];
    activeKey: string;
    onTabChange: (key: string) => void;
  }) => (
    <div className="flex gap-1">
      {subTabs.map((s) => (
        <button
          key={s.key}
          onClick={(e) => {
            e.stopPropagation();
            onTabChange(s.key);
          }}
          className={`px-2 py-1 rounded font-bold text-xs transition-all ${
            activeKey === s.key
              ? "bg-accent text-accent-foreground"
              : "bg-secondary text-secondary-foreground hover:brightness-110"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  const renderMiniList = (list: RankEntry[], valueIcon: string) => {
    if (list.length === 0) {
      return <p className="text-xs text-muted-foreground py-1">Nog geen data</p>;
    }
    return (
      <div className="flex flex-col gap-1">
        {list.slice(0, 3).map((e, i) => {
          const isMe = player?.id === e.id;
          const op = onlineMap.get(e.id);
          const isOnline = !!op;
          const canChallenge = isOnline && !isMe && op?.status !== "in_game";
          return (
            <div
              key={e.id}
              className="flex items-center justify-between px-2 py-1.5 rounded text-xs bg-secondary/40"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-5 text-right shrink-0">{medal(i)}</span>
                {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
                <span
                  className={nameClass(e.id, isMe)}
                  translate="no"
                  onClick={(ev) => { ev.stopPropagation(); goToProfile(e.id); }}
                >
                  {e.display_name}
                </span>
                {e.secondary && (
                  <span className="text-xs text-muted-foreground shrink-0">({e.secondary})</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-extrabold shrink-0">
                  {valueIcon} {e.value}
                </span>
                {canChallenge && (
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      openChallenge(e.id, e.display_name);
                    }}
                    title="Uitdagen"
                    className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-bold text-xs hover:brightness-110"
                  >
                    ⚔️
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const tabs: { key: Tab; icon: string; title: string }[] = [
    { key: "overview", icon: "📊", title: "Overzicht" },
    { key: "points", icon: "⭐", title: "Aantal punten" },
    { key: "streak", icon: "🔥", title: "Reeks" },
    { key: "games", icon: "🎯", title: "Aantal spellen" },
    { key: "badges", icon: "🏅", title: "Badges" },
    { key: "challenges", icon: "⚔️", title: "Uitdagingen" },
  ];
  const currentTabTitle = tabs.find((t) => t.key === tab)?.title ?? "";

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
            {t.key === "overview" && <span className="ml-1">Overzicht</span>}
          </button>
        ))}
      </div>

      <div className="w-full max-w-lg flex flex-col gap-2">
        {tab === "overview" && (
          <>
          {(() => {
            const onlineList = allPlayers.filter((p) => onlineIds.has(p.id));
            return (
              <div className="rounded-lg bg-card/60 border border-border p-3 flex flex-col gap-2 mb-1">
                <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Online ({onlineList.length})</span>
                </div>
                {onlineList.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">
                    Er is op dit moment niemand online.
                  </p>
                ) : (
                <div className="flex flex-col gap-1">
                  {onlineList.map((p) => {
                    const isMe = player?.id === p.id;
                    const op = onlineMap.get(p.id);
                    const canChallenge = !isMe && op?.status !== "in_game";
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-2 py-1.5 rounded text-xs bg-secondary/40"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                          <span
                            className={nameClass(p.id, isMe)}
                            translate="no"
                            onClick={() => goToProfile(p.id)}
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
                )}
              </div>
            );
          })()}
          {(() => {
            const champs = daySub === "today" ? championsToday : championsYesterday;
            const hasAny = champs.some((c) => c.entry);
            const isLoading = loadingSection["champions"] && !loaded["champions"];
            return (
              <div className="rounded-lg bg-card/60 border border-border p-3 flex flex-col gap-2 mb-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-sm text-foreground">🌟 Dagkanjers</div>
                  <div className="flex gap-1">
                    {(["today", "yesterday"] as DaySub[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setDaySub(s)}
                        className={`px-2 py-1 rounded font-bold text-xs transition-all ${
                          daySub === s
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-secondary-foreground hover:brightness-110"
                        }`}
                      >
                        {s === "today" ? "Vandaag" : "Gisteren"}
                      </button>
                    ))}
                  </div>
                </div>
                {isLoading ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    {[0,1,2,3].map((i) => (
                      <div key={i} className="h-7 rounded bg-secondary/40 animate-pulse" />
                    ))}
                  </div>
                ) : !hasAny ? (
                  <p className="text-xs text-muted-foreground py-1">Nog geen data</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {champs.map((c) => (
                      <div
                        key={c.label}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs bg-secondary/40"
                      >
                        <span className="text-muted-foreground font-bold shrink-0">{c.icon} {c.label}</span>
                        {c.entry ? (
                          <span className="flex items-center gap-1 min-w-0">
                            <span
                              className="font-bold truncate cursor-pointer hover:underline text-foreground"
                              translate="no"
                              onClick={() => navigate(`/profile/${c.entry!.id}`)}
                            >
                              {c.entry.display_name}
                            </span>
                            <span className="text-muted-foreground font-normal shrink-0">({c.entry.value})</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <CollapsibleSection
            title="⭐ Aantal punten"
            isOpen={!!expanded["points"]}
            isLoading={!!loadingSection["pointsToday"] || !!loadingSection["players"]}
            onToggle={() => toggleExpand("points", async () => {
              await Promise.all([
                ensureLoaded("players", loadAllPlayers),
                ensureLoaded("pointsToday", loadPointsToday),
              ]);
            })}
            headerExtra={
              <SubTabs
                tabs={[{ key: "total", label: "Totaal" }, { key: "today", label: "Vandaag" }]}
                activeKey={pointsSub}
                onTabChange={(k) => setPointsSub(k as PointsSub)}
              />
            }
          >
            {renderMiniList(pointsSub === "total" ? pointsTotalList : pointsToday, "⭐")}
          </CollapsibleSection>

          <CollapsibleSection
            title="🎯 Aantal spellen"
            isOpen={!!expanded["games"]}
            isLoading={!!loadingSection["gamesTotal"] || !!loadingSection["gamesToday"]}
            onToggle={() => toggleExpand("games", async () => {
              await Promise.all([
                ensureLoaded("gamesTotal", loadGamesTotal),
                ensureLoaded("gamesToday", loadGamesToday),
              ]);
            })}
            headerExtra={
              <SubTabs
                tabs={[{ key: "total", label: "Totaal" }, { key: "today", label: "Vandaag" }]}
                activeKey={gamesSub}
                onTabChange={(k) => setGamesSub(k as GamesSub)}
              />
            }
          >
            {renderMiniList(gamesSub === "total" ? gamesTotal : gamesToday, "🎮")}
          </CollapsibleSection>

          <CollapsibleSection
            title="🔥 Reeks"
            isOpen={!!expanded["streak"]}
            isLoading={!!loadingSection["players"]}
            onToggle={() => toggleExpand("streak", () => ensureLoaded("players", loadAllPlayers))}
            headerExtra={
              <SubTabs
                tabs={[{ key: "max", label: "Maximaal" }, { key: "current", label: "Huidige" }]}
                activeKey={streakSub}
                onTabChange={(k) => setStreakSub(k as StreakSub)}
              />
            }
          >
            {renderMiniList(streakSub === "max" ? maxStreakList : currentStreakList, "🔥")}
          </CollapsibleSection>

          <CollapsibleSection
            title="🏅 Badges"
            isOpen={!!expanded["badges"]}
            isLoading={!!loadingSection["badges"]}
            onToggle={() => toggleExpand("badges", () => ensureLoaded("badges", loadBadges))}
          >
            {renderMiniList(badgesList, "🏅")}
          </CollapsibleSection>

          <CollapsibleSection
            title="⚔️ Uitdagingen"
            isOpen={!!expanded["challenges"]}
            isLoading={!!loadingSection["challenges"]}
            onToggle={() => toggleExpand("challenges", () => ensureLoaded("challenges", loadChallenges))}
          >
            {renderMiniList(challengesList, "⚔️")}
          </CollapsibleSection>
          </>
        )}

        {tab !== "overview" && (
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
          </div>
        )}

        {tab === "points" && (
          <>
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
            {(gamesSub === "total" ? gamesTotal : gamesToday).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nog geen data</p>
            ) : (
              (gamesSub === "total" ? gamesTotal : gamesToday).map((e, i) =>
                renderRow(e, i, "🎮"),
              )
            )}
          </>
        )}

        {tab === "badges" && (
          <>
            {badgesList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nog geen data</p>
            ) : (
              badgesList.map((e, i) => renderRow(e, i, "🏅"))
            )}
          </>
        )}

        {tab === "challenges" && (
          <>
            {challengesList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nog geen data</p>
            ) : (
              challengesList.map((e, i) => renderRow(e, i, "⚔️"))
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
