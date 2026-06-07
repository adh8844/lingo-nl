import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, LockOpen, AlertTriangle, Users, Star } from "lucide-react";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Rules = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center px-3 sm:px-4 py-6 sm:py-10">
      <SEO
        title="Spelregels — DingoLingo woordenschat oefenen"
        description="Lees hoe DingoLingo werkt: kies een speelmodus (Leren zonder timer, Oefenen, Klassiek of Uitdaging), raad het Nederlandse woord en bouw je woordenschat op."
        path="/spelregels"
      />
      <div className="w-full max-w-3xl">
        <button
          onClick={() => navigate("/spelen")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug
        </button>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary mb-8">
          Zo werkt DingoLingo
        </h1>

        <div className="space-y-5">
          {/* Kaart 1 — Het spel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Het spel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-[15px] leading-relaxed space-y-4">
                <p>
                  Raad het verborgen woord in maximaal 5 pogingen. De eerste letter krijg je cadeau — de rest moet je zelf ontdekken.
                  Alleen bestaande Nederlandse woorden zijn toegestaan. Voer je een ongeldig woord in, dan sla je een beurt over.
                </p>
                <p>
                  Na elke geldige poging ontvang je feedback:
                </p>
              </div>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="w-24">
                      <span className="inline-block w-6 h-6 rounded-sm bg-tile-correct" />
                    </TableCell>
                    <TableCell>Letter op de juiste plek</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <span className="inline-block w-6 h-6 rounded-sm bg-tile-present" />
                    </TableCell>
                    <TableCell>Letter in het woord, maar op de verkeerde plek</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <span className="inline-block w-6 h-6 rounded-sm bg-tile-absent" />
                    </TableCell>
                    <TableCell>Letter komt niet voor in het woord</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Kaart 1b — Speelmodi */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Speelmodi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Kies een modus die bij jou past. Voor leerlingen en beginners raden we{" "}
                <strong className="text-foreground">Leren</strong> aan — geen tijdsdruk, zodat je rustig
                kunt nadenken over het juiste woord.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modus</TableHead>
                    <TableHead>Timer</TableHead>
                    <TableHead>Voor wie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold">Leren</TableCell>
                    <TableCell>geen</TableCell>
                    <TableCell>Leerlingen en beginners. Geen snelheidsbonus.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Oefenen</TableCell>
                    <TableCell>3:00</TableCell>
                    <TableCell>Rustig oefenen met meer tijd dan klassiek.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Klassiek</TableCell>
                    <TableCell>1:30</TableCell>
                    <TableCell>De originele DingoLingo-uitdaging.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Uitdaging</TableCell>
                    <TableCell>1:00</TableCell>
                    <TableCell>Voor wie écht snel wil zijn.</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Kaart 2 — Niveaus */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Niveaus</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Toegang</TableHead>
                    <TableHead>Ontgrendelvoorwaarden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold">4-letter</TableCell>
                    <TableCell>
                      <LockOpen className="w-5 h-5 text-tile-correct" />
                    </TableCell>
                    <TableCell>Startpunt voor iedereen</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold align-top">5-letter</TableCell>
                    <TableCell className="align-top">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-foreground mb-1">Eén van deze is genoeg:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>250 punten in 4-letter</li>
                        <li>3 badges uit minstens 2 categorieën</li>
                        <li>5 woorden op rij geraden in 1e poging</li>
                      </ul>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold align-top">6-letter</TableCell>
                    <TableCell className="align-top">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-foreground mb-1">Je hebt alles hiervan nodig:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>600 punten totaal (alle niveaus)</li>
                        <li>1 zeldzame badge ★ óf 8 gewone badges</li>
                        <li>"Op dreef"-badge (3 dagen op rij gespeeld)</li>
                      </ul>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Kaart 3 — Puntensysteem */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Puntensysteem</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Poging</TableHead>
                    <TableHead>4-letter (×1,0)</TableHead>
                    <TableHead>5-letter (×1,5)</TableHead>
                    <TableHead>6-letter (×2,0)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["1e poging", "20", "30", "40"],
                    ["2e poging", "15", "22,5", "30"],
                    ["3e poging", "12", "18", "24"],
                    ["4e poging", "10", "15", "20"],
                    ["5e poging", "5", "7,5", "10"],
                    ["Niet geraden", "2", "3", "4"],
                  ].map(([label, a, b, c]) => (
                    <TableRow key={label}>
                      <TableCell className="font-medium">{label}</TableCell>
                      <TableCell>{a} pt</TableCell>
                      <TableCell>{b} pt</TableCell>
                      <TableCell>{c} pt</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>
                  Bovenop het basisresultaat: snelheidsbonus, reeksbonus en dagelijkse bonus — zie
                  de puntentabel voor exacte bedragen.
                </p>
                <p className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-accent shrink-0" />
                  <span>
                    Inactief: −100 punten per week zonder Lingo. Puntentotaal wordt nooit negatief.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Kaart 3b — Bonussen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Bonussen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Snelheidsbonus */}
              <div>
                <h3 className="font-semibold mb-2">Snelheidsbonus</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Hoe sneller je het woord raadt, hoe meer extra punten je verdient. De drempels
                  verschillen per niveau.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Opgelost binnen</TableHead>
                      <TableHead>4-letter</TableHead>
                      <TableHead>5-letter</TableHead>
                      <TableHead>6-letter</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Supersnel</TableCell>
                      <TableCell>&lt;15s · +8</TableCell>
                      <TableCell>&lt;20s · +10</TableCell>
                      <TableCell>&lt;25s · +15</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Snel</TableCell>
                      <TableCell>&lt;30s · +4</TableCell>
                      <TableCell>&lt;40s · +5</TableCell>
                      <TableCell>&lt;50s · +7</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Vlot</TableCell>
                      <TableCell>&lt;60s · +2</TableCell>
                      <TableCell>&lt;75s · +2</TableCell>
                      <TableCell>&lt;90s · +3</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Reeksbonus */}
              <div>
                <h3 className="font-semibold mb-2">Reeksbonus</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Speel meerdere dagen op rij en ontvang elke gespeelde dag een bonus op basis van
                  je actieve reeks. Je krijgt de hoogste bonus die op je reeks van toepassing is.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reeks</TableHead>
                      <TableHead>4-letter</TableHead>
                      <TableHead>5-letter</TableHead>
                      <TableHead>6-letter</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">2 dagen</TableCell>
                      <TableCell>+3</TableCell>
                      <TableCell>+4</TableCell>
                      <TableCell>+5</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">3 dagen</TableCell>
                      <TableCell>+6</TableCell>
                      <TableCell>+8</TableCell>
                      <TableCell>+10</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">7 dagen</TableCell>
                      <TableCell>+10</TableCell>
                      <TableCell>+13</TableCell>
                      <TableCell>+18</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">30 dagen</TableCell>
                      <TableCell>+20</TableCell>
                      <TableCell>+25</TableCell>
                      <TableCell>+35</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Dagelijkse bonus */}
              <div>
                <h3 className="font-semibold mb-2">Dagelijkse bonus</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Beloningen voor je dagelijkse activiteit in het spel.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Actie</TableHead>
                      <TableHead className="text-right">Bonus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Eerste spel van de dag</TableCell>
                      <TableCell className="text-right font-medium">+5</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Alle drie niveaus op één dag gespeeld (4, 5 én 6)</TableCell>
                      <TableCell className="text-right font-medium">+20</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Eerste spel ooit</TableCell>
                      <TableCell className="text-right font-medium">+10</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>100e spel gespeeld</TableCell>
                      <TableCell className="text-right font-medium">+50</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>500e spel gespeeld</TableCell>
                      <TableCell className="text-right font-medium">+150</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Kaart 4 — Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">23 badges in 6 categorieën</h3>
                  <div className="flex flex-wrap gap-2">
                    {["Tijd", "Reeks", "Vaardigheid", "Sociaal", "Uithoudingsvermogen", "Prestige"].map(
                      (c) => (
                        <Badge key={c} variant="secondary">
                          {c}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-1">
                    Zeldzame badges <Star className="w-4 h-4 fill-primary text-primary" />
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-[15px]">
                    <li>Moeilijker te verdienen</li>
                    <li>Geven meer punten</li>
                    <li>Tellen zwaarder mee voor 6-letter ontgrendeling</li>
                  </ul>
                </div>
              </div>
              <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Badges zijn zichtbaar op je profiel en tonen hoe jij speelt — niet alleen hoe hoog
                  je staat.
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Kaarten 5 en 6 — naast elkaar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Ranglijst</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1 text-[15px]">
                  <li>Bepaald door totale punten</li>
                  <li>Badges zijn zichtbaar maar tellen niet mee voor positie</li>
                  <li>Punten zijn de enige maatstaf</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Kort samengevat</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1 text-[15px]">
                  <li>
                    <strong>Punten</strong> — bepalen je positie op de ranglijst
                  </li>
                  <li>
                    <strong>Badges</strong> — openen hogere niveaus, ook zonder punten
                  </li>
                  <li>
                    <strong>Combinatie</strong> — levert het beste resultaat
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rules;
