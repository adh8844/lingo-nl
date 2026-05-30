import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface DefinitionResult {
  definition: string | null
  example: string | null
}

function parseAiText(text: string): DefinitionResult {
  // Expected: "<korte uitleg>. <voorbeeldzin>"
  const cleaned = text.trim().replace(/\s+/g, ' ')
  // Split on sentence boundary
  const match = cleaned.match(/^(.+?[.!?])\s+(.+)$/)
  if (match) {
    return { definition: match[1].trim(), example: match[2].trim() }
  }
  // Fallback: split on first ". "
  const parts = cleaned.split('. ')
  if (parts.length >= 2) {
    return {
      definition: parts[0].trim() + '.',
      example: parts.slice(1).join('. ').trim(),
    }
  }
  return { definition: cleaned, example: null }
}

const DEFAULT_PROMPT = `Een korte uitleg van het woord '[WORD]'. Gebruik hiervoor maximaal 40 tekens. Gevolgd door een voorbeeldzin met dit woord erin. Deze zin mag niet langer zijn dan 25 tekens.`

async function getPromptTemplate(admin: ReturnType<typeof createClient>): Promise<string> {
  try {
    const { data } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'word_definition_prompt')
      .maybeSingle()
    const v = (data as any)?.value
    if (typeof v === 'string' && v.trim().length > 0) return v
  } catch (e) {
    console.error('getPromptTemplate error', e)
  }
  return DEFAULT_PROMPT
}

async function generateDefinition(word: string, admin: ReturnType<typeof createClient>): Promise<DefinitionResult> {
  const template = await getPromptTemplate(admin)
  const prompt = template.replaceAll('[WORD]', word)

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    console.error('AI gateway error', res.status, await res.text())
    return { definition: null, example: null }
  }

  const json = await res.json()
  const text: string = json?.choices?.[0]?.message?.content ?? ''
  if (!text) return { definition: null, example: null }
  return parseAiText(text)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const wordRaw = typeof body.word === 'string' ? body.word.trim().toLowerCase() : ''
    const length = Number(body.length)

    if (!wordRaw || !Number.isInteger(length) || length < 2 || length > 20) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    const { data: existing } = await admin
      .from('word_definitions')
      .select('definition, example')
      .eq('word', wordRaw)
      .eq('length', length)
      .maybeSingle()

    if (existing && (existing.definition || existing.example)) {
      return new Response(JSON.stringify(existing), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const generated = await generateDefinition(wordRaw)

    if (generated.definition || generated.example) {
      await admin.from('word_definitions').upsert(
        {
          word: wordRaw,
          length,
          definition: generated.definition,
          example: generated.example,
          source: 'ai',
        },
        { onConflict: 'word,length' },
      )
    }

    return new Response(JSON.stringify(generated), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('get-word-definition error', e)
    return new Response(JSON.stringify({ definition: null, example: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
