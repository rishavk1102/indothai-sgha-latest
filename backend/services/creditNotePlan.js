function toMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Full payment → every line.
 * Partial payment → a single amount (tax stays 0; billing enters the paid total).
 * Specific lines → only those invoice_line_ids.
 */
function resolveCreditNotePlan(sourceLines, options = {}) {
  const lines = Array.isArray(sourceLines) ? sourceLines : [];
  const mode = String(options.mode || 'full').toLowerCase();

  if (mode === 'partial') {
    const amount = toMoney(options.amount);
    if (!(amount > 0)) {
      throw new Error('Enter the amount that was paid');
    }
    return { type: 'amount', amount };
  }

  if (mode === 'lines') {
    const ids = new Set(
      (Array.isArray(options.line_ids) ? options.line_ids : [])
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0)
    );
    const picked = lines.filter((line) => ids.has(Number(line.invoice_line_id)));
    if (!picked.length) {
      throw new Error('Select at least one invoice line that was paid');
    }
    return { type: 'lines', lines: picked };
  }

  if (!lines.length) {
    throw new Error('Source invoice has no lines');
  }
  return { type: 'lines', lines };
}

function creditAbsTotal(plan) {
  if (plan.type === 'amount') return toMoney(plan.amount);
  const lines = plan.lines || [];
  return toMoney(
    lines.reduce(
      (sum, line) =>
        sum + Number(line.amount || 0) + Number(line.tax || 0),
      0
    )
  );
}

module.exports = {
  resolveCreditNotePlan,
  creditAbsTotal,
  toMoney,
};
