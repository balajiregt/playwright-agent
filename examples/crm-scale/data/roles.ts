export const ROLES = ['admin', 'manager', 'sales', 'support', 'viewer'] as const;
export type Role = typeof ROLES[number];

export const NAV_SECTIONS = ['Accounts', 'Contacts', 'Leads', 'Opportunities', 'Quotes', 'Invoices', 'Tasks', 'Reports', 'Users', 'Settings', 'Audit log'] as const;
export type NavSection = typeof NAV_SECTIONS[number];

/** Which navigation sections each role may open (CRM-SCALE-REQ NAV-*). */
export const NAV_ACCESS: Record<Role, NavSection[]> = {
  admin: [...NAV_SECTIONS],
  manager: ['Accounts', 'Contacts', 'Leads', 'Opportunities', 'Quotes', 'Invoices', 'Tasks', 'Reports', 'Settings'],
  sales: ['Accounts', 'Contacts', 'Leads', 'Opportunities', 'Quotes', 'Tasks'],
  support: ['Accounts', 'Contacts', 'Invoices', 'Tasks'],
  viewer: ['Accounts', 'Contacts', 'Opportunities', 'Invoices', 'Tasks', 'Reports']
};

export const PATH_FOR: Record<NavSection, string> = {
  Accounts: '/accounts', Contacts: '/contacts', Leads: '/leads', Opportunities: '/opportunities', Quotes: '/quotes', Invoices: '/invoices',
  Tasks: '/tasks', Reports: '/reports', Users: '/users', Settings: '/settings', 'Audit log': '/audit'
};

/** API permission matrix: [method, path, body?] probes and the roles allowed (CRM-SCALE-REQ PERM-*). */
export type Probe = { id: string; method: 'GET' | 'POST' | 'PATCH'; path: string; body?: Record<string, unknown>; allowed: Role[]; okStatus?: number };
export const API_PROBES: Probe[] = [
  { id: 'export-accounts', method: 'GET', path: '/api/accounts/export', allowed: ['admin', 'manager'] },
  { id: 'list-leads', method: 'GET', path: '/api/leads', allowed: ['admin', 'manager', 'sales'] },
  { id: 'create-lead', method: 'POST', path: '/api/leads', body: { name: 'Probe Lead', email: 'probe@lead.test', source: 'Web' }, allowed: ['admin', 'sales'], okStatus: 201 },
  { id: 'list-quotes', method: 'GET', path: '/api/quotes', allowed: ['admin', 'manager', 'sales'] },
  { id: 'list-invoices', method: 'GET', path: '/api/invoices', allowed: ['admin', 'manager', 'support', 'viewer'] },
  { id: 'reports', method: 'GET', path: '/api/reports/summary', allowed: ['admin', 'manager', 'viewer'] },
  { id: 'list-users', method: 'GET', path: '/api/users', allowed: ['admin'] },
  { id: 'edit-settings', method: 'PATCH', path: '/api/settings', body: { currency: 'USD' }, allowed: ['admin'] },
  { id: 'audit', method: 'GET', path: '/api/audit', allowed: ['admin'] },
  { id: 'create-opportunity', method: 'POST', path: '/api/opportunities', body: { name: 'Probe deal', value: 100, accountId: 'a1' }, allowed: ['admin', 'manager', 'sales'], okStatus: 201 }
];
