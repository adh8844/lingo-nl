import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer, Player } from "@/hooks/usePlayer";
import { toast } from "sonner";

type Tab = "all" | "friends" | "groups";

interface RankedPlayer {
  id: string;
  display_name: string;
  player_code: string;
  current_streak: number;
  best_streak: number;
}

interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
}

const Rankings = () => {
  const navigate = useNavigate();
  const { player, loading } = usePlayer();
  const [tab, setTab] = useState<Tab>("all");
  const [allPlayers, setAllPlayers] = useState<RankedPlayer[]>([]);
  const [friends, setFriends] = useState<RankedPlayer[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<RankedPlayer[]>([]);
  const [groupCode, setGroupCode] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Load all players
  const loadAllPlayers = useCallback(async () => {
    const { data } = await supabase
      .from("players")
      .select("*")
      .order("best_streak", { ascending: false })
      .limit(100);
    if (data) setAllPlayers(data);
  }, []);

  // Load friends
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
      .order("best_streak", { ascending: false });
    if (data) setFriends(data);
  }, [player]);

  // Load groups the player is in
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

  // Load group members
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
      .order("best_streak", { ascending: false });
    if (data) setGroupMembers(data);
  }, []);

  useEffect(() => {
    if (tab === "all") loadAllPlayers();
    if (tab === "friends" && player) loadFriends();
    if (tab === "groups" && player) loadGroups();
  }, [tab, player, loadAllPlayers, loadFriends, loadGroups]);

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

    // Auto-join the group
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">LINGO</div>
      </div>
    );
  }

  const renderRankRow = (entry: RankedPlayer, i: number) => {
    const isMe = player?.id === entry.id;
    return (
      <div
        key={entry.id}
        className={`flex items-center justify-between px-3 sm:px-4 py-2.5 rounded-lg text-sm ${
          isMe ? "bg-primary/15 border border-primary/30" : "bg-secondary/60"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-muted-foreground font-bold w-6 sm:w-8 text-right shrink-0">
            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
          </span>
          <span className={`font-bold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
            {entry.display_name}
            {isMe && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            now: {entry.current_streak}
          </span>
          <span className="font-extrabold">🔥 {entry.best_streak}</span>
        </div>
      </div>
    );
  };

  const selectedGroupData = groups.find((g) => g.id === selectedGroup);

  return (
    <div className="min-h-screen flex flex-col items-center py-4 sm:py-8 px-3 sm:px-4">
      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={() => navigate("/")}
          className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm hover:brightness-110 transition-all"
        >
          ← Back
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
          🏆 Rankings
        </h1>
        <div className="w-16" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 w-full max-w-lg">
        {(["all", "friends", "groups"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedGroup(null); }}
            className={`flex-1 px-3 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:brightness-110"
            }`}
          >
            {t === "all" ? "🌍 All Players" : t === "friends" ? "👥 Friends" : "🏠 Groups"}
          </button>
        ))}
      </div>

      <div className="w-full max-w-lg flex flex-col gap-2">
        {/* ALL PLAYERS TAB */}
        {tab === "all" && (
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
                {/* Leaderboard with self included */}
                {(() => {
                  const combined = [
                    player,
                    ...friends.filter((f) => f.id !== player.id),
                  ].sort((a, b) => b.best_streak - a.best_streak || b.current_streak - a.current_streak);
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
              /* Group detail view */
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
              /* Groups list */
              <div className="flex flex-col gap-3">
                {/* Join / Create actions */}
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

                {/* Group list */}
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
