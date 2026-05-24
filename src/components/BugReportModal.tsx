import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BugReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
  role?: string;
}

type Severity = "Low" | "Medium" | "High" | "Critical";

const APP_VERSION =
  (typeof __BUILD_TIMESTAMP__ !== "undefined" ? __BUILD_TIMESTAMP__ : "unknown");

declare const __BUILD_TIMESTAMP__: string;

const BugReportModal = ({ open, onOpenChange, userEmail = "", role = "guest" }: BugReportModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("Medium");
  const [reporter, setReporter] = useState(userEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSeverity("Medium");
    setReporter("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Geef een korte uitleg van het probleem.");
      return;
    }

    setSubmitting(true);
    try {
      const finalReporter = (reporter.trim() || userEmail || "").trim();
      const sourceUrl = window.location.href;
      const timestamp = new Date().toISOString();
      const viewport = `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`;
      const userAgent = navigator.userAgent;

      const contextBlock = [
        "---",
        `Reporter: ${finalReporter || "(none)"}`,
        `Role: ${role}`,
        `Source URL: ${sourceUrl}`,
        `Timestamp: ${timestamp}`,
        `App version: ${APP_VERSION}`,
        `Viewport: ${viewport}`,
        `User agent: ${userAgent}`,
      ].join("\n");

      const fullDescription = description.trim()
        ? `${description.trim()}\n\n${contextBlock}`
        : contextBlock;

      const { data, error: invokeError } = await supabase.functions.invoke("send-bug-report", {
        body: {
          title: title.trim(),
          description: fullDescription,
          type: "bug",
          severity,
          reporter: finalReporter,
          source_url: sourceUrl,
        },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (!data?.success) throw new Error(data?.error || "Onbekende fout");

      toast.success("Gelukt, de melding is verzonden!");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Er ging iets mis.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary font-extrabold">Werkt iets niet?</DialogTitle>
          <DialogDescription>
            Laat het ons weten, dan kijken we ernaar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold" htmlFor="bug-title">
              Korte uitleg van het probleem <span className="text-destructive">*</span>
            </label>
            <Input
              id="bug-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Knop werkt niet na ronde"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold" htmlFor="bug-description">
              Iets meer detail, wat verwachtte je dat er zou gebeuren?
            </label>
            <Textarea
              id="bug-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optioneel"
              maxLength={2000}
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold">Ernst</label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Laag</SelectItem>
                <SelectItem value="Medium">Gemiddeld</SelectItem>
                <SelectItem value="High">Hoog</SelectItem>
                <SelectItem value="Critical">Kritiek</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold" htmlFor="bug-reporter">
              E-mailadres, voor evt. vragen
            </label>
            <Input
              id="bug-reporter"
              type="email"
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
              placeholder="Optioneel"
              maxLength={255}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="px-4 py-2 text-sm font-bold rounded-xl bg-secondary text-secondary-foreground hover:brightness-110 transition-all disabled:opacity-50"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Versturen
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BugReportModal;
