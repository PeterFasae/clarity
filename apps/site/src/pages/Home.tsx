import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Section, Reveal } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Blob, ProductFrame } from "@/components/ui/Blob";
import { Demo } from "@/components/demo/Demo";
import { WaitlistForm } from "@/components/WaitlistForm";
import { feature } from "@/lib/status";

const RECOGNITION = [
  {
    quote: "I wrote it down. I have no idea where.",
    body: "Notes exist. Retrieval doesn't. So the effort bought you nothing.",
  },
  {
    quote: "I either transcribe everything or nothing.",
    body: "Filtering in real time takes the exact bandwidth the lecture is already using.",
  },
  {
    quote: "I'll tag it later. (Never tags it.)",
    body: "Every app charges an organisation tax at the moment you have least to spend.",
  },
  {
    quote: "I've tried eleven apps.",
    body: "They all assumed you'd meet them halfway. Then quietly blamed you.",
  },
];

/**
 * The four "how it works" blocks. Each names the features it describes, and the
 * status line underneath is computed from docs/status.json rather than written
 * here — so a claim on this page cannot outlive the thing it claims.
 */
const SUBSTANCE: { heading: string; body: string; features: string[] }[] = [
  {
    heading: "Capture however your brain is working today",
    body: "Voice, typing, or one keystroke. No title required, no folder to choose. Switch mid-thought.",
    features: ["quick-capture", "voice-capture"],
  },
  {
    heading: "Let the software do the sorting",
    body: "Summaries and action items are pulled out automatically on save — every one optional, every one dismissible. It suggests. You decide.",
    features: ["summaries", "action-items", "suggested-tags"],
  },
  {
    heading: "Find it again without remembering what you called it",
    body: "Search matches what the note says, not what it's named.",
    features: ["search"],
  },
  {
    heading: "Make the interface fit you",
    body: "Dyslexia-friendly fonts, text size, high contrast, low-stimulation mode, motion off. Set once; it follows you to every device.",
    features: ["readable-fonts", "calm-themes", "preferences-sync"],
  },
];

/**
 * One honest sentence about where a block's features actually are. Present
 * tense is only ever reached when everything it names is `built`.
 */
function substanceStatus(ids: string[]): string {
  const statuses = ids.map((id) => feature(id).status);
  if (statuses.every((s) => s === "built")) return "Available now.";
  const live = ids.filter((id) => feature(id).status === "built");
  const building = ids.filter((id) => feature(id).status === "in-progress");
  const parts: string[] = [];
  if (live.length) parts.push(`${live.map((id) => feature(id).name).join(", ")} available now`);
  if (building.length)
    parts.push(`${building.map((id) => feature(id).name).join(", ")} being built`);
  if (parts.length === 0) return "In development — not built yet.";
  return `${parts.join("; ")}. The rest is still to come.`;
}

