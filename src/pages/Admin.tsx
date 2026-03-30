import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ADMIN_EMAIL = "denheijera@icloud.com";

interface PendingWord {
  id: string;
  word: string;
  length: number;
  created_at: string;
  suggested_by: string | null;
  suggestor_name?: string;
}

interface WordRecord {
  length: number;
  created_at: string;
  approved: boolean;
}

const Admin = () => {
  const navigate = useNavigate();
  const { session, loading, authReady } = usePlayer();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pendingWords, setPendingWords] = useState<PendingWord[]>([]);
  const [loadingWords, setLoadingWords] = useState(true);
  const [allWords, setAllWords] = useState<WordRecord[]>([]);
  const [timeView, setTimeView] = useState<"dag" | "maand">("maand");

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
      .select("id, word, length, created_at, suggested_by")
      .eq("approved", false)
      .eq("rejected", false)
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
    const { data } = await supabase
      .from("dutch_words")
      .select("length, created_at, approved")
      .eq("rejected", false);
    if (data) setAllWords(data as WordRecord[]);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadPendingWords();
      loadAllWords();
    }
  }, [isAdmin, loadPendingWords, loadAllWords]);

  // Words per length chart data
  const lengthChartData = useMemo(() => {
    const counts: Record<number, number> = {};
    allWords.filter(w => w.approved).forEach(w => {
      counts[w.length] = (counts[w.length] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([len, count]) => ({ name: `${len} letters`, count }))
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));
  }, [allWords]);

  // Words added over time
  const timeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    allWords.forEach(w => {
      const d = new Date(w.created_at);
      const key = timeView === "dag"
        ? d.toISOString().slice(0, 10)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ name: date, count }));
  }, [allWords, timeView]);

  const handleApprove = async (word: PendingWord) => {
    const { error } = await supabase
      .from("dutch_words")
      .update({ approved: true } as any)
      .eq("id", word.id);
    if (error) {
      toast.error("Fout bij goedkeuren");
      return;
    }
    toast.success(`"${word.word.toUpperCase()}" goedgekeurd!`);
    setPendingWords(prev => prev.filter(w => w.id !== word.id));
  };

  const handleReject = async (word: PendingWord) => {
    const { error } = await supabase
      .from("dutch_words")
      .update({ rejected: true } as any)
      .eq("id", word.id);
    if (error) {
      toast.error("Fout bij afkeuren");
      return;
    }
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

  return (
    <div className="min-h-screen flex flex-col items-center py-4 sm:py-8 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
            Admin — Woordenbeheer
          </h1>
        </div>

        {/* Stats Section */}
        <div className="grid gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Woorden per woordlengte</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Woorden toegevoegd over tijd</CardTitle>
                <Tabs value={timeView} onValueChange={(v) => setTimeView(v as "dag" | "maand")}>
                  <TabsList className="h-8">
                    <TabsTrigger value="maand" className="text-xs px-2 py-1">Maand</TabsTrigger>
                    <TabsTrigger value="dag" className="text-xs px-2 py-1">Dag</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {timeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={timeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-45} textAnchor="end" height={60} />
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
            </CardContent>
          </Card>
        </div>

        {/* Pending words section */}
        {loadingWords ? (
          <p className="text-muted-foreground">Laden...</p>
        ) : pendingWords.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Geen woorden om te beoordelen</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground mb-2">
              {pendingWords.length} woord{pendingWords.length !== 1 ? "en" : ""} ter beoordeling
            </p>
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
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white"
                    onClick={() => handleApprove(word)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
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
      </div>
    </div>
  );
};

export default Admin;
