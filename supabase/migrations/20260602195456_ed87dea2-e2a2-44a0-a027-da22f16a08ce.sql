-- Set existing words as educational by default so the "leren" pool is not empty
UPDATE public.dutch_words SET educational = true WHERE educational = false;

-- Blacklist: archaic, poetic, juridical, anatomical-crude or otherwise unsuitable
-- for primary-school vocabulary practice
UPDATE public.dutch_words SET educational = false
WHERE word IN (
  'noch','gene','aars','jank','vlas','dauw','gier','heil',
  'thans','immer','ginds','weldra','gans','wier','luid',
  'lieflijk','onthand','derwaarts','aldus','aldra',
  'verguisd','verguizen','gewaad','gewaden'
);

-- For words added after this migration, require admin approval before
-- they appear in the educational pool
ALTER TABLE public.dutch_words ALTER COLUMN educational SET DEFAULT false;