export function Home() {
  return (
    <>
      <Seo
        title="Clarity"
        description="A note-taking app for ADHD brains. Speak or type, and it handles the summarising, sorting, and remembering — so capturing a thought costs you nothing."
        path="/"
      />

      {/* 1 · Hero */}
      <Section tone="bg" className="relative overflow-hidden">
        <Blob color="lavender" className="right-[-10%] top-[-20%] h-[28rem] w-[28rem] opacity-40" />
        <Blob color="blue" className="left-[-15%] bottom-[-30%] h-96 w-96 opacity-40" />
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <h1 className="text-4xl sm:text-5xl">
              Notes that don&rsquo;t ask you to be organised first.
            </h1>
            <p className="mt-6 max-w-measure text-xl text-ink-muted">
              Clarity is a note-taking app for ADHD brains. Speak or type, and
              it handles the summarising, sorting, and remembering — so capturing
              a thought costs you nothing.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href="#waitlist">
                <Button size="lg">Join the waitlist</Button>
              </a>
              <a href="#demo">
                <Button variant="secondary" size="lg">
                  Try it right here
                </Button>
              </a>
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              Free while in development. No card, no spam.
            </p>
          </Reveal>

          <Reveal className="hidden lg:block">
            <ProductFrame />
          </Reveal>
        </div>
      </Section>

      {/* 2 · Recognition */}
      <Section tone="surface" labelledBy="recognition-h">
        <Reveal>
          <h2 id="recognition-h" className="text-3xl">
            If any of this sounds familiar
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {RECOGNITION.map((item) => (
            <Reveal key={item.quote}>
              <figure className="h-full rounded-lg border border-line bg-bg p-7">
                <blockquote className="text-xl font-bold text-ink">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-3 text-ink-muted">{item.body}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="mt-8 text-lg text-ink-muted">
            Sound familiar? You&rsquo;re describing executive function, not laziness.
          </p>
        </Reveal>
      </Section>

      {/* 3 · Reframe */}
      <Section tone="bg" labelledBy="reframe-h" className="text-center">
        <Reveal>
          <h2 id="reframe-h" className="sr-only">
            Our approach
          </h2>
          <div className="mx-auto max-w-3xl space-y-6 text-2xl leading-snug text-ink">
            <p>
              Most note apps are filing cabinets. They work beautifully — if you
              already have the focus to file.
            </p>
            <p>
              ADHD doesn&rsquo;t work like that. Attention arrives in bursts,
              thinking runs sideways, and the admin work is exactly what falls off.
              So we built the opposite:{" "}
              <span className="font-bold text-[#5F49BC]">
                capture with no ceremony, and let the software do the organising.
              </span>
            </p>
            <p className="text-ink-muted">
              Not a tool you have to keep up with. A tool that keeps up with you.
            </p>
          </div>
        </Reveal>
      </Section>

      {/* 4 · Proof — the demo */}
      <Section tone="surface" id="demo" labelledBy="demo-h">
        <Reveal>
          <h2 id="demo-h" className="text-3xl">
            Don&rsquo;t take our word for it. Try it.
          </h2>
          <p className="mt-4 max-w-measure text-lg text-ink-muted">
            Three pieces of Clarity, running right here in your browser — the
            summariser is the real one, imported from the same module the app
            uses, not a mock-up. Nothing is sent anywhere.
          </p>
        </Reveal>
        <Reveal className="mt-8">
          <Demo />
        </Reveal>
      </Section>

      {/* 5 · Substance */}
      <Section tone="bg" labelledBy="substance-h">
        <Reveal>
          <h2 id="substance-h" className="text-3xl">
            How it works
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {SUBSTANCE.map((block) => (
            <Reveal key={block.heading}>
              <div className="h-full rounded-lg border border-line bg-surface p-7">
                <h3 className="text-xl">{block.heading}</h3>
                <p className="mt-3 text-ink-muted">{block.body}</p>
                <p className="mt-4 inline-block rounded-full bg-lavender-soft px-3 py-1 text-sm font-bold text-[#5F49BC]">
                  {substanceStatus(block.features)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="mt-8">
            <Link to="/how-it-works" className="text-lg font-bold text-[#5F49BC] hover:underline">
              See the full walkthrough &rarr;
            </Link>
          </p>
        </Reveal>
      </Section>

      {/* 6 · Trust */}
      <Section tone="surface" labelledBy="trust-h">
        <Reveal>
          <h2 id="trust-h" className="text-3xl">
            Built with care, and in the open
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Reveal>
            <div className="h-full rounded-lg border border-line bg-bg p-7">
              <h3 className="text-xl">Grounded in research</h3>
              <p className="mt-3 text-ink-muted">
                Built on published work in neurodiverse-centred design, universal
                design for learning, and assistive technology.
              </p>
              <Link to="/research" className="mt-4 inline-block font-bold text-[#5F49BC] hover:underline">
                Read the research &rarr;
              </Link>
            </div>
          </Reveal>
          <Reveal>
            <div className="h-full rounded-lg border border-line bg-bg p-7">
              <h3 className="text-xl">Accessible by construction</h3>
              <p className="mt-3 text-ink-muted">
                Keyboard navigable, built for screen readers, with WCAG 2.1 AA as
                our standard — and an honest record of where we currently are.
              </p>
              <Link to="/accessibility" className="mt-4 inline-block font-bold text-[#5F49BC] hover:underline">
                Accessibility statement &rarr;
              </Link>
            </div>
          </Reveal>
          <Reveal>
            <div className="h-full rounded-lg border border-line bg-bg p-7">
              <h3 className="text-xl">We don&rsquo;t monitor you</h3>
              <p className="mt-3 text-ink-muted">
                No attention tracking. No behavioural profiling. No selling data.
                Your notes are yours — exportable and deletable, always.
              </p>
              <Link to="/privacy" className="mt-4 inline-block font-bold text-[#5F49BC] hover:underline">
                Privacy in plain English &rarr;
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 7 · Invitation */}
      <Section tone="bg" id="waitlist" labelledBy="waitlist-h" className="relative overflow-hidden">
        <Blob color="green" className="right-[-10%] bottom-[-30%] h-96 w-96 opacity-50" />
        <Reveal>
          <h2 id="waitlist-h" className="text-3xl sm:text-4xl">
            Be first in.
          </h2>
          <p className="mt-4 max-w-measure text-lg text-ink-muted">
            We&rsquo;re building in the open, with ADHD users shaping what ships.
            Join the waitlist and help decide what gets built next.
          </p>
          <div className="mt-8">
            <WaitlistForm />
          </div>
        </Reveal>
      </Section>
    </>
  );
}
