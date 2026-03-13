
CREATE TABLE public.dutch_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  length integer NOT NULL,
  approved boolean NOT NULL DEFAULT true,
  suggested_by uuid REFERENCES public.players(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(word)
);

ALTER TABLE public.dutch_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Words are viewable by everyone" ON public.dutch_words FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can suggest a word" ON public.dutch_words FOR INSERT TO public WITH CHECK (true);

CREATE INDEX idx_dutch_words_length_approved ON public.dutch_words (length, approved);

-- Seed with existing 4-letter words
INSERT INTO public.dutch_words (word, length) VALUES
('bank',4),('boot',4),('boek',4),('bord',4),('brug',4),('deur',4),('dier',4),('doel',4),('geld',4),('glas',4),
('hond',4),('huis',4),('kaas',4),('kind',4),('klok',4),('koud',4),('lamp',4),('land',4),('lijn',4),('maan',4),
('melk',4),('muur',4),('neus',4),('paar',4),('park',4),('pijn',4),('reis',4),('ring',4),('rood',4),('rust',4),
('snel',4),('soep',4),('stad',4),('step',4),('taal',4),('taak',4),('trap',4),('tuin',4),('vuur',4),('warm',4),
('wiel',4),('wind',4),('wolk',4),('zand',4),('zeep',4),('ziek',4),('zing',4),('zout',4),('zwak',4),('zwem',4),
('baan',4),('berg',4),('blik',4),('boom',4),('dans',4),('deel',4),('eten',4),('film',4),('gang',4),('geur',4),
('goud',4),('grap',4),('haar',4),('hand',4),('hart',4),('hoek',4),('kans',4),('kern',4),('klap',4),('knop',4),
('koek',4),('kool',4),('lach',4),('last',4),('leeg',4),('lied',4),('list',4),('maak',4),('meid',4),('mooi',4),
('naam',4),('nood',4),('ogen',4),('palm',4),('plak',4),('punt',4),('raam',4),('raak',4),('riem',4),('roep',4),
('ruim',4),('slot',4),('stem',4),('stof',4),('tang',4),('teen',4),('tent',4),('tong',4),('vals',4),('vent',4),
('vlag',4),('vlak',4),('voet',4),('vork',4),('wand',4),('wens',4),('werk',4),('wijn',4),('zaal',4),('zaak',4);

-- Seed with existing 5-letter words (filtering to exact 5 chars)
INSERT INTO public.dutch_words (word, length) VALUES
('appel',5),('avond',5),('baker',5),('beker',5),('broek',5),('brood',5),('chili',5),('draak',5),('dwerg',5),('engel',5),
('fiets',5),('flask',5),('groen',5),('groep',5),('hamer',5),('hemel',5),('hoorn',5),('idool',5),('inham',5),
('jurij',5),('kaart',5),('kabel',5),('kleur',5),('knoop',5),('konig',5),('kroeg',5),('kunst',5),('laken',5),('laser',5),
('lever',5),('loper',5),('macht',5),('mango',5),('media',5),('meldt',5),('nacht',5),('nieuw',5),('oever',5),('paard',5),
('piano',5),('plant',5),('plein',5),('prijs',5),('proef',5),('radio',5),('regen',5),('ruzie',5),('salon',5),('schip',5),
('slaap',5),('slang',5),('staal',5),('stank',5),('stoel',5),('storm',5),('tafel',5),('tegel',5),
('toren',5),('trein',5),('tulip',5),('vacht',5),('vlieg',5),('vloed',5),('water',5),('wegen',5),('werld',5),('worst',5),
('wraak',5),('zadel',5),('zwaan',5),('zwart',5),('amber',5),('bloem',5),('brein',5),
('draad',5),('ebben',5),('fabel',5),('geest',5),('haven',5),('inzet',5),('jeugd',5),('kwast',5),('loods',5),('nagel',5),
('olive',5),('pijlt',5),('ronde',5),('steel',5),('taart',5),('uitje',5),('vloot',5),('waard',5),('zetel',5),('zomer',5);

-- Seed with existing 6-letter words (filtering to exact 6 chars)
INSERT INTO public.dutch_words (word, length) VALUES
('donker',6),('fiesta',6),('gebied',6),('geluid',6),('gratis',6),('groeit',6),('handel',6),('helder',6),('insect',6),
('jungle',6),('keuken',6),('klasse',6),('koffie',6),('liefde',6),('mentor',6),('midden',6),('natuur',6),('nummer',6),
('opener',6),('pagina',6),('plafon',6),('recept',6),('ridder',6),('school',6),('sieren',6),('stroom',6),('tempel',6),
('tropen',6),('tunnel',6),('uitzet',6),('vlakte',6),('vriend',6),('wandel',6),('winter',6),('wonder',6),('zolder',6),
('achter',6),('balkon',6),('bewijs',6),('blanko',6),('camera',6),('detail',6),('eiland',6),('folder',6),('gevoel',6),
('hoogte',6),('ijsjes',6),('jurken',6),('kennis',6),('letter',6),('marmer',6),('naaien',6),('orkest',6),('pakket',6),
('rivier',6),('scherp',6),('sigaar',6),('sterke',6),('strand',6),('tennis',6),('uitleg',6),('veilig',6),
('vulpen',6),('werken',6),('zanger',6),('zilver',6),('cirkel',6),('danser',6),('erwten',6),('feiten',6),('geheim',6),
('haring',6),('ingang',6),('kiezen',6),('ladder',6),('moeite',6),('oceaan',6),('piloot',6),
('schaap',6),('tassen',6),('vragen',6),('wassen',6),('zenden',6),('anders',6),('beiden',6),('tussen',6);
