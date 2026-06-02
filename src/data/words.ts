import { supabase } from "@/integrations/supabase/client";

const dutch4 = [
  "bank", "boot", "boek", "bord", "brug", "deur", "dier", "doel", "geld", "glas",
  "hond", "huis", "kaas", "kind", "klok", "koud", "lamp", "land", "lijn", "maan",
  "melk", "muur", "neus", "paar", "park", "pijn", "reis", "ring", "rood", "rust",
  "snel", "soep", "stad", "step", "taal", "taak", "trap", "tuin", "vuur", "warm",
  "wiel", "wind", "wolk", "zand", "zeep", "ziek", "zing", "zout", "zwak", "zwem",
];

const dutch5 = [
  "appel", "avond", "baker", "beker", "broek", "brood", "draak", "dwerg", "engel",
  "fiets", "groen", "groep", "hamer", "hemel", "hoorn", "kaart", "kabel", "kleur",
  "knoop", "kroeg", "kunst", "laken", "laser", "lever", "loper", "macht", "mango",
  "nacht", "nieuw", "oever", "paard", "piano", "plant", "plein", "prijs", "proef",
  "radio", "regen", "ruzie", "salon", "schip", "slaap", "slang", "staal", "stank",
  "stoel", "storm", "tafel", "tegel", "toren", "trein", "vacht", "vlieg", "vloed",
  "water", "worst", "wraak", "zadel", "zwaan", "zwart", "bloem", "brein", "draad",
  "fabel", "geest", "haven", "inzet", "jeugd", "kwast", "loods", "nagel", "ronde",
  "steel", "taart", "vloot", "waard", "zetel", "zomer",
];

const dutch6 = [
  "donker", "gebied", "geluid", "gratis", "handel", "helder", "insect",
  "jungle", "keuken", "klasse", "koffie", "liefde", "mentor", "midden", "natuur", "nummer",
  "opener", "pagina", "recept", "ridder", "school", "stroom", "tempel",
  "tropen", "tunnel", "vlakte", "vriend", "wandel", "winter", "wonder", "zolder",
  "achter", "balkon", "bewijs", "camera", "detail", "eiland", "folder", "gevoel",
  "hoogte", "kennis", "letter", "marmer", "pakket", "rivier", "scherp", "sigaar",
  "sterke", "strand", "tennis", "uitleg", "veilig", "werken", "zanger", "zilver",
  "cirkel", "danser", "geheim", "haring", "ingang", "kiezen", "ladder", "moeite",
  "oceaan", "piloot", "schaap", "tassen", "vragen", "wassen", "zenden", "anders", "beiden", "tussen",
];

export type WordLength = 4 | 5 | 6 | 10 | 12 | 14;
export type Language = "nl";
export type WordPool = "educational" | "full";

const wordLists: Record<number, string[]> = { 4: dutch4, 5: dutch5, 6: dutch6 };

// Cache per (length, pool) — educatieve en volledige pool gescheiden.
let dbWordsCache: Record<string, string[]> = {};
let dbWordsCacheTime: Record<string, number> = {};
const CACHE_TTL = 60000;

const RECENT_WORDS_KEY = "lingo_recent_words";
const MAX_RECENT_RATIO = 0.5;

