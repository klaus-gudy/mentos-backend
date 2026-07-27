/**
 * Ported from mentos-frontend/app/(app)/documents/page.tsx `CATS` — not
 * exported from lib/types.ts or lib/seed.ts like MAINTENANCE_CATEGORIES is,
 * but still the frontend's real, closed list (the upload dialog's category
 * `<select>` only ever offers these six).
 */
export const DOCUMENT_CATEGORIES = [
  'Lease',
  'Identification',
  'Inspection',
  'Receipt',
  'Insurance',
  'Maintenance',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
