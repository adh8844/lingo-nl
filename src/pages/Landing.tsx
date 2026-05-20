import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import Lenis from "lenis";
import {
  Trophy,
  Flame,
  Star,
  Zap,
  Sparkles,
  Users,
  Brain,
  ArrowRight,
  Target,
  Crown,
  ChevronDown,
} from "lucide-react";
import DingoMascot from "@/components/DingoMascot";
import SEO from "@/components/SEO";
import { usePlayer } from "@/hooks/usePlayer";
import dingoTrophy from "@/assets/dingo-trophy.png";
import dingoSunglasses from "@/assets/dingo-sunglasses.png";
import dingoConfetti from "@/assets/dingo-confetti.png";
import dingoDancing from "@/assets/dingo-dancing.png";

const Landing = () => {
  const navigate = useNavigate();
  const { session } = usePlayer();
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth scroll with Lenis
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, smoothWheel: true });
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const id = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
    };
  }, []);

  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  const ctaTarget = session ? "/spelen" : "/auth";
  const ctaLabel = session ? "Doorspelen" : "Maak een account";

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <SEO
        title="LINGO NL — Het Nederlandse woordspel dat je niet meer loslaat"
        description="Raad het woord, jaag op badges, beklim de ranglijst. Speel Lingo gratis online in het Nederlands."
        path="/"
      />

      {/* Scroll progress bar */}
      <motion.div
        style={{ scaleX: progressX }}
        className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-50"
      />

      {/* Floating nav */}
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-card/70 backdrop-blur-xl border border-border shadow-lg"
      >
        <div className="flex items-center gap-1 pl-2 pr-3">
          <span className="text-lg font-extrabold text-primary leading-none">L</span>
          <DingoMascot size={22} className="-mx-0.5" />
          <span className="text-lg font-extrabold text-primary leading-none">NGO</span>
        </div>
        <button
          onClick={() => navigate("/auth")}
          className="text-xs font-bold px-3 py-1.5 rounded-full text-foreground/80 hover:text-foreground transition-colors"
        >
          Inloggen
        </button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(ctaTarget)}
          className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-primary text-primary-foreground"
        >
          {session ? "Spelen" : "Start gratis"}
        </motion.button>
      </motion.header>

      <Hero ctaTarget={ctaTarget} ctaLabel={ctaLabel} />
      <MarqueeStrip />
      <HowItWorks />
      <FeatureGrid />
      <BoardShowcase />
      <BadgesSection />
      <FinalCTA ctaTarget={ctaTarget} ctaLabel={ctaLabel} />
      <Footer />
    </div>
  );
};

/* ----------------------------- Hero ----------------------------- */
const Hero = ({ ctaTarget, ctaLabel }: { ctaTarget: string; ctaLabel: string }) => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-12 overflow-hidden"
    >
      {/* Background glow blobs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-[120px]"
      />
      <motion.div
        animate={{ scale: [1, 1.3, 1], rotate: [0, -25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-accent/20 blur-[140px]"
      />

      {/* Floating letter tiles */}
      <FloatingTiles />

      <motion.div style={{ y, opacity }} className="relative z-10 flex flex-col items-center text-center max-w-3xl">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="mb-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-bold"
        >
          <Sparkles className="w-3 h-3 text-primary" />
          Nederlands woordspel · gratis · geen reclame
        </motion.div>

        <h1 className="font-extrabold tracking-tighter text-primary leading-[0.85] text-7xl sm:text-8xl md:text-9xl flex items-end justify-center">
          <motion.span
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            L
          </motion.span>
          <motion.span
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.4 }}
            className="inline-block mx-[-6px] mb-[2px]"
          >
            <DingoMascot size={120} className="md:!w-[140px] md:!h-[140px]" />
          </motion.span>
          <motion.span
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            NGO
          </motion.span>
        </h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-6 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight"
        >
          Raad het woord.{" "}
          <span className="text-primary">Beklim</span> de ranglijst.{" "}
          <span className="text-accent">Word</span> de scherpste taalkop van Nederland.
        </motion.p>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl"
        >
          5 pogingen. 90 seconden. Eindeloos verslavend. Speel solo, jaag op badges of daag
          vrienden uit voor een live duel.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-8 flex flex-col sm:flex-row items-center gap-3"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px hsl(var(--primary) / 0.5)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(ctaTarget)}
            className="group inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-primary text-primary-foreground font-extrabold text-lg shadow-lg shadow-primary/30"
          >
            {ctaLabel}
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/spelregels")}
            className="px-7 py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-lg border border-border"
          >
            Spelregels bekijken
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-10 flex items-center gap-6 text-xs text-muted-foreground"
        >
          <Stat icon={<Users className="w-4 h-4 text-primary" />} value="100%" label="Nederlands" />
          <Stat icon={<Zap className="w-4 h-4 text-primary" />} value="90s" label="per ronde" />
          <Stat icon={<Trophy className="w-4 h-4 text-primary" />} value="∞" label="badges" />
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ delay: 1.5, y: { repeat: Infinity, duration: 1.6 } }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground"
      >
        <ChevronDown className="w-6 h-6" />
      </motion.div>
    </section>
  );
};

