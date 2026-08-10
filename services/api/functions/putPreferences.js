import { DEFAULT_PREFERENCES, PreferencesSchema, PreferencesUpdateSchema } from '@clarity/core';
import { getPreferences, putPreferences } from '../lib/dynamo.js';
import { parseBody, withAuth } from '../lib/handler.js';
import { ok } from '../lib/respond.js';

/**
 * PUT /me/preferences — a partial update, merged onto what is already stored.
 *
 * Server-side persistence is what makes settings follow a user across devices
 * (report §2.2.5.1). The client keeps `localStorage` as its offline cache and
 * its pre-login source; neither side uses a cookie, which is why there is no
 * cookie banner to write.
 */
export const handler = withAuth(async (event, userId) => {
  const update = parseBody(event, PreferencesUpdateSchema);
  const stored = await getPreferences(userId);

  const preferences = PreferencesSchema.parse({
    ...DEFAULT_PREFERENCES,
    ...(stored ?? {}),
    ...update,
  });

  await putPreferences(userId, preferences);
  return ok(event, { preferences });
});
