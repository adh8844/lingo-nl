

# Fix: Points Not Updating Due to 1000-Row Query Limit

## Problem
The `process-game-result` edge function calculates total points by fetching all `points_log` entries for a player (line 411). However, Supabase has a default limit of 1000 rows per query. Janice has 1143 entries, so only 1000 are fetched, resulting in an incorrect (lower) total being written back to `players.points`.

**Affected players:**
- Janice: 1143 entries — currently showing 10061 instead of 11547 (1486 points missing)
- Arjan (905), Horse lover (789) will hit this limit soon

## Solution

### 1. Fix the edge function query (process-game-result/index.ts)
Replace the points summation query (line 411) that fetches all rows with a Supabase RPC or aggregation approach. Two options:

**Option A (simplest):** Use a database function to SUM points server-side:
- Create a DB function `get_player_total_points(p_id uuid)` that returns `SELECT COALESCE(SUM(points), 0) FROM points_log WHERE player_id = p_id`
- Call it via `supabase.rpc('get_player_total_points', { p_id: player_id })`

**Option B:** Paginate the points_log query in the edge function to fetch all rows. This is less efficient.

I recommend **Option A** — a simple DB function.

### 2. Fix Janice's current points
Run a data update to set Janice's points to the correct total (11547) based on the actual SUM of her points_log entries. Also verify and fix any other players whose `players.points` doesn't match their `points_log` SUM.

## Technical Steps

1. **Create migration**: Add `get_player_total_points` database function
2. **Update edge function**: Replace line 411 with an RPC call to the new function
3. **Fix existing data**: Update all players whose `players.points` differs from their actual `points_log` SUM

## Files Changed
- `supabase/functions/process-game-result/index.ts` — use RPC instead of fetching all rows
- New migration for the database function + data fix

