import { Seo } from "@/components/Seo";
import { Section, Reveal } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";

export function Privacy() {
  return (
    <>
      <Seo
        title="Privacy"
        description="Plain-English privacy for the Clarity website: what this site does and doesn't collect. No cookies, no tracking."
        path="/privacy"
      />
      <PageHeader
        kicker="Privacy"
        title="Privacy, in plain English"
        intro="The short version: this website doesn't track you, doesn't use cookies, and doesn't send your information anywhere unless you deliberately submit the waitlist form. Here's the detail."
      />

      <Section tone="surface" className="pt-0">
        <div className="measure space-y-10">
          <Reveal>
            <div>
              <h2 className="text-2xl">What this website collects</h2>
              <p className="mt-3 text-ink-muted">
                Nothing automatically. There&rsquo;s no analytics, no tracking
                pixel, no advertising script, and no cookie. We don&rsquo;t know
                who you are when you visit.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div>
              <h2 className="text-2xl">Your display preferences</h2>
              <p className="mt-3 text-ink-muted">
                When you change the theme, font, or motion settings, that choice
                is saved in your browser&rsquo;s local storage on this device
                only. It never leaves your device and it isn&rsquo;t a cookie.
                Clear your browser data and it&rsquo;s gone.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div>
              <h2 className="text-2xl">The interactive demo</h2>
              <p className="mt-3 text-ink-muted">
                The summarise and focus-mode demos run entirely in your browser.
                The voice demo uses your browser&rsquo;s own speech recognition,
                and in some browsers, Chrome among them, that can send the audio
                to an online speech service used by the browser. We
                never receive that audio, store it, or see it, but we
                can&rsquo;t promise it stays on your device. If you would rather it
                did, use the sample instead of the microphone. The text you type
                into the demo stays on your screen and is never transmitted to
                us.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div>
              <h2 className="text-2xl">The waitlist form</h2>
              <p className="mt-3 text-ink-muted">
                In this build, the waitlist form has no server behind it, so when
                you submit it, your email is not stored anywhere — the success
                message says as much. When we connect a real waitlist, we&rsquo;ll
                use your email for exactly one thing: to tell you once when we
                launch. We won&rsquo;t sell it, share it, or send you anything
                else. This page will be updated with the specifics before that
                goes live.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div>
              <h2 className="text-2xl">Our stance on your data</h2>
              <p className="mt-3 text-ink-muted">
                This matters more here than for most products. Tools aimed at
                ADHD often imply monitoring — tracking your attention, your
                habits, your behaviour. We don&rsquo;t, and we won&rsquo;t. When
                the app ships, your notes will be yours: exportable and deletable,
                always.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="rounded-lg border-2 border-dashed border-line p-6">
              <p className="font-bold uppercase tracking-wide text-ink-muted">
                TODO — legal text
              </p>
              <p className="mt-2 text-ink-muted">
                A formal privacy policy (data controller details, legal basis,
                GDPR rights, retention periods, and contact route) will be added
                here before any real data is collected. The plain-English summary
                above describes what the site actually does today.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
