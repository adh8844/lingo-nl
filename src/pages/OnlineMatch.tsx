import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "@/hooks/usePlayer";
import { useOnlineMatch } from "@/hooks/useOnlineMatch";
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
    requestRematch,
    declineRematch,
    forfeitMatch,
  } = useOnlineMatch(player?.id);

  const [opponentName, setOpponentName] = useState("Tegenstander");
  

  useEffect(() => {
    if (!activeMatch || !player) return;
    const opponentId = activeMatch.player1_id === player.id
      ? activeMatch.player2_id
      : activeMatch.player1_id;

    if (!opponentId) return;

    supabase
      .from("players")
      .select("display_name")
      .eq("id", opponentId)
      .single()
      .then(({ data }) => {
        if (data) setOpponentName(data.display_name);
      });
  }, [activeMatch?.id, activeMatch?.player1_id, activeMatch?.player2_id, player?.id]);

  // Points are now handled server-side via process-game-result edge function

  // Detect opponent declined rematch
  useEffect(() => {
    if (!activeMatch || activeMatch.status !== "finished" || !player) return;
    const m = activeMatch as any;
    const isPlayer1 = player.id === activeMatch.player1_id;
    const opRematch = isPlayer1 ? m.rematch_player2 : m.rematch_player1;

    if (opRematch === false) {
      const timer = setTimeout(() => {
        leaveMatch();
        navigate("/rankings");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeMatch, player, navigate, leaveMatch]);

  const handleLeave = () => {
    if (activeMatch?.status === "finished") {
      declineRematch();
    }
    leaveMatch();
    navigate("/rankings");
  };

  const handleForfeit = async () => {
    await forfeitMatch();
    // Don't navigate yet - let the match status update show the result
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
        onRequestRematch={requestRematch}
        onDeclineRematch={declineRematch}
        onForfeit={handleForfeit}
      />
    </div>
  );
};

export default OnlineMatchPage;
