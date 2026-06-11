import { Client, ClientOrder } from '@/data/mockData';

export function dbToClient(r: Record<string, unknown>): Client {
  return {
    id: r.id as string,
    type: r.type as 'individual' | 'company',
    firstName: r.firstName as string,
    lastName: (r.lastName as string) || undefined,
    middleName: (r.middleName as string) || undefined,
    companyName: (r.companyName as string) || undefined,
    phone: r.phone as string,
    email: (r.email as string) || undefined,
    city: (r.city as string) || undefined,
    address: (r.address as string) || undefined,
    note: (r.note as string) || undefined,
    balance: Number(r.balance),
    totalOrders: Number(r.totalOrders),
    totalSpent: Number(r.totalSpent),
    createdAt: (r.createdAt as string) || new Date().toISOString().slice(0, 10),
    vins: (r.vins as string[]) || [],
  };
}

export function clientName(c: Client): string {
  return c.type === 'company'
    ? c.companyName || c.firstName
    : [c.lastName, c.firstName, c.middleName].filter(Boolean).join(' ');
}

export function clientInitials(c: Client): string {
  if (c.type === 'company') return (c.companyName || 'К').slice(0, 2).toUpperCase();
  return ((c.lastName?.[0] || '') + (c.firstName?.[0] || '')).toUpperCase() || '?';
}

export function isNew(c: Client): boolean {
  const diff = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 30;
}

export function hasDebt(c: Client): boolean {
  return c.balance < 0;
}

export function hasActive(c: Client, orders: ClientOrder[]): boolean {
  return orders.some(
    (o) => o.clientId === c.id && (o.status === 'new' || o.status === 'ordered' || o.status === 'in_stock'),
  );
}
