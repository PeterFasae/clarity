import { Check, Clock } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Section, Reveal } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";

/**
 * Everything on this page is something that was checked, on the date below, by
 * the method named next to it. Nothing here is aspirational — the things we
 * have not done are in their own list, and they stay there until they are done.
 */
const VERIFIED_ON = "10 August 2026";

const IMPLEMENTED = [
  "Keyboard navigation through every control on every page, in a logical order, with a visible focus ring on each one. Walked with real key presses, not scripted focus.",
  "A skip link to jump straight to the main content.",
  "Body text at 18px with 1.7 line-height, and a reading measure capped at about 65 characters.",
  "A visible \u201creduce motion\u201d toggle that overrides your operating system\u2019s setting in both directions, as well as honouring it by default.",
  "A font toggle that switches the whole site to OpenDyslexic.",
  "Light and dark themes, saved on your device \u2014 no cookies, so no cookie banner.",
  "Zero automated accessibility violations on every page, in both themes, including the interactive demo and its focus-mode overlay.",
  "Colour contrast measured in both themes. Every text pair we ship is listed below; the lowest is 5.6:1 against a 4.5:1 requirement.",
  "The interactive demo runs entirely in your browser, so nothing about it depends on a network connection.",
];

const NOT_YET = [
  "An independent, third-party accessibility audit.",
  "Any testing with a real screen reader. The markup uses landmarks, headings, labels and live regions, and the demo\u2019s focus-mode overlay traps focus and announces itself \u2014 but nobody has yet driven this site with VoiceOver, NVDA or JAWS, so we are not going to claim it works well with them.",
  "Testing with a diverse group of ADHD and neurodivergent users.",
  "Testing at a range of browser zoom levels and with a screen magnifier.",
  "The in-app experience \u2014 this statement covers this marketing website only. The app is still in development and has its own audit ahead of it.",
];

/**
 * Measured with the WCAG relative-luminance formula against the colours the
 * site actually computes, in both themes, rather than against the hex values we
 * meant to ship. Those two things were not the same: the purple was hardcoded
 * for the light theme and measured 2.1\u20132.7:1 in dark until this audit.
 */
const CONTRAST = [
  { pair: "Body text on the page background", light: "13.0:1", dark: "14.6:1", pass: "AAA" },
  { pair: "Body text on a card", light: "14.2:1", dark: "13.3:1", pass: "AAA" },
  { pair: "Muted text on the page background", light: "5.8:1", dark: "7.5:1", pass: "AA" },
  { pair: "Muted text on a card", light: "6.3:1", dark: "6.8:1", pass: "AA" },
  { pair: "Links and headings in purple, on the page", light: "6.0:1", dark: "7.4:1", pass: "AA" },
  { pair: "Purple on the soft lavender fill", light: "5.7:1", dark: "5.6:1", pass: "AA" },
  { pair: "Button label on a filled purple button", light: "6.6:1", dark: "7.4:1", pass: "AA" },
  { pair: "Error text on a card", light: "6.6:1", dark: "7.4:1", pass: "AA" },
  {
    pair: "Brand lavender \u2014 fills and large display type only, never body text",
    light: "2.9:1",
    dark: "n/a",
    pass: "Decorative only",
  },
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
            independent audit says so. Here&rsquo;s the honest picture instead,
            last checked on{" "}
            <span className="font-bold text-ink">{VERIFIED_ON}</span>.
          </>
        }
      />

      <Section tone="surface" labelledBy="impl-h" className="pt-0">
        <Reveal>
          <h2 id="impl-h" className="text-2xl">
            What&rsquo;s implemented on this website
          </h2>
          <p className="mt-3 max-w-measure text-ink-muted">
            Every line below was checked rather than assumed. The automated part
            used axe-core across all five pages in both themes; the keyboard part
            was walked by hand. Automated testing only catches a minority of
            accessibility problems, which is why the list underneath it matters
            more than this one.
          </p>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {IMPLEMENTED.map((item) => (
              <li key={item} className="flex gap-3 rounded-lg border border-line bg-bg p-4">
                <Check className="mt-1 h-5 w-5 shrink-0 text-lavender-ink" aria-hidden="true" />
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
                Measured contrast ratios for every text and background pair the
                site ships, in both themes
              </caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-3 pr-4 font-bold">Colour pair</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Light</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Dark</th>
                  <th scope="col" className="py-3 font-bold">Rating</th>
                </tr>
              </thead>
              <tbody>
                {CONTRAST.map((row) => (
                  <tr key={row.pair} className="border-b border-line align-top">
                    <td className="py-3 pr-4">{row.pair}</td>
                    <td className="py-3 pr-4 font-bold">{row.light}</td>
                    <td className="py-3 pr-4 font-bold">{row.dark}</td>
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
          <div className="rounded-lg border-2 border-dashed border-lavender-ink/40 bg-lavender-soft p-7">
            <p className="font-bold uppercase tracking-wide text-lavender-ink">
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
              className="font-bold text-lavender-ink hover:underline"
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