function getRecentWords(length: WordLength): string[] {
  try {
    const stored = localStorage.getItem(`${RECENT_WORDS_KEY}_${length}`);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function addRecentWord(word: string, length: WordLength, totalWords: number) {
  const recent = getRecentWords(length);
  const maxRecent = Math.max(1, Math.floor(totalWords * MAX_RECENT_RATIO));
  const updated = [word, ...recent.filter(w => w !== word)].slice(0, maxRecent);
  try { localStorage.setItem(`${RECENT_WORDS_KEY}_${length}`, JSON.stringify(updated)); } catch {}
}

function pickNonRecentWord(words: string[], length: WordLength): string {
  const recent = new Set(getRecentWords(length));
  const available = words.filter(w => !recent.has(w));
  const pool = available.length > 0 ? available : words;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  addRecentWord(chosen, length, words.length);
  return chosen;
}

export async function loadDutchWordsFromDB(length: WordLength, pool: WordPool = "full"): Promise<string[]> {
  const cacheKey = `${length}_${pool}`;
  const now = Date.now();
  if (dbWordsCache[cacheKey] && now - (dbWordsCacheTime[cacheKey] || 0) < CACHE_TTL) {
    return dbWordsCache[cacheKey];
  }
  let query = supabase
    .from("dutch_words")
    .select("word")
    .eq("length", length)
    .eq("approved", true)
    .eq("appropriate", true);
  if (pool === "educational") {
    query = query.eq("educational", true);
  }
  const { data, error } = await query;

  // Educatieve pool nog niet gecureerd? Val terug op de volledige pool zodat
  // de "Leren"-modus altijd speelbaar blijft.
  if (pool === "educational" && (!data || data.length === 0)) {
    return loadDutchWordsFromDB(length, "full");
  }
  if (error || !data || data.length === 0) {
    return wordLists[length].filter(w => w.length === length);
  }
  const words = data.map(r => r.word.toLowerCase());
  dbWordsCache[cacheKey] = words;
  dbWordsCacheTime[cacheKey] = now;
  return words;
}

export async function getRandomWordAsync(language: Language, length: WordLength, pool: WordPool = "full"): Promise<string> {
  const words = await loadDutchWordsFromDB(length, pool);
  return pickNonRecentWord(words, length);
}

export async function isValidWordAsync(word: string, language: Language, length: WordLength): Promise<boolean> {
  if (word.length !== length || !/^[a-z]+$/i.test(word)) return false;
  // A word counts as a valid guess as soon as it is approved (correct spelling),
  // even if it is marked as not appropriate. Only rejected words are invalid.
  const { data } = await supabase
    .from("dutch_words")
    .select("id")
    .eq("word", word.toLowerCase())
    .eq("length", length)
    .eq("approved", true)
    .eq("rejected", false)
    .limit(1);
  return !!(data && data.length > 0);
}

export async function checkWordRejected(word: string, length: WordLength): Promise<boolean> {
  const { data } = await supabase
    .from("dutch_words")
    .select("id")
    .eq("word", word.toLowerCase())
    .eq("length", length)
    .eq("rejected", true)
    .limit(1);
  return !!(data && data.length > 0);
}

export async function suggestWord(word: string, length: WordLength, playerId?: string): Promise<{ success: boolean; rejected?: boolean }> {
  const isRejected = await checkWordRejected(word, length);
  if (isRejected) return { success: false, rejected: true };

  const { error } = await supabase
    .from("dutch_words")
    .insert({ word: word.toLowerCase(), length, approved: false, appropriate: false, suggested_by: playerId || null });
  if (!error) delete dbWordsCache[length];
  return { success: !error };
}

// Markeer een woord direct als afgewezen / niet geschikt / niet goedgekeurd.
// Wordt aangeroepen wanneer de speler in de suggestie-popup op "Nee" klikt.
export async function rejectWordSuggestion(word: string, length: WordLength, playerId?: string): Promise<void> {
  const lower = word.toLowerCase();
  // Check of het woord al bestaat
  const { data: existing } = await supabase
    .from("dutch_words")
    .select("id")
    .eq("word", lower)
    .eq("length", length)
    .limit(1);

  if (existing && existing.length > 0) {
    await supabase
      .from("dutch_words")
      .update({ approved: false, appropriate: false, rejected: true })
      .eq("id", existing[0].id);
  } else {
    await supabase
      .from("dutch_words")
      .insert({
        word: lower,
        length,
        approved: false,
        appropriate: false,
        rejected: true,
        suggested_by: playerId || null,
      });
  }
  delete dbWordsCache[length];
}

export function getRandomWord(language: Language, length: WordLength): string {
  const list = wordLists[length];
  const filtered = list.filter(w => w.length === length);
  return filtered[Math.floor(Math.random() * filtered.length)].toLowerCase();
}
