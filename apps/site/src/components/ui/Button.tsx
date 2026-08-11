import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-[background-color,border-color,color] duration-200 disabled:opacity-60 disabled:pointer-events-none select-none";

const variants: Record<Variant, string> = {
  // Both halves of the pair are theme-aware: lavender-ink flips light/dark
  // with the theme and lavender-ink-on flips with it, so the fill keeps its
  // contrast in both. Measured in both themes by the axe sweep.
  primary:
    "bg-lavender-ink text-lavender-ink-on hover:bg-lavender-ink-hover border border-transparent",
  secondary:
    "bg-surface text-lavender-ink border border-lavender-ink hover:bg-lavender-soft",
  ghost: "bg-transparent text-ink hover:bg-lavender-soft border border-transparent",
};

const sizes: Record<Size, string> = {
  md: "px-5 py-2.5 text-base",
  lg: "px-7 py-3.5 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
