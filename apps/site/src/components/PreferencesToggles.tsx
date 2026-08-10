import { Moon, Sun, Type, Waves } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { cn } from "@/lib/cn";

interface ToggleButtonProps {
  pressed: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

function ToggleButton({ pressed, onClick, label, children }: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      title={label}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors",
        pressed
          ? "border-[#5F49BC] bg-lavender-soft text-[#5F49BC]"
          : "border-line bg-surface text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The three visitor levers: theme, font, motion. Rendered in the footer (and,
 * compactly, in the header). Every control is a real toggle button with an
 * accessible pressed state and a text label.
 */
export function PreferencesToggles({
  layout = "row",
}: {
  layout?: "row" | "stack";
}) {
  const { theme, font, motion, setTheme, setFont, setMotion } = usePreferences();

  return (
    <div
      role="group"
      aria-label="Display preferences"
      className={cn(
        "flex gap-2",
        layout === "stack" ? "flex-col items-start" : "flex-wrap items-center",
      )}
    >
      <ToggleButton
        pressed={theme === "dark"}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Moon className="h-4 w-4" aria-hidden="true" />
        )}
        {theme === "dark" ? "Light" : "Dark"}
      </ToggleButton>

      <ToggleButton
        pressed={font === "dyslexic"}
        onClick={() => setFont(font === "dyslexic" ? "default" : "dyslexic")}
        label={
          font === "dyslexic"
            ? "Switch to the default font"
            : "Switch to the OpenDyslexic font"
        }
      >
        <Type className="h-4 w-4" aria-hidden="true" />
        {font === "dyslexic" ? "Default font" : "Dyslexia font"}
      </ToggleButton>

      <ToggleButton
        pressed={motion === "reduced"}
        onClick={() => setMotion(motion === "reduced" ? "full" : "reduced")}
        label={
          motion === "reduced"
            ? "Allow motion and animation"
            : "Reduce motion and animation"
        }
      >
        <Waves className="h-4 w-4" aria-hidden="true" />
        {motion === "reduced" ? "Motion off" : "Reduce motion"}
      </ToggleButton>
    </div>
  );
}
