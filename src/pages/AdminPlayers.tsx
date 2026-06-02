import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { GameMode, MODE_LABEL } from "@/types/mode";

type RoleLabel = "speler" | "teacher" | "admin";

interface PlayerRow {
  id: string;
  user_id: string | null;
  display_name: string;
  player_code: string;
  points: number;
  preferred_mode: GameMode;
  school_id: string | null;
  total_games_played: number;
}

interface SchoolRow { id: string; name: string }

const AdminPlayers = () => {
  const navigate = useNavigate();
  const { authReady, session } = usePlayer();
  const { isAdmin, checking } = useIsAdmin();

  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [roles, setRoles] = useState<Record<string, RoleLabel>>({}); // by user_id
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [newSchoolOpen, setNewSchoolOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolCity, setNewSchoolCity] = useState("");
  const [creatingSchool, setCreatingSchool] = useState(false);
  const [pendingPlayerId, setPendingPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!session) { navigate("/auth", { replace: true }); return; }
    if (!checking && !isAdmin) { navigate("/", { replace: true }); }
  }, [authReady, session, checking, isAdmin, navigate]);

  const loadAll = async () => {
    setLoading(true);
    const [pRes, rRes, sRes] = await Promise.all([
      supabase
        .from("players")
        .select("id, user_id, display_name, player_code, points, preferred_mode, school_id, total_games_played")
        .order("display_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("schools").select("id, name").order("name"),
    ]);
    setPlayers((pRes.data as PlayerRow[]) || []);
    const map: Record<string, RoleLabel> = {};
    (rRes.data || []).forEach((r: any) => { map[r.user_id] = r.role as RoleLabel; });
    setRoles(map);
    setSchools((sRes.data as SchoolRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter(p =>
      p.display_name.toLowerCase().includes(q) ||
      p.player_code.toLowerCase().includes(q),
    );
  }, [players, query]);

  const updateMode = async (p: PlayerRow, mode: GameMode) => {
    const { error } = await supabase.from("players").update({ preferred_mode: mode } as any).eq("id", p.id);
    if (error) { toast.error("Fout bij opslaan modus"); return; }
    setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, preferred_mode: mode } : x));
    toast.success(`Modus van ${p.display_name} → ${MODE_LABEL[mode]}`);
  };

  const updateSchool = async (p: PlayerRow, school_id: string | null) => {
    const { error } = await supabase.from("players").update({ school_id } as any).eq("id", p.id);
    if (error) { toast.error("Fout bij opslaan school"); return; }
    setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, school_id } : x));
    toast.success(`School bijgewerkt`);
  };

  const handleSchoolSelect = (p: PlayerRow, v: string) => {
    if (v === "__new__") {
      setPendingPlayerId(p.id);
      setNewSchoolName("");
      setNewSchoolCity("");
      setNewSchoolOpen(true);
      return;
    }
    updateSchool(p, v === "none" ? null : v);
  };

  const createSchool = async () => {
    const name = newSchoolName.trim();
    if (!name) { toast.error("Naam is verplicht"); return; }
    setCreatingSchool(true);
    const { data, error } = await supabase
      .from("schools")
      .insert({ name, city: newSchoolCity.trim() || null } as any)
      .select("id, name")
      .single();
    setCreatingSchool(false);
    if (error || !data) { toast.error("Fout bij aanmaken school"); return; }
    setSchools(prev => [...prev, data as SchoolRow].sort((a, b) => a.name.localeCompare(b.name)));
    toast.success(`School "${data.name}" aangemaakt`);
    if (pendingPlayerId) {
      const p = players.find(x => x.id === pendingPlayerId);
      if (p) await updateSchool(p, data.id);
    }
    setNewSchoolOpen(false);
    setPendingPlayerId(null);
  };

  const updateRole = async (p: PlayerRow, role: RoleLabel) => {
    if (!p.user_id) { toast.error("Speler heeft geen gekoppeld account"); return; }
    if (role === "speler") {
      const { error } = await supabase.rpc("remove_user_role", { _user_id: p.user_id } as any);
      if (error) { toast.error("Fout bij rol verwijderen"); return; }
      setRoles(prev => { const n = { ...prev }; delete n[p.user_id!]; return n; });
      toast.success(`${p.display_name} is nu speler`);
      return;
    }
    const { error } = await supabase.rpc("assign_user_role", { _user_id: p.user_id, _role: role } as never);
    if (error) { toast.error("Fout bij rol toewijzen"); return; }
    setRoles(prev => ({ ...prev, [p.user_id!]: role }));
    toast.success(`${p.display_name} → ${role}`);
  };

  if (!authReady || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">DINGOLINGO</div>
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col items-center py-4 sm:py-8 px-4">
      <SEO title="Spelers beheren — Admin" description="Beheer rollen, scholen en speelmodi van alle DingoLingo-spelers." path="/admin/spelers" />
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
            Spelersbeheer
          </h1>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Zoek op naam of code…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <Button size="icon" variant="outline" onClick={() => setQuery(query)}>
            <Search className="w-4 h-4" />
          </Button>
          <span className="ml-auto self-center text-sm text-muted-foreground">
            {filtered.length} spelers
          </span>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Laden…</p>
        ) : (
          <div className="grid gap-3">
            {filtered.map(p => {
              const currentRole: RoleLabel = (p.user_id && roles[p.user_id]) || "speler";
              return (
                <div key={p.id} className="p-4 rounded-2xl bg-card border border-border">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-[140px]">
                      <div className="font-extrabold">{p.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        #{p.player_code} · {p.points} pt · {p.total_games_played} spellen
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Rol</label>
                      <Select value={currentRole} onValueChange={(v) => updateRole(p, v as RoleLabel)}>
                        <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="speler">Speler</SelectItem>
                          <SelectItem value="teacher">Docent</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Speelmodus</label>
                      <Select value={p.preferred_mode || "klassiek"} onValueChange={(v) => updateMode(p, v as GameMode)}>
                        <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leren">Leren</SelectItem>
                          <SelectItem value="oefenen">Oefenen</SelectItem>
                          <SelectItem value="klassiek">Klassiek</SelectItem>
                          <SelectItem value="uitdaging">Uitdaging</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">School</label>
                      <Select
                        value={p.school_id || "none"}
                        onValueChange={(v) => handleSchoolSelect(p, v)}
                      >
                        <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Geen school —</SelectItem>
                          {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          <SelectItem value="__new__" className="text-primary font-bold">+ Nieuwe school…</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={newSchoolOpen} onOpenChange={(o) => { setNewSchoolOpen(o); if (!o) setPendingPlayerId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe school toevoegen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Naam *</label>
              <Input value={newSchoolName} onChange={(e) => setNewSchoolName(e.target.value)} placeholder="bv. Basisschool De Regenboog" autoFocus />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plaats</label>
              <Input value={newSchoolCity} onChange={(e) => setNewSchoolCity(e.target.value)} placeholder="bv. Amsterdam" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewSchoolOpen(false)} disabled={creatingSchool}>Annuleren</Button>
            <Button onClick={createSchool} disabled={creatingSchool || !newSchoolName.trim()}>
              {creatingSchool ? "Aanmaken…" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlayers;
