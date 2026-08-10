import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useFocusMode } from "@/components/FocusMode";

export function FocusTab() {
  const { enter } = useFocusMode();

  return (
    <div className="max-w-measure">
      <p className="text-lg text-ink">
        The best way to explain focus mode is to just do it. Press the button and
        watch this whole page — the nav, the sections, all of it — fall away to a
        single note on a calm field.
      </p>
      <p className="mt-4 text-ink-muted">
        Press <kbd className="rounded border border-line px-1.5 py-0.5 text-sm">Esc</kbd>{" "}
        or the exit button to bring everything back. In the app, this is one note
        with nothing else competing for your attention.
      </p>

      <div className="mt-6">
        <Button onClick={() => enter()} size="lg">
          <Maximize2 className="h-5 w-5" aria-hidden="true" />
          Enter focus mode
        </Button>
      </div>
    </div>
  );
}
