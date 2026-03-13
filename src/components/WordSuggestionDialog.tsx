import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Language } from "@/data/words";

interface WordSuggestionDialogProps {
  open: boolean;
  word: string;
  language: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

const WordSuggestionDialog = ({ open, word, language, onConfirm, onCancel }: WordSuggestionDialogProps) => {
  const isNl = language === "nl";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isNl ? "Woord niet gevonden" : "Word not found"}
          </DialogTitle>
          <DialogDescription>
            {isNl
              ? `"${word.toUpperCase()}" staat niet in de woordenlijst. Wil je dit woord toevoegen?`
              : `"${word.toUpperCase()}" is not in the word list. Would you like to add it?`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            {isNl ? "Nee" : "No"}
          </Button>
          <Button onClick={onConfirm}>
            {isNl ? "Ja, toevoegen" : "Yes, add it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WordSuggestionDialog;
