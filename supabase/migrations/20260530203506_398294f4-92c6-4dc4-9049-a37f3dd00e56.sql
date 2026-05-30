CREATE TABLE public.word_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word text NOT NULL,
  length integer NOT NULL,
  definition text,
  example text,
  source text NOT NULL DEFAULT 'ai',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT word_definitions_word_length_unique UNIQUE (word, length)
);

CREATE INDEX idx_word_definitions_word ON public.word_definitions(word);

GRANT SELECT ON public.word_definitions TO anon;
GRANT SELECT ON public.word_definitions TO authenticated;
GRANT ALL ON public.word_definitions TO service_role;

ALTER TABLE public.word_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Definitions are viewable by everyone"
ON public.word_definitions
FOR SELECT
USING (true);

CREATE POLICY "Admin can update definitions"
ON public.word_definitions
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TRIGGER update_word_definitions_updated_at
BEFORE UPDATE ON public.word_definitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();