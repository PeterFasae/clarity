import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

const LINKS = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/accessibility", label: "Accessibility" },
  { to: "/research", label: "Research" },
  { to: "/privacy", label: "Privacy" },
];

function Wordmark() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 rounded-lg font-bold text-ink"
      aria-label="Clarity — home"
    >
      <span
        aria-hidden="true"
        className="grid h-8 w-8 place-items-center rounded-lg bg-[#5F49BC] text-white"
      >
        {/* simple abstract mark, not a brain/lightning motif */}
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M5 8h14M5 13h9M5 18h5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="text-lg">Clarity</span>
    </Link>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-sm">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-content items-center justify-between px-6 py-3"
      >
        <Wordmark />

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-base font-bold transition-colors",
                  isActive
                    ? "text-[#5F49BC]"
                    : "text-ink-muted hover:text-ink",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
          <a href="/#waitlist" className="ml-2">
            <Button size="md">Join the waitlist</Button>
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex items-center rounded-lg border border-line p-2 text-ink md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-bg md:hidden">
          <div className="mx-auto flex max-w-content flex-col gap-1 px-6 py-4">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-3 text-lg font-bold",
                    isActive ? "text-[#5F49BC]" : "text-ink",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            <a
              href="/#waitlist"
              onClick={() => setOpen(false)}
              className="mt-2"
            >
              <Button size="lg" className="w-full">
                Join the waitlist
              </Button>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
