// CRM-Scale browser app (vanilla JS, no build step).
const root = document.getElementById('app');
const state = { me: null, toast: null };
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (v, currency = state.me?.settings.currency ?? 'USD') => `${currency} ${Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const can = action => state.me?.permissions.includes(action);

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { headers: { 'content-type': 'application/json' }, ...options, body: options.body ? JSON.stringify(options.body) : undefined });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

const NAV = [
  { path: '/dashboard', label: 'Dashboard', action: null },
  { path: '/accounts', label: 'Accounts', action: 'accounts.view' },
  { path: '/contacts', label: 'Contacts', action: 'contacts.view' },
  { path: '/leads', label: 'Leads', action: 'leads.view' },
  { path: '/opportunities', label: 'Opportunities', action: 'opportunities.view' },
  { path: '/quotes', label: 'Quotes', action: 'quotes.view' },
  { path: '/invoices', label: 'Invoices', action: 'invoices.view' },
  { path: '/tasks', label: 'Tasks', action: 'tasks.view' },
  { path: '/reports', label: 'Reports', action: 'reports.view' },
  { path: '/users', label: 'Users', action: 'users.view' },
  { path: '/settings', label: 'Settings', action: 'settings.view' },
  { path: '/audit', label: 'Audit log', action: 'audit.view' }
];

function shell(title, content, testId) {
  const nav = NAV.map(n => {
    const allowed = !n.action || can(n.action);
    return `<a href="${n.path}" data-link data-testid="nav-${n.label.toLowerCase().replaceAll(' ', '-')}" ${allowed ? '' : 'aria-disabled="true" class="disabled" tabindex="-1"'}>${n.label}</a>`;
  }).join('');
  const toast = state.toast ? `<p role="status" data-testid="toast" class="toast ${state.toast.kind}">${esc(state.toast.text)}</p>` : '';
  state.toast = null;
  root.innerHTML = `<header class="top"><strong>CRM-Scale</strong><span data-testid="active-user">${esc(state.me.name)} · ${esc(state.me.role)}</span>
    <button data-testid="sign-out" id="sign-out">Sign out</button></header>
    <div class="layout"><nav aria-label="Main">${nav}</nav><main data-testid="${testId}"><h1>${esc(title)}</h1>${toast}${content}</main></div>`;
  document.getElementById('sign-out').onclick = async () => { await api('/session', { method: 'DELETE' }); state.me = null; go('/login'); };
}

function denied(path) {
  shell('Permission denied', `<p data-testid="permission-denied">You do not have access to ${esc(path)}.</p>`, 'permission-denied-page');
}

function fieldErrors(errors = {}) {
  for (const [field, message] of Object.entries(errors)) {
    const input = document.querySelector(`[name="${field}"]`);
    const slot = document.querySelector(`[data-testid="error-${field}"]`);
    if (slot) { slot.textContent = message; slot.hidden = false; }
    if (input) input.setAttribute('aria-invalid', 'true');
  }
}

function formHtml(id, fields, submitLabel) {
  return `<form id="${id}" data-testid="${id}" novalidate>${fields.map(f => `
    <label for="${id}-${f.name}">${f.label}</label>${f.type === 'select'
      ? `<select id="${id}-${f.name}" name="${f.name}">${f.options.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select>`
      : `<input id="${id}-${f.name}" name="${f.name}" type="${f.type ?? 'text'}" ${f.step ? `step="${f.step}"` : ''}>`}
    <p class="field-error" data-testid="error-${f.name}" role="alert" hidden></p>`).join('')}
    <button type="submit">${submitLabel}</button></form>`;
}

const formValues = form => Object.fromEntries(new FormData(form).entries());

async function genericList(cfg, path) {
  if (!can(`${cfg.resource}.view`)) return denied(path);
  const params = new URLSearchParams(location.search);
  const q = params.get('q') ?? '', page = Number(params.get('page') ?? 1);
  const { data } = await api(`/${cfg.resource}?q=${encodeURIComponent(q)}&page=${page}`);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const rows = data.items.map(item => `<tr data-testid="row-${item.id}">${cfg.columns.map(c => `<td data-col="${c.key}">${esc(c.format ? c.format(item) : item[c.key])}</td>`).join('')}
    <td class="actions">${(cfg.actions ?? []).filter(a => a.show(item)).map(a => `<button data-action="${a.id}" data-id="${item.id}">${a.label}</button>`).join('')}</td></tr>`).join('');
  const createAllowed = can(`${cfg.resource}.create`);
  const readOnly = createAllowed ? '' : `<p data-testid="read-only-banner" class="banner">You can view ${cfg.title.toLowerCase()} but not change them.</p>`;
  shell(cfg.title, `${readOnly}
    <form class="search" id="search-form"><label>Search ${cfg.title.toLowerCase()}<input name="q" data-testid="search" value="${esc(q)}"></label><button>Search</button></form>
    ${createAllowed ? `<details data-testid="create-panel"><summary data-testid="new-${cfg.entity}">New ${cfg.entity}</summary>${formHtml('create-form', cfg.fields, `Create ${cfg.entity}`)}</details>` : ''}
    ${cfg.extra ? cfg.extra() : ''}
    <table data-testid="${cfg.resource}-table"><thead><tr>${cfg.columns.map(c => `<th>${c.label}</th>`).join('')}<th>Actions</th></tr></thead><tbody>${rows || `<tr><td colspan="9" data-testid="empty">No ${cfg.title.toLowerCase()} found.</td></tr>`}</tbody></table>
    <div class="pager"><span data-testid="page-info">Page ${data.page} of ${pages} · ${data.total} total</span>
      <button data-testid="prev-page" ${page <= 1 ? 'disabled' : ''}>Previous</button><button data-testid="next-page" ${page >= pages ? 'disabled' : ''}>Next</button></div>`, `${cfg.resource}-page`);
  const nav = p => go(`${path}?q=${encodeURIComponent(q)}&page=${p}`);
  document.querySelector('[data-testid="prev-page"]').onclick = () => nav(page - 1);
  document.querySelector('[data-testid="next-page"]').onclick = () => nav(page + 1);
  document.getElementById('search-form').onsubmit = e => { e.preventDefault(); go(`${path}?q=${encodeURIComponent(formValues(e.target).q)}&page=1`); };
  const form = document.getElementById('create-form');
  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const body = cfg.toBody ? cfg.toBody(formValues(form)) : formValues(form);
    const result = await api(`/${cfg.resource}`, { method: 'POST', body });
    if (!result.ok) return fieldErrors(result.data.errors ?? { form: result.data.error });
    state.toast = { kind: 'ok', text: `${cfg.entity[0].toUpperCase() + cfg.entity.slice(1)} created` };
    go(path);
  };
  root.querySelectorAll('[data-action]').forEach(btn => btn.onclick = async () => {
    const action = cfg.actions.find(a => a.id === btn.dataset.action);
    const result = await action.run(btn.dataset.id);
    if (result === false) return;
    state.toast = result?.ok === false ? { kind: 'error', text: result.data.error ?? 'Action failed' } : { kind: 'ok', text: action.done };
    go(path + location.search);
  });
  cfg.after?.();
}

const del = resource => id => confirm('Delete this record?') ? api(`/${resource}/${id}`, { method: 'DELETE' }) : false;

const MODULES = {
  '/accounts': { resource: 'accounts', entity: 'account', title: 'Accounts',
    columns: [{ key: 'name', label: 'Name' }, { key: 'industry', label: 'Industry' }],
    fields: [{ name: 'name', label: 'Account name' }, { name: 'industry', label: 'Industry' }],
    actions: [{ id: 'delete', label: 'Delete', done: 'Account deleted', show: () => can('accounts.delete'), run: del('accounts') }],
    extra: () => can('accounts.export') ? '<button data-testid="export-accounts" id="export">Export accounts</button>' : '<button data-testid="export-accounts" disabled aria-disabled="true">Export accounts</button>',
    after: () => { const b = document.getElementById('export'); if (b) b.onclick = async () => { const r = await api('/accounts/export'); state.toast = { kind: 'ok', text: `Exported ${r.data.accounts.length} accounts` }; go('/accounts'); }; } },
  '/contacts': { resource: 'contacts', entity: 'contact', title: 'Contacts',
    columns: [{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }],
    fields: [{ name: 'name', label: 'Contact name' }, { name: 'email', label: 'Email', type: 'email' }],
    actions: [{ id: 'delete', label: 'Delete', done: 'Contact deleted', show: () => can('contacts.delete'), run: del('contacts') }] },
  '/leads': { resource: 'leads', entity: 'lead', title: 'Leads',
    columns: [{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'company', label: 'Company' }, { key: 'source', label: 'Source' }, { key: 'status', label: 'Status' }],
    fields: [{ name: 'name', label: 'Lead name' }, { name: 'email', label: 'Email', type: 'email' }, { name: 'company', label: 'Company' },
      { name: 'source', label: 'Source', type: 'select', options: [{ value: '', label: 'Choose a source' }, ...['Web', 'Referral', 'Event', 'Partner'].map(v => ({ value: v, label: v }))] }],
    actions: [{ id: 'convert', label: 'Convert', done: 'Lead converted', show: l => can('leads.convert') && l.status === 'open', run: id => api(`/leads/${id}/convert`, { method: 'POST' }) },
      { id: 'delete', label: 'Delete', done: 'Lead deleted', show: () => can('leads.delete'), run: del('leads') }] },
  '/opportunities': { resource: 'opportunities', entity: 'opportunity', title: 'Opportunities',
    columns: [{ key: 'name', label: 'Name' }, { key: 'stage', label: 'Stage' }, { key: 'value', label: 'Value', format: o => money(o.value) },
      { key: 'probability', label: 'Probability', format: o => `${o.probability}%` }, { key: 'weighted', label: 'Weighted', format: o => money(o.weighted) }],
    fields: [{ name: 'name', label: 'Opportunity name' }, { name: 'value', label: 'Value', type: 'number', step: '0.01' },
      { name: 'accountId', label: 'Account', type: 'select', options: [{ value: '', label: 'Choose an account' }, { value: 'a1', label: 'Northwind Traders' }, { value: 'a2', label: 'Contoso Ltd' }, { value: 'a3', label: 'Fabrikam Inc' }] }],
    actions: [{ id: 'advance', label: 'Advance stage', done: 'Stage updated', show: o => can('opportunities.edit') && !['won', 'lost', 'negotiation'].includes(o.stage),
        run: async id => { const order = ['prospecting', 'qualification', 'proposal', 'negotiation']; const opp = (await api('/opportunities')).data.items.find(o => o.id === id); return api(`/opportunities/${id}/stage`, { method: 'POST', body: { stage: order[order.indexOf(opp.stage) + 1] } }); } },
      { id: 'win', label: 'Mark won', done: 'Opportunity won', show: o => can('opportunities.edit') && !['won', 'lost'].includes(o.stage), run: id => api(`/opportunities/${id}/stage`, { method: 'POST', body: { stage: 'won' } }) },
      { id: 'lose', label: 'Mark lost', done: 'Opportunity lost', show: o => can('opportunities.edit') && !['won', 'lost'].includes(o.stage),
        run: id => { const reason = prompt('Why was it lost?'); return reason === null ? false : api(`/opportunities/${id}/stage`, { method: 'POST', body: { stage: 'lost', lostReason: reason } }); } }] }
};

async function quotesPage(path) {
  if (!can('quotes.view')) return denied(path);
  const { data } = await api('/quotes');
  const rows = data.items.map(q => `<tr data-testid="row-${q.id}"><td data-col="number">${esc(q.number)}</td><td data-col="status">${esc(q.status)}</td>
    <td data-col="subtotal">${money(q.subtotal)}</td><td data-col="discount">${esc(q.discountPct)}%</td><td data-col="tax">${money(q.tax)}</td><td data-col="total">${money(q.total)}</td>
    <td class="actions">${q.status === 'pending-approval' && can('quotes.approve') ? `<button data-q="approve" data-id="${q.id}">Approve</button>` : ''}
      ${['draft', 'pending-approval'].includes(q.status) && can('quotes.send') ? `<button data-q="send" data-id="${q.id}">Send</button>` : ''}
      ${q.status === 'sent' && can('quotes.send') ? `<button data-q="accept" data-id="${q.id}">Mark accepted</button>` : ''}</td></tr>`).join('');
  const builder = can('quotes.create') ? `<details data-testid="create-panel"><summary data-testid="new-quote">New quote</summary>
    <form id="quote-form" data-testid="quote-form" novalidate>
      <label>Account<select name="accountId"><option value="">Choose an account</option><option value="a1">Northwind Traders</option><option value="a2">Contoso Ltd</option><option value="a3">Fabrikam Inc</option></select></label>
      <p class="field-error" data-testid="error-accountId" role="alert" hidden></p>
      <fieldset data-testid="quote-lines"><legend>Lines</legend>
        ${[0, 1, 2].map(i => `<div class="line"><label>Item ${i + 1}<input name="item${i}"></label><label>Quantity ${i + 1}<input name="qty${i}" type="number"></label><label>Unit price ${i + 1}<input name="price${i}" type="number" step="0.01"></label></div>`).join('')}
      </fieldset><p class="field-error" data-testid="error-lines" role="alert" hidden></p>
      <label>Discount %<input name="discountPct" type="number" value="0"></label><p class="field-error" data-testid="error-discountPct" role="alert" hidden></p>
      <button type="submit">Create quote</button></form></details>` : `<p data-testid="read-only-banner" class="banner">You can view quotes but not change them.</p>`;
  shell('Quotes', `${builder}<p data-testid="approval-threshold">Discounts above ${state.me.settings.approvalThresholdPct}% need manager approval.</p>
    <table data-testid="quotes-table"><thead><tr><th>Number</th><th>Status</th><th>Subtotal</th><th>Discount</th><th>Tax</th><th>Total</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`, 'quotes-page');
  const form = document.getElementById('quote-form');
  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const v = formValues(form);
    const lines = [0, 1, 2].filter(i => v[`item${i}`] || v[`qty${i}`] || v[`price${i}`]).map(i => ({ item: v[`item${i}`], qty: Number(v[`qty${i}`]), unitPrice: Number(v[`price${i}`]) }));
    const r = await api('/quotes', { method: 'POST', body: { accountId: v.accountId, lines, discountPct: Number(v.discountPct || 0) } });
    if (!r.ok) return fieldErrors(r.data.errors ?? {});
    state.toast = { kind: 'ok', text: r.data.status === 'pending-approval' ? `Quote ${r.data.number} needs approval` : `Quote ${r.data.number} created` };
    go('/quotes');
  };
  root.querySelectorAll('[data-q]').forEach(b => b.onclick = async () => {
    const r = await api(`/quotes/${b.dataset.id}/${b.dataset.q}`, { method: 'POST' });
    state.toast = r.ok ? { kind: 'ok', text: { approve: 'Quote approved', send: 'Quote sent', accept: 'Quote accepted' }[b.dataset.q] } : { kind: 'error', text: r.data.error };
    go('/quotes');
  });
}

async function invoicesPage(path) {
  if (!can('invoices.view')) return denied(path);
  const { data } = await api('/invoices');
  const quotes = can('invoices.create') ? (await api('/quotes')).data.items?.filter(q => q.status === 'accepted') ?? [] : [];
  const rows = data.items.map(i => `<tr data-testid="row-${i.id}" class="${i.overdue ? 'overdue' : ''}"><td data-col="number">${esc(i.number)}</td><td data-col="status">${esc(i.status)}</td>
    <td data-col="total">${money(i.total)}</td><td data-col="balance">${money(i.balance)}</td><td data-col="due">${esc(i.dueOn)}${i.overdue ? ' <span data-testid="overdue-badge" class="badge">Overdue</span>' : ''}</td>
    <td class="actions">${i.status === 'draft' && can('invoices.send') ? `<button data-i="send" data-id="${i.id}">Send</button>` : ''}
      ${['sent', 'partially-paid'].includes(i.status) && can('invoices.pay') ? `<button data-i="pay" data-id="${i.id}">Record payment</button>` : ''}</td></tr>`).join('');
  const create = can('invoices.create') ? `<form id="invoice-form" data-testid="invoice-form"><label>Accepted quote<select name="quoteId"><option value="">Choose a quote</option>${quotes.map(q => `<option value="${q.id}">${esc(q.number)}</option>`).join('')}</select></label>
    <p class="field-error" data-testid="error-quoteId" role="alert" hidden></p><button type="submit">Create invoice</button></form>` : '';
  shell('Invoices', `${create}<table data-testid="invoices-table"><thead><tr><th>Number</th><th>Status</th><th>Total</th><th>Balance</th><th>Due</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`, 'invoices-page');
  const form = document.getElementById('invoice-form');
  if (form) form.onsubmit = async e => { e.preventDefault(); const r = await api('/invoices', { method: 'POST', body: formValues(form) });
    if (!r.ok) return r.data.errors ? fieldErrors(r.data.errors) : (state.toast = { kind: 'error', text: r.data.error }, go('/invoices'));
    state.toast = { kind: 'ok', text: `Invoice ${r.data.number} created` }; go('/invoices'); };
  root.querySelectorAll('[data-i]').forEach(b => b.onclick = async () => {
    let r;
    if (b.dataset.i === 'send') r = await api(`/invoices/${b.dataset.id}/send`, { method: 'POST' });
    else { const amount = prompt('Payment amount'); if (amount === null) return; r = await api(`/invoices/${b.dataset.id}/payments`, { method: 'POST', body: { amount: Number(amount) } }); }
    state.toast = r.ok ? { kind: 'ok', text: b.dataset.i === 'send' ? 'Invoice sent' : `Payment recorded. Status: ${r.data.status}` } : { kind: 'error', text: r.data.errors?.amount ?? r.data.error };
    go('/invoices');
  });
}

async function tasksPage(path) {
  const { data } = await api('/tasks');
  const rows = data.items.map(t => `<li data-testid="task-${t.id}" class="${t.overdue ? 'overdue' : ''} ${t.done ? 'done' : ''}"><span data-col="title">${esc(t.title)}</span>
    <span data-col="due">${esc(t.dueOn)}</span>${t.overdue ? '<span data-testid="overdue-badge" class="badge">Overdue</span>' : ''}${t.done ? '<span data-testid="done-badge">Done</span>' : `<button data-t="${t.id}">Complete</button>`}</li>`).join('');
  const create = can('tasks.create') ? formHtml('task-form', [{ name: 'title', label: 'Task title' }, { name: 'dueOn', label: 'Due date', type: 'date' }], 'Add task') : '';
  shell('Tasks', `${create}<ol data-testid="task-list">${rows}</ol>`, 'tasks-page');
  const form = document.getElementById('task-form');
  if (form) form.onsubmit = async e => { e.preventDefault(); const r = await api('/tasks', { method: 'POST', body: formValues(form) }); if (!r.ok) return fieldErrors(r.data.errors); state.toast = { kind: 'ok', text: 'Task added' }; go('/tasks'); };
  root.querySelectorAll('[data-t]').forEach(b => b.onclick = async () => { const r = await api(`/tasks/${b.dataset.t}/complete`, { method: 'POST' }); state.toast = r.ok ? { kind: 'ok', text: 'Task completed' } : { kind: 'error', text: r.data.error }; go('/tasks'); });
}

async function reportsPage(path) {
  if (!can('reports.view')) return denied(path);
  const { data } = await api('/reports/summary');
  const tile = (id, label, value) => `<article data-testid="metric-${id}"><span class="label">${label}</span><strong>${value}</strong></article>`;
  shell('Reports', `<section class="tiles">${tile('pipeline-total', 'Open pipeline', money(data.pipelineTotal))}${tile('weighted-pipeline', 'Weighted pipeline', money(data.weightedPipeline))}
    ${tile('won-quarter', 'Won this quarter', money(data.wonThisQuarter))}${tile('outstanding', 'Outstanding invoices', money(data.outstandingInvoices))}${tile('overdue-tasks', 'Overdue tasks', data.overdueTasks)}</section>`, 'reports-page');
}

async function usersPage(path) {
  if (!can('users.view')) return denied(path);
  const { data } = await api('/users');
  const roles = ['admin', 'manager', 'sales', 'support', 'viewer'];
  const rows = data.items.map(u => `<tr data-testid="row-${u.id}"><td data-col="email">${esc(u.email)}</td><td data-col="role"><select data-role="${u.id}" aria-label="Role for ${esc(u.email)}">${roles.map(r => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
    <td data-col="status">${u.active ? 'Active' : 'Deactivated'}</td><td><button data-active="${u.id}" data-to="${!u.active}">${u.active ? 'Deactivate' : 'Reactivate'}</button></td></tr>`).join('');
  shell('Users', `${formHtml('invite-form', [{ name: 'email', label: 'Email', type: 'email' }, { name: 'role', label: 'Role', type: 'select', options: [{ value: '', label: 'Choose a role' }, ...roles.map(r => ({ value: r, label: r }))] }], 'Invite user')}
    <table data-testid="users-table"><thead><tr><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>`, 'users-page');
  document.getElementById('invite-form').onsubmit = async e => { e.preventDefault(); const r = await api('/users', { method: 'POST', body: formValues(e.target) }); if (!r.ok) return fieldErrors(r.data.errors); state.toast = { kind: 'ok', text: 'Invitation sent' }; go('/users'); };
  const patch = async (id, body) => { const r = await api(`/users/${id}`, { method: 'PATCH', body }); state.toast = r.ok ? { kind: 'ok', text: 'User updated' } : { kind: 'error', text: r.data.error }; go('/users'); };
  root.querySelectorAll('[data-role]').forEach(s => s.onchange = () => patch(s.dataset.role, { role: s.value }));
  root.querySelectorAll('[data-active]').forEach(b => b.onclick = () => patch(b.dataset.active, { active: b.dataset.to === 'true' }));
}

async function settingsPage(path) {
  if (!can('settings.view')) return denied(path);
  const { data } = await api('/settings');
  const editable = can('settings.edit');
  shell('Settings', `${editable ? '' : '<p data-testid="read-only-banner" class="banner">Only admins can change settings.</p>'}
    <form id="settings-form" data-testid="settings-form" novalidate><label>Approval threshold %<input name="approvalThresholdPct" type="number" value="${esc(data.approvalThresholdPct)}" ${editable ? '' : 'disabled'}></label>
    <p class="field-error" data-testid="error-approvalThresholdPct" role="alert" hidden></p>
    <label>Currency<select name="currency" ${editable ? '' : 'disabled'}>${['USD', 'EUR', 'INR'].map(c => `<option ${c === data.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <button type="submit" ${editable ? '' : 'disabled'}>Save settings</button></form>`, 'settings-page');
  document.getElementById('settings-form').onsubmit = async e => { e.preventDefault(); const v = formValues(e.target);
    const r = await api('/settings', { method: 'PATCH', body: { approvalThresholdPct: Number(v.approvalThresholdPct), currency: v.currency } });
    if (!r.ok) return fieldErrors(r.data.errors ?? {}); state.me.settings = r.data; state.toast = { kind: 'ok', text: 'Settings saved' }; go('/settings'); };
}

async function auditPage(path) {
  if (!can('audit.view')) return denied(path);
  const { data } = await api('/audit');
  shell('Audit log', `<table data-testid="audit-table"><thead><tr><th>User</th><th>Action</th><th>Entity</th><th>Id</th></tr></thead><tbody>${data.items.map(a => `<tr><td>${esc(a.user)}</td><td data-col="action">${esc(a.action)}</td><td data-col="entity">${esc(a.entity)}</td><td data-col="id">${esc(a.id)}</td></tr>`).join('')}</tbody></table>`, 'audit-page');
}

async function dashboard() {
  const tasks = (await api('/tasks')).data.items ?? [];
  shell('Dashboard', `<p data-testid="welcome">Welcome, ${esc(state.me.name)}.</p><p data-testid="today">Today is ${esc(state.me.today)}.</p>
    <p data-testid="my-overdue">${tasks.filter(t => t.overdue && t.assignee === state.me.id).length} of your tasks are overdue.</p>`, 'dashboard-page');
}

function loginPage() {
  root.innerHTML = `<main data-testid="login-page" class="login"><h1>Sign in to CRM-Scale</h1>
    <form id="login-form" novalidate><label>Email<input name="email" type="email" autocomplete="username"></label>
    <label>Password<input name="password" type="password" autocomplete="current-password"></label>
    <p data-testid="login-error" role="alert" hidden></p><button type="submit">Sign in</button></form></main>`;
  document.getElementById('login-form').onsubmit = async e => {
    e.preventDefault();
    const tenant = new URLSearchParams(location.search).get('tenant') ?? undefined;
    const r = await api('/session', { method: 'POST', body: { ...formValues(e.target), tenant } });
    if (!r.ok) { const p = document.querySelector('[data-testid="login-error"]'); p.textContent = r.data.error; p.hidden = false; return; }
    await loadMe(); go('/dashboard');
  };
}

async function loadMe() { const r = await api('/me'); state.me = r.ok ? r.data : null; return state.me; }

const ROUTES = { '/dashboard': dashboard, '/quotes': quotesPage, '/invoices': invoicesPage, '/tasks': tasksPage, '/reports': reportsPage,
  '/users': usersPage, '/settings': settingsPage, '/audit': auditPage };

async function render() {
  const path = location.pathname;
  if (path === '/login') return loginPage();
  if (!state.me && !(await loadMe())) return go('/login');
  if (MODULES[path]) return genericList(MODULES[path], path);
  if (ROUTES[path]) return ROUTES[path](path);
  return go('/dashboard');
}

function go(path) { history.pushState({}, '', path); render(); }
window.addEventListener('popstate', render);
document.addEventListener('click', e => { const a = e.target.closest('a[data-link]'); if (!a) return; e.preventDefault(); if (a.getAttribute('aria-disabled') !== 'true') go(a.getAttribute('href')); });
render();
