import {
  DEFAULT_PREFERENCES,
  ERROR_CODES,
  PreferencesSchema,
  PreferencesUpdateSchema,
  aiMayBeEnabled,
} from '@clarity/core';
import { getPreferences, putPreferences } from '../lib/dynamo.js';
import { parseBody, withAuth } from '../lib/handler.js';
import { failure, ok } from '../lib/respond.js';

/**
 * PUT /me/preferences — a partial update, merged onto what is already stored.
 *
 * Server-side persistence is what makes settings follow a user across devices
 * (report §2.2.5.1). The client keeps `localStorage` as its offline cache and
 * its pre-login source; neither side uses a cookie, which is why there is no
 * cookie banner to write.
 *
 * One rule is enforced here rather than in the UI: **AI assistance cannot be
 * switched on without consent on the record.** A client that sends
 * `aiEnabled: true` with no `aiConsentedAt` — ever stored or supplied now —
 * gets a 422. That makes "we showed them the consent copy" a fact the server
 * checked, not a claim about a screen, and it means the flag cannot be flipped
 * by a stray request.
 */
export const handler = withAuth(async (event, userId) => {
  const update = parseBody(event, PreferencesUpdateSchema);
  const stored = await getPreferences(userId);
  const current = { ...DEFAULT_PREFERENCES, ...(stored ?? {}) };

  if (update.aiEnabled === true && !aiMayBeEnabled(current, update)) {
    return failure(
      event,
      422,
      ERROR_CODES.consentRequired,
      'AI assistance cannot be switched on until the consent copy has been accepted.',
    );
  }

  const preferences = PreferencesSchema.parse({ ...current, ...update });

  await putPreferences(userId, preferences);
  return ok(event, { preferences });
});
