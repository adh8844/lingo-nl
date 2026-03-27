import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";
import { usePresence, OnlinePlayer } from "@/hooks/usePresence";
import { useOnlineMatch } from "@/hooks/useOnlineMatch";
import { WordLength } from "@/data/words";
import { toast } from "sonner";

type Tab = "points" | "friends" | "groups";

interface RankedPlayer {
  id: string;
  display_name: string;
  player_code: string;
  current_streak: number;
  best_streak: number;
  points: number;
}

interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
}

const TIMER_OPTIONS = [30, 60, 90, 120];

const Rankings = () => {
  const navigate = useNavigate();
  const { player, loading } = usePlayer();
  const [tab, setTab] = useState<Tab>("points");
  const [allPlayers, setAllPlayers] = useState<RankedPlayer[]>([]);
  const [friends, setFriends] = useState<RankedPlayer[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<RankedPlayer[]>([]);
  const [groupCode, setGroupCode] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Challenge UI state
  const [challengingId, setChallengingId] = useState<string | null>(null);
  const [challengeTimer, setChallengeTimer] = useState(60);
  const [challengeWordLength, setChallengeWordLength] = useState<WordLength>(5);
  const [sending, setSending] = useState(false);

  const { onlinePlayers } = usePresence(player?.id);
  const { activeMatch, sendChallenge } = useOnlineMatch(player?.id);

  // Create a set of online player IDs for quick lookup
  const onlinePlayerIds = new Set(onlinePlayers.map(p => p.player_id));

  useEffect(() => {
    if (activeMatch) {
      navigate("/online-match");
    }
  }, [activeMatch, navigate]);

  const loadPointsRanking = useCallback(async () => {
    const { data } = await supabase
      .from("players")
      .select("*")
      .order("points", { ascending: false })
      .limit(100);
    if (data) setAllPlayers(data.map(p => ({ ...p, points: p.points ?? 0 })));
  }, []);

  const loadFriends = useCallback(async () => {
    if (!player) return;
    const { data: friendLinks } = await supabase
      .from("friends")
      .select("friend_id")
      .eq("player_id", player.id);

    if (!friendLinks || friendLinks.length === 0) {
      setFriends([]);
      return;
    }

    const friendIds = friendLinks.map((f) => f.friend_id);
    const { data } = await supabase
      .from("players")
      .select("*")
      .in("id", friendIds)
      .order("points", { ascending: false });
    if (data) setFriends(data.map(p => ({ ...p, points: p.points ?? 0 })));
  }, [player]);

  const loadGroups = useCallback(async () => {
    if (!player) return;
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("player_id", player.id);

    if (!memberships || memberships.length === 0) {
      setGroups([]);
      return;
    }

    const groupIds = memberships.map((m) => m.group_id);
    const { data } = await supabase
      .from("groups")
      .select("*")
      .in("id", groupIds);
    if (data) setGroups(data);
  }, [player]);

  const loadGroupMembers = useCallback(async (groupId: string) => {
    const { data: members } = await supabase
      .from("group_members")
      .select("player_id")
      .eq("group_id", groupId);

    if (!members || members.length === 0) {
      setGroupMembers([]);
      return;
    }

    const playerIds = members.map((m) => m.player_id);
    const { data } = await supabase
      .from("players")
      .select("*")
      .in("id", playerIds)
      .order("points", { ascending: false });
    if (data) setGroupMembers(data.map(p => ({ ...p, points: p.points ?? 0 })));
  }, []);

  useEffect(() => {
    if (tab === "points") loadPointsRanking();
    if (tab === "friends" && player) loadFriends();
    if (tab === "groups" && player) loadGroups();
  }, [tab, player, loadPointsRanking, loadFriends, loadGroups]);

  useEffect(() => {
    if (selectedGroup) loadGroupMembers(selectedGroup);
  }, [selectedGroup, loadGroupMembers]);

  const createGroup = async () => {
    if (!player || !newGroupName.trim()) return;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

    const { data, error } = await supabase
      .from("groups")
      .insert({ name: newGroupName.trim(), invite_code: code, created_by: player.id })
      .select()
      .single();

    if (error) {
      toast.error("Could not create group");
      return;
    }

    await supabase.from("group_members").insert({ group_id: data.id, player_id: player.id });
    toast.success(`Group "${data.name}" created! Code: ${code}`);
    setNewGroupName("");
    setShowCreateGroup(false);
    loadGroups();
  };

  const joinGroup = async () => {
    if (!player) return;
    const code = groupCode.trim().toUpperCase();
    if (!code) return;

    const { data: group } = await supabase
      .from("groups")
      .select("*")
      .eq("invite_code", code)
      .single();

    if (!group) {
      toast.error("Group not found");
      return;
    }

    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: group.id, player_id: player.id });

    if (error?.code === "23505") {
      toast.info("Already in this group!");
    } else if (error) {
      toast.error("Error joining group");
    } else {
      toast.success(`Joined "${group.name}"!`);
    }

    setGroupCode("");
    loadGroups();
  };

  const leaveGroup = async (groupId: string) => {
    if (!player) return;
    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("player_id", player.id);
    setSelectedGroup(null);
    loadGroups();
    toast.success("Left group");
  };

  const handleSendChallenge = async (targetId: string) => {
    setSending(true);
    const result = await sendChallenge(targetId, challengeTimer, challengeWordLength, "nl");
    setSending(false);
    if (result) {
      toast.success("Uitdaging verstuurd!");
      setChallengingId(null);
    } else {
      toast.error("Kon uitdaging niet versturen");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">LINGO</div>
      </div>
    );
  }

  const renderChallengeSettings = (targetPlayerId: string) => {
    if (challengingId !== targetPlayerId) return null;
    return (
      <div className="mt-2 p-3 rounded-lg bg-card border border-border flex flex-col gap-3">
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium w-14">Letters:</span>
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
        <button
          onClick={() => handleSendChallenge(targetPlayerId)}
          disabled={sending}
          className="w-full px-4 py-2 rounded-lg bg-accent text-accent-foreground font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
        >
          {sending ? "..." : "⚔️ Verstuur uitdaging"}
        </button>
      </div>
    );
  };

  const renderRankRow = (entry: RankedPlayer, i: number) => {
    const isMe = player?.id === entry.id;
    const isOnline = onlinePlayerIds.has(entry.id);
    const canChallenge = isOnline && !isMe;

    return (
      <div key={entry.id}>
        <div
          className={`flex items-center justify-between px-3 sm:px-4 py-2.5 rounded-lg text-sm ${
            isMe ? "bg-primary/15 border border-primary/30" : "bg-secondary/60"
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-muted-foreground font-bold w-6 sm:w-8 text-right shrink-0">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              {isOnline && (
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              )}
              <span className={`font-bold truncate ${isMe ? "text-primary" : "text-foreground"}`} translate="no">
                {entry.display_name}
                {isMe && <span className="text-xs text-muted-foreground ml-1">(jij)</span>}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="font-extrabold">⭐ {entry.points}</span>
            {canChallenge && (
              <button
                onClick={() => setChallengingId(challengingId === entry.id ? null : entry.id)}
                className="px-2 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:brightness-110 transition-all"
              >
                ⚔️
              </button>
            )}
          </div>
        </div>
        {renderChallengeSettings(entry.id)}
      </div>
    );
  };

  const selectedGroupData = groups.find((g) => g.id === selectedGroup);

  const tabs: { key: Tab; label: string }[] = [
    { key: "points", label: "⭐ Punten" },
    { key: "friends", label: "👥 Vrienden" },
    { key: "groups", label: "🏠 Groepen" },
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

      <div className="flex gap-1 mb-4 sm:mb-6 w-full max-w-lg overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelectedGroup(null); setChallengingId(null); }}
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
        {/* POINTS TAB */}
        {tab === "points" && (
          <>
            {allPlayers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No players yet</p>
            ) : (
              allPlayers.map((p, i) => renderRankRow(p, i))
            )}
          </>
        )}

        {/* FRIENDS TAB */}
        {tab === "friends" && (
          <>
            {!player ? (
              <p className="text-center text-muted-foreground py-8">Create a player first</p>
            ) : (
              <>
                {(() => {
                  const combined = [
                    { ...player, points: player.points ?? 0 },
                    ...friends.filter((f) => f.id !== player.id),
                  ].sort((a, b) => b.points - a.points);
                  return combined.length === 1 && friends.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Add friends from the home screen to see them here!
                    </p>
                  ) : (
                    combined.map((p, i) => renderRankRow(p, i))
                  );
                })()}
              </>
            )}
          </>
        )}

        {/* GROUPS TAB */}
        {tab === "groups" && (
          <>
            {!player ? (
              <p className="text-center text-muted-foreground py-8">Create a player first</p>
            ) : selectedGroup && selectedGroupData ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← All groups
                  </button>
                  <button
                    onClick={() => leaveGroup(selectedGroup)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive font-bold hover:bg-destructive/30 transition-colors"
                  >
                    Leave
                  </button>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-card">
                  <span className="font-extrabold text-foreground">{selectedGroupData.name}</span>
                  <span
                    className="font-mono text-xs text-primary cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedGroupData.invite_code);
                      toast.success("Code copied!");
                    }}
                  >
                    Code: {selectedGroupData.invite_code}
                  </span>
                </div>
                {groupMembers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No members yet</p>
                ) : (
                  groupMembers.map((p, i) => renderRankRow(p, i))
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                    placeholder="Group code"
                    maxLength={6}
                    className="flex-1 px-3 py-2 rounded-lg bg-muted text-foreground font-mono font-bold text-center text-sm tracking-widest border-2 border-transparent focus:border-primary focus:outline-none transition-colors uppercase"
                  />
                  <button
                    onClick={joinGroup}
                    disabled={groupCode.length < 6}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>

                {showCreateGroup ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Group name"
                      maxLength={30}
                      className="flex-1 px-3 py-2 rounded-lg bg-muted text-foreground font-bold text-sm border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                    />
                    <button
                      onClick={createGroup}
                      disabled={!newGroupName.trim()}
                      className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => { setShowCreateGroup(false); setNewGroupName(""); }}
                      className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm hover:brightness-110 transition-all"
                  >
                    + Create a group
                  </button>
                )}

                {groups.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    Join or create a group to compete!
                  </p>
                ) : (
                  groups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGroup(g.id)}
                      className="flex items-center justify-between px-4 py-3 rounded-lg bg-card hover:brightness-110 transition-all text-left"
                    >
                      <span className="font-bold text-foreground">{g.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{g.invite_code}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Rankings;
