import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DingoMascot from "@/components/DingoMascot";
import SEO from "@/components/SEO";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const navTo = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      toast({ title: "Ongeldige link", description: "Deze resetlink is ongeldig of verlopen.", variant: "destructive" });
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast({ title: "Wachtwoord gewijzigd", description: "Je kunt nu inloggen met je nieuwe wachtwoord." });
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-full bg-card/70 backdrop-blur-xl border border-border shadow-lg max-w-[calc(100vw-1rem)]"
      >
        <div className="flex items-center gap-1.5 pl-1 sm:pl-2 pr-2 sm:pr-3">
          <DingoMascot size={24} />
          <span className="text-base sm:text-lg font-extrabold text-primary leading-none">DingoLingo</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navTo("/auth")}
          className="flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-full text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-3 h-3" />
          Terug
        </motion.button>
      </motion.header>

      <SEO
        title="Wachtwoord resetten — DingoLingo"
        description="Stel een nieuw wachtwoord in voor je DingoLingo account."
        path="/reset-password"
      />
      <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-bounce-in">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter flex items-end leading-none">
            <span className="text-primary">Nieuw wachtwoord</span>
          </h1>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 w-full">
            <p className="text-muted-foreground text-center">Je wachtwoord is succesvol gewijzigd.</p>
            <button
              onClick={() => navTo("/auth")}
              className="w-full px-6 py-3 bg-primary text-primary-foreground font-extrabold text-lg rounded-xl hover:brightness-110 transition-all active:scale-95"
            >
              Ga naar inloggen
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nieuw wachtwoord"
                minLength={6}
                required
                className="w-full px-4 py-3 rounded-lg bg-secondary text-secondary-foreground font-bold text-center border-2 border-transparent focus:border-primary focus:outline-none transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading || password.length < 6}
              className="w-full px-6 py-3 bg-primary text-primary-foreground font-extrabold text-lg rounded-xl hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "..." : "Wachtwoord opslaan"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
