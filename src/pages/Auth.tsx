import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Eye, EyeOff, Sparkles, Star, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { usePlayer } from "@/hooks/usePlayer";
import SEO from "@/components/SEO";
import dingoCool from "@/assets/dingo-final-zittend-cool.png";

const PUPIL_EMAIL_DOMAIN = "pupil.dingolingo.local";

const FloatingShape = ({ delay, x, y, children }: { delay: number; x: string; y: string; children: React.ReactNode }) => (
  <motion.div
    className="absolute pointer-events-none text-primary/30"
    style={{ left: x, top: y }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0.3, 0.7, 0.3],
      scale: [0.8, 1.2, 0.8],
      y: [0, -20, 0],
      rotate: [0, 180, 360],
    }}
    transition={{ duration: 6, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

const Auth = () => {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [identifier, setIdentifier] = useState(""); // email OR username
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clicked, setClicked] = useState(false);
  const { session, authReady } = usePlayer();
  const { toast } = useToast();
  const navTo = useNavigate();
  const [searchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const dingoRotate = useTransform(mouseX, [-300, 300], [-15, 15]);
  const dingoY = useTransform(mouseY, [-300, 300], [-10, 10]);
  const smoothRotate = useSpring(dingoRotate, { stiffness: 50, damping: 20 });
  const smoothYV = useSpring(dingoY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    if (searchParams.get("mode") === "register") setMode("register");
  }, [searchParams]);

  useEffect(() => {
    if (authReady && session) navTo("/spelen", { replace: true });
  }, [authReady, session, navTo]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const resolveEmail = (raw: string) => {
    const v = raw.trim().toLowerCase();
    if (!v) return "";
    return v.includes("@") ? v : `${v}@${PUPIL_EMAIL_DOMAIN}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setClicked(true);
    setTimeout(() => setClicked(false), 600);

    const cleanId = identifier.trim().toLowerCase();

    if (mode === "forgot") {
      if (!cleanId.includes("@")) {
        toast({ title: "Vul je e-mailadres in", description: "Wachtwoord resetten kan alleen met een e-mailadres.", variant: "destructive" });
        return;
      }
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanId, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "E-mail verstuurd", description: "Check je inbox voor de resetlink." });
        setMode("login");
      } catch (err: any) {
        toast({ title: "Fout", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!cleanId || !password) {
      toast({ title: "Vul je gegevens in", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (mode === "register") {
        if (!cleanId.includes("@")) {
          toast({ title: "Gebruik een e-mailadres", description: "Registreren kan alleen met een e-mailadres. Leerlingen krijgen een account van hun docent.", variant: "destructive" });
          setLoading(false);
          return;
        }
        if (!displayName.trim()) {
          toast({ title: "Vul een naam in", variant: "destructive" });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: cleanId,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({ title: "Controleer je e-mail", description: "We hebben een bevestigingslink gestuurd." });
      } else {
        const email = resolveEmail(cleanId);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navTo("/spelen", { replace: true });
      }
    } catch (err: any) {
      toast({
        title: "Inloggen mislukt",
        description: err?.message ?? "Controleer je gegevens.",
        variant: "destructive",
      });
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

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-extrabold text-primary animate-pulse">DINGOLINGO</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center p-4"
    >
      <SEO
        title={mode === "register" ? "Account aanmaken — DingoLingo" : "Inloggen — DingoLingo"}
        description="Log in op DingoLingo. Leerlingen, docenten en ouders gebruiken dezelfde pagina."
        path="/auth"
      />

      {/* Animated background blobs */}
      <motion.div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/30 blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <FloatingShape delay={0} x="10%" y="20%"><Sparkles size={32} /></FloatingShape>
      <FloatingShape delay={1.5} x="85%" y="15%"><Star size={28} /></FloatingShape>
      <FloatingShape delay={3} x="15%" y="80%"><Heart size={24} /></FloatingShape>
      <FloatingShape delay={2} x="80%" y="75%"><Sparkles size={36} /></FloatingShape>
      <FloatingShape delay={4} x="50%" y="10%"><Star size={20} /></FloatingShape>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <motion.div className="flex justify-center mb-6" style={{ rotate: smoothRotate, y: smoothYV }}>
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.1, rotate: [0, -10, 10, -10, 0] }}
            className="relative"
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/40 blur-2xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <img src={dingoCool} alt="Dingo mascotte" className="relative w-40 h-40 object-contain drop-shadow-2xl" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-6"
        >
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent-foreground to-primary bg-clip-text text-transparent">
            Hoi ik ben Dingo!
          </h1>
          <p className="text-muted-foreground mt-2">
            {mode === "forgot"
              ? "Wachtwoord vergeten"
              : mode === "register"
              ? "Maak een account aan ✨"
              : "Log in om te spelen 🎮"}
          </p>
        </motion.div>

        <motion.div
          className="relative rounded-3xl border-2 border-primary/20 bg-card/80 backdrop-blur-xl p-8 shadow-2xl"
          whileHover={{ y: -4, boxShadow: "0 25px 50px -12px hsl(var(--primary) / 0.4)" }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                <label className="block text-sm font-semibold mb-2 text-foreground">Jouw naam</label>
                <motion.input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={20}
                  placeholder="bijv. Anna"
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background/50 focus:border-primary focus:bg-background focus:outline-none transition-all text-lg"
                  whileFocus={{ scale: 1.03 }}
                />
              </motion.div>
            )}

            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
              <label className="block text-sm font-semibold mb-2 text-foreground">
                {mode === "register" ? "E-mailadres" : "E-mail of gebruikersnaam"}
              </label>
              <motion.input
                type={mode === "register" || mode === "forgot" ? "email" : "text"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={mode === "register" || mode === "forgot" ? "naam@voorbeeld.nl" : "naam@voorbeeld.nl of anna123"}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background/50 focus:border-primary focus:bg-background focus:outline-none transition-all text-lg"
                whileFocus={{ scale: 1.03 }}
              />
            </motion.div>

            {mode !== "forgot" && (
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                <label className="block text-sm font-semibold mb-2 text-foreground">Wachtwoord</label>
                <div className="relative">
                  <motion.input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={4}
                    placeholder="••••"
                    className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-border bg-background/50 focus:border-primary focus:bg-background focus:outline-none transition-all text-lg tracking-widest"
                    whileFocus={{ scale: 1.03 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    aria-label="Toon wachtwoord"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {mode === "login" && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Wachtwoord vergeten?
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary to-accent-foreground py-4 text-lg font-bold text-primary-foreground shadow-lg disabled:opacity-60"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              animate={clicked ? { rotate: [0, -2, 2, -2, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <motion.span
                className="relative z-10 flex items-center justify-center gap-2"
                animate={loading ? { opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {loading
                  ? "Bezig..."
                  : mode === "forgot"
                  ? "Verstuur resetlink"
                  : mode === "register"
                  ? "Account aanmaken ✨"
                  : "Spelen! 🚀"}
              </motion.span>
              {clicked && (
                <motion.div
                  className="absolute inset-0 bg-white/30"
                  initial={{ scale: 0, opacity: 1, borderRadius: "100%" }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
              )}
            </motion.button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="flex items-center gap-3 w-full mt-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">of</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="flex flex-col gap-2 w-full mt-4">
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
            </>
          )}

          <div className="mt-6 text-center text-sm">
            {mode === "forgot" ? (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-muted-foreground hover:text-foreground transition"
              >
                Terug naar inloggen
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-muted-foreground hover:text-foreground transition"
              >
                {mode === "login" ? "Nog geen account? Registreer hier" : "Al een account? Log hier in"}
              </button>
            )}
          </div>

          <div className="mt-2 text-center text-xs text-muted-foreground">
            Leerlingen: gebruik je gebruikersnaam van je juf of meester.
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;
