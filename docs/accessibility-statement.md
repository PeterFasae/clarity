# Accessibility statement

**Last verified: 10 August 2026.** This statement covers the Clarity marketing
website (`apps/site`) and the Clarity app (`apps/web`) as they exist in this
repository. Neither is deployed, so nothing here describes a live service yet.

Our standard is **WCAG 2.1 Level AA**. We have not reached it, and this document
exists so that nobody has to guess how far off we are. Every line under "What we
have checked" names the method used. Everything we have not checked is in its
own list and stays there until it has been.

---

## What we have checked, and how

### Automated testing

axe-core 4.13 was run against every page and every significant state of both
surfaces, using the WCAG 2.0 A/AA, WCAG 2.1 A/AA and best-practice rule sets, in
a real browser rather than a simulated DOM.

| Surface | States covered | Result |
|---|---|---|
| `apps/site` | `/`, `/how-it-works`, `/accessibility`, `/research`, `/privacy`, all four demo tabs, the focus-mode overlay, the waitlist form after submission — each in light and dark | **0 violations** |
| `apps/web` | Sign in, sign up, notes list, an open note, focus mode, the actions view, settings, not-found — the first five also in all four themes | **0 violations** |

Two real defects were found this way and fixed:

- On the app, muted text measured 4.34:1 on the `accent` surface — it cleared
  4.5:1 on white, which is where it had been checked, but not on the surface it
  actually sits on. The token was darkened; it now measures 4.74:1 there.
- On the marketing site, the purple used for links, headings and small UI was a
  hardcoded hex tuned for a white background. In dark mode it measured
  **2.05–2.71:1**, against a 4.5:1 requirement, across fourteen elements. It is
  now a theme-aware variable with a paired foreground for filled controls.

**Automated tools catch a minority of accessibility problems.** A clean axe run
means the obvious machine-checkable failures are gone. It does not mean the site
is usable, and we do not present it as though it does.

### Keyboard

Walked by hand with real key presses, not scripted focus calls — which matters,
because a programmatic `.focus()` does not trigger `:focus-visible` and will
report a passing focus ring that a keyboard user never sees.

- **Marketing site:** 14 tab stops on `/accessibility`, in a logical order
  (skip link → navigation → call to action → in-page links → footer navigation →
  preference toggles). Every stop had a visible focus ring. The demo's tab strip
  implements the WAI-ARIA tabs pattern with roving `tabindex`; arrow keys move
  and select, and only the selected tab is in the tab order.
- **App:** every enabled focusable control on the notes screen is reachable, has
  an accessible name, and shows a visible focus ring. `⌘N` moves focus to the
  capture box from anywhere on the page; `⌘↵` saves. Navigation between the
  three main views works with Tab and Enter. The settings radio groups respond
  to arrow keys.

### Focus management

The focus-mode overlay on both surfaces was checked directly:

- `Escape` exits.
- Focus moves into the overlay on open and returns to the control that opened it
  on close.
- The rest of the page carries both `inert` and `aria-hidden="true"`, so it is
  gone from the tab order and from the accessibility tree, not merely invisible.
- Entering and leaving are announced through an `aria-live` region.

### Motion

Two independent switches, and either one is enough. The operating system's
`prefers-reduced-motion` setting is honoured by default, and an in-page toggle
overrides it **in both directions** — someone whose OS was never configured can
still turn motion off, and someone whose OS asks for reduced motion can turn it
back on here.

Verified by measurement: a 500ms transition drops to 0.01ms when the toggle is
set to reduced and returns to 500ms when set to full, on a machine whose
operating system is not asking for reduced motion. The OS-driven direction was
verified by inspecting the compiled stylesheet rather than by emulating the
media query — see the gaps below.

### Colour and contrast

Measured with the WCAG relative-luminance formula against the colours the
browser actually computes, in every theme, rather than against the hex values in
the design notes. Those two were not the same, which is how the dark-mode defect
above survived until now.

- **Marketing site**, light and dark: lowest text pair 5.6:1.
- **App**, all four themes (light, dark, high contrast, low stimulation): zero
  contrast violations across 20 theme-and-view combinations.

Brand lavender `#9b87f5` measures ~2.9:1 on white and is restricted to fills and
large display type. It is never used for body text.

### Text and reading

- Body text 18px with 1.7 line-height and a measure capped near 65 characters.
- Text size is a user preference with four steps, applied by scaling the root
  font size, so everything sized in `rem` follows.
- Atkinson Hyperlegible is the default face, with OpenDyslexic available as a
  toggle. Both are self-hosted, so no third party learns who is reading.

---

## What we have not checked

These are gaps, not omissions. We would rather publish a short honest list than
a long implied one.

- **Any testing with a real screen reader.** The markup uses landmarks,
  heading order, labels and live regions, and the focus-mode overlay traps focus
  and announces itself — but nobody has yet driven either surface with VoiceOver,
  NVDA or JAWS. We are not going to claim it works well with them.
- **An independent third-party audit.** Everything above is our own testing.
- **Testing with ADHD and neurodivergent users.** The research this product is
  built on names limited user testing as its own headline limitation, and we
  have not yet closed that gap.
- **Browser zoom and magnification.** Not tested at 200% or 400%, and not tested
  with a screen magnifier.
- **The OS-driven reduced-motion path**, verified by reading the stylesheet
  rather than by running a browser with the setting enabled.
- **Cognitive-accessibility testing.** Given who this product is for, this
  matters more here than the WCAG checklist does, and it is the largest gap on
  this page.
- **Lighthouse accessibility scores.** Not run; the tool is not installed in the
  development environment.

---

## Reporting a barrier

If any part of Clarity was hard or impossible to use, please tell us — it is the
fastest way for us to fix it. Include what happened and the device, browser or
assistive technology you were using.

The contact address on the site is currently a placeholder, because the domain
has not been registered yet. A monitored inbox will replace it before either
surface is deployed, and this statement will be updated with it.

---

## How this statement is maintained

It is dated, and the date means the day the checks were actually run. When a
check is re-run the date moves; when a gap is closed it moves from the second
list to the first, with the method that closed it. Anything we cannot show
evidence for does not go in the first list.
