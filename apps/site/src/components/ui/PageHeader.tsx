import { type ReactNode } from "react";
import { Section, Reveal } from "@/components/ui/Section";

export function PageHeader({
  kicker,
  title,
  intro,
}: {
  kicker?: string;
  title: string;
  intro?: ReactNode;
}) {
  return (
    <Section tone="bg" className="pb-10 sm:pb-12">
      <Reveal>
        {kicker && (
          <p className="mb-3 font-bold uppercase tracking-wide text-lavender-ink">
            {kicker}
          </p>
        )}
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {intro && (
          <div className="mt-6 max-w-measure text-xl text-ink-muted">{intro}</div>
        )}
      </Reveal>
    </Section>
  );
}
