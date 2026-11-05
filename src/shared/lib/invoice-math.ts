// Shared by the server (source of truth) and the invoice form (preview only).
// Invoice money rules. Everything is integer cents; strings only at the edges.
//
// Rounding policy (documented per spec §12):
// - line subtotal = quantity × unit price, rounded half-up to the cent
// - discount is a fixed amount off the subtotal, spread over lines in proportion
//   to their subtotal, so it also reduces the taxable base
// - tax is calculated per taxable line on its discounted amount, rounded half-up,
//   and the invoice tax is the sum of the line taxes
// - total = subtotal − discount + tax

/** "1250.5" → 125050. Input is already validated as ≤ 2 decimals. */
export function toCents(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const [whole, frac = ""] = String(v).split(".");
  const sign = whole!.startsWith("-") ? -1 : 1;
  return sign * (Math.abs(Number(whole)) * 100 + Number((frac + "00").slice(0, 2)));
}

export const fromCents = (c: number) => {
  const sign = c < 0 ? "-" : "";
  const abs = Math.abs(c);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
};

/** Half-up division for non-negative bigints. */
const divRound = (n: bigint, d: bigint) => (n * 2n + d) / (2n * d);

/** quantity ("2.5", up to 3 decimals) × unit price (cents) → cents. */
export function lineCents(quantity: string, unitPriceCents: number): number {
  const [w, f = ""] = quantity.split(".");
  const milli = BigInt(w!) * 1000n + BigInt((f + "000").slice(0, 3));
  return Number(divRound(milli * BigInt(unitPriceCents), 1000n));
}

export type LineIn = { quantity: string; unitPriceCents: number; taxable: boolean };
export type Totals = {
  lines: { subtotal: number; tax: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

/** taxRate is a percent string with up to 3 decimals ("8.25"). */
export function computeTotals(lines: LineIn[], discountCents: number, taxRate: string): Totals {
  const subs = lines.map((l) => lineCents(l.quantity, l.unitPriceCents));
  const subtotal = subs.reduce((a, b) => a + b, 0);
  const discount = Math.min(discountCents, subtotal);
  const [rw, rf = ""] = taxRate.split(".");
  const rateMilli = BigInt(rw!) * 1000n + BigInt((rf + "000").slice(0, 3)); // 8.25% → 8250
  const out = subs.map((sub, i) => {
    if (!lines[i]!.taxable || !subtotal || !rateMilli) return { subtotal: sub, tax: 0 };
    // discounted line base = sub × (subtotal − discount) / subtotal; tax = base × rate / 100
    const n = BigInt(sub) * BigInt(subtotal - discount) * rateMilli;
    return { subtotal: sub, tax: Number(divRound(n, BigInt(subtotal) * 100_000n)) };
  });
  const tax = out.reduce((a, b) => a + b.tax, 0);
  return { lines: out, subtotal, discount, tax, total: subtotal - discount + tax };
}
