export interface Part {
  id: string;
  article: string;
  name: string;
  brand: string;
  category: string;
  quantity: number;
  minQuantity: number;
  price: number;
  location: string;
  analogs: string[];
  oemArticle?: string;
  barcode?: string;
  lastMovement?: string;
}

export interface Movement {
  id: string;
  date: string;
  article: string;
  partName: string;
  type: 'in' | 'out';
  quantity: number;
  note?: string;
}

export const CATEGORIES = [
  'Двигатель',
  'Трансмиссия',
  'Подвеска',
  'Тормозная система',
  'Электрика',
  'Кузов',
  'Фильтры',
  'Расходники',
];

export const mockParts: Part[] = [];

export interface BalanceEntry {
  id: string;
  date: string;
  type: 'add' | 'remove' | 'prepaid' | 'refund';
  amount: number;
  note?: string;
  orderId?: string;
}

export interface Client {
  id: string;
  type: 'individual' | 'company';
  lastName?: string;
  firstName: string;
  middleName?: string;
  companyName?: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  note?: string;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
  balance: number;
  isDeleted?: boolean;
}

export interface OrderItem {
  article: string;
  name: string;
  brand: string;
  quantity: number;
  price: number;
}

export interface ClientOrder {
  id: string;
  clientId: string;
  date: string;
  status: 'new' | 'in_progress' | 'done' | 'cancelled';
  items: OrderItem[];
  total: number;
  prepaid: number;
  note?: string;
}

export const mockClients: Client[] = [];

export const mockClientOrders: ClientOrder[] = [];

export const mockMovements: Movement[] = [];