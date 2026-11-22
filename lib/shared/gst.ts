// GST breakup for invoices. Prices are treated as GST-inclusive (standard for B2C in India).
// Intra-state supply => CGST + SGST (half each). Inter-state => IGST.

export interface GstLine {
  name: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  gstRate: number;
}

export interface GstLineResult extends GstLine {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function normaliseState(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z]/g, '');
}

export function computeGst(lines: GstLine[], discount: number, sellerState: string, buyerState: string) {
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const intraState = normaliseState(sellerState) !== '' && normaliseState(sellerState) === normaliseState(buyerState);

  const result: GstLineResult[] = lines.map((l) => {
    // Coupon discount is spread across lines in proportion to their value.
    const share = subtotal > 0 ? (l.lineTotal / subtotal) * discount : 0;
    const gross = l.lineTotal - share;
    const taxableValue = round2(gross / (1 + l.gstRate / 100));
    const tax = round2(gross - taxableValue);
    return {
      ...l,
      taxableValue,
      cgst: intraState ? round2(tax / 2) : 0,
      sgst: intraState ? round2(tax / 2) : 0,
      igst: intraState ? 0 : tax
    };
  });

  const totals = result.reduce(
    (t, l) => ({
      taxableValue: round2(t.taxableValue + l.taxableValue),
      cgst: round2(t.cgst + l.cgst),
      sgst: round2(t.sgst + l.sgst),
      igst: round2(t.igst + l.igst)
    }),
    { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 }
  );

  return { lines: result, totals, intraState };
}
