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

export const mockParts: Part[] = [
  {
    id: '1',
    article: 'OP-641/1',
    name: 'Фильтр масляный',
    brand: 'Mann',
    category: 'Фильтры',
    quantity: 24,
    minQuantity: 5,
    price: 380,
    location: 'A1-01',
    analogs: ['W7008', 'OC217', '15400-PLM-A01'],
    oemArticle: '15400-PLM-A01',
    barcode: '4011558002602',
    lastMovement: '2026-06-05',
  },
  {
    id: '2',
    article: 'W7008',
    name: 'Фильтр масляный',
    brand: 'Mahle',
    category: 'Фильтры',
    quantity: 11,
    minQuantity: 5,
    price: 410,
    location: 'A1-02',
    analogs: ['OP-641/1', 'OC217', '15400-PLM-A01'],
    oemArticle: '15400-PLM-A01',
    barcode: '4009026024015',
    lastMovement: '2026-06-03',
  },
  {
    id: '3',
    article: 'OC217',
    name: 'Фильтр масляный',
    brand: 'Knecht',
    category: 'Фильтры',
    quantity: 0,
    minQuantity: 3,
    price: 350,
    location: 'A1-03',
    analogs: ['OP-641/1', 'W7008', '15400-PLM-A01'],
    oemArticle: '15400-PLM-A01',
    barcode: '4009026217006',
    lastMovement: '2026-05-28',
  },
  {
    id: '4',
    article: 'C2674',
    name: 'Фильтр воздушный',
    brand: 'Mann',
    category: 'Фильтры',
    quantity: 8,
    minQuantity: 3,
    price: 520,
    location: 'A2-01',
    analogs: ['LX571', 'MD620Z'],
    oemArticle: '17220-RZA-Y00',
    barcode: '4011558038105',
    lastMovement: '2026-06-01',
  },
  {
    id: '5',
    article: 'LX571',
    name: 'Фильтр воздушный',
    brand: 'Knecht',
    category: 'Фильтры',
    quantity: 3,
    minQuantity: 3,
    price: 490,
    location: 'A2-02',
    analogs: ['C2674', 'MD620Z'],
    oemArticle: '17220-RZA-Y00',
    barcode: '4009026571004',
    lastMovement: '2026-05-30',
  },
  {
    id: '6',
    article: 'MD620Z',
    name: 'Фильтр воздушный',
    brand: 'Purflux',
    category: 'Фильтры',
    quantity: 15,
    minQuantity: 3,
    price: 445,
    location: 'A2-03',
    analogs: ['C2674', 'LX571'],
    oemArticle: '17220-RZA-Y00',
    barcode: '3286064097201',
    lastMovement: '2026-06-04',
  },
  {
    id: '7',
    article: 'TRW-BF-L04',
    name: 'Колодки тормозные передние',
    brand: 'TRW',
    category: 'Тормозная система',
    quantity: 6,
    minQuantity: 2,
    price: 1850,
    location: 'B3-01',
    analogs: ['FDB1640', 'GDB1640'],
    barcode: '4057470000000',
    lastMovement: '2026-06-06',
  },
  {
    id: '8',
    article: 'FDB1640',
    name: 'Колодки тормозные передние',
    brand: 'Ferodo',
    category: 'Тормозная система',
    quantity: 4,
    minQuantity: 2,
    price: 1980,
    location: 'B3-02',
    analogs: ['TRW-BF-L04', 'GDB1640'],
    barcode: '5017927029200',
    lastMovement: '2026-06-02',
  },
  {
    id: '9',
    article: 'SKF-VKBA3450',
    name: 'Ступичный подшипник передний',
    brand: 'SKF',
    category: 'Подвеска',
    quantity: 2,
    minQuantity: 2,
    price: 4200,
    location: 'C1-05',
    analogs: ['FAG713617010B', 'SNR-R150.05'],
    barcode: '7316577100006',
    lastMovement: '2026-05-25',
  },
  {
    id: '10',
    article: 'FAG713617010B',
    name: 'Ступичный подшипник передний',
    brand: 'FAG',
    category: 'Подвеска',
    quantity: 5,
    minQuantity: 2,
    price: 3900,
    location: 'C1-06',
    analogs: ['SKF-VKBA3450', 'SNR-R150.05'],
    barcode: '4001802050453',
    lastMovement: '2026-06-03',
  },
  {
    id: '11',
    article: 'BOSCH-0451103258',
    name: 'Фильтр топливный',
    brand: 'Bosch',
    category: 'Фильтры',
    quantity: 7,
    minQuantity: 3,
    price: 680,
    location: 'A3-01',
    analogs: ['KL79', 'PP841'],
    barcode: '3165140519151',
    lastMovement: '2026-06-05',
  },
  {
    id: '12',
    article: 'NGK-BKR6E',
    name: 'Свеча зажигания',
    brand: 'NGK',
    category: 'Электрика',
    quantity: 32,
    minQuantity: 8,
    price: 220,
    location: 'D1-01',
    analogs: ['BOSCH-0242229659', 'DENSO-K16R-U'],
    barcode: '4054645530703',
    lastMovement: '2026-06-07',
  },
];

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

