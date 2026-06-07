import func2url from '../backend/func2url.json';

const PARTS_URL = func2url.parts;
const CLIENTS_URL = func2url.clients;
const ORDERS_URL = func2url.orders;

async function req(url: string, method = 'GET', body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── PARTS ──────────────────────────────────────────────
export const getParts = () => req(PARTS_URL);
export const createPart = (data: unknown) => req(PARTS_URL, 'POST', data);
export const updatePart = (id: string, data: unknown) => req(`${PARTS_URL}/${id}`, 'PUT', data);
export const deletePart = (id: string) => req(`${PARTS_URL}/${id}`, 'DELETE');
export const importParts = (parts: unknown[]) => req(`${PARTS_URL}/import`, 'POST', { parts });

// ── CLIENTS ────────────────────────────────────────────
export const getClients = () => req(CLIENTS_URL);
export const createClient = (data: unknown) => req(CLIENTS_URL, 'POST', data);
export const updateClient = (id: string, data: unknown) => req(`${CLIENTS_URL}/${id}`, 'PUT', data);

// ── ORDERS ─────────────────────────────────────────────
export const getOrders = (clientId?: string) =>
  req(clientId ? `${ORDERS_URL}?clientId=${clientId}` : ORDERS_URL);
export const createOrder = (data: unknown) => req(ORDERS_URL, 'POST', data);
export const updateOrder = (id: string, data: unknown) => req(`${ORDERS_URL}/${id}`, 'PUT', data);

// ── BALANCE ────────────────────────────────────────────
export const getBalanceHistory = (clientId: string) =>
  req(`${ORDERS_URL}/balance?clientId=${clientId}`);
export const changeBalance = (data: unknown) => req(`${ORDERS_URL}/balance`, 'POST', data);
