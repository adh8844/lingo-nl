export interface Player {
  id: string;
  player_code: string;
  display_name: string;
  current_streak: number;
  best_streak: number;
  points: number;
  birthdate?: string | null;
  total_games_played: number;
  total_hours_played: number;
  last_played_date?: string | null;
  unlocked_5letter: boolean;
  unlocked_6letter: boolean;
  created_at: string;
  user_id?: string | null;
  school_id?: string | null;
}