/**
 * RBAC catalog — the single source of truth for permission keys.
 *
 * A permission is `<resource>.<action>` (e.g. `lease.create`, `invoice.read`).
 * Groups exist purely for presentation in the frontend's roles screen; keys
 * never include the group. Ported from mentos-frontend/lib/seed.ts so the two
 * sides cannot drift — see ARCHITECTURE.md §6.
 */

export interface PermAction {
  key: string;
  label: string;
}

export interface PermResource {
  key: string;
  label: string;
  icon: string;
  actions: PermAction[];
}

export interface PermGroup {
  label: string;
  resources: PermResource[];
}

export const permCatalog: PermGroup[] = [
  {
    label: 'General',
    resources: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: 'layout-dashboard',
        actions: [{ key: 'read', label: 'View dashboard & KPIs' }],
      },
    ],
  },
  {
    label: 'Property management',
    resources: [
      {
        key: 'property',
        label: 'Properties',
        icon: 'building-2',
        actions: [
          { key: 'read', label: 'View properties' },
          { key: 'create', label: 'Add properties' },
          { key: 'update', label: 'Edit property details' },
          { key: 'delete', label: 'Delete properties' },
        ],
      },
      {
        key: 'unit',
        label: 'Units',
        icon: 'door-open',
        actions: [
          { key: 'read', label: 'View units' },
          { key: 'create', label: 'Add units' },
          { key: 'update', label: 'Edit unit details' },
          { key: 'delete', label: 'Delete units' },
        ],
      },
    ],
  },
  {
    label: 'Tenancy',
    resources: [
      {
        key: 'tenant',
        label: 'Tenants',
        icon: 'users-round',
        actions: [
          { key: 'read', label: 'View tenant profiles' },
          { key: 'create', label: 'Onboard tenants' },
          { key: 'update', label: 'Edit tenant details' },
          { key: 'blacklist', label: 'Blacklist / mark vacated' },
        ],
      },
      {
        key: 'lease',
        label: 'Leases',
        icon: 'file-text',
        actions: [
          { key: 'read', label: 'View leases' },
          { key: 'create', label: 'Create leases' },
          { key: 'update', label: 'Edit lease terms' },
          { key: 'terminate', label: 'Terminate early' },
          { key: 'export', label: 'Export contract' },
        ],
      },
    ],
  },
  {
    label: 'Finance',
    resources: [
      {
        key: 'invoice',
        label: 'Invoices',
        icon: 'receipt-text',
        actions: [
          { key: 'read', label: 'View invoices' },
          { key: 'create', label: 'Issue invoices' },
          { key: 'update', label: 'Edit / void invoices' },
        ],
      },
      {
        key: 'payment',
        label: 'Payments',
        icon: 'banknote',
        actions: [
          { key: 'read', label: 'View payments' },
          { key: 'create', label: 'Record payments' },
        ],
      },
      {
        key: 'report',
        label: 'Reports',
        icon: 'chart-no-axes-column',
        actions: [
          { key: 'read', label: 'View reports' },
          { key: 'export', label: 'Export PDF / Excel' },
        ],
      },
    ],
  },
  {
    label: 'Operations',
    resources: [
      {
        key: 'maintenance',
        label: 'Maintenance',
        icon: 'wrench',
        actions: [
          { key: 'read', label: 'View requests' },
          { key: 'create', label: 'Submit requests' },
          { key: 'assign', label: 'Assign staff' },
          { key: 'close', label: 'Close with cost' },
        ],
      },
      {
        key: 'document',
        label: 'Documents',
        icon: 'folder',
        actions: [
          { key: 'read', label: 'View documents' },
          { key: 'create', label: 'Upload documents' },
          { key: 'delete', label: 'Delete documents' },
        ],
      },
    ],
  },
  {
    label: 'Communication',
    resources: [
      {
        key: 'notification',
        label: 'Notifications',
        icon: 'bell',
        actions: [
          { key: 'read', label: 'View notifications' },
          { key: 'send', label: 'Send announcements' },
          { key: 'configure', label: 'Manage preferences' },
        ],
      },
      {
        key: 'template',
        label: 'Templates',
        icon: 'mail',
        actions: [
          { key: 'read', label: 'View templates' },
          { key: 'update', label: 'Edit templates' },
        ],
      },
    ],
  },
  {
    label: 'Administration',
    resources: [
      {
        key: 'user',
        label: 'Users',
        icon: 'shield-check',
        actions: [
          { key: 'read', label: 'View users' },
          { key: 'create', label: 'Invite users' },
          { key: 'update', label: 'Suspend / reactivate' },
        ],
      },
      {
        key: 'role',
        label: 'Roles',
        icon: 'lock',
        actions: [
          { key: 'read', label: 'View roles' },
          { key: 'create', label: 'Create roles' },
          { key: 'update', label: 'Edit permissions' },
          { key: 'delete', label: 'Delete roles' },
        ],
      },
      {
        key: 'audit',
        label: 'Audit log',
        icon: 'history',
        actions: [{ key: 'read', label: 'View audit log' }],
      },
    ],
  },
];

/** Flat list of every resource across capability groups. */
export const permResources: PermResource[] = permCatalog.flatMap((g) => g.resources);

/** Every valid permission key, e.g. ["dashboard.read", "property.read", …]. */
export const allPermKeys = (): string[] =>
  permResources.flatMap((r) => r.actions.map((a) => `${r.key}.${a.key}`));

const validKeys = new Set(allPermKeys());

/** Permission keys that are not in the catalog — used to reject bad role payloads. */
export const unknownPermKeys = (keys: string[]): string[] => keys.filter((k) => !validKeys.has(k));
