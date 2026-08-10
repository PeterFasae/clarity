import { useId, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Status = "idle" | "submitting" | "success" | "error";

const ENDPOINT = import.meta.env.VITE_WAITLIST_ENDPOINT as string | undefined;

function isValidEmail(value: string): boolean {
  // Deliberately permissive; real validation happens server-side if wired up.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function WaitlistForm() {
  const emailId = useId();
  const errorId = useId();
  const followUpId = useId();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState("");
  const successRef = useRef<HTMLDivElement | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Enter your email address so we know where to reach you.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("That doesn't look like an email address. Check for a typo?");
      return;
    }

    setStatus("submitting");

    // No endpoint configured (the default). Be honest: this is a demo build and
    // nothing was stored. We never silently pretend to save an address.
    if (!ENDPOINT) {
      await new Promise((r) => setTimeout(r, 500));
      setStatus("success");
      requestAnimationFrame(() => successRef.current?.focus());
      return;
    }

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("success");
      requestAnimationFrame(() => successRef.current?.focus());
    } catch {
      setStatus("error");
      setError(
        "Something went wrong sending that. Give it another try in a moment.",
      );
    }
  }

  if (status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        className="rounded-lg border border-[#5F49BC]/40 bg-lavender-soft p-6 outline-none"
      >
        <p className="flex items-center gap-2 text-lg font-bold text-ink">
          <Check className="h-5 w-5 text-[#5F49BC]" aria-hidden="true" />
          You&rsquo;re on the list.
        </p>
        {!ENDPOINT ? (
          <p className="mt-2 text-ink-muted">
            One honest note: this is a work-in-progress build with no server
            behind the form yet, so no address was actually stored. When the real
            waitlist is live, this is exactly where you&rsquo;ll sign up.
          </p>
        ) : (
          <p className="mt-2 text-ink-muted">
            We&rsquo;ll email you once when we launch. Nothing else.
          </p>
        )}

        {/* Optional, clearly skippable follow-up. */}
        <div className="mt-6 border-t border-[#5F49BC]/20 pt-5">
          <label htmlFor={followUpId} className="block font-bold text-ink">
            One optional question
          </label>
          <p id={`${followUpId}-hint`} className="mt-1 text-ink-muted">
            What&rsquo;s the one thing every notes app gets wrong for you? Skip it
            if you&rsquo;d rather not.
          </p>
          <textarea
            id={followUpId}
            aria-describedby={`${followUpId}-hint`}
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            rows={3}
            className="mt-3 w-full rounded-lg border border-line bg-surface p-3 text-base text-ink outline-none focus-visible:border-[#5F49BC]"
            placeholder="Totally optional…"
          />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-measure">
      <label htmlFor={emailId} className="block font-bold text-ink">
        Email address
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id={emailId}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder="you@example.com"
          className={cn(
            "min-w-0 flex-1 rounded-lg border bg-surface px-4 py-3 text-base text-ink outline-none",
            error ? "border-[hsl(var(--danger))]" : "border-line focus-visible:border-[#5F49BC]",
          )}
        />
        <Button type="submit" size="lg" disabled={status === "submitting"}>
          {status === "submitting" ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Joining…
            </>
          ) : (
            "Join the waitlist"
          )}
        </Button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-2 font-bold text-[hsl(var(--danger))]">
          {error}
        </p>
      )}

      <p className="mt-3 text-sm text-ink-muted">
        Free while in development. No card, no spam — one email when we launch.
      </p>
    </form>
  );
}