const Stat = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="flex items-center gap-2">
    {icon}
    <div className="text-left">
      <div className="font-extrabold text-foreground text-sm">{value}</div>
      <div className="leading-none">{label}</div>
    </div>
  </div>
);

/* ------------------------- Floating tiles ------------------------- */
const FloatingTiles = () => {
  const tiles = [
    { letter: "W", color: "correct", x: "8%", y: "20%", delay: 0 },
    { letter: "O", color: "present", x: "85%", y: "18%", delay: 0.3 },
    { letter: "R", color: "absent", x: "12%", y: "70%", delay: 0.6 },
    { letter: "D", color: "correct", x: "82%", y: "72%", delay: 0.9 },
    { letter: "L", color: "present", x: "3%", y: "45%", delay: 1.2 },
    { letter: "N", color: "correct", x: "92%", y: "48%", delay: 1.5 },
  ];
  const colorMap: Record<string, string> = {
    correct: "bg-[hsl(var(--tile-correct))] text-white",
    present: "bg-[hsl(var(--tile-present))] text-primary-foreground",
    absent: "bg-[hsl(var(--tile-absent))] text-foreground",
  };
  return (
    <>
      {tiles.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0, rotate: -90 }}
          animate={{
            opacity: 1,
            scale: 1,
            rotate: 0,
            y: [0, -14, 0],
          }}
          transition={{
            opacity: { duration: 0.6, delay: t.delay },
            scale: { duration: 0.6, delay: t.delay, type: "spring" },
            rotate: { duration: 0.6, delay: t.delay },
            y: { repeat: Infinity, duration: 3 + i * 0.3, ease: "easeInOut", delay: t.delay },
          }}
          style={{ left: t.x, top: t.y }}
          className={`hidden md:flex absolute w-16 h-16 rounded-xl items-center justify-center text-3xl font-extrabold shadow-2xl ${colorMap[t.color]}`}
        >
          {t.letter}
        </motion.div>
      ))}
    </>
  );
};

/* ----------------------- Marquee strip ----------------------- */
const MarqueeStrip = () => {
  const words = ["WINDEN", "WEIDE", "DROOM", "KAAS", "FIETS", "STROOP", "OLIFANT", "GEZELLIG", "VUURTOREN"];
  return (
    <section className="py-8 border-y border-border bg-card/40 overflow-hidden">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="flex gap-8 whitespace-nowrap"
      >
        {[...words, ...words, ...words].map((w, i) => (
          <span
            key={i}
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground/70"
          >
            {w} <span className="text-primary mx-4">✦</span>
          </span>
        ))}
      </motion.div>
    </section>
  );
};

