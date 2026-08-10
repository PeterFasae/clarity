import { Check, Clock } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Section, Reveal } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";

const IMPLEMENTED = [
  "Full keyboard navigation, in a logical order, with a visible focus indicator on every control.",
  "A skip link to jump straight to the main content.",
  "Body text at 18px with 1.7 line-height, and a reading measure capped at about 65 characters.",
  "A visible “reduce motion” toggle, plus full support for your operating system’s reduced-motion setting.",
  "A font toggle that switches the whole site to OpenDyslexic.",
  "Light, dark, and low-stimulation themes, saved on your device (no cookies).",
  "Colour contrast measured against WCAG 2.1 AA targets — the pairs we ship are listed below.",
  "The interactive demo runs entirely in your browser, so nothing depends on a network connection.",
];

const NOT_YET = [
  "An independent, third-party accessibility audit.",
  "Screen-reader testing at scale across JAWS, NVDA, and VoiceOver.",
  "Testing with a diverse group of ADHD and neurodivergent users.",
  "The in-app experience — this statement covers this marketing website only. The app is still in development.",
];

// Measured with the WCAG relative-luminance formula (light theme).
const CONTRAST = [
  { pair: "Body text (#2A2A33) on off-white (#F6F6F7)", ratio: "13.2:1", pass: "AAA" },
  { pair: "Body text (#2A2A33) on white (#FFFFFF)", ratio: "14.2:1", pass: "AAA" },
  { pair: "Muted text (#5B6066) on off-white (#F6F6F7)", ratio: "5.9:1", pass: "AA" },
  { pair: "Link/heading purple (#5F49BC) on white", ratio: "6.6:1", pass: "AA" },
  { pair: "White on button purple (#5F49BC)", ratio: "6.6:1", pass: "AA" },
  { pair: "Error text (#B3261E) on white", ratio: "6.5:1", pass: "AA" },
  { pair: "Brand lavender (#9B87F5) on white — fills/large only", ratio: "2.9:1", pass: "Decorative / large text only" },
];

export function Accessibility() {
  return (
    <>
      <Seo
        title="Accessibility"
        description="Where Clarity's website genuinely stands on accessibility — what's implemented, what isn't audited yet, measured contrast values, and how to report a barrier."
        path="/accessibility"
      />
      <PageHeader
        kicker="Accessibility"
        title="Our standard, and where we actually are"
        intro={
          <>
            Our standard is <span className="font-bold text-ink">WCAG 2.1 AA</span>.
            We&rsquo;re not going to tell you we&rsquo;ve reached it before an
            independent audit says so. Here&rsquo;s the honest picture instead.
          </>
        }
      />

      <Section tone="surface" labelledBy="impl-h" className="pt-0">
        <Reveal>
          <h2 id="impl-h" className="text-2xl">
            What&rsquo;s implemented on this website
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {IMPLEMENTED.map((item) => (
              <li key={item} className="flex gap-3 rounded-lg border border-line bg-bg p-4">
                <Check className="mt-1 h-5 w-5 shrink-0 text-[#5F49BC]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      <Section tone="bg" labelledBy="notyet-h">
        <Reveal>
          <h2 id="notyet-h" className="text-2xl">
            What we haven&rsquo;t done yet
          </h2>
          <p className="mt-3 max-w-measure text-ink-muted">
            Naming these matters as much as listing the wins. If a page claims to
            have accessibility completely solved, be suspicious — nobody knows
            that without testing.
          </p>
          <ul className="mt-6 space-y-3">
            {NOT_YET.map((item) => (
              <li key={item} className="flex gap-3 rounded-lg border border-line bg-surface p-4">
                <Clock className="mt-1 h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      <Section tone="surface" labelledBy="contrast-h">
        <Reveal>
          <h2 id="contrast-h" className="text-2xl">
            Measured contrast
          </h2>
          <p className="mt-3 max-w-measure text-ink-muted">
            Every text/background pair we ship, measured with the WCAG
            relative-luminance formula. AA needs 4.5:1 for body text and 3:1 for
            large text.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Contrast ratios for text and background colour pairs
              </caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-3 pr-4 font-bold">Colour pair</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Ratio</th>
                  <th scope="col" className="py-3 font-bold">Rating</th>
                </tr>
              </thead>
              <tbody>
                {CONTRAST.map((row) => (
                  <tr key={row.pair} className="border-b border-line align-top">
                    <td className="py-3 pr-4">{row.pair}</td>
                    <td className="py-3 pr-4 font-bold">{row.ratio}</td>
                    <td className="py-3 text-ink-muted">{row.pass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </Section>

      {/* Visible TODO for real audit results — intentionally not hidden. */}
      <Section tone="bg" labelledBy="audit-h">
        <Reveal>
          <div className="rounded-lg border-2 border-dashed border-[#5F49BC]/40 bg-lavender-soft p-7">
            <p className="font-bold uppercase tracking-wide text-[#5F49BC]">
              TODO — audit results
            </p>
            <h2 id="audit-h" className="mt-2 text-2xl">
              Independent audit: not yet completed
            </h2>
            <p className="mt-3 max-w-measure text-ink">
              When an external accessibility audit and structured screen-reader
              testing are done, the findings and remediation status will be
              published here in full — including anything that failed. This block
              stays until then.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section tone="surface" labelledBy="report-h">
        <Reveal>
          <h2 id="report-h" className="text-2xl">
            Found a barrier? Tell us.
          </h2>
          <p className="mt-3 max-w-measure text-ink-muted">
            If any part of this site was hard or impossible to use, we want to
            know — it&rsquo;s the fastest way for us to fix it. Email{" "}
            <a
              href="mailto:accessibility@clarity.example"
              className="font-bold text-[#5F49BC] hover:underline"
            >
              accessibility@clarity.example
            </a>{" "}
            with what happened and the device or assistive technology you were
            using. We read every one.
          </p>
          <p className="mt-3 text-sm text-ink-muted">
            (Placeholder address — replace with a monitored inbox before launch.)
          </p>
        </Reveal>
      </Section>
    </>
  );
}
