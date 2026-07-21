import { allPermKeys } from '../common/rbac/perm-catalog';

export interface BuiltInRole {
  code: string;
  name: string;
  description: string;
  perms: string[];
}

/**
 * The five built-in roles, ported from mentos-frontend/lib/seed.ts.
 *
 * Shared by the seeder and by bootstrap registration so both paths produce an
 * identical set — and so their codes stay the literals the frontend keys on
 * ("role-super", "role-pm"), which the name-slug rule would not reproduce.
 */
export const BUILT_IN_ROLES: BuiltInRole[] = [
  {
    code: 'role-super',
    name: 'Super Admin',
    description:
      'Full access to every module and administrative function, including user management.',
    perms: allPermKeys(),
  },
  {
    code: 'role-pm',
    name: 'Property Manager',
    description:
      'Runs day-to-day operations across assigned properties — onboarding, leasing and maintenance.',
    perms: [
      'dashboard.read',
      'property.read',
      'property.create',
      'property.update',
      'unit.read',
      'unit.create',
      'unit.update',
      'tenant.read',
      'tenant.create',
      'tenant.update',
      'tenant.blacklist',
      'lease.read',
      'lease.create',
      'lease.update',
      'invoice.read',
      'payment.read',
      'maintenance.read',
      'maintenance.create',
      'maintenance.assign',
      'maintenance.close',
      'report.read',
      'notification.read',
      'notification.send',
      'document.read',
      'document.create',
    ],
  },
  {
    code: 'role-acct',
    name: 'Accountant',
    description: 'Owns billing, rent collection and financial reporting across the portfolio.',
    perms: [
      'dashboard.read',
      'property.read',
      'tenant.read',
      'lease.read',
      'invoice.read',
      'invoice.create',
      'invoice.update',
      'payment.read',
      'payment.create',
      'report.read',
      'report.export',
      'notification.read',
      'document.read',
    ],
  },
  {
    code: 'role-maint',
    name: 'Maintenance Staff',
    description:
      'Handles maintenance requests assigned to them, with limited visibility elsewhere.',
    perms: [
      'property.read',
      'unit.read',
      'maintenance.read',
      'maintenance.create',
      'maintenance.assign',
      'maintenance.close',
      'notification.read',
    ],
  },
  {
    code: 'role-tenant',
    name: 'Tenant',
    description:
      'Self-service portal only — lease, invoices and maintenance requests for their own unit.',
    perms: [
      'lease.read',
      'invoice.read',
      'payment.read',
      'maintenance.read',
      'maintenance.create',
      'notification.read',
      'document.read',
    ],
  },
];

/** The role the first bootstrapped account receives. */
export const SUPER_ADMIN_CODE = 'role-super';
