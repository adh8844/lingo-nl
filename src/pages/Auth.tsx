import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { usePlayer } from "@/hooks/usePlayer";
import DingoMascot from "@/components/DingoMascot";
import SEO from "@/components/SEO";

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
      navTo("/spelen", { replace: true });
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
        <div className="text-2xl font-extrabold text-primary animate-pulse">DINGOLINGO</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-full bg-card/70 backdrop-blur-xl border border-border shadow-lg max-w-[calc(100vw-1rem)]"
      >
        <div className="flex items-center gap-0.5 pl-1 sm:pl-2 pr-2 sm:pr-3">
          <span className="text-base sm:text-lg font-extrabold text-primary leading-none">Ding</span>
          <DingoMascot size={20} className="-mx-0.5 sm:size-[22px]" />
          <span className="text-base sm:text-lg font-extrabold text-primary leading-none">Lingo</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navTo("/")}
          className="flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-full text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-3 h-3" />
          Terug
        </motion.button>
      </motion.header>

      <SEO
        title={isLogin ? "Inloggen — LINGO NL" : "Account aanmaken — LINGO NL"}
        description="Log in of maak een gratis account aan om Lingo in het Nederlands te spelen, badges te verdienen en je voortgang bij te houden."
        path="/auth"
      />
      <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-bounce-in">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-7xl sm:text-8xl font-extrabold tracking-tighter text-primary flex items-end leading-none">
            <span>L</span>
            <DingoMascot size={96} className="mx-[-4px] mb-[2px] hidden sm:block" />
            <DingoMascot size={72} className="mx-[-4px] mb-[2px] block sm:hidden" />
            <span>NGO</span>
          </h1>
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
