let counter = 0;
const unique = (prefix: string) => `${prefix} ${Date.now().toString(36)}${(++counter).toString(36)}`;

export const aLead = (over: Partial<{ name: string; email: string; company: string; source: string }> = {}) => {
  const name = unique('Lead');
  return { name, email: `${name.replace(/\s+/g, '.').toLowerCase()}@leads.test`, company: '', source: 'Web', ...over };
};
export const anAccount = (over: Partial<{ name: string; industry: string }> = {}) => ({ name: unique('Account'), industry: 'Testing', ...over });
export const aQuoteLine = (item = 'Licences', qty = 1, unitPrice = 100) => ({ item, qty, unitPrice });
