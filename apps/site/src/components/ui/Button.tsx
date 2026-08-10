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
  // #5F49BC on white = ~6.7:1; white on #5F49BC = ~6.7:1. Both pass AA.
  primary:
    "bg-[#5F49BC] text-white hover:bg-[#4d3aa0] border border-transparent",
  secondary:
    "bg-surface text-[#5F49BC] border border-[#5F49BC] hover:bg-lavender-soft",
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
