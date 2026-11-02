// Money helpers: integer minor units only. Never use floating point for money.
export type Cents = bigint;

export function toCents(decimal: string): Cents {
  const m = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(decimal.trim());
  if (!m) throw new Error(`Invalid money value: ${decimal}`);
  const [, sign, whole = "0", frac = ""] = m;
  const cents = BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0"));
  return sign ? -cents : cents;
}

export function fromCents(cents: Cents): string {
  const neg = cents < 0n;
  const abs = neg ? -cents : cents;
  return `${neg ? "-" : ""}${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
}
