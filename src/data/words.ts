import { supabase } from "@/integrations/supabase/client";

// Dutch word lists (fallback)
const dutch4 = [
  "bank", "boot", "boek", "bord", "brug", "deur", "dier", "doel", "geld", "glas",
  "hond", "huis", "kaas", "kind", "klok", "koud", "lamp", "land", "lijn", "maan",
  "melk", "muur", "neus", "paar", "park", "pijn", "reis", "ring", "rood", "rust",
  "snel", "soep", "stad", "step", "taal", "taak", "trap", "tuin", "vuur", "warm",
  "wiel", "wind", "wolk", "zand", "zeep", "ziek", "zing", "zout", "zwak", "zwem",
  "baan", "berg", "blik", "boom", "dans", "deel", "eten", "film", "gang", "geur",
  "goud", "grap", "haar", "hand", "hart", "hoek", "kans", "kern", "klap", "knop",
  "koek", "kool", "lach", "last", "leeg", "lied", "list", "maak", "meid", "mooi",
  "naam", "nood", "ogen", "palm", "plak", "punt", "raam", "raak", "riem", "roep",
  "ruim", "slot", "stem", "stof", "tang", "teen", "tent", "tong", "vals", "vent",
  "vlag", "vlak", "voet", "vork", "wand", "wens", "werk", "wijn", "zaal", "zaak",
];

const dutch5 = [
  "appel", "avond", "baker", "beker", "broek", "brood", "chili", "draak", "dwerg", "engel",
  "fiets", "flask", "groen", "groep", "hamer", "hemel", "hoorn", "idool", "inham",
  "jurij", "kaart", "kabel", "kleur", "knoop", "konig", "kroeg", "kunst", "laken", "laser",
  "lever", "loper", "macht", "mango", "media", "meldt", "nacht", "nieuw", "oever", "paard",
  "piano", "plant", "plein", "prijs", "proef", "radio", "regen", "ruzie", "salon", "schip",
  "slaap", "slang", "staal", "stank", "stoel", "storm", "tafel", "tegel",
  "toren", "trein", "tulip", "vacht", "vlieg", "vloed", "water", "wegen", "werld", "worst",
  "wraak", "zadel", "zwaan", "zwart", "amber", "bloem", "brein",
  "draad", "ebben", "fabel", "geest", "haven", "inzet", "jeugd", "kwast", "loods", "nagel",
  "olive", "pijlt", "ronde", "steel", "taart", "uitje", "vloot", "waard", "zetel", "zomer",
];

const dutch6 = [
  "donker", "fiesta", "gebied", "geluid", "gratis", "groeit", "handel", "helder", "insect",
  "jungle", "keuken", "klasse", "koffie", "liefde", "mentor", "midden", "natuur", "nummer",
  "opener", "pagina", "plafon", "recept", "ridder", "school", "sieren", "stroom", "tempel",
  "tropen", "tunnel", "uitzet", "vlakte", "vriend", "wandel", "winter", "wonder", "zolder",
  "achter", "balkon", "bewijs", "blanko", "camera", "detail", "eiland", "folder", "gevoel",
  "hoogte", "ijsjes", "jurken", "kennis", "letter", "marmer", "naaien", "orkest", "pakket",
  "rivier", "scherp", "sigaar", "sterke", "strand", "tennis", "uitleg", "veilig",
  "vulpen", "werken", "zanger", "zilver", "cirkel", "danser", "erwten", "feiten", "geheim",
  "haring", "ingang", "kiezen", "ladder", "moeite", "oceaan", "piloot",
  "schaap", "tassen", "vragen", "wassen", "zenden", "anders", "beiden", "tussen",
];

// English word lists
const english4 = [
  "able", "back", "bare", "bird", "bold", "burn", "cake", "calm", "cold", "dark",
  "dawn", "deep", "dish", "door", "dust", "earn", "easy", "edge", "face", "fair",
  "fame", "fast", "fear", "fire", "fish", "flag", "flat", "flow", "fold", "food",
  "fork", "form", "free", "full", "game", "gift", "glow", "gold", "good", "gray",
  "grip", "grow", "hair", "half", "hall", "hand", "hard", "harm", "hate", "have",
  "head", "heal", "heat", "help", "hero", "high", "hill", "hold", "hole", "home",
  "hope", "hour", "hunt", "idea", "iron", "item", "jack", "jazz", "join", "jump",
  "just", "keen", "keep", "kind", "king", "kiss", "knee", "knot", "know", "lake",
  "lamp", "land", "last", "lead", "lean", "left", "life", "lift", "like", "lime",
  "line", "link", "lion", "list", "live", "lock", "long", "look", "lord", "lose",
];

const english5 = [
  "above", "actor", "admit", "agent", "agree", "alien", "align", "angel", "anger", "apple",
  "arena", "awful", "badge", "beach", "blast", "blaze", "bliss", "bloom", "board", "bonus",
  "brave", "bread", "brick", "brief", "bring", "broad", "brush", "build", "burst", "cabin",
  "candy", "cargo", "chain", "chair", "charm", "chase", "cheap", "chess", "chief", "child",
  "civic", "claim", "clash", "clean", "clear", "climb", "clock", "close", "cloud", "coach",
  "coral", "count", "cover", "crack", "craft", "crane", "crash", "cream", "crisp", "cross",
  "crowd", "crown", "crush", "cycle", "dance", "death", "debug", "delay", "delta", "depth",
  "devil", "diary", "dizzy", "doubt", "draft", "drain", "drake", "drama", "drawn", "dream",
  "dress", "drift", "drink", "drive", "drone", "eager", "earth", "elite", "ember", "empty",
  "enjoy", "enter", "equal", "error", "event", "every", "exact", "exile", "extra", "fable",
];

