import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionProps {
  children: ReactNode;
  /** background band */
  tone?: "bg" | "surface" | "soft";
  className?: string;
  id?: string;
  as?: "section" | "div" | "footer" | "header";
  labelledBy?: string;
}

const tones = {
  bg: "bg-bg",
  surface: "bg-surface",
  soft: "bg-lavender-soft",
};

/** Vertical rhythm band — ~7rem padding, roughly double a normal SaaS page. */
export function Section({
  children,
  tone = "bg",
  className,
  id,
  as: Tag = "section",
  labelledBy,
}: SectionProps) {
  return (
    <Tag
      id={id}
      aria-labelledby={labelledBy}
      className={cn("px-6 py-20 sm:py-28", tones[tone], className)}
    >
      <div className="mx-auto w-full max-w-content">{children}</div>
    </Tag>
  );
}

/** Reveal-on-mount wrapper; honours reduced motion via the global CSS override. */
export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("animate-fade-rise", className)}>{children}</div>;
}
