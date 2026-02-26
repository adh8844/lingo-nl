import { useState } from "react";
import LingoGame from "@/components/LingoGame";
import { Language, WordLength } from "@/data/words";

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [language, setLanguage] = useState<Language>("nl");
  const [wordLength, setWordLength] = useState<WordLength>(5);

  if (gameStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center py-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary mb-6">
          LINGO
        </h1>
        <LingoGame
          language={language}
          wordLength={wordLength}
          onBack={() => setGameStarted(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-8 animate-bounce-in">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tighter text-primary">
            LINGO
          </h1>
          <p className="text-muted-foreground text-lg">
            Raad het woord · Guess the word
          </p>
        </div>

        {/* Language selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setLanguage("nl")}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
              language === "nl"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:brightness-110"
            }`}
          >
            🇳🇱 Nederlands
          </button>
          <button
            onClick={() => setLanguage("en")}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
              language === "en"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:brightness-110"
            }`}
          >
            🇬🇧 English
          </button>
        </div>

        {/* Word length selector */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground font-medium">
            {language === "nl" ? "Aantal letters" : "Word length"}
          </p>
          <div className="flex gap-2">
            {([4, 5, 6] as WordLength[]).map((len) => (
              <button
                key={len}
                onClick={() => setWordLength(len)}
                className={`w-14 h-14 rounded-lg font-extrabold text-xl transition-all active:scale-95 ${
                  wordLength === len
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "bg-secondary text-secondary-foreground hover:brightness-110"
                }`}
              >
                {len}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => setGameStarted(true)}
          className="px-10 py-3.5 bg-accent text-accent-foreground font-extrabold text-lg rounded-xl hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-accent/30"
        >
          {language === "nl" ? "Start!" : "Play!"}
        </button>
      </div>
    </div>
  );
};

export default Index;
