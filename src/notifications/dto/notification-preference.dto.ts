export type NotifPrefsShape = Record<string, { label: string; email: boolean; sms: boolean; inapp: boolean }>;

/**
 * Mirrors mentos-frontend's `NotifPrefs` exactly — sent and returned as a
 * bare `Record<string, {label,email,sms,inapp}>`, not wrapped in an
 * envelope, since the frontend PUTs the whole object it got from GET back
 * unmodified except for the one toggle the user flipped. The key set is
 * UI-defined, not schema-enforced, so validation stays shallow (matching how
 * UpdateInvoiceDto.items is validated manually rather than per-field) —
 * see NotificationsController.setPreferences.
 */
export const isValidPrefsShape = (body: unknown): body is NotifPrefsShape => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return false;
  return Object.values(body).every(
    (v) =>
      typeof v === 'object' &&
      v !== null &&
      typeof (v as Record<string, unknown>).label === 'string' &&
      typeof (v as Record<string, unknown>).email === 'boolean' &&
      typeof (v as Record<string, unknown>).sms === 'boolean' &&
      typeof (v as Record<string, unknown>).inapp === 'boolean',
  );
};
