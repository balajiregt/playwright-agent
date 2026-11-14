// CRM-Scale: a deterministic, dependency-free CRM used to benchmark Playwright test
// assessment and mutation verification. Each session belongs to a tenant with its own
// seeded data, so tests are isolated and can run in parallel. "Today" is fixed.
// Faults (benchmark mode only) are named switches at the exact rule sites.
import { randomUUID } from 'node:crypto';

export const TODAY = '2026-11-15';
export const ROLES = ['admin', 'manager', 'sales', 'support', 'viewer'];
export const STAGES = { prospecting: 10, qualification: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 };
export const TAX_RATE = 0.18;
export const PAGE_SIZE = 10;

export const FAULTS = [
  'lead-email-format', 'lead-duplicate', 'lead-convert-twice', 'lead-convert-no-account',
  'opp-weighted', 'opp-lost-reason', 'opp-value-negative',
  'quote-tax', 'quote-rounding', 'quote-threshold', 'quote-send-unapproved', 'quote-approve-sales',
  'invoice-number', 'invoice-overdue', 'invoice-partial', 'invoice-from-draft-quote',
  'task-sort', 'task-complete-other', 'task-due-required',
  'report-pipeline', 'report-outstanding',
  'user-last-admin', 'user-deactivated-login', 'user-duplicate-email',
  'account-unique', 'account-delete-open-invoice', 'contact-email', 'paging',
  'viewer-edit-opps', 'export-sales', 'audit-missing-delete', 'settings-manager',
  'support-delete-contacts'
];

