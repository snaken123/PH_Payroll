import { z } from "zod";

/**
 * z.coerce.number() calls Number(value) directly, and Number("") is 0, not
 * NaN — so an optional numeric field left blank in an HTML number input
 * (raw value "") coerces to 0 and can fail a downstream .positive()/.min()
 * check, causing the whole form to silently fail client-side validation
 * with no visible error (since no UI is wired for an "empty optional field
 * that's secretly invalid"). This treats "", null, and undefined as
 * "not provided" before the inner schema ever sees them.
 */
export function optionalCoercedNumber<T extends z.ZodTypeAny>(inner: T) {
  return z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    inner.optional()
  );
}
