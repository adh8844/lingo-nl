import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PUPIL_EMAIL_DOMAIN = "pupil.dingolingo.local";

function slugifyFirstName(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "")
    .slice(0, 20);
}
const rand3 = () => String(Math.floor(Math.random() * 1000)).padStart(3, "0");
const rand4pwd = () => String(Math.floor(Math.random() * 10000)).padStart(4, "0");

function generatePlayerCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerUserId = userData.user.id;

    // Check teacher role + get school
    const { data: isTeacherData } = await userClient.rpc("is_teacher");
    if (!isTeacherData) {
      return new Response(JSON.stringify({ error: "Forbidden: niet docent" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: teacherPlayer } = await admin
      .from("players").select("id, school_id").eq("user_id", callerUserId).maybeSingle();

    if (!teacherPlayer?.school_id) {
      return new Response(JSON.stringify({ error: "Docent niet aan school gekoppeld" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const firstName: string = (body.first_name ?? "").toString().trim();
    const lastName: string = (body.last_name ?? "").toString().trim();
    const age: number | null = body.age != null && body.age !== "" ? Number(body.age) : null;
    const group: number | null = body.school_group != null && body.school_group !== "" ? Number(body.school_group) : null;
    const mode: string = (body.preferred_mode ?? "leren").toString();

    if (!firstName) {
      return new Response(JSON.stringify({ error: "Voornaam is verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["leren", "oefenen", "klassiek", "uitdaging"].includes(mode)) {
      return new Response(JSON.stringify({ error: "Ongeldige speelmodus" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const base = slugifyFirstName(firstName) || "leerling";

    // Generate unique username
    let username = "";
    let createdAuth: { id: string } | null = null;
    const password = rand4pwd();
    let attempts = 0;
    while (attempts < 20 && !createdAuth) {
      attempts++;
      const candidate = `${base}${rand3()}`;
      const email = `${candidate}@${PUPIL_EMAIL_DOMAIN}`;

      // check players.username uniqueness
      const { data: existing } = await admin
        .from("players").select("id").ilike("username", candidate).maybeSingle();
      if (existing) continue;

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: `${firstName}${lastName ? " " + lastName : ""}`, pupil: true },
      });
      if (createErr) {
        if (/already registered|exists/i.test(createErr.message)) continue;
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      createdAuth = { id: created.user!.id };
      username = candidate;
    }

    if (!createdAuth) {
      return new Response(JSON.stringify({ error: "Kon geen unieke gebruikersnaam genereren" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const displayName = `${firstName}${lastName ? " " + lastName : ""}`;
    const birthdate = age && age > 0 && age < 120
      ? new Date(new Date().getFullYear() - age, 0, 1).toISOString().slice(0, 10)
      : null;

    // Insert player row
    let playerCode = generatePlayerCode();
    let playerId: string | null = null;
    for (let i = 0; i < 5 && !playerId; i++) {
      const { data: inserted, error: insErr } = await admin.from("players").insert({
        user_id: createdAuth.id,
        display_name: displayName,
        player_code: playerCode,
        username,
        school_id: teacherPlayer.school_id,
        preferred_mode: mode,
        school_group: group,
        birthdate,
      }).select("id").maybeSingle();
      if (insErr) {
        if (insErr.code === "23505") { playerCode = generatePlayerCode(); continue; }
        // rollback auth user
        await admin.auth.admin.deleteUser(createdAuth.id);
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      playerId = inserted?.id ?? null;
    }

    if (playerId) {
      await admin.from("pupil_credentials").insert({
        player_id: playerId,
        username,
        password,
        created_by: teacherPlayer.id,
      });
      // Assign 'leerling' role
      await admin.from("user_roles").insert({
        user_id: createdAuth.id,
        role: "leerling",
      });
    }


    return new Response(
      JSON.stringify({ username, password, player_id: playerId, display_name: displayName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
