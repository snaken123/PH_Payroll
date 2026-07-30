import { NextResponse } from "next/server";

/**
 * Wraps a thrown error from a mutation (e.g. an unexpected Prisma failure —
 * dropped connection, constraint violation) into a clean JSON error response
 * instead of letting it surface as an unhandled 500 with a raw stack trace.
 */
export function mutationErrorResponse(err: unknown) {
  console.error(err);
  return NextResponse.json({ error: "The request could not be completed. Please try again." }, { status: 500 });
}
