// Dynamic role-based access control.
//
// PERMISSION_MODULES is the catalogue of everything that can be allowed, grouped by
// module → submodule. Roles are stored in the database (table `roles`) as a list of
// these permission keys and are created/edited by a Super Admin in Admin → Users & Roles.
// The server checks the signed-in user's permissions on every admin API call.

export const PERMISSION_MODULES = [
  {
    key: 'orders',
    label: 'Orders',
    permissions: [
      { key: 'orders.view', label: 'View orders & order details' },
      { key: 'orders.status', label: 'Change order status (process, pack, ship, deliver)' },
      { key: 'orders.cancel', label: 'Cancel orders' },
      { key: 'orders.notes', label: 'Internal notes & courier cost' },
      { key: 'orders.export', label: 'Export orders (CSV)' }
    ]
  },
  {
    key: 'payments',
    label: 'Payments',
    permissions: [
      { key: 'payments.verify', label: 'Verify / reject UPI payments' },
      { key: 'payments.refund', label: 'Issue refunds' }
    ]
  },
  {
    key: 'shipping',
    label: 'Shipping',
    permissions: [
      { key: 'shipping.book', label: 'Book / cancel shipments, labels & tracking' },
      { key: 'shipping.setup', label: 'Shipping setup (pickup locations, connection test)' }
    ]
  },
  {
    key: 'customers',
    label: 'Customers',
    permissions: [
      { key: 'customers.view', label: 'View customer directory' },
      { key: 'customers.export', label: 'Export customers (CSV)' }
    ]
  },
  {
    key: 'catalog',
    label: 'Products & Catalogue',
    permissions: [
      { key: 'products.view', label: 'View products' },
      { key: 'products.create', label: 'Add products & upload photos' },
      { key: 'products.edit', label: 'Edit products (name, price, photos, details)' },
      { key: 'products.delete', label: 'Delete / archive products' },
      { key: 'products.stock', label: 'Update stock quantities' },
      { key: 'products.cost', label: 'See & edit cost prices (margins)' },
      { key: 'categories.manage', label: 'Manage categories' }
    ]
  },
  {
    key: 'marketing',
    label: 'Coupons & Reviews',
    permissions: [
      { key: 'coupons.view', label: 'View coupons' },
      { key: 'coupons.manage', label: 'Create / pause / delete coupons' },
      { key: 'reviews.view', label: 'View customer reviews' },
      { key: 'reviews.moderate', label: 'Approve / hide / delete reviews' }
    ]
  },
  {
    key: 'reports',
    label: 'Reports',
    permissions: [{ key: 'reports.sales', label: 'Sales & profit reports' }]
  },
  {
    key: 'settings',
    label: 'Store Settings',
    permissions: [
      { key: 'settings.store', label: 'Store profile (name, contact, banner text)' },
      { key: 'settings.pickup', label: 'Pickup address, GST & PAN' },
      { key: 'settings.payments', label: 'Payment methods, shipping & COD charges' },
      { key: 'settings.seo', label: 'SEO, analytics & policies' }
    ]
  },
  {
    key: 'admin',
    label: 'Administration',
    permissions: [
      { key: 'integrations.manage', label: 'Integrations (Shiprocket, Delhivery, Razorpay, e-mail logins)' },
      { key: 'users.view', label: 'View admin users' },
      { key: 'users.manage', label: 'Add / edit / deactivate admin users' },
      { key: 'roles.manage', label: 'Create & edit roles' },
      { key: 'audit.view', label: 'Audit log' }
    ]
  }
] as const;

export type Permission = (typeof PERMISSION_MODULES)[number]['permissions'][number]['key'];
export const ALL_PERMISSIONS: Permission[] = PERMISSION_MODULES.flatMap((m) => m.permissions.map((p) => p.key));
export const isPermission = (k: string): k is Permission => (ALL_PERMISSIONS as string[]).includes(k);

/** The built-in, non-editable full-access role. */
export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

/** Presets created on install (all except Super Admin can be edited or deleted). */
export const PRESET_ROLES: { key: string; name: string; description: string; permissions: Permission[] }[] = [
  {
    key: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Full access to everything. Cannot be edited or deleted.',
    permissions: ALL_PERMISSIONS
  },
  {
    key: 'MANAGER',
    name: 'Store Manager',
    description: 'Runs the store: orders, payments, refunds, shipping, products, coupons, reviews, reports and store settings.',
    permissions: ALL_PERMISSIONS.filter((p) => !['integrations.manage', 'users.view', 'users.manage', 'roles.manage', 'audit.view'].includes(p))
  },
  {
    key: 'STAFF',
    name: 'Dispatch Staff',
    description: 'Packs and ships: sees orders and customers, updates order status, books couriers.',
    permissions: ['orders.view', 'orders.status', 'orders.notes', 'shipping.book', 'customers.view', 'products.view']
  },
  {
    key: 'VIEWER',
    name: 'Viewer / Accountant',
    description: 'Read-only: orders, customers, products with cost prices, coupons, reviews and sales reports.',
    permissions: ['orders.view', 'orders.export', 'customers.view', 'products.view', 'products.cost', 'coupons.view', 'reviews.view', 'reports.sales']
  }
];

export interface Role {
  id: string;
  key: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  userCount: number;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  /** role key, e.g. SUPER_ADMIN, MANAGER or a custom role key */
  role: string;
  roleName: string;
  permissions: Permission[];
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export function hasPermission(user: Pick<AdminUser, 'permissions'>, p: Permission): boolean {
  return user.permissions.includes(p);
}
