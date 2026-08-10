import registry from "@status";

/**
 * The feature-status registry, read straight from docs/status.json.
 *
 * This exists so a label cannot rot. The site never hardcodes what a feature
 * does or whether it exists — it looks both up. CONTEXT.md §6 is the rule it
 * enforces: public copy may only describe a feature in the present tense when
 * its status is "built". This audience has been over-promised by every
 * productivity tool they've abandoned; being the one that told the truth is
 * worth more than the extra signup.
 */

export type FeatureStatus = "built" | "in-progress" | "planned";

export interface Feature {
  id: string;
  name: string;
  group: string;
  status: FeatureStatus;
  publicCopy: string;
  note?: string;
}

const FEATURES = (registry as { features: Feature[] }).features;

const BY_ID = new Map(FEATURES.map((f) => [f.id, f]));

export function feature(id: string): Feature {
  const found = BY_ID.get(id);
  // Loud on purpose: a typo'd id must not silently render as a missing card.
  if (!found) throw new Error(`No feature "${id}" in docs/status.json`);
  return found;
}

export function featuresIn(group: string): Feature[] {
  return FEATURES.filter((f) => f.group === group);
}

/** The only place a status becomes a word a visitor reads. */
export const STATUS_LABEL: Record<FeatureStatus, string> = {
  built: "Available now",
  "in-progress": "Being built",
  planned: "Coming soon",
};
