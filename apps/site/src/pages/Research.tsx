import { Seo } from "@/components/Seo";
import { Section, Reveal } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";

// Structure only. Per the build brief, the source report is treated as not
// available to this build, so nothing here summarises, quotes, or invents
// findings. Each block is a labelled placeholder describing what content it
// needs. See the note to the founder at the foot of the page.

const SECTIONS = [
  {
    id: "why",
    title: "Why note-taking fails for ADHD",
    need: "A plain-language summary of the cognitive barriers (attention regulation, working memory, executive function) and how conventional note-taking compounds them. Source: literature review, section 2.1.",
  },
  {
    id: "principles",
    title: "The design principles we build on",
    need: "The core neurodiverse-centred design principles the product is built around (simplified interfaces, chunking, real-time feedback, multimodal input, personalisation). Source: literature review, section 2.1.5.",
  },
  {
    id: "evidence",
    title: "What the field has tried before",
    need: "A short, fair survey of prior systems and their gaps — what worked, what didn't, and where the opportunity is. Source: review of related works, section 2.4.",
  },
  {
    id: "ethics",
    title: "Our ethical commitments",
    need: "The data-minimisation, consent, and opt-out principles that shape the product. Source: ethics section 2.3.4.",
  },
];

export function Research() {
  return (
    <>
      <Seo
        title="Research"
        description="The evidence base behind Clarity — the cognitive science and inclusive-design research the product is built on."
        path="/research"
      />
      <PageHeader
        kicker="Research"
        title="The evidence base"
        intro="Clarity isn't built on hunches. It's grounded in published work on ADHD cognition, universal design for learning, and assistive technology. This page will lay that foundation out in plain language, with citations."
      />

      {/* Prominent build-status notice — honest about what's missing. */}
      <Section tone="surface" className="pt-0">
        <Reveal>
          <div className="rounded-lg border-2 border-dashed border-lavender-ink/40 bg-lavender-soft p-7">
            <p className="font-bold uppercase tracking-wide text-lavender-ink">
              Placeholder — source material needed
            </p>
            <p className="mt-3 max-w-measure text-ink">
              This page is built as structure only. To fill it responsibly we
              need the underlying research report and its reference list, so that
              every claim on a public page is one we can actually stand behind and
              cite. Nothing below invents findings — each section states exactly
              what it needs.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section tone="bg">
        <div className="space-y-5">
          {SECTIONS.map((s) => (
            <Reveal key={s.id}>
              <article
                id={s.id}
                className="rounded-lg border border-line bg-surface p-7"
              >
                <h2 className="text-2xl">{s.title}</h2>
                <p className="mt-3 rounded-md bg-bg p-4 text-ink-muted">
                  <span className="font-bold text-ink">Needs: </span>
                  {s.need}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="surface" labelledBy="cite-h">
        <Reveal>
          <h2 id="cite-h" className="text-2xl">
            References
          </h2>
          <p className="mt-3 max-w-measure text-ink-muted">
            A full, linked reference list will live here once the source
            bibliography is supplied. We&rsquo;ll cite every study we rely on, so
            you can check our work.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
