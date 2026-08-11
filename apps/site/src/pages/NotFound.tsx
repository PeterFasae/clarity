import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Section, Reveal } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";

export function NotFound() {
  return (
    <>
      <Seo
        title="Page not found"
        description="That page doesn't exist."
        path="/404"
      />
      <Section tone="bg" className="text-center">
        <Reveal>
          <p className="text-lg font-bold text-lavender-ink">404</p>
          <h1 className="mt-2 text-4xl">We couldn&rsquo;t find that page</h1>
          <p className="mx-auto mt-4 max-w-measure text-lg text-ink-muted">
            The link may be old, or the page may have moved. No harm done.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/">
              <Button size="lg">Back to home</Button>
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
