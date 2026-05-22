import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const WEBHOOK_URL = Deno.env.get('WEBHOOK_URL');
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!WEBHOOK_URL || !WEBHOOK_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const { title, description, type, severity, reporter, source_url } = body ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Titel is verplicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = {
      title,
      description: description ?? '',
      type: type ?? 'bug',
      severity: severity ?? 'Medium',
      reporter: reporter ?? '',
      source_url: source_url ?? '',
      timestamp: new Date().toISOString(),
    };

    const rawBody = JSON.stringify(payload);
    const signature = await hmacSha256Hex(WEBHOOK_SECRET, rawBody);

    const resp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
      },
      body: rawBody,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return new Response(
        JSON.stringify({ success: false, error: `Webhook responded ${resp.status}: ${text.slice(0, 200)}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
