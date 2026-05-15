import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, X, Plus, Search, ChevronLeft, ChevronRight, Pencil, Save, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePresenceSettings, updatePresenceSetting } from "@/hooks/useAppSettings";
import SEO from "@/components/SEO";

const ADMIN_EMAIL = "denheijera@icloud.com";

interface PendingWord {
  id: string;
  word: string;
  length: number;
  created_at: string;
  suggested_by: string | null;
  suggestor_name?: string;
  approved: boolean;
  appropriate: boolean;
}

interface WordRecord {
  length: number;
  created_at: string;
  approved: boolean;
}

interface FullWord {
  id: string;
  word: string;
  length: number;
  approved: boolean;
  appropriate: boolean;
  rejected: boolean;
  suggested_by: string | null;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { session, loading, authReady } = usePlayer();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pendingWords, setPendingWords] = useState<PendingWord[]>([]);
  const [loadingWords, setLoadingWords] = useState(true);
  const [allWords, setAllWords] = useState<WordRecord[]>([]);
  const [timeView, setTimeView] = useState<"dag" | "maand">("dag");
  const [dayMonth, setDayMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Add word state
  const [newWord, setNewWord] = useState("");
  const [addingWord, setAddingWord] = useState(false);
  const [wordExists, setWordExists] = useState<boolean | null>(null);
  const [checkingWord, setCheckingWord] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FullWord[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<FullWord>>({});
  const PAGE_SIZE = 5;

  // Presence settings (instelbaar)
  const presence = usePresenceSettings();
  const [heartbeatInput, setHeartbeatInput] = useState<string>("");
  const [thresholdInput, setThresholdInput] = useState<string>("");
  const [savingSetting, setSavingSetting] = useState<string | null>(null);
  useEffect(() => {
    setHeartbeatInput(String(presence.heartbeatIntervalMs));
    setThresholdInput(String(presence.onlineThresholdMs));
  }, [presence.heartbeatIntervalMs, presence.onlineThresholdMs]);

  const savePresenceSetting = async (key: "heartbeat_interval_ms" | "online_threshold_ms", value: string) => {
    const num = parseInt(value);
    if (!num || num < 1000) { toast.error("Geef een waarde van minimaal 1000 ms"); return; }
    setSavingSetting(key);
    const err = await updatePresenceSetting(key, num);
    setSavingSetting(null);
    if (err) toast.error("Fout bij opslaan");
    else toast.success("Instelling opgeslagen");
  };

  // Collapsible open state per card
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({
    settings: false,
    stats: false,
    add: false,
    search: false,
    pending: true,
  });
  const toggleCard = (k: string) => setOpenCards(s => ({ ...s, [k]: !s[k] }));

  useEffect(() => {
    if (!authReady) return;
    if (!session) {
      navigate("/auth", { replace: true });
      return;
    }
    const email = session.user?.email?.toLowerCase();
    if (email === ADMIN_EMAIL) {
      setIsAdmin(true);
    } else {
      navigate("/", { replace: true });
    }
    setChecking(false);
  }, [authReady, session, navigate]);

  const loadPendingWords = useCallback(async () => {
    setLoadingWords(true);
    const { data } = await supabase
      .from("dutch_words")
      .select("id, word, length, created_at, suggested_by, approved, appropriate")
      .eq("rejected", false)
      .eq("approved", false)
      .order("created_at", { ascending: false });

    if (!data) {
      setPendingWords([]);
      setLoadingWords(false);
      return;
    }

    const playerIds = [...new Set((data as any[]).filter(w => w.suggested_by).map(w => w.suggested_by))];
    let playerMap: Record<string, string> = {};
    if (playerIds.length > 0) {
      const { data: players } = await supabase
        .from("players")
        .select("id, display_name")
        .in("id", playerIds);
      if (players) {
        players.forEach((p: any) => { playerMap[p.id] = p.display_name; });
      }
    }

    setPendingWords(
      (data as any[]).map(w => ({
        ...w,
        suggestor_name: w.suggested_by ? playerMap[w.suggested_by] || "Onbekend" : "Onbekend",
      }))
    );
    setLoadingWords(false);
  }, []);

  const loadAllWords = useCallback(async () => {
    // Fetch all words in batches to avoid 1000-row limit
    let all: WordRecord[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data } = await supabase
        .from("dutch_words")
        .select("length, created_at, approved")
        .eq("rejected", false)
        .range(from, from + batchSize - 1);
      if (!data || data.length === 0) break;
      all = all.concat(data as WordRecord[]);
      if (data.length < batchSize) break;
      from += batchSize;
    }
    setAllWords(all);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadPendingWords();
      loadAllWords();
    }
  }, [isAdmin, loadPendingWords, loadAllWords]);

  const lengthChartData = useMemo(() => {
    const counts: Record<number, number> = {};
    allWords.filter(w => w.approved).forEach(w => {
      counts[w.length] = (counts[w.length] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([len, count]) => ({ name: `${len} letters`, count }))
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));
  }, [allWords]);

  const timeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    if (timeView === "dag") {
      // Parse selected month
      const [year, month] = dayMonth.split("-").map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      // Initialize all days
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${dayMonth}-${String(d).padStart(2, "0")}`;
        counts[key] = 0;
      }
      allWords.forEach(w => {
        const d = new Date(w.created_at);
        const key = d.toISOString().slice(0, 10);
        if (key.startsWith(dayMonth)) {
          counts[key] = (counts[key] || 0) + 1;
        }
      });
    } else {
      allWords.forEach(w => {
        const d = new Date(w.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        counts[key] = (counts[key] || 0) + 1;
      });
    }
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        name: timeView === "dag" ? date.slice(8) : date,
        count,
      }));
  }, [allWords, timeView, dayMonth]);

  const shiftMonth = (direction: number) => {
    const [year, month] = dayMonth.split("-").map(Number);
    const d = new Date(year, month - 1 + direction, 1);
    setDayMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const dayMonthLabel = useMemo(() => {
    const [year, month] = dayMonth.split("-").map(Number);
    const months = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
    return `${months[month - 1]} ${year}`;
  }, [dayMonth]);

  // Check if word exists
  useEffect(() => {
    const trimmed = newWord.trim().toLowerCase();
    if (trimmed.length < 2) { setWordExists(null); return; }
    setCheckingWord(true);
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("dutch_words")
        .select("id")
        .eq("word", trimmed)
        .limit(1);
      setWordExists(data && data.length > 0);
      setCheckingWord(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [newWord]);

  const handleAddWord = async () => {
    const trimmed = newWord.trim().toLowerCase();
    if (!trimmed || wordExists) return;
    setAddingWord(true);
    const { error } = await supabase
      .from("dutch_words")
      .insert({ word: trimmed, length: trimmed.length, approved: true, appropriate: true } as any);
    setAddingWord(false);
    if (error) { toast.error("Fout bij toevoegen"); return; }
    toast.success(`"${trimmed.toUpperCase()}" toegevoegd!`);
    setNewWord("");
    setWordExists(null);
    loadAllWords();
  };

  // Search
  const doSearch = useCallback(async (page = 0) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    setHasSearched(true);
    const from = page * PAGE_SIZE;
    const { data, count } = await supabase
      .from("dutch_words")
      .select("id, word, length, approved, appropriate, rejected, suggested_by, created_at", { count: "exact" })
      .ilike("word", `%${q}%`)
      .order("word")
      .range(from, from + PAGE_SIZE - 1);
    setSearchResults((data as FullWord[]) || []);
    setSearchTotal(count || 0);
    setSearchPage(page);
    setEditingId(null);
  }, [searchQuery]);

  const handleSaveEdit = async (word: FullWord) => {
    const updates: any = {};
    if (editData.word !== undefined) {
      updates.word = editData.word.trim().toLowerCase();
      updates.length = updates.word.length;
    }
    if (editData.approved !== undefined) updates.approved = editData.approved;
    if (editData.appropriate !== undefined) updates.appropriate = editData.appropriate;
    if (editData.rejected !== undefined) {
      updates.rejected = editData.rejected;
      // Rejected words are by definition not correct and not appropriate.
      if (editData.rejected) {
        updates.approved = false;
        updates.appropriate = false;
      }
    }

    if (Object.keys(updates).length === 0) { setEditingId(null); return; }

    const { error } = await supabase
      .from("dutch_words")
      .update(updates)
      .eq("id", word.id);
    if (error) { toast.error("Fout bij opslaan"); return; }
    toast.success("Woord bijgewerkt!");
    setEditingId(null);
    setEditData({});
    doSearch(searchPage);
    loadAllWords();
    loadPendingWords();
  };

  const handleApprove = async (word: PendingWord) => {
    const { error } = await supabase
      .from("dutch_words")
      .update({ approved: true, appropriate: true } as any)
      .eq("id", word.id);
    if (error) { toast.error("Fout bij goedkeuren"); return; }
    toast.success(`"${word.word.toUpperCase()}" goedgekeurd!`);
    setPendingWords(prev => prev.filter(w => w.id !== word.id));
  };

  const handleApproveCorrectOnly = async (word: PendingWord) => {
    const { error } = await supabase
      .from("dutch_words")
      .update({ approved: true, appropriate: false } as any)
      .eq("id", word.id);
    if (error) { toast.error("Fout bij goedkeuren"); return; }
    toast.success(`"${word.word.toUpperCase()}" goedgekeurd als correct maar niet geschikt voor Lingo.`);
    setPendingWords(prev => prev.filter(w => w.id !== word.id));
  };

  const handleMarkAppropriate = async (word: PendingWord) => {
    const { error } = await supabase
      .from("dutch_words")
      .update({ appropriate: true } as any)
      .eq("id", word.id);
    if (error) { toast.error("Fout bij markeren als geschikt"); return; }
    toast.success(`"${word.word.toUpperCase()}" gemarkeerd als geschikt!`);
    setPendingWords(prev => prev.filter(w => w.id !== word.id));
  };

  const handleReject = async (word: PendingWord) => {
    const { error } = await supabase
      .from("dutch_words")
      .update({ rejected: true, approved: false, appropriate: false } as any)
      .eq("id", word.id);
    if (error) { toast.error("Fout bij afkeuren"); return; }
    toast.error(`"${word.word.toUpperCase()}" afgekeurd.`);
    setPendingWords(prev => prev.filter(w => w.id !== word.id));
  };

  if (loading || checking || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">LINGO</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const totalPages = Math.ceil(searchTotal / PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col items-center py-4 sm:py-8 px-4">
      <SEO
        title="Beheer — LINGO NL"
        description="Beheerpaneel voor LINGO NL: woorden goedkeuren, badges configureren en spelinstellingen aanpassen."
        path="/admin"
      />
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
            Admin — Woordenbeheer
          </h1>
        </div>

        {/* Online presence settings */}
        <Card className="mb-8">
          <Collapsible open={openCards.settings} onOpenChange={() => toggleCard("settings")}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer select-none">
                <CardTitle className="text-lg flex items-center justify-between">
                  Online-detectie instellingen
                  <ChevronDown className={`w-5 h-5 transition-transform ${openCards.settings ? "rotate-180" : ""}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Heartbeat-interval (ms)</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Hoe vaak een speler een teken van leven naar de server stuurt.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1000}
                      step={500}
                      value={heartbeatInput}
                      onChange={(e) => setHeartbeatInput(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() => savePresenceSetting("heartbeat_interval_ms", heartbeatInput)}
                      disabled={savingSetting === "heartbeat_interval_ms"}
                    >
                      <Save className="w-4 h-4 mr-1" /> Opslaan
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Online-threshold (ms)</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Een speler wordt als online getoond als zijn laatste activiteit korter geleden is dan deze waarde.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1000}
                      step={500}
                      value={thresholdInput}
                      onChange={(e) => setThresholdInput(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() => savePresenceSetting("online_threshold_ms", thresholdInput)}
                      disabled={savingSetting === "online_threshold_ms"}
                    >
                      <Save className="w-4 h-4 mr-1" /> Opslaan
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Huidige waarden: heartbeat {presence.heartbeatIntervalMs} ms, threshold {presence.onlineThresholdMs} ms.
                </p>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Charts in tabs */}
        <Card className="mb-8">
          <Collapsible open={openCards.stats} onOpenChange={() => toggleCard("stats")}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer select-none">
                <CardTitle className="text-lg flex items-center justify-between">
                  Statistieken
                  <ChevronDown className={`w-5 h-5 transition-transform ${openCards.stats ? "rotate-180" : ""}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
            <Tabs defaultValue="length">
              <TabsList className="mb-4">
                <TabsTrigger value="length">Per woordlengte</TabsTrigger>
                <TabsTrigger value="time">Over tijd</TabsTrigger>
              </TabsList>
              <TabsContent value="length">
                {lengthChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={lengthChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="count" name="Aantal" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">Geen data</p>
                )}
              </TabsContent>
              <TabsContent value="time">
                <div className="flex items-center justify-between mb-2">
                  {timeView === "dag" && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => shiftMonth(-1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium min-w-[120px] text-center capitalize">{dayMonthLabel}</span>
                      <Button size="sm" variant="ghost" onClick={() => shiftMonth(1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  {timeView !== "dag" && <div />}
                  <Tabs value={timeView} onValueChange={(v) => setTimeView(v as "dag" | "maand")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="dag" className="text-xs px-2 py-1">Dag</TabsTrigger>
                      <TabsTrigger value="maand" className="text-xs px-2 py-1">Maand</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                {timeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={timeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="count" name="Aantal" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">Geen data</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Add word section */}
        <Card className="mb-8">
          <Collapsible open={openCards.add} onOpenChange={() => toggleCard("add")}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer select-none">
                <CardTitle className="text-lg flex items-center justify-between">
                  Woord toevoegen
                  <ChevronDown className={`w-5 h-5 transition-transform ${openCards.add ? "rotate-180" : ""}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  placeholder="Typ een woord..."
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
                  className="uppercase tracking-wider font-bold"
                />
                <div className="flex items-center gap-2 mt-1 min-h-[20px]">
                  {newWord.trim().length >= 2 && (
                    <>
                      <span className="text-xs text-muted-foreground">{newWord.trim().length} letters</span>
                      {checkingWord ? (
                        <span className="text-xs text-muted-foreground">Controleren...</span>
                      ) : wordExists === true ? (
                        <span className="text-xs text-red-500">⚠ Bestaat al in database</span>
                      ) : wordExists === false ? (
                        <span className="text-xs text-green-500">✓ Nieuw woord</span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
              <Button
                onClick={handleAddWord}
                disabled={!newWord.trim() || wordExists === true || addingWord}
                size="sm"
                className="mb-5"
              >
                <Plus className="w-4 h-4 mr-1" /> Toevoegen
              </Button>
            </div>
          </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Search section */}
        <Card className="mb-8">
          <Collapsible open={openCards.search} onOpenChange={() => toggleCard("search")}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer select-none">
                <CardTitle className="text-lg flex items-center justify-between">
                  Woorden zoeken & bewerken
                  <ChevronDown className={`w-5 h-5 transition-transform ${openCards.search ? "rotate-180" : ""}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Zoek op woord..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch(0)}
              />
              <Button size="sm" onClick={() => doSearch(0)}>
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {hasSearched && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground">Geen resultaten gevonden.</p>
            )}

            {searchResults.length > 0 && (
              <div className="flex flex-col gap-2">
                {searchResults.map(word => {
                  const isEditing = editingId === word.id;
                  const currentWord = isEditing && editData.word !== undefined ? editData.word : word.word;
                  const currentApproved = isEditing && editData.approved !== undefined ? editData.approved : word.approved;
                  const currentAppropriate = isEditing && editData.appropriate !== undefined ? editData.appropriate : word.appropriate;
                  const currentRejected = isEditing && editData.rejected !== undefined ? editData.rejected : word.rejected;

                  return (
                    <div key={word.id} className="p-3 rounded-xl bg-card border border-border">
                      {isEditing ? (
                        <div className="space-y-3">
                          <Input
                            value={currentWord}
                            onChange={(e) => setEditData(d => ({ ...d, word: e.target.value }))}
                            className="uppercase tracking-wider font-bold"
                          />
                          <div className="text-xs text-muted-foreground">
                            {(currentWord || "").trim().length} letters
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={currentApproved}
                                onCheckedChange={(v) => setEditData(d => ({ ...d, approved: v }))}
                                id={`approved-${word.id}`}
                              />
                              <Label htmlFor={`approved-${word.id}`} className="text-xs">Goedgekeurd</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={currentAppropriate}
                                onCheckedChange={(v) => setEditData(d => ({ ...d, appropriate: v }))}
                                id={`appropriate-${word.id}`}
                              />
                              <Label htmlFor={`appropriate-${word.id}`} className="text-xs">Geschikt</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={currentRejected}
                                onCheckedChange={(v) => setEditData(d => ({ ...d, rejected: v }))}
                                id={`rejected-${word.id}`}
                              />
                              <Label htmlFor={`rejected-${word.id}`} className="text-xs">Afgewezen</Label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveEdit(word)}>
                              <Save className="w-4 h-4 mr-1" /> Opslaan
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditData({}); }}>
                              Annuleren
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-extrabold text-lg tracking-wider text-foreground">
                              {word.word.toUpperCase()}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {word.length} letters
                              {word.approved && <span className="text-green-500 ml-2">✓ Correct</span>}
                              {!word.approved && <span className="text-orange-500 ml-2">⏳ Niet goedgekeurd</span>}
                              {word.appropriate && <span className="text-green-500 ml-2">✓ Geschikt</span>}
                              {!word.appropriate && <span className="text-orange-500 ml-2">⏳ Niet geschikt</span>}
                              {word.rejected && <span className="text-red-500 ml-2">✗ Afgewezen</span>}
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(word.id); setEditData({}); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={searchPage === 0}
                      onClick={() => doSearch(searchPage - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Pagina {searchPage + 1} van {totalPages} ({searchTotal} resultaten)
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={searchPage >= totalPages - 1}
                      onClick={() => doSearch(searchPage + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Pending words section */}
        <Card className="mb-8">
          <Collapsible open={openCards.pending} onOpenChange={() => toggleCard("pending")}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer select-none">
                <CardTitle className="text-lg flex items-center justify-between">
                  Te beoordelen woorden{!loadingWords && ` (${pendingWords.length})`}
                  <ChevronDown className={`w-5 h-5 transition-transform ${openCards.pending ? "rotate-180" : ""}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
        {loadingWords ? (
          <p className="text-muted-foreground">Laden...</p>
        ) : pendingWords.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-lg">Geen woorden om te beoordelen</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                {pendingWords.length} woord{pendingWords.length !== 1 ? "en" : ""} ter beoordeling
              </p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white text-xs"
                  onClick={async () => {
                    const ids = pendingWords.map(w => w.id);
                    const { error } = await supabase
                      .from("dutch_words")
                      .update({ approved: true, appropriate: true } as any)
                      .in("id", ids);
                    if (error) { toast.error("Fout bij bulk goedkeuren"); return; }
                    toast.success(`${ids.length} woorden goedgekeurd!`);
                    setPendingWords([]);
                  }}
                >
                  <Check className="w-4 h-4" />
                  Alles
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-yellow-600 border-yellow-600 hover:bg-yellow-600 hover:text-white text-xs"
                  onClick={async () => {
                    const ids = pendingWords.map(w => w.id);
                    const { error } = await supabase
                      .from("dutch_words")
                      .update({ approved: true, appropriate: false } as any)
                      .in("id", ids);
                    if (error) { toast.error("Fout bij bulk goedkeuren"); return; }
                    toast.success(`${ids.length} woorden goedgekeurd als alleen correct.`);
                    setPendingWords([]);
                  }}
                >
                  <Check className="w-4 h-4" />
                  Alleen correct
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white text-xs"
                  onClick={async () => {
                    const ids = pendingWords.map(w => w.id);
                    const { error } = await supabase
                      .from("dutch_words")
                      .update({ rejected: true, approved: false, appropriate: false } as any)
                      .in("id", ids);
                    if (error) { toast.error("Fout bij bulk afkeuren"); return; }
                    toast.error(`${ids.length} woorden afgekeurd.`);
                    setPendingWords([]);
                  }}
                >
                  <X className="w-4 h-4" />
                  Afkeuren
                </Button>
              </div>
            </div>
            {pendingWords.map(word => (
              <div
                key={word.id}
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
              >
                <div className="flex flex-col">
                  <span className="font-extrabold text-lg tracking-wider text-foreground">
                    {word.word.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {word.length} letters • voorgesteld door {word.suggestor_name}
                  </span>
                  <span className="text-xs mt-0.5">
                    {!word.approved && <span className="text-orange-500 mr-2">⏳ Niet goedgekeurd</span>}
                    {word.approved && <span className="text-green-500 mr-2">✓ Correct</span>}
                    {!word.appropriate && <span className="text-orange-500">⏳ Niet geschikt</span>}
                    {word.appropriate && <span className="text-green-500">✓ Geschikt</span>}
                  </span>
                </div>
                <div className="flex gap-1">
                  {!word.approved ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white text-xs"
                        onClick={() => handleApprove(word)}
                        title="Correct + Geschikt"
                      >
                        <Check className="w-4 h-4" />
                        Alles
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-yellow-600 border-yellow-600 hover:bg-yellow-600 hover:text-white text-xs"
                        onClick={() => handleApproveCorrectOnly(word)}
                        title="Correct maar niet geschikt voor Lingo"
                      >
                        <Check className="w-4 h-4" />
                        Alleen correct
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white text-xs"
                      onClick={() => handleMarkAppropriate(word)}
                      title="Markeer als geschikt voor Lingo"
                    >
                      <Check className="w-4 h-4" />
                      Geschikt
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                    onClick={() => handleReject(word)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
