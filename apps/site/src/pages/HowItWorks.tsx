import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Section, Reveal } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { featuresIn, STATUS_LABEL, type Feature } from "@/lib/status";

function StatusTag({ status }: { status: Feature["status"] }) {
  const tone =
    status === "built"
      ? "bg-softgreen text-ink"
      : "bg-lavender-soft text-[#5F49BC]";
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold ${tone}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function FeatureGroup({ title, features }: { title: string; features: Feature[] }) {
  return (
    <div>
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {features.map((f) => (
          <div key={f.id} className="rounded-lg border border-line bg-surface p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xl">{f.name}</h3>
              <StatusTag status={f.status} />
            </div>
            <p className="text-ink-muted">{f.publicCopy}</p>
            {f.note && (
              <p className="mt-3 text-sm text-ink-muted">{f.note}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <>
      <Seo
        title="How it works"
        description="Everything Clarity does — capture, understand, organise, and adapt — with an honest label on what's live today and what's still coming."
        path="/how-it-works"
      />
      <PageHeader
        kicker="How it works"
        title="Built around capture, not filing"
        intro={
          <>
            Here&rsquo;s the whole picture — grouped by what you&rsquo;re actually
            trying to do. Every label on this page is read from the same file the
            engineering team updates, so it says{" "}
            <span className="font-bold text-ink">available now</span> only when a
            thing genuinely is. Right now Clarity is in development and most of
            this list is honestly marked{" "}
            <span className="font-bold text-[#5F49BC]">being built</span> or{" "}
            <span className="font-bold text-[#5F49BC]">coming soon</span>.
          </>
        }
      />

      <Section tone="bg" className="pt-0">
        <div className="space-y-16">
          <Reveal>
            <FeatureGroup title="Capture" features={featuresIn("capture")} />
          </Reveal>
          <Reveal>
            <FeatureGroup title="Understand" features={featuresIn("understand")} />
          </Reveal>
          <Reveal>
            <FeatureGroup title="Organise & retrieve" features={featuresIn("organise")} />
          </Reveal>
          <Reveal>
            <FeatureGroup title="Adapt to you" features={featuresIn("adapt")} />
          </Reveal>
          <Reveal>
            <FeatureGroup title="Your account and your data" features={featuresIn("platform")} />
          </Reveal>
        </div>
      </Section>

      <Section tone="surface" className="text-center">
        <Reveal>
          <h2 className="text-3xl">Want one of these sooner?</h2>
          <p className="mx-auto mt-4 max-w-measure text-lg text-ink-muted">
            The waitlist is where we decide what to build next. Tell us what you
            need and it moves up the list.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/#waitlist">
              <Button size="lg">Join the waitlist</Button>
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
