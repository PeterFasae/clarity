import { Link } from "react-router-dom";
import { PreferencesToggles } from "@/components/PreferencesToggles";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface px-6 py-14">
      <div className="mx-auto flex max-w-content flex-col gap-10">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-measure">
            <p className="text-lg font-bold text-ink">Clarity</p>
            <p className="mt-2 text-ink-muted">
              A note-taking app for ADHD brains. In development, built in the open.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-2">
            <Link to="/how-it-works" className="text-lavender-ink hover:underline">
              How it works
            </Link>
            <Link to="/accessibility" className="text-lavender-ink hover:underline">
              Accessibility
            </Link>
            <Link to="/research" className="text-lavender-ink hover:underline">
              Research
            </Link>
            <Link to="/privacy" className="text-lavender-ink hover:underline">
              Privacy
            </Link>
          </nav>
        </div>

        <div className="border-t border-line pt-8">
          <p className="mb-3 text-sm font-bold text-ink-muted">
            Display preferences
          </p>
          <PreferencesToggles />
          <p className="mt-3 text-sm text-ink-muted">
            Saved on this device only. We don&rsquo;t use cookies.
          </p>
        </div>

        <p className="text-sm text-ink-muted">
          &copy; {new Date().getFullYear()} Clarity. This is a
          work-in-progress build, not a finished product.
        </p>
      </div>
    </footer>
  );
}