export const mockClients: Client[] = [
  {
    id: 'c1',
    type: 'individual',
    lastName: 'Иванов',
    firstName: 'Алексей',
    middleName: 'Сергеевич',
    phone: '+7 (905) 123-45-67',
    email: 'ivanov@mail.ru',
    city: 'Москва',
    address: 'ул. Ленина, 12, кв. 5',
    createdAt: '2026-03-15',
    totalOrders: 5,
    totalSpent: 18750,
    balance: 0,
  },
  {
    id: 'c2',
    type: 'company',
    firstName: 'Менеджер',
    companyName: 'Авто Мастер ООО',
    phone: '+7 (495) 987-65-43',
    email: 'automaster@company.ru',
    city: 'Москва',
    address: 'Промзона, корп. 7',
    createdAt: '2026-01-10',
    totalOrders: 12,
    totalSpent: 87400,
    balance: 5000,
  },
  {
    id: 'c3',
    type: 'individual',
    lastName: 'Петрова',
    firstName: 'Мария',
    phone: '+7 (916) 234-56-78',
    city: 'Подольск',
    createdAt: '2026-05-01',
    totalOrders: 2,
    totalSpent: 4200,
    balance: 0,
  },
  {
    id: 'c4',
    type: 'company',
    firstName: 'Администратор',
    companyName: 'СТО Гараж №1',
    phone: '+7 (499) 111-22-33',
    email: 'garazh@sto.ru',
    city: 'Одинцово',
    createdAt: '2026-02-20',
    totalOrders: 8,
    totalSpent: 52100,
    balance: -3600,
  },
  {
    id: 'c5',
    type: 'individual',
    lastName: 'Сидоров',
    firstName: 'Дмитрий',
    middleName: 'Александрович',
    phone: '+7 (926) 555-44-33',
    email: 'sidorov@yandex.ru',
    city: 'Москва',
    createdAt: '2026-04-18',
    totalOrders: 3,
    totalSpent: 9600,
    balance: 0,
  },
];

export const mockClientOrders: ClientOrder[] = [
  {
    id: 'o1', clientId: 'c1', date: '2026-06-05', status: 'done',
    items: [
      { article: 'OP-641/1', name: 'Фильтр масляный', brand: 'Mann', quantity: 2, price: 380 },
      { article: 'NGK-BKR6E', name: 'Свеча зажигания', brand: 'NGK', quantity: 4, price: 220 },
    ],
    total: 1640, prepaid: 1640, note: 'Замена масла',
  },
  {
    id: 'o2', clientId: 'c1', date: '2026-05-20', status: 'done',
    items: [
      { article: 'C2674', name: 'Фильтр воздушный', brand: 'Mann', quantity: 1, price: 520 },
    ],
    total: 520, prepaid: 300,
  },
  {
    id: 'o3', clientId: 'c2', date: '2026-06-07', status: 'in_progress',
    items: [
      { article: 'TRW-BF-L04', name: 'Колодки тормозные', brand: 'TRW', quantity: 4, price: 1850 },
      { article: 'FDB1640', name: 'Колодки тормозные', brand: 'Ferodo', quantity: 2, price: 1980 },
    ],
    total: 11360, prepaid: 0, note: 'Оптовый заказ',
  },
  {
    id: 'o4', clientId: 'c2', date: '2026-06-01', status: 'done',
    items: [
      { article: 'SKF-VKBA3450', name: 'Ступичный подшипник', brand: 'SKF', quantity: 2, price: 4200 },
    ],
    total: 8400, prepaid: 8400,
  },
  {
    id: 'o5', clientId: 'c4', date: '2026-06-06', status: 'new',
    items: [
      { article: 'BOSCH-0451103258', name: 'Фильтр топливный', brand: 'Bosch', quantity: 3, price: 680 },
      { article: 'C2674', name: 'Фильтр воздушный', brand: 'Mann', quantity: 3, price: 520 },
    ],
    total: 3600, prepaid: 0,
  },
  {
    id: 'o6', clientId: 'c5', date: '2026-05-25', status: 'done',
    items: [
      { article: 'FAG713617010B', name: 'Ступичный подшипник', brand: 'FAG', quantity: 1, price: 3900 },
    ],
    total: 3900, prepaid: 3900,
  },
];

export const mockMovements: Movement[] = [
  { id: '1', date: '2026-06-07', article: 'NGK-BKR6E', partName: 'Свеча зажигания', type: 'out', quantity: 8, note: 'Продажа' },
  { id: '2', date: '2026-06-06', article: 'TRW-BF-L04', partName: 'Колодки тормозные передние', type: 'in', quantity: 6, note: 'Поступление' },
  { id: '3', date: '2026-06-05', article: 'OP-641/1', partName: 'Фильтр масляный', type: 'out', quantity: 4, note: 'Продажа' },
  { id: '4', date: '2026-06-05', article: 'BOSCH-0451103258', partName: 'Фильтр топливный', type: 'in', quantity: 7, note: 'Поступление' },
  { id: '5', date: '2026-06-04', article: 'MD620Z', partName: 'Фильтр воздушный', type: 'out', quantity: 5, note: 'Продажа' },
  { id: '6', date: '2026-06-03', article: 'W7008', partName: 'Фильтр масляный', type: 'out', quantity: 3, note: 'Продажа' },
  { id: '7', date: '2026-06-03', article: 'FAG713617010B', partName: 'Ступичный подшипник', type: 'in', quantity: 5, note: 'Поступление' },
  { id: '8', date: '2026-06-02', article: 'FDB1640', partName: 'Колодки тормозные передние', type: 'out', quantity: 2, note: 'Продажа' },
  { id: '9', date: '2026-06-01', article: 'C2674', partName: 'Фильтр воздушный', type: 'in', quantity: 8, note: 'Поступление' },
  { id: '10', date: '2026-05-30', article: 'LX571', partName: 'Фильтр воздушный', type: 'out', quantity: 5, note: 'Продажа' },
  { id: '11', date: '2026-05-28', article: 'OC217', partName: 'Фильтр масляный', type: 'out', quantity: 6, note: 'Продажа' },
  { id: '12', date: '2026-05-25', article: 'SKF-VKBA3450', partName: 'Ступичный подшипник', type: 'out', quantity: 1, note: 'Продажа' },
];