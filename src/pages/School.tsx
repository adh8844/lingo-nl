import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Users,
  Trophy,
  Check,
  Mail,
} from "lucide-react";
import SEO from "@/components/SEO";
import dingoLogo from "@/assets/dingo-final-zittend-cool.png";

const SCHOOL_CONTACT_EMAIL = "denheijera@icloud.com";

const School = () => {
  const navigate = useNavigate();

  const mailto =
    `mailto:${SCHOOL_CONTACT_EMAIL}` +
    `?subject=${encodeURIComponent("Aanvraag DingoLingo voor onze school")}` +
    `&body=${encodeURIComponent(
      "Beste DingoLingo team,\n\nWij willen graag DingoLingo aanbieden aan onze leerlingen.\n\nNaam school: \nPlaats: \nAantal leerlingen (Groep 3 t/m 8): \nContactpersoon: \nTelefoon: \n\nMet vriendelijke groet,\n"
    )}`;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <SEO
        title="DingoLingo voor scholen — Lingo voor Groep 3 t/m 8"
        description="DingoLingo voor de basisschool: woordenschat, spelling en plezier voor leerlingen uit Groep 3 t/m 8. Eigen schoolomgeving, vanaf €1 per leerling per jaar."
        path="/school"
      />

      {/* Floating header */}
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-3 inset-x-0 mx-auto w-fit z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-card/70 backdrop-blur-xl border border-border shadow-lg"
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-xs font-bold text-foreground/80 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Terug
        </button>
        <span className="text-base font-extrabold text-primary leading-none px-2">
          DingoLingo
        </span>
        <a
          href={mailto}
          className="text-[11px] sm:text-xs font-extrabold px-3 py-1.5 rounded-full bg-primary text-primary-foreground"
        >
          Vraag aan
        </a>
      </motion.header>

      {/* Hero */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 pt-28 pb-16 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 25, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, -25, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-accent/20 blur-[140px]"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex flex-col items-center text-center max-w-3xl"
        >
          <div className="mb-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-bold">
            <GraduationCap className="w-3.5 h-3.5 text-primary" />
            Voor de basisschool · Groep 3 t/m 8
          </div>

          <img
            src={dingoLogo}
            alt="DingoLingo mascotte"
            className="h-24 sm:h-32 w-auto object-contain mb-4"
          />

          <h1 className="font-extrabold tracking-tighter leading-[0.9] text-4xl sm:text-6xl md:text-7xl">
            <span className="text-primary">DingoLingo</span>
            <br />
            voor de basisschool
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl">
            Woordenschat en spelling waar leerlingen <span className="text-foreground font-bold">naar uitkijken</span>.
            Een veilige, besloten leeromgeving voor uw hele school — vanaf{" "}
            <span className="text-primary font-extrabold">€1 per leerling per jaar</span>.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <motion.a
              whileHover={{ scale: 1.05, boxShadow: "0 0 40px hsl(var(--primary) / 0.5)" }}
              whileTap={{ scale: 0.95 }}
              href={mailto}
              className="group inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-primary text-primary-foreground font-extrabold text-lg shadow-lg shadow-primary/30"
            >
              Vraag schoolaccount aan
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </motion.a>
            <button
              onClick={() => navigate("/")}
              className="px-7 py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-lg border border-border"
            >
              Naar de homepagina
            </button>
          </div>
        </motion.div>
      </section>

      {/* Waarom */}
      <Section
        kicker="Waarom DingoLingo"
        title="Spelend leren, écht effectief."
      >
        <div className="max-w-5xl mx-auto mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: <Sparkles className="w-7 h-7" />,
              title: "Woordenschat & spelling",
              body: "Honderden Nederlandse woorden, afgestemd op niveau 4, 5 en 6 letters.",
            },
            {
              icon: <Trophy className="w-7 h-7" />,
              title: "Motiverend",
              body: "Badges, streaks en dagklassementen houden leerlingen scherp én betrokken.",
            },
            {
              icon: <ShieldCheck className="w-7 h-7" />,
              title: "Veilige omgeving",
              body: "Geen reclame, geen externe contacten. Alleen klasgenoten in de ranglijst.",
            },
            {
              icon: <GraduationCap className="w-7 h-7" />,
              title: "Groep 3 t/m 8",
              body: "Geschikt voor de hele onderbouw én bovenbouw. Speelt op tablet en chromebook.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="p-5 rounded-2xl bg-card border border-border"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <h3 className="font-extrabold text-lg mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Eigen schoolomgeving */}
      <Section
        kicker="Eigen schoolomgeving"
        title="Uw school. Uw kring."
      >
        <div className="max-w-3xl mx-auto mt-10 grid gap-4">
          {[
            "Leerlingen zien alleen klasgenoten en schoolgenoten in de ranglijst.",
            "Online uitdagingen kunnen alleen tussen leerlingen van dezelfde school.",
            "Geen vermenging met externe spelers — een vertrouwde, gesloten kring.",
            "Iedere leerling krijgt een eigen account met persoonlijke voortgang en badges.",
          ].map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border"
            >
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <p className="text-base sm:text-lg text-foreground">{line}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Prijs */}
      <Section kicker="Tarief" title="Eerlijk en eenvoudig.">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-xl mx-auto mt-12 p-8 sm:p-10 rounded-3xl bg-card border-2 border-primary/40 shadow-2xl shadow-primary/20 text-center"
        >
          <div className="text-xs font-extrabold tracking-widest uppercase text-primary mb-3">
            Schoollicentie
          </div>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-6xl sm:text-7xl font-extrabold tracking-tight text-foreground">
              €1
            </span>
            <span className="text-lg font-bold text-muted-foreground">
              / leerling / jaar
            </span>
          </div>
          <p className="mt-4 text-muted-foreground">
            Eén jaarbedrag per leerlingaccount. Eén factuur per school.
            Geen verborgen kosten, geen reclame, geen in-app aankopen.
          </p>
          <ul className="mt-6 grid gap-2 text-left">
            {[
              "Onbeperkt spelen voor alle aangemelde leerlingen",
              "Eigen ranglijst binnen de school",
              "Persoonlijke voortgang en badges per leerling",
              "Factuur op naam van de school",
            ].map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <a
            href={mailto}
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-extrabold"
          >
            <Mail className="w-4 h-4" />
            Vraag een offerte aan
          </a>
        </motion.div>
      </Section>

      {/* Hoe het werkt */}
      <Section kicker="Hoe het werkt" title="In drie stappen live.">
        <div className="max-w-5xl mx-auto mt-12 grid md:grid-cols-3 gap-5">
          {[
            {
              n: "01",
              title: "Aanmelden",
              body: "U stuurt een korte aanvraag. Wij nemen binnen 2 werkdagen contact op.",
              icon: <Mail className="w-8 h-8" />,
            },
            {
              n: "02",
              title: "School krijgt code",
              body: "We maken uw schoolomgeving aan en sturen u een unieke schoolcode.",
              icon: <ShieldCheck className="w-8 h-8" />,
            },
            {
              n: "03",
              title: "Leerlingen spelen",
              body: "Leerlingen registreren met de schoolcode en kunnen direct beginnen.",
              icon: <Users className="w-8 h-8" />,
            },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative p-7 rounded-3xl bg-card border border-border overflow-hidden"
            >
              <div className="absolute -top-6 -right-6 text-9xl font-extrabold text-primary/5 select-none">
                {s.n}
              </div>
              <div className="relative w-14 h-14 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-4">
                {s.icon}
              </div>
              <h3 className="relative text-xl font-extrabold mb-1">{s.title}</h3>
              <p className="relative text-muted-foreground text-sm">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center p-10 sm:p-14 rounded-3xl bg-gradient-to-br from-primary/15 via-card to-accent/10 border border-border"
        >
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Klaar om DingoLingo in de klas te brengen?
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg">
            Schrijf uw school in en geef leerlingen van Groep 3 t/m 8 een
            woordspel waar ze écht plezier in hebben.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={mailto}
              className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-primary text-primary-foreground font-extrabold text-lg"
            >
              <Mail className="w-5 h-5" />
              Vraag schoolaccount aan
            </a>
            <button
              onClick={() => navigate("/")}
              className="px-7 py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-lg border border-border"
            >
              Terug naar landing
            </button>
          </div>
        </motion.div>
      </section>

      <footer className="py-10 px-4 text-center text-xs text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} DingoLingo · Speel je wijzer
      </footer>
    </div>
  );
};

const Section = ({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="py-20 sm:py-24 px-4">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto text-center"
    >
      <div className="inline-block px-3 py-1 mb-4 rounded-full bg-primary/10 text-primary text-xs font-extrabold tracking-widest uppercase">
        {kicker}
      </div>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
        {title}
      </h2>
    </motion.div>
    {children}
  </section>
);

export default School;
