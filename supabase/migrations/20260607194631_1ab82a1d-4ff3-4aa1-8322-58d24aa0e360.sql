DELETE FROM public.word_definitions WHERE char_length(word) <> length;
ALTER TABLE public.word_definitions ADD CONSTRAINT word_definitions_word_length_match CHECK (char_length(word) = length);