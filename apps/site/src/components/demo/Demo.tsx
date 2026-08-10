import { useRef, useState, type KeyboardEvent } from "react";
import { Maximize2, Mic, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { SpeakTab } from "./SpeakTab";
import { SummariseTab } from "./SummariseTab";
import { FocusTab } from "./FocusTab";

const TABS = [
  { id: "speak", label: "Speak it", icon: Mic },
  { id: "summarise", label: "Summarise it", icon: Sparkles },
  { id: "focus", label: "Focus mode", icon: Maximize2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Interactive demo — a working thing, not a video. WAI-ARIA tabs pattern with
 * roving arrow-key navigation. Every panel runs client-side; zero network.
 */
export function Demo() {
  const [active, setActive] = useState<TabId>("speak");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((t) => t.id === active);
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setActive(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div
        role="tablist"
        aria-label="Try Clarity"
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-1 border-b border-line bg-bg p-2"
      >
        {TABS.map((tab, i) => {
          const selected = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-base font-bold transition-colors",
                selected
                  ? "bg-[#5F49BC] text-white"
                  : "text-ink-muted hover:bg-lavender-soft hover:text-ink",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="p-5 sm:p-7"
        >
          {tab.id === "speak" && <SpeakTab />}
          {tab.id === "summarise" && <SummariseTab />}
          {tab.id === "focus" && <FocusTab />}
        </div>
      ))}
    </div>
  );
}
