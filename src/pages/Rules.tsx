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
        title="Spelregels — DingoLingo woordspel"
        description="Lees de spelregels van DingoLingo: hoe je woorden raadt, punten verdient, badges ontgrendelt en niveaus van 4, 5 en 6 letters speelt."
        path="/spelregels"
      />
      <div className="w-full max-w-3xl">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug
        </button>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary mb-8">
          Spelregels — Lingo
        </h1>

        <div className="space-y-5">
          {/* Kaart 1 — Het spel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Het spel</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-[15px] leading-relaxed">
                Raad het verborgen woord in maximaal 5 pogingen. Na elke poging krijg je feedback:
              </p>
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
                      <ul className="list-disc pl-5 space-y-1">
                        <li>250 punten in 4-letter, of</li>
                        <li>3 badges uit min. 2 categorieën, of</li>
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
                      <ul className="list-disc pl-5 space-y-1">
                        <li>600 punten totaal (alle niveaus), én</li>
                        <li>1 zeldzame badge ★ of 8 gewone badges, én</li>
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

          {/* Kaart 4 — Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">28 badges in 6 categorieën</h3>
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
