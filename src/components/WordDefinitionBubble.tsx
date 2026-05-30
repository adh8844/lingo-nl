import { BookOpen } from "lucide-react";

interface WordDefinitionBubbleProps {
  word: string;
  definition: string | null;
  example: string | null;
  loading?: boolean;
}

const WordDefinitionBubble = ({ word, definition, example, loading }: WordDefinitionBubbleProps) => {
  if (!loading && !definition && !example) return null;

  return (
    <div className="relative w-full max-w-xs animate-bounce-in">
      <div className="relative bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
        {/* Speech bubble tail */}
        <div className="absolute -top-2 left-6 w-4 h-4 bg-card border-l border-t border-border rotate-45" />

        <div className="flex items-start gap-2 relative">
          <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-primary uppercase tracking-wide mb-1">
              {word}
            </p>
            {loading ? (
              <p className="text-xs text-muted-foreground animate-pulse">Uitleg laden...</p>
            ) : (
              <>
                {definition && (
                  <p className="text-sm text-foreground leading-snug">{definition}</p>
                )}
                {example && (
                  <p className="text-xs text-muted-foreground italic mt-1 leading-snug">
                    “{example}”
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordDefinitionBubble;
