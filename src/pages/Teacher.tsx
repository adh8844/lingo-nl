import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, GraduationCap, Mail, Users, BookOpen, BarChart3 } from "lucide-react";
import SEO from "@/components/SEO";
import { usePlayer } from "@/hooks/usePlayer";
import { useIsTeacher } from "@/hooks/useIsTeacher";

const TEACHER_CONTACT = "denheijera@icloud.com";

const Teacher = () => {
  const navigate = useNavigate();
  const { session } = usePlayer();
  const { isTeacher } = useIsTeacher();

  const mailto =
    `mailto:${TEACHER_CONTACT}` +
    `?subject=${encodeURIComponent("Aanvraag docent-rol DingoLingo")}` +
    `&body=${encodeURIComponent(
      "Beste DingoLingo team,\n\nIk wil graag een docent-account bij DingoLingo.\n\nNaam: \nSchool: \nGroep/klas: \nE-mail account: \n\nMet vriendelijke groet,\n",
    )}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Docent worden — DingoLingo"
        description="Beheer een klas leerlingen, wijs woordensets toe en volg voortgang. Vraag een docent-account aan bij DingoLingo."
        path="/docent"
      />

      <header className="px-4 pt-6 pb-2 max-w-3xl mx-auto flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug
        </button>
        <span className="text-sm font-extrabold text-primary">DingoLingo</span>
      </header>

      <main className="px-4 py-10 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-primary/10 text-primary text-xs font-extrabold tracking-widest uppercase">
            <GraduationCap className="w-3.5 h-3.5" />
            Voor docenten
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            DingoLingo in jouw klas.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Geef leerlingen veilige, gerichte woordenschat-oefening. Met een docent-account
            koppel je leerlingen aan jouw klas en zie je hun voortgang.
          </p>
        </motion.div>

        {isTeacher && (
          <div className="mt-6 p-4 rounded-2xl bg-primary/10 border border-primary/30 text-sm font-bold text-primary">
            Je hebt een docent-rol. Een volledig docent-dashboard komt binnenkort.
          </div>
        )}

        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          {[
            { icon: <Users className="w-6 h-6" />, t: "Eigen klas", b: "Leerlingen onder jouw klascode, eigen ranglijst." },
            { icon: <BookOpen className="w-6 h-6" />, t: "Woordensets", b: "Wijs woordlijsten toe per thema of niveau." },
            { icon: <BarChart3 className="w-6 h-6" />, t: "Voortgang", b: "Zie per leerling welke woorden zitten en welke niet." },
          ].map((f) => (
            <div key={f.t} className="p-5 rounded-2xl bg-card border border-border">
              <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <h3 className="font-extrabold">{f.t}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.b}</p>
            </div>
          ))}
        </div>

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
            {!session && (
              <button
                onClick={() => navigate("/auth?mode=register")}
                className="px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold border border-border"
              >
                Eerst account maken
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Teacher;
