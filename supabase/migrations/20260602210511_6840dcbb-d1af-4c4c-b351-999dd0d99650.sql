CREATE OR REPLACE FUNCTION public.dutch_words_rejected_not_educational()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rejected = true THEN
    NEW.educational := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dutch_words_rejected_not_educational ON public.dutch_words;
CREATE TRIGGER trg_dutch_words_rejected_not_educational
BEFORE INSERT OR UPDATE ON public.dutch_words
FOR EACH ROW
EXECUTE FUNCTION public.dutch_words_rejected_not_educational();