import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { usePlayer } from "@/hooks/usePlayer";
import DingoMascot from "@/components/DingoMascot";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { session, loading: authLoading, authReady } = usePlayer();
  const { toast } = useToast();

  const navTo = useNavigate();

  useEffect(() => {
    if (authReady && session) {
      navTo("/", { replace: true });
    }
  }, [authReady, session, navTo]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!displayName.trim()) {
          toast({ title: "Vul een naam in", variant: "destructive" });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({ title: "Controleer je e-mail", description: "We hebben een bevestigingslink gestuurd." });
      }
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (error) {
      toast({ title: "Fout", description: String(error), variant: "destructive" });
      setLoading(false);
    }
  };

   if (!authReady || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">LINGO</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-bounce-in">
        <div className="flex flex-col items-center gap-2">
          <DingoMascot size={96} />
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-primary">LINGO</h1>
          <p className="text-muted-foreground">{isLogin ? "Inloggen" : "Account aanmaken"}</p>
        </div>

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3 w-full">
          {!isLogin && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jouw naam"
              maxLength={20}
              className="w-full px-4 py-3 rounded-lg bg-secondary text-secondary-foreground font-bold text-center border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mailadres"
            className="w-full px-4 py-3 rounded-lg bg-secondary text-secondary-foreground font-bold text-center border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            minLength={6}
            className="w-full px-4 py-3 rounded-lg bg-secondary text-secondary-foreground font-bold text-center border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-primary text-primary-foreground font-extrabold text-lg rounded-xl hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "..." : isLogin ? "Inloggen" : "Registreren"}
          </button>
        </form>

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">of</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => handleOAuth("google")}
            disabled={loading}
            className="w-full px-6 py-3 bg-secondary text-secondary-foreground font-bold rounded-xl hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
          >
            Doorgaan met Google
          </button>
          <button
            onClick={() => handleOAuth("apple")}
            disabled={loading}
            className="w-full px-6 py-3 bg-secondary text-secondary-foreground font-bold rounded-xl hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
          >
            Doorgaan met Apple
          </button>
        </div>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isLogin ? "Nog geen account? Registreer hier" : "Al een account? Log hier in"}
        </button>
      </div>
    </div>
  );
};

export default Auth;
