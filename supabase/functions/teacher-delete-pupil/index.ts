import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const callerUserId = userData.user.id;

    const body = await req.json();
    const playerId: string | undefined = body.player_id;
    if (!playerId) return json({ error: "player_id is verplicht" }, 400);

    // Authorization: admin OR teacher in same school as pupil
    const { data: isAdmin } = await userClient.rpc("is_admin");
    const { data: isTeacher } = await userClient.rpc("is_teacher");
    if (!isAdmin && !isTeacher) return json({ error: "Forbidden" }, 403);

    const { data: pupil } = await admin
      .from("players").select("id, user_id, school_id").eq("id", playerId).maybeSingle();
    if (!pupil) return json({ error: "Leerling niet gevonden" }, 404);

    if (!isAdmin) {
      const { data: teacher } = await admin
        .from("players").select("school_id").eq("user_id", callerUserId).maybeSingle();
      if (!teacher?.school_id || teacher.school_id !== pupil.school_id) {
        return json({ error: "Forbidden: leerling niet in jouw school" }, 403);
      }
    }

    // Cleanup
    await admin.from("pupil_credentials").delete().eq("player_id", pupil.id);
    await admin.from("player_presence").delete().eq("player_id", pupil.id);
    await admin.from("player_badges").delete().eq("player_id", pupil.id);
    await admin.from("points_log").delete().eq("player_id", pupil.id);
    await admin.from("games").delete().eq("player_id", pupil.id);
    await admin.from("game_completions").delete().eq("player_id", pupil.id);

    const { error: delPlayerErr } = await admin.from("players").delete().eq("id", pupil.id);
    if (delPlayerErr) return json({ error: delPlayerErr.message }, 400);

    if (pupil.user_id) {
      await admin.from("user_roles").delete().eq("user_id", pupil.user_id);
      await admin.auth.admin.deleteUser(pupil.user_id);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
