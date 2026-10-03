/**
 * Retrying what DynamoDB did not get to.
 *
 * BatchGetItem and BatchWriteItem can return part of a request as unprocessed,
 * which means DynamoDB is throttling the table. Sending the same request again
 * at once is the one thing that makes it worse, and every concurrent caller
 * doing the same is how a throttle becomes an outage. So each retry waits for
 * a random time between zero and a ceiling that doubles with every attempt
 * ("full jitter"), up to a cap, and after a bounded number of attempts it stops
 * and says so rather than looping until the Lambda times out.
 */

export const BACKOFF = Object.freeze({ baseMs: 50, capMs: 1000, maxAttempts: 8 });

export class UnprocessedItemsError extends Error {
  constructor() {
    super('DynamoDB kept returning unprocessed items.');
    this.name = 'UnprocessedItemsError';
  }
}

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** How long to wait after the given attempt (0 is the first): random in [0, min(cap, base * 2^attempt)). */
export function backoffDelay(attempt, random = Math.random, { baseMs, capMs } = BACKOFF) {
  return Math.floor(random() * Math.min(capMs, baseMs * 2 ** attempt));
}

/**
 * Call `step` with the items still to do until it reports none left.
 *
 * `step(items)` sends one request and returns the items DynamoDB did not
 * process. `sleep` and `random` are parameters only so that tests can watch
 * the waiting without doing it.
 */
export async function retryUnprocessed(
  items,
  step,
  { sleep = realSleep, random = Math.random, maxAttempts = BACKOFF.maxAttempts } = {},
) {
  let remaining = items;

  for (let attempt = 0; ; attempt++) {
    remaining = await step(remaining);
    if (remaining.length === 0) return;

    if (attempt + 1 >= maxAttempts) throw new UnprocessedItemsError();
    await sleep(backoffDelay(attempt, random));
  }
}
