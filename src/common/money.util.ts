/** "420000" / 420000 → "TSh 420,000" — matches mentos-frontend's `money()` formatter, for server-rendered notification text. */
export function moneyLabel(amount: number | string): string {
  return 'TSh ' + Math.round(Number(amount) || 0).toLocaleString('en-US');
}

/** "1500000" → "TSh 1.5M", "42000" → "TSh 42k" — matches mentos-frontend's `moneyShort()`, for compact chart labels. */
export function moneyShortLabel(amount: number | string): string {
  const v = Number(amount) || 0;
  if (v >= 1e6) return 'TSh ' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return 'TSh ' + Math.round(v / 1e3) + 'k';
  return 'TSh ' + v;
}
