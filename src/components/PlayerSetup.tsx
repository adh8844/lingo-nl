import { useState } from "react";

interface PlayerSetupProps {
  language: "nl" | "en";
  onCreatePlayer: (name: string) => Promise<void>;
}

const PlayerSetup = ({ language, onCreatePlayer }: PlayerSetupProps) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      await onCreatePlayer(name.trim());
    } catch {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full max-w-xs">
      <p className="text-sm text-muted-foreground font-medium text-center">
        {language === "nl"
          ? "Kies een naam om te beginnen. Je krijgt een code om te delen met vrienden."
          : "Choose a name to get started. You'll get a code to share with friends."}
      </p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={language === "nl" ? "Jouw naam" : "Your name"}
        maxLength={20}
        className="w-full px-4 py-3 rounded-lg bg-secondary text-secondary-foreground font-bold text-center text-lg border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
      />
      <button
        type="submit"
        disabled={!name.trim() || loading}
        className="px-8 py-3 bg-primary text-primary-foreground font-extrabold text-lg rounded-xl hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
      >
        {loading
          ? "..."
          : language === "nl"
          ? "Start!"
          : "Let's go!"}
      </button>
    </form>
  );
};

export default PlayerSetup;