/* ------------------------ How it works ------------------------ */
const HowItWorks = () => {
  const steps = [
    {
      n: "01",
      title: "Kies je niveau",
      body: "Start met 4 letters. Verdien punten en badges om 5 en 6 letters te ontgrendelen.",
      icon: <Target className="w-12 h-12" />,
    },
    {
      n: "02",
      title: "Raad in 5 pogingen",
      body: "Groen = juist. Geel = juiste letter, foute plek. Grijs = nope. De klok tikt — 90 seconden.",
      icon: <Brain className="w-12 h-12" />,
    },
    {
      n: "03",
      title: "Daag vrienden uit",
      body: "Best-of-9 live duels met millisecondes-tiebreak. Wie raadt het scherpst en het snelst?",
      icon: <Users className="w-12 h-12" />,
    },
  ];
  return (
    <section className="relative py-28 px-4">
      <SectionHeader
        kicker="Hoe het werkt"
        title="Drie stappen. Eén obsessie."
      />
      <div className="max-w-6xl mx-auto mt-14 grid md:grid-cols-3 gap-5">
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: i * 0.12 }}
            whileHover={{ y: -6 }}
            className="group relative p-7 rounded-3xl bg-card border border-border overflow-hidden"
          >
            <div className="absolute -top-6 -right-6 text-9xl font-extrabold text-primary/5 select-none">
              {s.n}
            </div>
            <div className="relative flex items-center gap-3 mb-4">
              <div className="w-20 h-20 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                {s.icon}
              </div>
              <span className="text-xs font-bold text-muted-foreground">{s.n}</span>
            </div>
            <h3 className="relative text-2xl font-extrabold mb-2">{s.title}</h3>
            <p className="relative text-muted-foreground">{s.body}</p>
            <motion.div
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              className="absolute bottom-0 left-0 right-0 h-1 bg-primary origin-left"
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const SectionHeader = ({ kicker, title }: { kicker: string; title: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="max-w-3xl mx-auto text-center"
  >
    <div className="inline-block px-3 py-1 mb-4 rounded-full bg-primary/10 text-primary text-xs font-extrabold tracking-widest uppercase">
      {kicker}
    </div>
    <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">{title}</h2>
  </motion.div>
);

/* ------------------------ Feature grid ------------------------ */
const FeatureGrid = () => {
  const features = [
    { icon: <Flame className="w-5 h-5" />, title: "Dagelijkse streaks", body: "Mis geen dag. Bouw een vlam." },
    { icon: <Star className="w-5 h-5" />, title: "Puntenjacht", body: "Hoe sneller je raadt, hoe meer punten." },
    { icon: <Crown className="w-5 h-5" />, title: "Nationale ranglijst", body: "Strijd tegen heel Nederland." },
    { icon: <Zap className="w-5 h-5" />, title: "Live duels", body: "Best-of-9 tegen je vrienden." },
    { icon: <Trophy className="w-5 h-5" />, title: "Tientallen badges", body: "Zeldzame medailles voor scherpe spelers." },
    { icon: <Sparkles className="w-5 h-5" />, title: "Challenger Mode", body: "Eén poging. 60 seconden. Lange woorden." },
  ];
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-transparent via-card/30 to-transparent">
      <SectionHeader kicker="Wat je krijgt" title="Niet zomaar een woordspel." />
      <div className="max-w-6xl mx-auto mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            whileHover={{ scale: 1.03, borderColor: "hsl(var(--primary))" }}
            className="p-6 rounded-2xl bg-card border border-border cursor-default"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-3">
              {f.icon}
            </div>
            <h4 className="font-extrabold text-lg mb-1">{f.title}</h4>
            <p className="text-sm text-muted-foreground">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

/* ------------------------ Board showcase ------------------------ */
const BoardShowcase = () => {
  // Animated mini-board reveal voor 6-letter woord HERKEN
  const target = "HERKEN";
  const guesses = ["HONGER", "HARKEN", "HERKEN"];
  const colors = (guess: string) =>
    guess.split("").map((c, i) =>
      c === target[i] ? "correct" : target.includes(c) ? "present" : "absent",
    );
  const colorClass: Record<string, string> = {
    correct: "bg-[hsl(var(--tile-correct))] text-white border-transparent",
    present: "bg-[hsl(var(--tile-present))] text-primary-foreground border-transparent",
    absent: "bg-[hsl(var(--tile-absent))] text-foreground border-transparent",
  };

  return (
    <section className="py-28 px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-block px-3 py-1 mb-4 rounded-full bg-accent/15 text-accent text-xs font-extrabold tracking-widest uppercase">
            Het spel
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5">
            Eén raadsel. <br />
            <span className="text-primary">Vijf kansen.</span> <br />
            <span className="text-accent">Negentig seconden.</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Elke tik op het toetsenbord telt. Elke seconde levert punten op. En als je het woord
            kraakt? Confetti, een blije Dingo en een streak die je niet wil verliezen.
          </p>
          <ul className="space-y-3">
            {[
              "Realtime feedback per letter",
              "Snelheidsbonus voor scherpe denkers",
              "Multipliers voor streaks",
              "Anti-cheat via server-side validatie",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[hsl(var(--tile-correct))] flex items-center justify-center text-white text-xs">
                  ✓
                </div>
                <span className="font-medium">{t}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40, rotate: 4 }}
          whileInView={{ opacity: 1, x: 0, rotate: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, type: "spring" }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl opacity-50" />
          <div className="relative p-6 sm:p-8 rounded-[2rem] bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between mb-5 text-xs font-bold text-muted-foreground">
              <span>6 letters · Nederlands</span>
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-accent" /> 6
                <span className="ml-3">⏱ 0:52</span>
              </span>
            </div>
            <div className="space-y-2">
              {guesses.map((g, row) => {
                const cs = colors(g);
                return (
                  <div key={row} className="grid grid-cols-6 gap-2">
                    {g.split("").map((ch, i) => (
                      <motion.div
                        key={i}
                        initial={{ rotateX: 0 }}
                        whileInView={{ rotateX: [0, 90, 0] }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.6,
                          delay: row * 0.5 + i * 0.1,
                        }}
                        className={`aspect-square rounded-lg flex items-center justify-center text-xl sm:text-2xl font-extrabold ${colorClass[cs[i]]}`}
                      >
                        {ch}
                      </motion.div>
                    ))}
                  </div>
                );
              })}
              {[...Array(2)].map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-2">
                  {[...Array(6)].map((_, j) => (
                    <div
                      key={j}
                      className="aspect-square rounded-lg bg-[hsl(var(--tile-empty))] border border-border/50"
                    />
                  ))}
                </div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 2 }}
              className="mt-5 flex items-center justify-center gap-2 text-primary font-extrabold"
            >
              <img src={dingoConfetti} alt="" className="w-12 h-12" />
              Geraden!
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ------------------------ Badges section ------------------------ */
const BadgesSection = () => {
  const badges = [
    { icon: <Flame className="w-7 h-7" />, name: "Op dreef", desc: "5 dagen op rij gespeeld", points: 50, rare: false },
    { icon: <Zap className="w-7 h-7" />, name: "Supersnel", desc: "Geraden binnen 20 seconden", points: 30, rare: false },
    { icon: <Target className="w-7 h-7" />, name: "Vlekkeloos", desc: "Geraden in 1 poging", points: 75, rare: true },
    { icon: <Crown className="w-7 h-7" />, name: "Maandmaster", desc: "Een maand lang elke dag gespeeld", points: 200, rare: true },
    { icon: <Trophy className="w-7 h-7" />, name: "Meesterspeler", desc: "1000 spellen gewonnen", points: 250, rare: true },
    { icon: <Users className="w-7 h-7" />, name: "Werver", desc: "5 vrienden uitgenodigd", points: 100, rare: false },
    { icon: <Brain className="w-7 h-7" />, name: "Onvermoeibaar", desc: "50 spellen in één dag", points: 80, rare: false },
    { icon: <Star className="w-7 h-7" />, name: "Legend", desc: "Top 10 van Nederland", points: 500, rare: true },
  ];
  return (
    <section className="py-28 px-4 relative overflow-hidden">
      <SectionHeader
        kicker="Verzamel ze allemaal"
        title="Badges die laten zien hoe jij speelt."
      />
      <div className="max-w-5xl mx-auto mt-14 grid grid-cols-2 md:grid-cols-4 gap-3">
        {badges.map((b, i) => (
          <motion.div
            key={b.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: (i % 4) * 0.08, type: "spring" }}
            whileHover={{ y: -4 }}
            className={`relative rounded-xl border p-4 ${
              b.rare
                ? "bg-accent/10 border-accent/30"
                : "bg-primary/10 border-primary/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`shrink-0 mt-0.5 ${b.rare ? "text-accent" : "text-primary"}`}>
                {b.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {b.name}
                    {b.rare && " ★"}
                  </p>
                  <span className="text-[10px] font-bold text-primary shrink-0">+{b.points}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{b.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="text-center mt-8 text-sm text-muted-foreground">
        Plus tientallen andere — voor streaks, snelheid, doorzettingsvermogen en pure brille.
      </p>
    </section>
  );
};

/* ------------------------ Final CTA ------------------------ */
const FinalCTA = ({ ctaTarget, ctaLabel }: { ctaTarget: string; ctaLabel: string }) => {
  const navigate = useNavigate();
  return (
    <section className="py-32 px-4 relative overflow-hidden">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-[80vw] h-[80vw] max-w-3xl max-h-3xl rounded-full bg-gradient-to-tr from-primary/20 via-transparent to-accent/20 blur-3xl" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative max-w-3xl mx-auto text-center"
      >
        <DingoMascot size={120} className="mx-auto mb-6" />
        <h2 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight">
          Klaar om de <span className="text-primary">scherpste</span> taalkop te worden?
        </h2>
        <p className="mt-5 text-lg text-muted-foreground">
          Gratis. Geen reclame. Geen onzin. Eén klik en je raadt je eerste woord.
        </p>
        <motion.button
          whileHover={{ scale: 1.06, boxShadow: "0 0 60px hsl(var(--primary) / 0.6)" }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate(ctaTarget)}
          className="mt-8 inline-flex items-center gap-2 px-9 py-5 rounded-2xl bg-primary text-primary-foreground font-extrabold text-xl shadow-2xl shadow-primary/40"
        >
          {ctaLabel}
          <ArrowRight className="w-6 h-6" />
        </motion.button>
        <p className="mt-4 text-xs text-muted-foreground">
          Al een account?{" "}
          <button onClick={() => navigate("/auth")} className="underline font-bold">
            Inloggen
          </button>
        </p>
      </motion.div>
    </section>
  );
};

const Footer = () => (
  <footer className="py-10 px-4 border-t border-border text-center text-xs text-muted-foreground">
    <p>
      © {new Date().getFullYear()} LINGO NL — Gemaakt met ♥ in Nederland
    </p>
  </footer>
);

export default Landing;
