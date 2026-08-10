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
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  font: 'atkinson',
  textSize: 'm',
  motion: 'full',
  aiEnabled: false,
};

/** Every field optional — PUT /me/preferences accepts a partial update. */
export const PreferencesUpdateSchema = PreferencesSchema.partial();
export type PreferencesUpdate = z.infer<typeof PreferencesUpdateSchema>;
