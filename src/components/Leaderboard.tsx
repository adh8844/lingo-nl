import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Player } from "@/hooks/usePlayer";
import { toast } from "sonner";

interface LeaderboardProps {
  player: Player;
  language: "nl" | "en";
}

interface FriendPlayer {
  id: string;
  display_name: string;
  player_code: string;
  current_streak: number;
  best_streak: number;
}

const Leaderboard = ({ player, language }: LeaderboardProps) => {
  const [friends, setFriends] = useState<FriendPlayer[]>([]);
  const [friendCode, setFriendCode] = useState("");
  const [open, setOpen] = useState(false);

  const loadFriends = useCallback(async () => {
    const { data: friendLinks } = await supabase
      .from("friends")
      .select("friend_id")
      .eq("player_id", player.id);

    if (!friendLinks || friendLinks.length === 0) {
      setFriends([]);
      return;
    }

    const friendIds = friendLinks.map((f) => f.friend_id);
    const { data: friendPlayers } = await supabase
      .from("players")
      .select("*")
      .in("id", friendIds);

    if (friendPlayers) {
      setFriends(friendPlayers);
    }
  }, [player.id]);

  useEffect(() => {
    if (open) loadFriends();
  }, [open, loadFriends]);

  const addFriend = async () => {
    const code = friendCode.trim().toUpperCase();
    if (!code) return;
    if (code === player.player_code) {
      toast.error(language === "nl" ? "Dat is jouw eigen code!" : "That's your own code!");
      return;
    }

    const { data: friendPlayer } = await supabase
      .from("players")
      .select("*")
      .eq("player_code", code)
      .single();

    if (!friendPlayer) {
      toast.error(language === "nl" ? "Speler niet gevonden" : "Player not found");
      return;
    }

    const { error } = await supabase
      .from("friends")
      .insert({ player_id: player.id, friend_id: friendPlayer.id });

    if (error?.code === "23505") {
      toast.info(language === "nl" ? "Al toegevoegd!" : "Already added!");
    } else if (error) {
      toast.error("Error adding friend");
    } else {
      toast.success(
        language === "nl"
          ? `${friendPlayer.display_name} toegevoegd!`
          : `Added ${friendPlayer.display_name}!`
      );
    }

    setFriendCode("");
    loadFriends();
  };

  const removeFriend = async (friendId: string) => {
    await supabase
      .from("friends")
      .delete()
      .eq("player_id", player.id)
      .eq("friend_id", friendId);
    loadFriends();
  };

  // Build leaderboard: player + friends, sorted by best_streak desc
  const leaderboard = [
    { ...player, isMe: true },
    ...friends.map((f) => ({ ...f, isMe: false })),
  ].sort((a, b) => b.best_streak - a.best_streak || b.current_streak - a.current_streak);

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm transition-all hover:brightness-110 flex items-center justify-between"
      >
        <span>🏆 {language === "nl" ? "Vriendenranglijst" : "Friends Leaderboard"}</span>
        <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3 animate-bounce-in">
          {/* My code */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {language === "nl" ? "Jouw code:" : "Your code:"}
            </span>
            <span
              className="font-mono font-extrabold text-primary text-lg tracking-widest cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(player.player_code);
                toast.success(language === "nl" ? "Code gekopieerd!" : "Code copied!");
              }}
              title={language === "nl" ? "Klik om te kopiëren" : "Click to copy"}
            >
              {player.player_code}
            </span>
          </div>

          {/* Add friend */}
          <div className="flex gap-2">
            <input
              type="text"
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
              placeholder={language === "nl" ? "Code van vriend" : "Friend's code"}
              maxLength={6}
              className="flex-1 px-3 py-2 rounded-lg bg-muted text-foreground font-mono font-bold text-center text-sm tracking-widest border-2 border-transparent focus:border-primary focus:outline-none transition-colors uppercase"
            />
            <button
              onClick={addFriend}
              disabled={friendCode.length < 6}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
            >
              +
            </button>
          </div>

          {/* Leaderboard */}
          <div className="flex flex-col gap-1.5">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  entry.isMe
                    ? "bg-primary/15 border border-primary/30"
                    : "bg-secondary/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-bold w-5 text-right">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                  </span>
                  <span className={`font-bold ${entry.isMe ? "text-primary" : "text-foreground"}`}>
                    {entry.display_name}
                    {entry.isMe && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({language === "nl" ? "jij" : "you"})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {language === "nl" ? "nu" : "now"}: {entry.current_streak}
                  </span>
                  <span className="font-extrabold">🔥 {entry.best_streak}</span>
                  {!entry.isMe && (
                    <button
                      onClick={() => removeFriend(entry.id)}
                      className="text-xs text-muted-foreground hover:text-accent transition-colors ml-1"
                      title={language === "nl" ? "Verwijderen" : "Remove"}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