const english6 = [
  "absurd", "advent", "agency", "alpine", "anchor", "animal", "answer", "arcane", "arctic",
  "autumn", "basket", "battle", "beacon", "beauty", "bishop", "blanch", "bounce",
  "branch", "breach", "breath", "bridge", "bright", "broken", "bronze", "brutal", "bubble",
  "burden", "cactus", "camera", "candle", "canvas", "castle", "center", "chance", "change",
  "cheese", "chosen", "church", "circle", "clever", "client", "cobalt", "coffee", "column",
  "combat", "common", "copper", "corner", "cosmic", "cotton", "couple", "course", "cradle",
  "create", "credit", "cruise", "custom", "danger", "debate", "decent", "defeat", "define",
  "demand", "desert", "design", "detail", "device", "dinner", "direct", "divine", "donate",
  "double", "dragon", "driven", "effect", "effort", "empire", "enable", "energy", "engine",
  "escape", "evolve", "expand", "expert", "export", "fabric", "factor", "family", "farmer",
];

export type Language = "nl" | "en";
export type WordLength = 4 | 5 | 6;

const wordLists: Record<Language, Record<WordLength, string[]>> = {
  nl: { 4: dutch4, 5: dutch5, 6: dutch6 },
  en: { 4: english4, 5: english5, 6: english6 },
};

// Cache for DB words
let dbWordsCache: Record<number, string[]> = {};
let dbWordsCacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

// Track recently used words to avoid repetition
const RECENT_WORDS_KEY = "lingo_recent_words";
const MAX_RECENT_RATIO = 0.5; // Keep up to 50% of word list in recent history

function getRecentWords(length: WordLength): string[] {
  try {
    const stored = localStorage.getItem(`${RECENT_WORDS_KEY}_${length}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentWord(word: string, length: WordLength, totalWords: number) {
  const recent = getRecentWords(length);
  const maxRecent = Math.max(1, Math.floor(totalWords * MAX_RECENT_RATIO));
  const updated = [word, ...recent.filter(w => w !== word)].slice(0, maxRecent);
  try {
    localStorage.setItem(`${RECENT_WORDS_KEY}_${length}`, JSON.stringify(updated));
  } catch { /* ignore */ }
}

function pickNonRecentWord(words: string[], length: WordLength): string {
  const recent = new Set(getRecentWords(length));
  const available = words.filter(w => !recent.has(w));
  const pool = available.length > 0 ? available : words;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  addRecentWord(chosen, length, words.length);
  return chosen;
}

export async function loadDutchWordsFromDB(length: WordLength): Promise<string[]> {
  const now = Date.now();
  if (dbWordsCache[length] && now - dbWordsCacheTime < CACHE_TTL) {
    return dbWordsCache[length];
  }

  const { data, error } = await supabase
    .from("dutch_words")
    .select("word")
    .eq("length", length)
    .eq("approved", true);

  if (error || !data || data.length === 0) {
    // Fallback to local list
    return wordLists.nl[length].filter(w => w.length === length);
  }

  const words = data.map(r => r.word.toLowerCase());
  dbWordsCache[length] = words;
  dbWordsCacheTime = now;
  return words;
}

export async function getRandomWordAsync(language: Language, length: WordLength): Promise<string> {
  if (language === "nl") {
    const words = await loadDutchWordsFromDB(length);
    return pickNonRecentWord(words, length);
  }
  const list = wordLists[language][length].filter(w => w.length === length);
  return pickNonRecentWord(list, length);
}

export async function isValidWordAsync(word: string, language: Language, length: WordLength): Promise<boolean> {
  if (word.length !== length || !/^[a-z]+$/i.test(word)) return false;

  if (language === "nl") {
    const { data } = await supabase
      .from("dutch_words")
      .select("id")
      .eq("word", word.toLowerCase())
      .eq("length", length)
      .eq("approved", true)
      .limit(1);
    return !!(data && data.length > 0);
  }

  // English: accept any alphabetic word of correct length
  return true;
}

export async function suggestWord(word: string, length: WordLength, playerId?: string): Promise<boolean> {
  const { error } = await supabase
    .from("dutch_words")
    .insert({
      word: word.toLowerCase(),
      length,
      approved: true, // auto-approve for now
      suggested_by: playerId || null,
    });

  if (!error) {
    // Invalidate cache
    delete dbWordsCache[length];
  }
  return !error;
}

// Keep synchronous versions as fallback
export function getRandomWord(language: Language, length: WordLength): string {
  const list = wordLists[language][length];
  const filtered = list.filter(w => w.length === length);
  return filtered[Math.floor(Math.random() * filtered.length)].toLowerCase();
}

export function isValidWord(word: string, language: Language, length: WordLength): boolean {
  return word.length === length && /^[a-z]+$/i.test(word);
}
