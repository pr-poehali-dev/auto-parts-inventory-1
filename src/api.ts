import func2url from '../backend/func2url.json';

const PARTS_URL = func2url.parts;
const SUPPLIER_SEARCH_URL = (func2url as Record<string, string>)['supplier-search'];
const CLIENTS_URL = func2url.clients;
const ORDERS_URL = func2url.orders;
const DECODE_VIN_URL = (func2url as Record<string, string>)['decode-vin'];
const AUTH_URL = func2url.auth;

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
export const updatePart = (id: string, data: unknown) => req(`${PARTS_URL}?id=${id}`, 'PUT', data);
export const deletePart = (id: string) => req(`${PARTS_URL}?id=${id}`, 'DELETE');
export const importParts = (parts: unknown[]) => req(`${PARTS_URL}?action=import`, 'POST', { parts });

// ── CLIENTS ────────────────────────────────────────────
export const getClients = () => req(CLIENTS_URL);
export const getClient = (id: string) => req(`${CLIENTS_URL}?id=${id}`);
export const createClient = (data: unknown) => req(CLIENTS_URL, 'POST', data);
export const updateClient = (id: string, data: unknown) => req(`${CLIENTS_URL}?id=${id}`, 'PUT', data);

// ── ORDERS ─────────────────────────────────────────────
export const getOrders = (clientId?: string) =>
  req(clientId ? `${ORDERS_URL}?clientId=${clientId}` : ORDERS_URL);
export const createOrder = (data: unknown) => req(ORDERS_URL, 'POST', data);
export const updateOrder = (id: string, data: unknown) => req(`${ORDERS_URL}?id=${id}`, 'PUT', data);
export const deleteOrder = (id: string) => req(`${ORDERS_URL}?id=${id}`, 'DELETE');
export const getReturns = () => req(`${ORDERS_URL}?action=returns`);
export const createReturn = (data: unknown) => req(`${ORDERS_URL}?action=return`, 'POST', data);

// ── BALANCE ────────────────────────────────────────────
export const getBalanceHistory = (clientId: string) =>
  req(`${ORDERS_URL}?action=balance&clientId=${clientId}`);
export const changeBalance = (data: unknown) => req(`${ORDERS_URL}?action=balance`, 'POST', data);

// ── VIN DECODE ─────────────────────────────────────────
export const decodeVin = (vin: string) => req(`${DECODE_VIN_URL}?vin=${encodeURIComponent(vin)}`);

// ── AUTH ───────────────────────────────────────────────
function authReq(url: string, method = 'GET', body?: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Session-Token'] = token;
  return fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      return data;
    });
}
export const authRegister = (data: { email: string; phone: string; name: string; password: string }) =>
  authReq(`${AUTH_URL}?action=register`, 'POST', data);
export const authLogin = (data: { email: string; password: string }) =>
  authReq(`${AUTH_URL}?action=login`, 'POST', data);
export const authMe = (token: string) =>
  authReq(`${AUTH_URL}?action=me`, 'GET', undefined, token);
export const authForgot = (email: string) =>
  authReq(`${AUTH_URL}?action=forgot`, 'POST', { email });
export const authReset = (token: string, password: string) =>
  authReq(`${AUTH_URL}?action=reset`, 'POST', { token, password });
export const authLogout = (token: string) =>
  authReq(`${AUTH_URL}?action=logout`, 'POST', undefined, token);
export const authUpdate = (token: string, data: { name?: string; phone?: string; password?: string; oldPassword?: string }) =>
  authReq(`${AUTH_URL}?action=update`, 'POST', data, token);
export const getCompanySettings = () =>
  authReq(`${AUTH_URL}?action=company`, 'GET');
export const saveCompanySettings = (token: string, data: Record<string, string>) =>
  authReq(`${AUTH_URL}?action=company`, 'POST', data, token);

// ── SUPPLIER SEARCH ─────────────────────────────────────
export const checkSupplierConnection = (token: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Session-Token': token };
  return fetch(`${SUPPLIER_SEARCH_URL}?action=check`, { headers })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      return data as { connected: { name: string; ok: boolean; error?: string }[] };
    });
};
export const searchSuppliers = (article: string, token: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Session-Token': token };
  return fetch(`${SUPPLIER_SEARCH_URL}?article=${encodeURIComponent(article)}`, { headers })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      return data as { results: SupplierResult[]; connected: string[] };
    });
};
export interface SupplierResult {
  source: string;
  article: string;
  brand: string;
  name: string;
  price: number;
  quantity: number;
  delivery_days: string;
  warehouse: string;
}

// ── PAYMENT ─────────────────────────────────────────────
const PAYMENT_URL = (func2url as Record<string, string>)['payment'];
export const getSubscriptionStatus = (token: string) =>
  authReq(`${PAYMENT_URL}?action=status`, 'GET', undefined, token);
export const createPayment = (token: string, months = 1) =>
  authReq(`${PAYMENT_URL}?action=create`, 'POST', { months }, token);
export const adminExtendSubscription = (token: string, userId: string, months: number) =>
  authReq(`${PAYMENT_URL}?action=admin_extend`, 'POST', { userId, months }, token);

// ── ADMIN ───────────────────────────────────────────────
const ADMIN_URL = (func2url as Record<string, string>)['admin'];
function adminReq(url: string, method = 'GET', body?: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Session-Token'] = token;
  return fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      return data;
    });
}
export const adminGetStats = (token: string) => adminReq(`${ADMIN_URL}?action=stats`, 'GET', undefined, token);
export const adminGetUsers = (token: string) => adminReq(`${ADMIN_URL}?action=users`, 'GET', undefined, token);
export const adminToggleUser = (token: string, userId: string) => adminReq(`${ADMIN_URL}?action=toggle_user`, 'POST', { userId }, token);
export const adminGetOrders = (token: string, limit = 50) => adminReq(`${ADMIN_URL}?action=orders&limit=${limit}`, 'GET', undefined, token);
export const adminGetDbInfo = (token: string) => adminReq(`${ADMIN_URL}?action=dbinfo`, 'GET', undefined, token);
export const adminGetVisits = (token: string, period: 'day' | 'week' | 'month') =>
  adminReq(`${ADMIN_URL}?action=visits&period=${period}`, 'GET', undefined, token);
export const logVisit = (page: string, userId?: string | null) => {
  if (!ADMIN_URL) return;
  fetch(`${ADMIN_URL}?action=log_visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page, user_id: userId || null }),
  }).catch(() => {});
};

// ── FEEDBACK ────────────────────────────────────────────
const FEEDBACK_URL = (func2url as Record<string, string>)['feedback'];
function feedbackReq(url: string, method = 'GET', body?: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      return data;
    });
}
export const sendFeedback = (message: string, token?: string) =>
  feedbackReq(FEEDBACK_URL, 'POST', { message }, token);
export const adminGetFeedback = (token: string) =>
  feedbackReq(FEEDBACK_URL, 'GET', undefined, token);
export const adminReplyFeedback = (token: string, id: number, reply: string) =>
  feedbackReq(FEEDBACK_URL, 'PUT', { id, reply }, token);
export const adminMarkFeedbackRead = (token: string, id: number) =>
  feedbackReq(FEEDBACK_URL, 'PUT', { id, mark_read: true }, token);