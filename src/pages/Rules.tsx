import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";

const Rules = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center px-3 sm:px-4 py-6 sm:py-10">
      <SEO
        title="Spelregels — LINGO NL woordspel"
        description="Lees de spelregels van Lingo NL: hoe je woorden raadt, punten verdient, badges ontgrendelt en niveaus van 4, 5 en 6 letters speelt."
        path="/spelregels"
      />
      <div className="w-full max-w-2xl">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug
        </button>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary mb-8">Spelregels — Lingo</h1>

        <div className="space-y-6 text-foreground leading-relaxed text-[15px]">
          <section>
            <h2 className="text-xl font-bold mb-2">Wat is Lingo?</h2>
            <p>
              Lingo is een woordraadspel waarbij je een verborgen woord moet raden door slimme pogingen te doen. Na elke
              poging krijg je feedback: welke letters op de juiste plek staan, welke letters wel in het woord zitten
              maar op de verkeerde plek, en welke letters helemaal niet voorkomen. Je hebt maximaal 5 pogingen per
              woord.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">De drie niveaus</h2>
            <p className="mb-3">Lingo kent drie niveaus die je één voor één vrijspeelt:</p>
            <div className="space-y-3 pl-1">
              <p>
                <strong>4-letter Lingo</strong> is altijd toegankelijk voor iedereen — dit is het startpunt. Hier leer
                je het spel kennen en bouw je punten en badges op.
              </p>
              <p>
                <strong>5-letter Lingo</strong> ontgrendel je zodra je aan één van de volgende voorwaarden voldoet: je
                hebt 250 punten verzameld in 4-letter Lingo, of je hebt minstens 3 badges verdiend uit minimaal 2
                verschillende categorieën, of je hebt 5 woorden op rij geraden in je eerste poging.
              </p>
              <p>
                <strong>6-letter Lingo</strong> is het hoogste niveau en vereist een combinatie: minimaal 600 punten
                totaal (over alle niveaus samen), plus minstens één zeldzame badge (★) of 8 gewone badges, plus de "Op
                dreef"-badge (3 dagen op rij gespeeld).
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Hoe verdien je punten?</h2>
            <p className="mb-3">
              Punten verdien je per spel. Hoe sneller je het woord raadt, hoe meer je krijgt. Het basisresultaat hangt
              af van in welke poging je het woord raadt:
            </p>
            <p className="mb-3">
              In 4-letter Lingo krijg je 20 punten voor het raden van het woord bij de eerste-poging, 15 voor de tweede,
              12 voor de derde, 10 voor de vierde, 5 voor de vijfde en 2 punten als je het woord niet raadt. In 5-letter
              Lingo worden deze bedragen vermenigvuldigd met 1,5. In 6-letter Lingo met 2,0.
            </p>
            <p>
              Bovenop het basisresultaat komen snelheidsbonussen (als je het woord snel raadt), reeksbonussen (als je
              meerdere dagen op rij speelt) en dagelijkse bonussen. Zie de puntentabel voor de exacte bedragen.
            </p>
            <p className="mb-3">Voor elke week dat je geen Lingo speelt verlies je 100 punten. Je puntentotaal kan nooit negatief worden — er wordt nooit meer afgetrokken dan je hebt.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Badges</h2>
            <p className="mb-3">
              Naast punten verdien je badges voor bijzondere prestaties. Er zijn 28 badges verdeeld over 6 categorieën:
              Tijd, Reeks, Vaardigheid, Sociaal, Uithoudingsvermogen en Prestige. Zeldzame badges (★) zijn moeilijker te
              verdienen maar geven meer punten en tellen zwaarder mee bij het ontgrendelen van 6-letter Lingo.
            </p>
            <p>
              Badges zijn zichtbaar op je profiel. Ze tonen aan andere spelers wat voor speler jij bent — niet alleen
              hoe hoog je staat, maar ook hoe je speelt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">De ranglijst</h2>
            <p>
              De ranglijst wordt bepaald door totale punten. Badges zijn zichtbaar maar tellen niet direct mee voor je
              positie op de ranglijst. Punten zijn de enige maatstaf voor wie er bovenaan staat.
            </p>
          </section>

          <section className="bg-primary/5 border border-primary/20 rounded-xl p-4 sm:p-5">
            <h2 className="text-xl font-bold mb-2">Kort samengevat</h2>
            <p>
              Punten zijn de motor van het spel: ze bepalen je positie op de ranglijst en zijn één route naar hogere
              niveaus. Badges zijn de sleutels: ze openen deuren die punten alleen soms niet kunnen openen, en ze
              vertellen het verhaal van hoe jij speelt. Het beste resultaat bereik je met een combinatie van beide.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Rules;
