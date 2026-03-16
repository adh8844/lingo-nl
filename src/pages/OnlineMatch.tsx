import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "@/hooks/usePlayer";
import { useOnlineMatch } from "@/hooks/useOnlineMatch";
import { usePoints } from "@/hooks/usePoints";
import { supabase } from "@/integrations/supabase/client";
import OnlineGame from "@/components/OnlineGame";

const OnlineMatchPage = () => {
  const navigate = useNavigate();
  const { player, loading } = usePlayer();
  const {
    activeMatch,
    currentRound,
    roundStartTime,
    submitGuessTime,
    submitFailed,
    leaveMatch,
    loadActiveMatch,
  } = useOnlineMatch(player?.id);
  const { awardMatchWin } = usePoints(player?.id);

  const [opponentName, setOpponentName] = useState("Opponent");

  // Load opponent name
  useEffect(() => {
    if (!activeMatch || !player) return;
    const opponentId = activeMatch.player1_id === player.id
      ? activeMatch.player2_id
      : activeMatch.player1_id;

    supabase
      .from("players")
      .select("display_name")
      .eq("id", opponentId)
      .single()
      .then(({ data }) => {
        if (data) setOpponentName(data.display_name);
      });
  }, [activeMatch, player]);

  // Award points when match finishes and player wins
  useEffect(() => {
    if (activeMatch?.status === "finished" && activeMatch.winner_id === player?.id) {
      awardMatchWin();
    }
  }, [activeMatch?.status, activeMatch?.winner_id, player?.id, awardMatchWin]);

  const handleLeave = () => {
    leaveMatch();
    navigate("/rankings");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">LINGO</div>
      </div>
    );
  }

  if (!player) {
    navigate("/");
    return null;
  }

  if (!activeMatch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-lg font-bold text-muted-foreground animate-pulse">
          Waiting for match...
        </div>
        <button
          onClick={() => navigate("/rankings")}
          className="px-4 py-2 bg-secondary text-secondary-foreground font-bold rounded-lg text-sm"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-4 sm:py-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-primary mb-4 sm:mb-6">
        LINGO ⚔️
      </h1>
      <OnlineGame
        match={activeMatch}
        currentRound={currentRound}
        roundStartTime={roundStartTime}
        playerId={player.id}
        opponentName={opponentName}
        onSubmitGuessTime={submitGuessTime}
        onSubmitFailed={submitFailed}
        onLeave={handleLeave}
      />
    </div>
  );
};

export default OnlineMatchPage;
