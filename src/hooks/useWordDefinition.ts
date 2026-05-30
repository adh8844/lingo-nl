import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WordDefinition {
  definition: string | null;
  example: string | null;
}

const cache = new Map<string, WordDefinition>();
const inflight = new Map<string, Promise<WordDefinition>>();

async function fetchDefinition(word: string, length: number): Promise<WordDefinition> {
  const key = `${word}:${length}`;
  if (cache.has(key)) return cache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const p = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-word-definition", {
        body: { word, length },
      });
      if (error || !data) return { definition: null, example: null };
      const result: WordDefinition = {
        definition: data.definition ?? null,
        example: data.example ?? null,
      };
      cache.set(key, result);
      return result;
    } catch {
      return { definition: null, example: null };
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

export function useWordDefinition(word: string | undefined, length: number | undefined) {
  const [data, setData] = useState<WordDefinition>({ definition: null, example: null });
  const [loading, setLoading] = useState(false);
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!word || !length) return;
    const key = `${word.toLowerCase()}:${length}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    const cached = cache.get(key);
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    setData({ definition: null, example: null });
    fetchDefinition(word.toLowerCase(), length).then((res) => {
      if (lastKey.current === key) {
        setData(res);
        setLoading(false);
      }
    });
  }, [word, length]);

  return { ...data, loading };
}
