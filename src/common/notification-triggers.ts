/**
 * System events a notification template can be attached to — ported from
 * mentos-frontend/lib/seed.ts `TEMPLATE_TRIGGERS` so the two sides cannot
 * drift. Each trigger carries its description in both languages so a
 * template's `trigger` display label reads naturally regardless of which
 * language version is being shown.
 *
 * This is configuration only in this pass — nothing in the backend fires a
 * notification when one of these events occurs yet. Storing the trigger key
 * on a template records *intent* ("send this when a tenant is onboarded"),
 * ready for a future dispatch pipeline to read.
 */

export interface NotificationTrigger {
  key: string;
  en: string;
  sw: string;
}

export const NOTIFICATION_TRIGGERS: NotificationTrigger[] = [
  { key: 'rent-due', en: '3 days before rent is due', sw: 'Siku 3 kabla ya kodi kuiva' },
  { key: 'invoice-overdue', en: 'When an invoice becomes overdue', sw: 'Ankara inapopita muda' },
  { key: 'payment-received', en: 'When a payment is received', sw: 'Malipo yanapopokelewa' },
  { key: 'lease-created', en: 'When a lease is created', sw: 'Mkataba unapoundwa' },
  { key: 'lease-expiry', en: '60 days before lease ends', sw: 'Siku 60 kabla ya mkataba kuisha' },
  { key: 'maintenance-status', en: 'When a maintenance request changes status', sw: 'Ombi la matengenezo linapobadilisha hali' },
  { key: 'tenant-onboarded', en: 'When a tenant is onboarded', sw: 'Mpangaji anaposajiliwa' },
  { key: 'manual', en: 'Manual send', sw: 'Kutumwa kwa mkono' },
];

export const NOTIFICATION_TRIGGER_KEYS = NOTIFICATION_TRIGGERS.map((t) => t.key);

export const triggerByKey = (key: string): NotificationTrigger =>
  NOTIFICATION_TRIGGERS.find((t) => t.key === key) ?? NOTIFICATION_TRIGGERS[NOTIFICATION_TRIGGERS.length - 1];
