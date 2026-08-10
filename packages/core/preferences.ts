import { z } from 'zod';

/**
 * User preferences.
 *
 * These are stored server-side so they follow the user across devices, and
 * mirrored into `localStorage` as the offline cache and the pre-login source.
 * No cookies — which is why there is no cookie banner.
 *
 * Client-side the values are reflected onto `<html>` as classes and CSS does
 * the rendering; see `apps/site/src/context/PreferencesContext.tsx`.
 */

export const ThemeSchema = z.enum(['light', 'dark', 'high-contrast', 'low-stimulation']);
export type Theme = z.infer<typeof ThemeSchema>;

export const FontSchema = z.enum(['system', 'atkinson', 'dyslexic']);
export type Font = z.infer<typeof FontSchema>;

export const TextSizeSchema = z.enum(['s', 'm', 'l', 'xl']);
export type TextSize = z.infer<typeof TextSizeSchema>;

export const MotionSchema = z.enum(['full', 'reduced']);
export type Motion = z.infer<typeof MotionSchema>;

export const PreferencesSchema = z.object({
  theme: ThemeSchema,
  font: FontSchema,
  textSize: TextSizeSchema,
  motion: MotionSchema,
  /**
   * Opt-in to LLM assistance. Default FALSE, and it stays false until the user
   * has read consent copy saying plainly that note text is sent to Anthropic.
   * A user who never turns this on has genuinely never had a note leave the
   * system, and that is a claim worth being able to make.
   */
  aiEnabled: z.boolean(),

  /**
   * When the user accepted the consent copy, or null if they never have.
   *
   * This exists so "they were shown the consent screen" is a fact on the record
   * rather than a claim about the UI. The server refuses to set `aiEnabled`
   * true without it, which means a client cannot enable AI assistance by
   * accident, and a request that tries is a validation error rather than a
   * quiet opt-in.
   */
  aiConsentedAt: z.string().datetime().nullable(),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  font: 'atkinson',
  textSize: 'm',
  motion: 'full',
  aiEnabled: false,
  aiConsentedAt: null,
};

/**
 * The rule the API enforces on `PUT /me/preferences`: AI assistance cannot be
 * switched on unless consent is on the record — either already stored, or
 * supplied in the same request.
 */
export function aiMayBeEnabled(
  stored: Pick<Preferences, 'aiConsentedAt'>,
  update: Partial<Preferences>,
): boolean {
  return Boolean(update.aiConsentedAt ?? stored.aiConsentedAt);
}

/** Every field optional — PUT /me/preferences accepts a partial update. */
export const PreferencesUpdateSchema = PreferencesSchema.partial();
export type PreferencesUpdate = z.infer<typeof PreferencesUpdateSchema>;