// action -> roles allowed
export const PERMISSIONS = {
  'accounts.view': ROLES, 'accounts.create': ['admin', 'manager', 'sales'], 'accounts.edit': ['admin', 'manager', 'sales'],
  'accounts.delete': ['admin'], 'accounts.export': ['admin', 'manager'],
  'contacts.view': ROLES, 'contacts.create': ['admin', 'manager', 'sales', 'support'], 'contacts.edit': ['admin', 'manager', 'sales', 'support'],
  'contacts.delete': ['admin', 'manager'],
  'leads.view': ['admin', 'manager', 'sales'], 'leads.create': ['admin', 'sales'], 'leads.convert': ['admin', 'manager', 'sales'], 'leads.delete': ['admin'],
  'opportunities.view': ['admin', 'manager', 'sales', 'viewer'], 'opportunities.create': ['admin', 'manager', 'sales'],
  'opportunities.edit': ['admin', 'manager', 'sales'], 'opportunities.delete': ['admin', 'manager'],
  'quotes.view': ['admin', 'manager', 'sales'], 'quotes.create': ['admin', 'manager', 'sales'], 'quotes.approve': ['admin', 'manager'],
  'quotes.send': ['admin', 'manager', 'sales'],
  'invoices.view': ['admin', 'manager', 'support', 'viewer'], 'invoices.create': ['admin', 'manager'], 'invoices.send': ['admin', 'manager'],
  'invoices.pay': ['admin', 'manager'],
  'tasks.view': ROLES, 'tasks.create': ['admin', 'manager', 'sales', 'support'],
  'reports.view': ['admin', 'manager', 'viewer'],
  'users.view': ['admin'], 'users.manage': ['admin'],
  'settings.view': ['admin', 'manager'], 'settings.edit': ['admin'],
  'audit.view': ['admin']
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const round2 = n => Math.round(n * 100) / 100;

function seed() {
  const users = ROLES.map((role, i) => ({ id: `u${i + 1}`, email: `${role}@example.com`, name: role[0].toUpperCase() + role.slice(1), role, active: true }));
  users.push({ id: 'u6', email: 'sales2@example.com', name: 'Sales Two', role: 'sales', active: true });
  const accounts = [
    { id: 'a1', name: 'Northwind Traders', industry: 'Retail', owner: 'u3' },
    { id: 'a2', name: 'Contoso Ltd', industry: 'Software', owner: 'u2' },
    { id: 'a3', name: 'Fabrikam Inc', industry: 'Manufacturing', owner: 'u3' },
    ...Array.from({ length: 9 }, (_, i) => ({ id: `a${i + 4}`, name: `Synthetic Account ${String(i + 1).padStart(2, '0')}`, industry: 'Services', owner: 'u6' }))
  ];
  return {
    users, accounts,
    contacts: [
      { id: 'c1', name: 'Ada Lovelace', email: 'ada@northwind.test', accountId: 'a1' },
      { id: 'c2', name: 'Alan Turing', email: 'alan@contoso.test', accountId: 'a2' }
    ],
    leads: [
      { id: 'l1', name: 'Grace Hopper', email: 'grace@navy.test', company: 'Navy Labs', source: 'Referral', status: 'open' },
      { id: 'l2', name: 'Linus Pauling', email: 'linus@chem.test', company: '', source: 'Web', status: 'open' }
    ],
    opportunities: [
      { id: 'o1', name: 'Northwind renewal', accountId: 'a1', value: 120000, stage: 'negotiation', owner: 'u3' },
      { id: 'o2', name: 'Contoso expansion', accountId: 'a2', value: 80000, stage: 'proposal', owner: 'u2' },
      { id: 'o3', name: 'Fabrikam pilot', accountId: 'a3', value: 20000, stage: 'prospecting', owner: 'u3' },
      { id: 'o4', name: 'Northwind add-on', accountId: 'a1', value: 15000, stage: 'won', owner: 'u3', closedOn: '2026-10-20' },
      { id: 'o5', name: 'Legacy migration', accountId: 'a2', value: 50000, stage: 'lost', owner: 'u2', lostReason: 'Budget', closedOn: '2026-09-02' }
    ],
    quotes: [
      { id: 'q1', number: 'Q-1001', accountId: 'a1', opportunityId: 'o1', lines: [{ item: 'Licences', qty: 10, unitPrice: 1000 }], discountPct: 5, status: 'accepted' },
      { id: 'q2', number: 'Q-1002', accountId: 'a2', opportunityId: 'o2', lines: [{ item: 'Services', qty: 4, unitPrice: 2500 }], discountPct: 0, status: 'draft' }
    ],
    invoices: [
      { id: 'i1', number: 'INV-2026-0001', quoteId: 'q1', accountId: 'a1', total: 11210, paid: 11210, status: 'paid', issuedOn: '2026-10-01', dueOn: '2026-10-31' },
      { id: 'i2', number: 'INV-2026-0002', quoteId: 'q1', accountId: 'a1', total: 5000, paid: 0, status: 'sent', issuedOn: '2026-10-05', dueOn: '2026-11-01' }
    ],
    tasks: [
      { id: 't1', title: 'Call Northwind', dueOn: '2026-11-20', assignee: 'u3', done: false },
      { id: 't2', title: 'Send Contoso proposal', dueOn: '2026-11-10', assignee: 'u2', done: false },
      { id: 't3', title: 'Prepare QBR deck', dueOn: '2026-11-25', assignee: 'u3', done: false },
      { id: 't4', title: 'Fix billing contact', dueOn: '2026-11-12', assignee: 'u4', done: false },
      { id: 't5', title: 'Archive old leads', dueOn: '2026-11-01', assignee: 'u1', done: true }
    ],
    settings: { currency: 'USD', approvalThresholdPct: 15, fiscalYearStart: '01-01' },
    audit: [],
    seq: { invoice: 2, quote: 1002, id: 100 }
  };
}

export function quoteTotals(quote, fault) {
  const subtotal = quote.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const discount = subtotal * quote.discountPct / 100;
  const taxRate = fault === 'quote-tax' ? 0.08 : TAX_RATE;
  const raw = (subtotal - discount) * (1 + taxRate);
  const total = fault === 'quote-rounding' ? Math.floor(raw) : round2(raw);
  return { subtotal: round2(subtotal), discount: round2(discount), tax: round2((subtotal - discount) * taxRate), total };
}

export function createApi({ fault = null } = {}) {
  if (fault !== null && !FAULTS.includes(fault)) throw new Error(`Unknown benchmark fault: ${fault}`);
  const tenants = new Map();
  const sessions = new Map();
  const tenantData = name => { if (!tenants.has(name)) tenants.set(name, seed()); return tenants.get(name); };
  const can = (role, action) => {
    if (fault === 'viewer-edit-opps' && action === 'opportunities.edit' && role === 'viewer') return true;
    if (fault === 'export-sales' && action === 'accounts.export' && role === 'sales') return true;
    if (fault === 'quote-approve-sales' && action === 'quotes.approve' && role === 'sales') return true;
    if (fault === 'settings-manager' && action === 'settings.edit' && role === 'manager') return true;
    if (fault === 'support-delete-contacts' && action === 'contacts.delete' && role === 'support') return true;
    return (PERMISSIONS[action] ?? []).includes(role);
  };
  const permissionsFor = role => Object.keys(PERMISSIONS).filter(a => can(role, a));

  return async function api(req, res) {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (!url.pathname.startsWith('/api/')) return false;
    const reply = (status, body, headers = {}) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers });
      res.end(JSON.stringify(body));
      return true;
    };
    const readJson = async () => {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw new Error('too large'); }
      if (!raw) return {};
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid');
      return data;
    };
    let body = {};
    if (['POST', 'PATCH'].includes(req.method)) {
      try { body = await readJson(); } catch { return reply(400, { error: 'Invalid JSON' }); }
    }

    if (url.pathname === '/api/session' && req.method === 'POST') {
      const tenant = typeof body.tenant === 'string' && /^[\w-]{1,64}$/.test(body.tenant) ? body.tenant : 'default';
      const db = tenantData(tenant);
      const user = db.users.find(u => u.email === body.email);
      if (!user || body.password !== 'password') return reply(401, { error: 'Invalid email or password' });
      if (!user.active && fault !== 'user-deactivated-login') return reply(403, { error: 'This account is deactivated' });
      const token = randomUUID();
      sessions.set(token, { tenant, userId: user.id });
      return reply(200, { role: user.role }, { 'set-cookie': `crm-scale=${token}; HttpOnly; SameSite=Strict; Path=/` });
    }
    const token = (req.headers.cookie ?? '').split(';').map(v => v.trim()).find(v => v.startsWith('crm-scale='))?.slice(10);
    const session = sessions.get(token);
    if (url.pathname === '/api/session' && req.method === 'DELETE') {
      sessions.delete(token);
      return reply(200, { signedOut: true }, { 'set-cookie': 'crm-scale=; Max-Age=0; Path=/' });
    }
    if (!session) return reply(401, { error: 'Authentication required' });
    const db = tenantData(session.tenant);
    const me = db.users.find(u => u.id === session.userId);
    if (!me || (!me.active && fault !== 'user-deactivated-login')) return reply(401, { error: 'Authentication required' });
    const role = me.role;
    const deny = () => reply(403, { error: 'You do not have permission to do that' });
    const invalid = (errors) => reply(422, { error: 'Validation failed', errors });
    const audit = (action, entity, id) => db.audit.push({ at: `${TODAY}T09:00:00Z`, user: me.email, action, entity, id });
    const nextId = prefix => `${prefix}${++db.seq.id}`;
    const parts = url.pathname.split('/').filter(Boolean).slice(1); // after "api"
    const [resource, id, sub] = parts;
    const list = (items, q, fields) => {
      const filtered = q ? items.filter(it => fields.some(f => String(it[f] ?? '').toLowerCase().includes(q.toLowerCase()))) : items;
      const size = fault === 'paging' ? 20 : PAGE_SIZE;
      const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
      return { items: filtered.slice((page - 1) * size, page * size), total: filtered.length, page, pageSize: size };
    };

    if (resource === 'me') return reply(200, { email: me.email, name: me.name, role, permissions: permissionsFor(role), today: TODAY, settings: db.settings });

    // ---- accounts
    if (resource === 'accounts') {
      if (id === 'export') return can(role, 'accounts.export') ? reply(200, { accounts: db.accounts.map(({ id, name, industry }) => ({ id, name, industry })) }) : deny();
      if (!id && req.method === 'GET') return can(role, 'accounts.view') ? reply(200, list(db.accounts, url.searchParams.get('q'), ['name', 'industry'])) : deny();
      if (!id && req.method === 'POST') {
        if (!can(role, 'accounts.create')) return deny();
        const name = String(body.name ?? '').trim();
        if (!name) return invalid({ name: 'Account name is required' });
        const clash = fault === 'account-unique' ? db.accounts.some(a => a.name === name) : db.accounts.some(a => a.name.toLowerCase() === name.toLowerCase());
        if (clash) return invalid({ name: 'An account with this name already exists' });
        const account = { id: nextId('a'), name, industry: String(body.industry ?? ''), owner: me.id };
        db.accounts.unshift(account); audit('create', 'account', account.id);
        return reply(201, account);
      }
      const account = db.accounts.find(a => a.id === id);
      if (!account) return reply(404, { error: 'Not found' });
      if (req.method === 'GET') return can(role, 'accounts.view') ? reply(200, account) : deny();
      if (req.method === 'PATCH') {
        if (!can(role, 'accounts.edit')) return deny();
        if (body.name !== undefined && !String(body.name).trim()) return invalid({ name: 'Account name is required' });
        Object.assign(account, { name: body.name ?? account.name, industry: body.industry ?? account.industry });
        return reply(200, account);
      }
      if (req.method === 'DELETE') {
        if (!can(role, 'accounts.delete')) return deny();
        const open = db.invoices.some(i => i.accountId === id && i.status !== 'paid');
        if (open && fault !== 'account-delete-open-invoice') return reply(409, { error: 'Account has unpaid invoices and cannot be deleted' });
        db.accounts = db.accounts.filter(a => a.id !== id);
        if (fault !== 'audit-missing-delete') audit('delete', 'account', id);
        return reply(200, { deleted: id });
      }
    }

    // ---- contacts
    if (resource === 'contacts') {
      if (!id && req.method === 'GET') return can(role, 'contacts.view') ? reply(200, list(db.contacts, url.searchParams.get('q'), ['name', 'email'])) : deny();
      if (!id && req.method === 'POST') {
        if (!can(role, 'contacts.create')) return deny();
        const errors = {};
        if (!String(body.name ?? '').trim()) errors.name = 'Contact name is required';
        if (fault !== 'contact-email' && !EMAIL.test(String(body.email ?? ''))) errors.email = 'A valid email is required';
        if (Object.keys(errors).length) return invalid(errors);
        const contact = { id: nextId('c'), name: String(body.name).trim(), email: String(body.email ?? ''), accountId: body.accountId ?? null };
        db.contacts.unshift(contact); audit('create', 'contact', contact.id);
        return reply(201, contact);
      }
      const contact = db.contacts.find(c => c.id === id);
      if (!contact) return reply(404, { error: 'Not found' });
      if (req.method === 'DELETE') {
        if (!can(role, 'contacts.delete')) return deny();
        db.contacts = db.contacts.filter(c => c.id !== id);
        if (fault !== 'audit-missing-delete') audit('delete', 'contact', id);
        return reply(200, { deleted: id });
      }
    }

    // ---- leads
    if (resource === 'leads') {
      if (!id && req.method === 'GET') return can(role, 'leads.view') ? reply(200, list(db.leads, url.searchParams.get('q'), ['name', 'email', 'company'])) : deny();
      if (!id && req.method === 'POST') {
        if (!can(role, 'leads.create')) return deny();
        const errors = {};
        const email = String(body.email ?? '').trim();
        if (!String(body.name ?? '').trim()) errors.name = 'Lead name is required';
        if (!email) errors.email = 'Email is required';
        else if (fault !== 'lead-email-format' && !EMAIL.test(email)) errors.email = 'Enter a valid email address';
        else if (fault !== 'lead-duplicate' && db.leads.some(l => l.email.toLowerCase() === email.toLowerCase())) errors.email = 'A lead with this email already exists';
        if (!String(body.source ?? '').trim()) errors.source = 'Lead source is required';
        if (Object.keys(errors).length) return invalid(errors);
        const lead = { id: nextId('l'), name: String(body.name).trim(), email, company: String(body.company ?? ''), source: String(body.source), status: 'open' };
        db.leads.unshift(lead); audit('create', 'lead', lead.id);
        return reply(201, lead);
      }
      const lead = db.leads.find(l => l.id === id);
      if (!lead) return reply(404, { error: 'Not found' });
      if (sub === 'convert' && req.method === 'POST') {
        if (!can(role, 'leads.convert')) return deny();
        if (lead.status === 'converted' && fault !== 'lead-convert-twice') return reply(409, { error: 'Lead is already converted' });
        let account = null;
        if (lead.company && fault !== 'lead-convert-no-account') {
          account = db.accounts.find(a => a.name.toLowerCase() === lead.company.toLowerCase());
          if (!account) { account = { id: nextId('a'), name: lead.company, industry: '', owner: me.id }; db.accounts.unshift(account); }
        }
        const contact = { id: nextId('c'), name: lead.name, email: lead.email, accountId: account?.id ?? null };
        db.contacts.unshift(contact);
        lead.status = 'converted';
        audit('convert', 'lead', lead.id);
        return reply(200, { lead, contact, account });
      }
      if (req.method === 'DELETE') {
        if (!can(role, 'leads.delete')) return deny();
        db.leads = db.leads.filter(l => l.id !== id);
        if (fault !== 'audit-missing-delete') audit('delete', 'lead', id);
        return reply(200, { deleted: id });
      }
    }

    // ---- opportunities
    if (resource === 'opportunities') {
      const decorate = o => {
        const prob = fault === 'opp-weighted' && o.stage === 'negotiation' ? 50 : STAGES[o.stage];
        return { ...o, probability: prob, weighted: round2(o.value * prob / 100) };
      };
      if (!id && req.method === 'GET') return can(role, 'opportunities.view') ? reply(200, { ...list(db.opportunities, url.searchParams.get('q'), ['name']), items: list(db.opportunities, url.searchParams.get('q'), ['name']).items.map(decorate) }) : deny();
      if (!id && req.method === 'POST') {
        if (!can(role, 'opportunities.create')) return deny();
        const errors = {};
        const value = Number(body.value);
        if (!String(body.name ?? '').trim()) errors.name = 'Opportunity name is required';
        if (!Number.isFinite(value) || (fault === 'opp-value-negative' ? false : value <= 0)) errors.value = 'Value must be a positive number';
        if (!db.accounts.some(a => a.id === body.accountId)) errors.accountId = 'Choose an account';
        if (Object.keys(errors).length) return invalid(errors);
        const opp = { id: nextId('o'), name: String(body.name).trim(), accountId: body.accountId, value, stage: 'prospecting', owner: me.id };
        db.opportunities.unshift(opp); audit('create', 'opportunity', opp.id);
        return reply(201, decorate(opp));
      }
      const opp = db.opportunities.find(o => o.id === id);
      if (!opp) return reply(404, { error: 'Not found' });
      if (sub === 'stage' && req.method === 'POST') {
        if (!can(role, 'opportunities.edit')) return deny();
        if (!(body.stage in STAGES)) return invalid({ stage: 'Unknown stage' });
        if (body.stage === 'lost' && !String(body.lostReason ?? '').trim() && fault !== 'opp-lost-reason') return invalid({ lostReason: 'A reason is required to close as lost' });
        opp.stage = body.stage;
        if (['won', 'lost'].includes(body.stage)) { opp.closedOn = TODAY; if (body.stage === 'lost') opp.lostReason = body.lostReason ?? ''; }
        return reply(200, decorate(opp));
      }
      if (req.method === 'DELETE') {
        if (!can(role, 'opportunities.delete')) return deny();
        db.opportunities = db.opportunities.filter(o => o.id !== id);
        if (fault !== 'audit-missing-delete') audit('delete', 'opportunity', id);
        return reply(200, { deleted: id });
      }
    }

    // ---- quotes
    if (resource === 'quotes') {
      const threshold = fault === 'quote-threshold' ? 20 : db.settings.approvalThresholdPct;
      const decorate = q => ({ ...q, ...quoteTotals(q, fault), needsApproval: q.discountPct > threshold });
      if (!id && req.method === 'GET') return can(role, 'quotes.view') ? reply(200, { items: db.quotes.map(decorate), total: db.quotes.length }) : deny();
      if (!id && req.method === 'POST') {
        if (!can(role, 'quotes.create')) return deny();
        const lines = Array.isArray(body.lines) ? body.lines : [];
        const errors = {};
        if (!db.accounts.some(a => a.id === body.accountId)) errors.accountId = 'Choose an account';
        if (!lines.length || lines.some(l => !String(l.item ?? '').trim() || !(Number(l.qty) > 0) || !(Number(l.unitPrice) >= 0))) errors.lines = 'Each line needs an item, a quantity above zero and a price';
        const discountPct = Number(body.discountPct ?? 0);
        if (!(discountPct >= 0 && discountPct <= 50)) errors.discountPct = 'Discount must be between 0 and 50%';
        if (Object.keys(errors).length) return invalid(errors);
        const quote = { id: nextId('q'), number: `Q-${++db.seq.quote}`, accountId: body.accountId, opportunityId: body.opportunityId ?? null,
          lines: lines.map(l => ({ item: String(l.item), qty: Number(l.qty), unitPrice: Number(l.unitPrice) })), discountPct, status: 'draft' };
        quote.status = quote.discountPct > threshold ? 'pending-approval' : 'draft';
        db.quotes.unshift(quote); audit('create', 'quote', quote.id);
        return reply(201, decorate(quote));
      }
      const quote = db.quotes.find(q => q.id === id);
      if (!quote) return reply(404, { error: 'Not found' });
      if (req.method === 'GET' && !sub) return can(role, 'quotes.view') ? reply(200, decorate(quote)) : deny();
      if (sub === 'approve' && req.method === 'POST') {
        if (!can(role, 'quotes.approve')) return deny();
        if (quote.status !== 'pending-approval') return reply(409, { error: 'Quote does not need approval' });
        quote.status = 'draft'; quote.approvedBy = me.email;
        return reply(200, decorate(quote));
      }
      if (sub === 'send' && req.method === 'POST') {
        if (!can(role, 'quotes.send')) return deny();
        if (quote.status === 'pending-approval' && fault !== 'quote-send-unapproved') return reply(409, { error: 'Quote needs approval before it can be sent' });
        if (!['draft', 'pending-approval'].includes(quote.status)) return reply(409, { error: 'Only draft quotes can be sent' });
        quote.status = 'sent';
        return reply(200, decorate(quote));
      }
      if (sub === 'accept' && req.method === 'POST') {
        if (!can(role, 'quotes.send')) return deny();
        if (quote.status !== 'sent') return reply(409, { error: 'Only sent quotes can be accepted' });
        quote.status = 'accepted';
        return reply(200, decorate(quote));
      }
    }

    // ---- invoices
    if (resource === 'invoices') {
      const decorate = i => ({ ...i, balance: round2(i.total - i.paid), overdue: fault === 'invoice-overdue' ? false : i.status !== 'paid' && i.dueOn < TODAY });
      if (!id && req.method === 'GET') return can(role, 'invoices.view') ? reply(200, { items: db.invoices.map(decorate), total: db.invoices.length }) : deny();
      if (!id && req.method === 'POST') {
        if (!can(role, 'invoices.create')) return deny();
        const quote = db.quotes.find(q => q.id === body.quoteId);
        if (!quote) return invalid({ quoteId: 'Choose a quote' });
        if (quote.status !== 'accepted' && fault !== 'invoice-from-draft-quote') return reply(409, { error: 'Only accepted quotes can be invoiced' });
        const n = fault === 'invoice-number' ? 1 : ++db.seq.invoice;
        const invoice = { id: nextId('i'), number: `INV-2026-${String(n).padStart(4, '0')}`, quoteId: quote.id, accountId: quote.accountId,
          total: quoteTotals(quote, fault).total, paid: 0, status: 'draft', issuedOn: TODAY, dueOn: '2026-12-15' };
        db.invoices.unshift(invoice); audit('create', 'invoice', invoice.id);
        return reply(201, decorate(invoice));
      }
      const invoice = db.invoices.find(i => i.id === id);
      if (!invoice) return reply(404, { error: 'Not found' });
      if (sub === 'send' && req.method === 'POST') {
        if (!can(role, 'invoices.send')) return deny();
        if (invoice.status !== 'draft') return reply(409, { error: 'Only draft invoices can be sent' });
        invoice.status = 'sent';
        return reply(200, decorate(invoice));
      }
      if (sub === 'payments' && req.method === 'POST') {
        if (!can(role, 'invoices.pay')) return deny();
        const amount = Number(body.amount);
        if (invoice.status === 'draft') return reply(409, { error: 'Send the invoice before recording payments' });
        if (!(amount > 0) || amount > round2(invoice.total - invoice.paid)) return invalid({ amount: 'Amount must be above zero and no more than the balance' });
        invoice.paid = round2(invoice.paid + amount);
        invoice.status = fault === 'invoice-partial' || invoice.paid >= invoice.total ? 'paid' : 'partially-paid';
        return reply(200, decorate(invoice));
      }
    }

    // ---- tasks
    if (resource === 'tasks') {
      const sorted = () => [...db.tasks].sort((a, b) => fault === 'task-sort' ? b.dueOn.localeCompare(a.dueOn) : a.dueOn.localeCompare(b.dueOn))
        .map(t => ({ ...t, overdue: !t.done && t.dueOn < TODAY }));
      if (!id && req.method === 'GET') return can(role, 'tasks.view') ? reply(200, { items: sorted(), total: db.tasks.length }) : deny();
      if (!id && req.method === 'POST') {
        if (!can(role, 'tasks.create')) return deny();
        const errors = {};
        if (!String(body.title ?? '').trim()) errors.title = 'Title is required';
        if (fault !== 'task-due-required' && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.dueOn ?? ''))) errors.dueOn = 'Due date is required';
        if (Object.keys(errors).length) return invalid(errors);
        const task = { id: nextId('t'), title: String(body.title).trim(), dueOn: String(body.dueOn ?? TODAY), assignee: body.assignee ?? me.id, done: false };
        db.tasks.push(task);
        return reply(201, task);
      }
      const task = db.tasks.find(t => t.id === id);
      if (!task) return reply(404, { error: 'Not found' });
      if (sub === 'complete' && req.method === 'POST') {
        if (task.assignee !== me.id && role !== 'admin' && fault !== 'task-complete-other') return reply(403, { error: 'Only the assignee or an admin can complete this task' });
        task.done = true;
        return reply(200, task);
      }
    }

    // ---- reports
    if (resource === 'reports' && id === 'summary' && req.method === 'GET') {
      if (!can(role, 'reports.view')) return deny();
      const open = db.opportunities.filter(o => fault === 'report-pipeline' ? o.stage !== 'won' : !['won', 'lost'].includes(o.stage));
      const outstanding = db.invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (fault === 'report-outstanding' ? i.total : i.total - i.paid), 0);
      return reply(200, {
        pipelineTotal: round2(open.reduce((s, o) => s + o.value, 0)),
        weightedPipeline: round2(open.reduce((s, o) => s + o.value * STAGES[o.stage] / 100, 0)),
        wonThisQuarter: round2(db.opportunities.filter(o => o.stage === 'won' && (o.closedOn ?? '') >= '2026-10-01').reduce((s, o) => s + o.value, 0)),
        outstandingInvoices: round2(outstanding),
        overdueTasks: db.tasks.filter(t => !t.done && t.dueOn < TODAY).length
      });
    }

    // ---- users
    if (resource === 'users') {
      if (!can(role, 'users.view')) return deny();
      if (!id && req.method === 'GET') return reply(200, { items: db.users, total: db.users.length });
      if (!id && req.method === 'POST') {
        if (!can(role, 'users.manage')) return deny();
        const email = String(body.email ?? '').trim().toLowerCase();
        const errors = {};
        if (!EMAIL.test(email)) errors.email = 'A valid email is required';
        else if (fault !== 'user-duplicate-email' && db.users.some(u => u.email === email)) errors.email = 'A user with this email already exists';
        if (!ROLES.includes(body.role)) errors.role = 'Choose a role';
        if (Object.keys(errors).length) return invalid(errors);
        const user = { id: nextId('u'), email, name: email.split('@')[0], role: body.role, active: true };
        db.users.push(user); audit('invite', 'user', user.id);
        return reply(201, user);
      }
      const user = db.users.find(u => u.id === id);
      if (!user) return reply(404, { error: 'Not found' });
      if (req.method === 'PATCH') {
        if (!can(role, 'users.manage')) return deny();
        const admins = db.users.filter(u => u.role === 'admin' && u.active);
        const losesAdmin = user.role === 'admin' && ((body.role && body.role !== 'admin') || body.active === false);
        if (losesAdmin && admins.length <= 1 && fault !== 'user-last-admin') return reply(409, { error: 'The workspace must keep at least one active admin' });
        if (body.role !== undefined) { if (!ROLES.includes(body.role)) return invalid({ role: 'Choose a role' }); user.role = body.role; }
        if (body.active !== undefined) user.active = Boolean(body.active);
        audit('update', 'user', user.id);
        return reply(200, user);
      }
    }

    // ---- settings
    if (resource === 'settings') {
      if (req.method === 'GET') return can(role, 'settings.view') ? reply(200, db.settings) : deny();
      if (req.method === 'PATCH') {
        if (!can(role, 'settings.edit')) return deny();
        const pct = Number(body.approvalThresholdPct);
        if (body.approvalThresholdPct !== undefined && !(pct >= 0 && pct <= 50)) return invalid({ approvalThresholdPct: 'Threshold must be between 0 and 50%' });
        if (body.approvalThresholdPct !== undefined) db.settings.approvalThresholdPct = pct;
        if (body.currency !== undefined) { if (!['USD', 'EUR', 'INR'].includes(body.currency)) return invalid({ currency: 'Unsupported currency' }); db.settings.currency = body.currency; }
        audit('update', 'settings', 'settings');
        return reply(200, db.settings);
      }
    }

    if (resource === 'audit' && req.method === 'GET') return can(role, 'audit.view') ? reply(200, { items: [...db.audit].reverse() }) : deny();
    return reply(404, { error: 'Unknown endpoint' });
  };
}
