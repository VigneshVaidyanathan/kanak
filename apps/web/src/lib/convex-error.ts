import { ConvexError } from 'convex/values';

/**
 * The message a Convex mutation meant for the user to read.
 *
 * Convex passes a `ConvexError`'s payload through intact; anything else
 * reaches the client wrapped in a request id and a server stack trace, which
 * is not something to put in front of someone.
 */
export function convexErrorMessage(err: unknown) {
  return err instanceof ConvexError
    ? String(err.data)
    : 'Something went wrong. Please try again.';
}
