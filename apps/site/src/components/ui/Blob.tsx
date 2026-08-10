/**
 * Abstract, soft, low-contrast decorative shapes — the site's only "imagery".
 * No photography, no brain/lightning/scribble motifs. Purely decorative, so
 * aria-hidden and pointer-events-none. Pure CSS/SVG: zero network requests.
 */
import { cn } from "@/lib/cn";

export function Blob({
  className,
  color = "lavender",
}: {
  className?: string;
  color?: "lavender" | "blue" | "green";
}) {
  const fill = {
    lavender: "#9b87f5",
    blue: "#D3E4FD",
    green: "#F2FCE2",
  }[color];

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 200 200"
      className={cn("pointer-events-none absolute -z-10 blur-2xl", className)}
    >
      <path
        fill={fill}
        d="M42.7,-62.9C55.9,-54.8,67.4,-43.2,72.8,-29.1C78.2,-15,77.5,1.6,72.1,16.3C66.7,31,56.6,43.8,44,53.5C31.4,63.2,15.7,69.8,-0.6,70.7C-16.9,71.5,-33.8,66.6,-46.9,56.7C-60,46.8,-69.3,31.9,-72.9,15.6C-76.5,-0.7,-74.4,-18.4,-66.4,-32.4C-58.4,-46.4,-44.5,-56.7,-30.4,-64.4C-16.3,-72.1,-2.1,-77.2,11.3,-75.4C24.7,-73.6,29.5,-71,42.7,-62.9Z"
        transform="translate(100 100)"
      />
    </svg>
  );
}

/** A calm, abstract stand-in for a product frame (no fake dashboard collage). */
export function ProductFrame({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-lg border bg-surface p-6 shadow-[0_1px_2px_rgba(20,20,40,0.04)]",
        className,
      )}
    >
      <Blob color="blue" className="right-[-30%] top-[-40%] h-64 w-64 opacity-60" />
      <div className="relative space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#9b87f5]" />
          <div className="h-2.5 w-28 rounded-full bg-line" />
        </div>
        <div className="space-y-2.5">
          <div className="h-2.5 w-full rounded-full bg-line" />
          <div className="h-2.5 w-[92%] rounded-full bg-line" />
          <div className="h-2.5 w-[78%] rounded-full bg-line" />
        </div>
        <div className="rounded-md bg-lavender-soft p-3">
          <div className="mb-2 h-2 w-20 rounded-full bg-[#9b87f5]/50" />
          <div className="space-y-2">
            <div className="h-2 w-[85%] rounded-full bg-[#9b87f5]/25" />
            <div className="h-2 w-[60%] rounded-full bg-[#9b87f5]/25" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-softgreen" />
          <div className="h-6 w-20 rounded-full bg-softblue" />
        </div>
      </div>
    </div>
  );
}
