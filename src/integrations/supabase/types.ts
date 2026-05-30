export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          description: string
          id: string
          is_rare: boolean
          name: string
          points: number
        }
        Insert: {
          category: string
          description: string
          id: string
          is_rare?: boolean
          name: string
          points?: number
        }
        Update: {
          category?: string
          description?: string
          id?: string
          is_rare?: boolean
          name?: string
          points?: number
        }
        Relationships: []
      }
      dutch_words: {
        Row: {
          appropriate: boolean
          approved: boolean
          created_at: string
          id: string
          length: number
          rejected: boolean
          suggested_by: string | null
          word: string
        }
        Insert: {
          appropriate?: boolean
          approved?: boolean
          created_at?: string
          id?: string
          length: number
          rejected?: boolean
          suggested_by?: string | null
          word: string
        }
        Update: {
          appropriate?: boolean
          approved?: boolean
          created_at?: string
          id?: string
          length?: number
          rejected?: boolean
          suggested_by?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "dutch_words_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dutch_words_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          player_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          player_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      game_completions: {
        Row: {
          completed_date: string
          created_at: string
          id: string
          player_id: string
        }
        Insert: {
          completed_date?: string
          created_at?: string
          id?: string
          player_id: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_completions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_completions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          attempts: number | null
          duration_seconds: number | null
          first_green_attempt: number | null
          id: string
          level: number
          played_at: string
          player_id: string
          points_earned: number
          session_id: string | null
          solved: boolean
          word: string
        }
        Insert: {
          attempts?: number | null
          duration_seconds?: number | null
          first_green_attempt?: number | null
          id?: string
          level: number
          played_at?: string
          player_id: string
          points_earned?: number
          session_id?: string | null
          solved?: boolean
          word: string
        }
        Update: {
          attempts?: number | null
          duration_seconds?: number | null
          first_green_attempt?: number | null
          id?: string
          level?: number
          played_at?: string
          player_id?: string
          points_earned?: number
          session_id?: string | null
          solved?: boolean
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_games_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_games_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          player_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          player_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      match_round_progress: {
        Row: {
          attempt_number: number
          correct_count: number
          created_at: string
          id: string
          match_id: string
          player_id: string
          round_id: string
        }
        Insert: {
          attempt_number: number
          correct_count?: number
          created_at?: string
          id?: string
          match_id: string
          player_id: string
          round_id: string
        }
        Update: {
          attempt_number?: number
          correct_count?: number
          created_at?: string
          id?: string
          match_id?: string
          player_id?: string
          round_id?: string
        }
        Relationships: []
      }
      match_rounds: {
        Row: {
          created_at: string
          id: string
          match_id: string
          player1_guess_time_ms: number | null
          player2_guess_time_ms: number | null
          round_number: number
          status: string
          winner_id: string | null
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          player1_guess_time_ms?: number | null
          player2_guess_time_ms?: number | null
          round_number: number
          status?: string
          winner_id?: string | null
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          player1_guess_time_ms?: number | null
          player2_guess_time_ms?: number | null
          round_number?: number
          status?: string
          winner_id?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_rounds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "online_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rounds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "online_matches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rounds_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rounds_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      online_challenges: {
        Row: {
          challenged_id: string
          challenger_id: string
          created_at: string
          id: string
          language: string
          status: string
          timer_seconds: number
          word_length: number
        }
        Insert: {
          challenged_id: string
          challenger_id: string
          created_at?: string
          id?: string
          language?: string
          status?: string
          timer_seconds?: number
          word_length?: number
        }
        Update: {
          challenged_id?: string
          challenger_id?: string
          created_at?: string
          id?: string
          language?: string
          status?: string
          timer_seconds?: number
          word_length?: number
        }
        Relationships: [
          {
            foreignKeyName: "online_challenges_challenged_id_fkey"
            columns: ["challenged_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_challenges_challenged_id_fkey"
            columns: ["challenged_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      online_matches: {
        Row: {
          created_at: string
          current_round: number
          current_word: string | null
          forfeited_by: string | null
          id: string
          language: string
          player1_id: string
          player1_wins: number
          player2_id: string
          player2_wins: number
          rematch_player1: boolean | null
          rematch_player2: boolean | null
          status: string
          timer_seconds: number
          updated_at: string
          winner_id: string | null
          word_length: number
        }
        Insert: {
          created_at?: string
          current_round?: number
          current_word?: string | null
          forfeited_by?: string | null
          id?: string
          language?: string
          player1_id: string
          player1_wins?: number
          player2_id: string
          player2_wins?: number
          rematch_player1?: boolean | null
          rematch_player2?: boolean | null
          status?: string
          timer_seconds?: number
          updated_at?: string
          winner_id?: string | null
          word_length?: number
        }
        Update: {
          created_at?: string
          current_round?: number
          current_word?: string | null
          forfeited_by?: string | null
          id?: string
          language?: string
          player1_id?: string
          player1_wins?: number
          player2_id?: string
          player2_wins?: number
          rematch_player1?: boolean | null
          rematch_player2?: boolean | null
          status?: string
          timer_seconds?: number
          updated_at?: string
          winner_id?: string | null
          word_length?: number
        }
        Relationships: [
          {
            foreignKeyName: "online_matches_forfeited_by_fkey"
            columns: ["forfeited_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_forfeited_by_fkey"
            columns: ["forfeited_by"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      player_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          player_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          player_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pbadges_badge"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pbadges_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pbadges_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      player_presence: {
        Row: {
          last_seen: string
          player_id: string
          status: string
        }
        Insert: {
          last_seen?: string
          player_id: string
          status?: string
        }
        Update: {
          last_seen?: string
          player_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_presence_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_presence_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          best_streak: number
          birthdate: string | null
          created_at: string
          current_streak: number
          display_name: string
          id: string
          last_played_date: string | null
          player_code: string
          points: number
          school_id: string | null
          total_games_played: number
          total_hours_played: number
          unlocked_5letter: boolean
          unlocked_6letter: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          best_streak?: number
          birthdate?: string | null
          created_at?: string
          current_streak?: number
          display_name: string
          id?: string
          last_played_date?: string | null
          player_code: string
          points?: number
          school_id?: string | null
          total_games_played?: number
          total_hours_played?: number
          unlocked_5letter?: boolean
          unlocked_6letter?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          best_streak?: number
          birthdate?: string | null
          created_at?: string
          current_streak?: number
          display_name?: string
          id?: string
          last_played_date?: string | null
          player_code?: string
          points?: number
          school_id?: string | null
          total_games_played?: number
          total_hours_played?: number
          unlocked_5letter?: boolean
          unlocked_6letter?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      points_log: {
        Row: {
          created_at: string
          game_id: string | null
          id: string
          player_id: string
          points: number
          reason: string
        }
        Insert: {
          created_at?: string
          game_id?: string | null
          id?: string
          player_id: string
          points: number
          reason: string
        }
        Update: {
          created_at?: string
          game_id?: string | null
          id?: string
          player_id?: string
          points?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_points_game"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_points_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_points_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      school_details: {
        Row: {
          contact_email: string
          contact_name: string
          contact_phone: string | null
          invite_code: string
          school_id: string
        }
        Insert: {
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          invite_code: string
          school_id: string
        }
        Update: {
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          invite_code?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_details_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      word_definitions: {
        Row: {
          created_at: string
          definition: string | null
          example: string | null
          id: string
          length: number
          source: string
          updated_at: string
          word: string
        }
        Insert: {
          created_at?: string
          definition?: string | null
          example?: string | null
          id?: string
          length: number
          source?: string
          updated_at?: string
          word: string
        }
        Update: {
          created_at?: string
          definition?: string | null
          example?: string | null
          id?: string
          length?: number
          source?: string
          updated_at?: string
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      match_rounds_public: {
        Row: {
          created_at: string | null
          id: string | null
          match_id: string | null
          player1_guess_time_ms: number | null
          player2_guess_time_ms: number | null
          round_number: number | null
          status: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          match_id?: string | null
          player1_guess_time_ms?: number | null
          player2_guess_time_ms?: number | null
          round_number?: number | null
          status?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          match_id?: string | null
          player1_guess_time_ms?: number | null
          player2_guess_time_ms?: number | null
          round_number?: number | null
          status?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_rounds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "online_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rounds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "online_matches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rounds_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rounds_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      online_matches_public: {
        Row: {
          created_at: string | null
          current_round: number | null
          forfeited_by: string | null
          id: string | null
          language: string | null
          player1_id: string | null
          player1_wins: number | null
          player2_id: string | null
          player2_wins: number | null
          rematch_player1: boolean | null
          rematch_player2: boolean | null
          status: string | null
          timer_seconds: number | null
          updated_at: string | null
          winner_id: string | null
          word_length: number | null
        }
        Insert: {
          created_at?: string | null
          current_round?: number | null
          forfeited_by?: string | null
          id?: string | null
          language?: string | null
          player1_id?: string | null
          player1_wins?: number | null
          player2_id?: string | null
          player2_wins?: number | null
          rematch_player1?: boolean | null
          rematch_player2?: boolean | null
          status?: string | null
          timer_seconds?: number | null
          updated_at?: string | null
          winner_id?: string | null
          word_length?: number | null
        }
        Update: {
          created_at?: string | null
          current_round?: number | null
          forfeited_by?: string | null
          id?: string | null
          language?: string | null
          player1_id?: string | null
          player1_wins?: number | null
          player2_id?: string | null
          player2_wins?: number | null
          rematch_player1?: boolean | null
          rematch_player2?: boolean | null
          status?: string | null
          timer_seconds?: number | null
          updated_at?: string | null
          winner_id?: string | null
          word_length?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "online_matches_forfeited_by_fkey"
            columns: ["forfeited_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_forfeited_by_fkey"
            columns: ["forfeited_by"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      players_public: {
        Row: {
          best_streak: number | null
          created_at: string | null
          current_streak: number | null
          display_name: string | null
          id: string | null
          last_played_date: string | null
          player_code: string | null
          points: number | null
          total_games_played: number | null
          total_hours_played: number | null
          unlocked_5letter: boolean | null
          unlocked_6letter: boolean | null
          updated_at: string | null
        }
        Insert: {
          best_streak?: number | null
          created_at?: string | null
          current_streak?: number | null
          display_name?: string | null
          id?: string | null
          last_played_date?: string | null
          player_code?: string | null
          points?: number | null
          total_games_played?: number | null
          total_hours_played?: number | null
          unlocked_5letter?: boolean | null
          unlocked_6letter?: boolean | null
          updated_at?: string | null
        }
        Update: {
          best_streak?: number | null
          created_at?: string | null
          current_streak?: number | null
          display_name?: string | null
          id?: string | null
          last_played_date?: string | null
          player_code?: string | null
          points?: number | null
          total_games_played?: number | null
          total_hours_played?: number | null
          unlocked_5letter?: boolean | null
          unlocked_6letter?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_player_id: { Args: never; Returns: string }
      current_player_school_id: { Args: never; Returns: string }
      get_badges_count_in_range: {
        Args: { p_end?: string; p_start: string }
        Returns: {
          badges_count: number
          player_id: string
        }[]
      }
      get_badges_count_total: {
        Args: never
        Returns: {
          badges_count: number
          player_id: string
        }[]
      }
      get_completed_matches_count_in_range: {
        Args: { p_end?: string; p_start: string }
        Returns: {
          matches_count: number
          player_id: string
        }[]
      }
      get_completed_matches_count_total: {
        Args: never
        Returns: {
          matches_count: number
          player_id: string
        }[]
      }
      get_games_count_in_range: {
        Args: { p_end?: string; p_start: string }
        Returns: {
          games_count: number
          player_id: string
        }[]
      }
      get_games_count_total: {
        Args: never
        Returns: {
          games_count: number
          player_id: string
        }[]
      }
      get_my_player: {
        Args: never
        Returns: {
          best_streak: number
          birthdate: string | null
          created_at: string
          current_streak: number
          display_name: string
          id: string
          last_played_date: string | null
          player_code: string
          points: number
          school_id: string | null
          total_games_played: number
          total_hours_played: number
          unlocked_5letter: boolean
          unlocked_6letter: boolean
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_own_games: {
        Args: { p_player_id: string }
        Returns: {
          attempts: number
          duration_seconds: number
          first_green_attempt: number
          level: number
          played_at: string
          points_earned: number
          solved: boolean
        }[]
      }
      get_player_daily_points: {
        Args: { from_date: string; p_id: string; to_date: string }
        Returns: {
          day: string
          total_points: number
        }[]
      }
      get_player_total_points: { Args: { p_id: string }; Returns: number }
      get_points_in_range: {
        Args: { p_end?: string; p_start: string }
        Returns: {
          player_id: string
          total_points: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_match_participant: { Args: { p_match_id: string }; Returns: boolean }
      players_in_same_circle: {
        Args: { p1: string; p2: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
