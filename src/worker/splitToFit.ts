/**
 * Recursively split `text` until every returned piece measures within
 * `maxTokens`. Splits at the first whitespace at or after the string's
 * midpoint; the whitespace stays with the right piece so concatenating the
 * result reproduces the original text exactly.
 *
 * If a piece exceeds `maxTokens` but contains no whitespace from its midpoint
 * onward (a single word longer than the limit), it is returned as-is — there
 * is nothing to split on, and downstream synthesis must handle it.
 */
export async function splitToFit(
  text: string,
  maxTokens: number,
  measure: (text: string) => Promise<number>,
): Promise<string[]> {
  if ((await measure(text)) <= maxTokens) return [text];
  const mid = Math.floor(text.length / 2);
  let splitAt = -1;
  for (let i = mid; i < text.length; i++) {
    if (/\s/.test(text[i] as string)) {
      splitAt = i;
      break;
    }
  }
  if (splitAt === -1) return [text];
  const left = text.slice(0, splitAt);
  const right = text.slice(splitAt);
  const [l, r] = await Promise.all([
    splitToFit(left, maxTokens, measure),
    splitToFit(right, maxTokens, measure),
  ]);
  return [...l, ...r];
}
