import { DEFAULT_PREFERENCES, PreferencesSchema } from '@clarity/core';
import { getPreferences } from '../lib/dynamo.js';
import { withAuth } from '../lib/handler.js';
import { ok } from '../lib/respond.js';

/**
 * GET /me/preferences
 *
 * A user who has never opened the settings panel still gets a complete set of
 * preferences back, so the client has nothing to guess at. `aiEnabled` defaults
 * to false and this route is one of the places that has to stay true.
 */
export const handler = withAuth(async (event, userId) => {
  const stored = await getPreferences(userId);
  const preferences = PreferencesSchema.parse({ ...DEFAULT_PREFERENCES, ...(stored ?? {}) });

  return ok(event, { preferences });
});
