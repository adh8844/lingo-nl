import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, GraduationCap, Mail, Users, BarChart3, Trophy, UserPlus, Copy, Check, Eye, EyeOff, Trash2 } from "lucide-react";
import SEO from "@/components/SEO";
import { usePlayer } from "@/hooks/usePlayer";
import { useIsTeacher } from "@/hooks/useIsTeacher";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { GameMode, MODE_LABEL } from "@/types/mode";

const TEACHER_CONTACT = "denheijera@icloud.com";

interface Pupil {
  id: string;
  display_name: string;
  player_code: string;
  points: number;
  current_streak: number;
  total_games_played: number;
  preferred_mode: GameMode;
  last_played_date: string | null;
}

const Teacher = () => {
  const navigate = useNavigate();
  const { session, player } = usePlayer();
  const { isTeacher, checking } = useIsTeacher();

  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [loading, setLoading] = useState(true);
  const [creds, setCreds] = useState<Record<string, { username: string; password: string }>>({});
  const [shownPw, setShownPw] = useState<Record<string, boolean>>({});

  // Add-pupil dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addAge, setAddAge] = useState("");
  const [addGroup, setAddGroup] = useState("");
  const [addMode, setAddMode] = useState<GameMode>("leren");
  const [creating, setCreating] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadPupils = async () => {
    if (!player?.school_id) { setPupils([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("players")
      .select("id, display_name, player_code, points, current_streak, total_games_played, preferred_mode, last_played_date")
      .eq("school_id", player.school_id)
      .neq("id", player.id)
      .order("points", { ascending: false });
    const list = (data as Pupil[]) || [];
    setPupils(list);
    if (list.length) {
      const { data: credRows } = await supabase
        .from("pupil_credentials")
        .select("player_id, username, password")
        .in("player_id", list.map(p => p.id));
      const map: Record<string, { username: string; password: string }> = {};
      (credRows || []).forEach((c: any) => { map[c.player_id] = { username: c.username, password: c.password }; });
      setCreds(map);
    } else {
      setCreds({});
    }
    setLoading(false);
  };

  useEffect(() => { if (isTeacher && player) loadPupils(); }, [isTeacher, player]);

  const setMode = async (p: Pupil, mode: GameMode) => {
    const { error } = await supabase.rpc("teacher_set_pupil_mode", { _player_id: p.id, _mode: mode } as never);
    if (error) { toast.error("Fout bij modus instellen"); return; }
    setPupils(prev => prev.map(x => x.id === p.id ? { ...x, preferred_mode: mode } : x));
    toast.success(`${p.display_name} → ${MODE_LABEL[mode]}`);
  };

  const resetAddForm = () => {
    setAddFirstName(""); setAddLastName(""); setAddAge(""); setAddGroup(""); setAddMode("leren");
  };

  const createPupil = async () => {
    if (!addFirstName.trim()) { toast.error("Voornaam is verplicht"); return; }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("teacher-create-pupil", {
      body: {
        first_name: addFirstName.trim(),
        last_name: addLastName.trim() || null,
        age: addAge ? Number(addAge) : null,
        school_group: addGroup ? Number(addGroup) : null,
        preferred_mode: addMode,
      },
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Aanmaken mislukt");
      return;
    }
    const d = data as { username: string; password: string; display_name: string };
    setCreatedCreds({ username: d.username, password: d.password, name: d.display_name });
    setAddOpen(false);
    resetAddForm();
    loadPupils();
  };


  const mailto =
    `mailto:${TEACHER_CONTACT}` +
    `?subject=${encodeURIComponent("Aanvraag docent-rol DingoLingo")}` +
    `&body=${encodeURIComponent(
      "Beste DingoLingo team,\n\nIk wil graag een docent-account bij DingoLingo.\n\nNaam: \nSchool: \nGroep/klas: \nE-mail account: \n\nMet vriendelijke groet,\n",
    )}`;

  const totals = {
    pupils: pupils.length,
    games: pupils.reduce((s, p) => s + (p.total_games_played || 0), 0),
    avgPoints: pupils.length ? Math.round(pupils.reduce((s, p) => s + (p.points || 0), 0) / pupils.length) : 0,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Docent-dashboard — DingoLingo"
        description="Beheer leerlingen, wijs speelmodi toe en volg voortgang in jouw klas."
        path="/docent"
      />

      <header className="px-4 pt-6 pb-2 max-w-5xl mx-auto flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug
        </button>
        <span className="text-sm font-extrabold text-primary">DingoLingo</span>
      </header>

      <main className="px-4 py-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-primary/10 text-primary text-xs font-extrabold tracking-widest uppercase">
            <GraduationCap className="w-3.5 h-3.5" />
            {isTeacher ? "Docent" : "Voor docenten"}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {isTeacher ? "Jouw klas" : "DingoLingo in jouw klas."}
          </h1>
        </motion.div>

        {checking ? (
          <p className="mt-8 text-muted-foreground">Laden…</p>
        ) : !isTeacher ? (
          <NonTeacherView session={session} mailto={mailto} />
        ) : !player?.school_id ? (
          <div className="mt-8 p-6 rounded-2xl bg-card border border-border">
            <p className="font-bold">Je bent docent, maar nog niet aan een school gekoppeld.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Vraag een admin om je aan een school te koppelen. Daarna verschijnen je leerlingen hier automatisch.
            </p>
          </div>
        ) : (
          <>
            {/* Dashboard tegels */}
            <div className="mt-8 grid sm:grid-cols-3 gap-3">
              <DashTile icon={<Users className="w-5 h-5" />} label="Leerlingen" value={totals.pupils} />
              <DashTile icon={<BarChart3 className="w-5 h-5" />} label="Totaal spellen" value={totals.games} />
              <DashTile icon={<Trophy className="w-5 h-5" />} label="Gemiddelde punten" value={totals.avgPoints} />
            </div>

            {/* Leerlingen */}
            <div className="mt-10 mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold">Leerlingen</h2>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1">
                <UserPlus className="w-4 h-4" /> Leerling toevoegen
              </Button>
            </div>
            {loading ? (
              <p className="text-muted-foreground">Laden…</p>
            ) : pupils.length === 0 ? (
              <p className="text-muted-foreground">Nog geen leerlingen gekoppeld aan jouw school.</p>
            ) : (
              <div className="grid gap-3">
                {pupils.map(p => (
                  <div key={p.id} className="p-4 rounded-2xl bg-card border border-border">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        className="text-left min-w-[150px]"
                        onClick={() => navigate(`/statistics/${p.id}`)}
                      >
                        <div className="font-extrabold hover:text-primary">{p.display_name}</div>
                        <div className="text-xs text-muted-foreground">
                          #{p.player_code} · {p.points} pt · streak {p.current_streak} · {p.total_games_played} spellen
                        </div>
                        {p.last_played_date && (
                          <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                            Laatst gespeeld: {p.last_played_date}
                          </div>
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Modus:</span>
                        <Select value={p.preferred_mode || "klassiek"} onValueChange={(v) => setMode(p, v as GameMode)}>
                          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="leren">Leren</SelectItem>
                            <SelectItem value="oefenen">Oefenen</SelectItem>
                            <SelectItem value="klassiek">Klassiek</SelectItem>
                            <SelectItem value="uitdaging">Uitdaging</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/profile/${p.id}`)}>
                          Profiel
                        </Button>
                      </div>
                    </div>

                    {creds[p.id] && (
                      <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <div>
                          <span className="text-muted-foreground">Gebruikersnaam: </span>
                          <span className="font-mono font-bold">{creds[p.id].username}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Wachtwoord: </span>
                          <span className="font-mono font-bold tracking-widest">
                            {shownPw[p.id] ? creds[p.id].password : "••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShownPw(s => ({ ...s, [p.id]: !s[p.id] }))}
                            className="ml-1 text-muted-foreground hover:text-foreground"
                            aria-label={shownPw[p.id] ? "Verbergen" : "Tonen"}
                          >
                            {shownPw[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `Gebruikersnaam: ${creds[p.id].username}\nWachtwoord: ${creds[p.id].password}`,
                              );
                              toast.success("Gekopieerd");
                            }}
                            className="ml-1 text-muted-foreground hover:text-foreground"
                            aria-label="Kopiëren"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Dialog: leerling toevoegen */}
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetAddForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leerling toevoegen</DialogTitle>
              <DialogDescription>
                De school wordt automatisch ingesteld op jouw school. Gebruikersnaam en wachtwoord worden automatisch gegenereerd.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label htmlFor="fn">Voornaam *</Label>
                <Input id="fn" value={addFirstName} onChange={(e) => setAddFirstName(e.target.value)} placeholder="Bijv. Sanne" />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="ln">Achternaam</Label>
                <Input id="ln" value={addLastName} onChange={(e) => setAddLastName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label htmlFor="age">Leeftijd</Label>
                  <Input id="age" type="number" min={4} max={18} value={addAge} onChange={(e) => setAddAge(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="grp">Groep</Label>
                  <Input id="grp" type="number" min={1} max={8} value={addGroup} onChange={(e) => setAddGroup(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-1">
                <Label>Speelmodus</Label>
                <Select value={addMode} onValueChange={(v) => setAddMode(v as GameMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leren">Leren</SelectItem>
                    <SelectItem value="oefenen">Oefenen</SelectItem>
                    <SelectItem value="klassiek">Klassiek</SelectItem>
                    <SelectItem value="uitdaging">Uitdaging</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={creating}>Annuleren</Button>
              <Button onClick={createPupil} disabled={creating || !addFirstName.trim()}>
                {creating ? "Aanmaken…" : "Aanmaken"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: credentials weergeven */}
        <Dialog open={!!createdCreds} onOpenChange={(o) => { if (!o) { setCreatedCreds(null); setCopied(false); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leerling aangemaakt</DialogTitle>
              <DialogDescription>
                Noteer deze gegevens. Het wachtwoord wordt later niet meer getoond.
              </DialogDescription>
            </DialogHeader>
            {createdCreds && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Naam</div>
                  <div className="font-extrabold">{createdCreds.name}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Gebruikersnaam</div>
                  <div className="font-mono text-lg font-extrabold">{createdCreds.username}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Wachtwoord</div>
                  <div className="font-mono text-2xl font-extrabold tracking-widest">{createdCreds.password}</div>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Naam: ${createdCreds.name}\nGebruikersnaam: ${createdCreds.username}\nWachtwoord: ${createdCreds.password}`,
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <><Check className="w-4 h-4" /> Gekopieerd</> : <><Copy className="w-4 h-4" /> Kopieer gegevens</>}
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => { setCreatedCreds(null); setCopied(false); }}>Klaar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

const DashTile = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="p-4 rounded-2xl bg-card border border-border">
    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-bold">
      {icon}
      {label}
    </div>
    <div className="mt-1 text-3xl font-extrabold text-primary">{value}</div>
  </div>
);

const NonTeacherView = ({ session, mailto }: { session: any; mailto: string }) => (
  <>
    <p className="mt-4 text-lg text-muted-foreground">
      Geef leerlingen veilige, gerichte woordenschat-oefening. Met een docent-account
      koppel je leerlingen aan jouw klas en zie je hun voortgang.
    </p>
    <div className="mt-10 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-primary/15 via-card to-accent/10 border border-border">
      <h2 className="text-2xl font-extrabold">Vraag een docent-account aan</h2>
      <p className="mt-2 text-muted-foreground">
        {session
          ? "Stuur een mail vanuit het e-mailadres waarmee je bent ingelogd. We koppelen de rol aan je account."
          : "Maak eerst een account aan, en stuur dan een mail vanuit hetzelfde e-mailadres."}
      </p>
      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <a
          href={mailto}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-extrabold"
        >
          <Mail className="w-4 h-4" />
          Aanvraag versturen
        </a>
      </div>
    </div>
  </>
);

export default Teacher;
