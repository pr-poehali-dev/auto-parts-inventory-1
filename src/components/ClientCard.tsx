import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Client, ClientOrder, OrderItem, BalanceEntry, Part, StatusHistoryEntry } from '@/data/mockData';
import { getOrders, createOrder, updateOrder, getBalanceHistory, changeBalance, getParts, updateClient, getClient } from '@/api';
import VinInfo from '@/components/VinInfo';

interface Props {
  client: Client;
  onBack: () => void;
}

const STATUS_MAP: Record<string, { label: string; cls: string; icon: string }> = {
  new:       { label: 'Новый',              cls: 'text-yellow-700 bg-yellow-50',   icon: 'Clock' },
  ordered:   { label: 'Заказан',            cls: 'text-blue-600 bg-blue-50',       icon: 'ShoppingCart' },
  in_stock:  { label: 'Получен на склад',   cls: 'text-purple-600 bg-purple-50',   icon: 'PackageCheck' },
  issued:    { label: 'Выдан клиенту',      cls: 'text-emerald-600 bg-emerald-50', icon: 'HandCoins' },
  cancelled: { label: 'Отменён',            cls: 'text-muted-foreground bg-muted', icon: 'XCircle' },
};

function paymentStatus(order: ClientOrder) {
  if (order.prepaid >= order.total) return 'paid';
  if (order.prepaid > 0) return 'partial';
  return 'unpaid';
}

export default function ClientCard({ client, onBack }: Props) {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [balance, setBalance] = useState(client.balance);
  const [balanceHistory, setBalanceHistory] = useState<BalanceEntry[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { article: '', name: '', brand: '', quantity: 1, price: 0, costPrice: 0 },
  ]);
  const [orderNote, setOrderNote] = useState('');
  const [orderPrepaid, setOrderPrepaid] = useState(0);
  const [articleQuery, setArticleQuery] = useState<Record<number, string>>({});
  const [articleSuggestions, setArticleSuggestions] = useState<Record<number, Part[]>>({});

  const [showBalance, setShowBalance] = useState(false);
  const [balanceMode, setBalanceMode] = useState<'add' | 'remove'>('add');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceNote, setBalanceNote] = useState('');
  const [balanceSaved, setBalanceSaved] = useState(false);
  const [savingBalance, setSavingBalance] = useState(false);

  const [editPrepaidId, setEditPrepaidId] = useState<string | null>(null);
  const [editPrepaidVal, setEditPrepaidVal] = useState('');

  // Редактирование клиента
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    type: client.type,
    firstName: client.firstName,
    lastName: client.lastName || '',
    middleName: client.middleName || '',
    companyName: client.companyName || '',
    phone: client.phone,
    email: client.email || '',
    city: client.city || '',
    address: client.address || '',
    note: client.note || '',
  });
  const [editVins, setEditVins] = useState<string[]>(
    client.vins && client.vins.length > 0 ? client.vins : ['']
  );
  const [localClient, setLocalClient] = useState<Client>(client);

  useEffect(() => {
    Promise.all([
      getClient(client.id).then((data: unknown) => {
        const d = data as Record<string, unknown>;
        const fresh: Client = {
          ...client,
          vins: (d.vins as string[]) || [],
          balance: Number(d.balance),
          totalOrders: Number(d.totalOrders),
          totalSpent: Number(d.totalSpent),
          phone: (d.phone as string) || client.phone,
          email: (d.email as string) || client.email,
          city: (d.city as string) || client.city,
          note: (d.note as string) || client.note,
        };
        setLocalClient(fresh);
        setEditVins(fresh.vins && fresh.vins.length > 0 ? fresh.vins : ['']);
      }),
      getOrders(client.id).then((data: ClientOrder[]) => {
        const fixedOrds = data.map((o) => {
          if (!o.items?.length) return o;
          const allIssued = o.items.every((item) => item.status === 'issued');
          const allInStock = o.items.every((item) => item.status === 'in_stock' || item.status === 'issued');
          if (allIssued && o.status !== 'issued' && o.status !== 'cancelled') {
            updateOrder(o.id, { status: 'issued' });
            return { ...o, status: 'issued' };
          }
          if ((o.status === 'new' || o.status === 'ordered') && allInStock) {
            updateOrder(o.id, { status: 'in_stock' });
            return { ...o, status: 'in_stock' };
          }
          return o;
        });
        setOrders(fixedOrds);
      }),
      getBalanceHistory(client.id).then((data: BalanceEntry[]) => setBalanceHistory(data)),
      getParts().then((data: unknown[]) => setParts(data.map((r: unknown) => {
        const d = r as Record<string, unknown>;
        return {
          id: d.id as string, article: d.article as string, name: d.name as string,
          brand: (d.brand as string) || '', category: (d.category as string) || '',
          quantity: Number(d.quantity), minQuantity: Number(d.min_quantity),
          price: Number(d.price), location: (d.location as string) || '',
          analogs: (d.analogs as string[]) || [],
        } as Part;
      }))),
    ]).finally(() => setLoading(false));
  }, [client.id]);

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const vins = editVins.map((v) => v.trim().toUpperCase()).filter(Boolean);
      const updated = await updateClient(client.id, {
        type: editForm.type,
        firstName: editForm.firstName,
        lastName: editForm.lastName || null,
        middleName: editForm.middleName || null,
        companyName: editForm.companyName || null,
        phone: editForm.phone,
        email: editForm.email || null,
        city: editForm.city || null,
        address: editForm.address || null,
        note: editForm.note || null,
        vins,
      });
      setLocalClient((prev) => ({ ...prev, ...(updated as Partial<Client>), vins }));
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  };

  const clientName =
    localClient.type === 'company'
      ? localClient.companyName || localClient.firstName
      : [localClient.lastName, localClient.firstName, localClient.middleName].filter(Boolean).join(' ');

  const clientInitials =
    localClient.type === 'company'
      ? (localClient.companyName || 'К').slice(0, 2).toUpperCase()
      : ((localClient.lastName?.[0] || '') + (localClient.firstName?.[0] || '')).toUpperCase() || '?';

  const handleArticleSearch = (idx: number, val: string) => {
    setArticleQuery((q) => ({ ...q, [idx]: val }));
    // Сразу сохраняем введённый артикул в позицию заказа
    setOrderItems((items) => items.map((item, i) => i === idx ? { ...item, article: val } : item));
    if (val.length > 1) {
      const found = parts.filter(
        (p) => p.article.toLowerCase().includes(val.toLowerCase()) || p.name.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      setArticleSuggestions((s) => ({ ...s, [idx]: found }));
    } else {
      setArticleSuggestions((s) => ({ ...s, [idx]: [] }));
    }
  };

  const selectSuggestion = (idx: number, part: Part) => {
    setOrderItems((items) =>
      items.map((item, i) =>
        i === idx ? { article: part.article, name: part.name, brand: part.brand, quantity: item.quantity, price: part.price, costPrice: item.costPrice ?? 0 } : item
      )
    );
    setArticleQuery((q) => ({ ...q, [idx]: part.article }));
    setArticleSuggestions((s) => ({ ...s, [idx]: [] }));
  };

  const updateItem = (idx: number, field: keyof OrderItem, val: string | number) => {
    setOrderItems((items) => items.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const addItem = () => setOrderItems((i) => [...i, { article: '', name: '', brand: '', quantity: 1, price: 0, costPrice: 0 }]);
  const removeItem = (idx: number) => setOrderItems((i) => i.filter((_, j) => j !== idx));

  const orderTotal = orderItems.reduce((s, i) => s + i.quantity * i.price, 0);
  const orderCostTotal = orderItems.reduce((s, i) => s + i.quantity * (i.costPrice ?? 0), 0);
  const orderMargin = orderTotal - orderCostTotal;

  const openEditOrder = (order: ClientOrder) => {
    setEditingOrderId(order.id);
    setOrderItems(order.items.map(i => ({ ...i })));
    setOrderNote(order.note ?? '');
    setOrderPrepaid(order.prepaid);
    setArticleQuery({});
    setArticleSuggestions({});
  };

  const handleEditOrder = async () => {
    if (!editingOrderId) return;
    const validItems = orderItems.filter((i) => (i.article || i.name) && i.quantity > 0);
    if (!validItems.length) return;
    setSavingOrder(true);
    try {
      const updated = await updateOrder(editingOrderId, { items: validItems, note: orderNote });
      setOrders((prev) => prev.map((o) => o.id === editingOrderId ? { ...o, ...(updated as ClientOrder) } : o));
      setEditingOrderId(null);
      setOrderItems([{ article: '', name: '', brand: '', quantity: 1, price: 0, costPrice: 0 }]);
      setOrderNote('');
      setOrderPrepaid(0);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleCreateOrder = async () => {
    const validItems = orderItems.filter((i) => (i.article || i.name) && i.quantity > 0);
    if (!validItems.length) return;
    setSavingOrder(true);
    try {
      const created = await createOrder({
        clientId: client.id,
        items: validItems,
        prepaid: 0,
        note: orderNote,
        status: 'new',
      });
      setOrders((prev) => [created as ClientOrder, ...prev]);
      setShowNewOrder(false);
      setOrderItems([{ article: '', name: '', brand: '', quantity: 1, price: 0 }]);
      setOrderNote('');
      setOrderPrepaid(0);
      setArticleQuery({});
    } finally {
      setSavingOrder(false);
    }
  };

  const handleBalanceSave = async () => {
    const amt = parseFloat(balanceAmount);
    if (!amt || amt <= 0) return;
    setSavingBalance(true);
    try {
      const result = await changeBalance({ clientId: client.id, type: balanceMode, amount: amt, note: balanceNote });
      const newBalance = (result as { balance: number }).balance;
      setBalance(newBalance);
      const newHistory = await getBalanceHistory(client.id);
      setBalanceHistory(newHistory as BalanceEntry[]);

      setBalanceAmount('');
      setBalanceNote('');
      setBalanceSaved(true);
      setTimeout(() => { setBalanceSaved(false); setShowBalance(false); }, 1500);
    } finally {
      setSavingBalance(false);
    }
  };

  const handleSavePrepaid = async (orderId: string) => {
    const val = parseFloat(editPrepaidVal);
    if (isNaN(val) || val < 0) return;
    const updated = await updateOrder(orderId, { prepaid: val });
    setOrders((prev) => prev.map((o) => o.id === orderId ? updated as ClientOrder : o));
    const newHistory = await getBalanceHistory(client.id);
    setBalanceHistory(newHistory as BalanceEntry[]);
    setEditPrepaidId(null);
  };

  const [statusPopupId, setStatusPopupId] = useState<string | null>(null);

  const closeStatusPopup = useCallback(() => setStatusPopupId(null), []);
  useEffect(() => {
    if (!statusPopupId) return;
    const handler = () => closeStatusPopup();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [statusPopupId, closeStatusPopup]);

  const handleStatusChange = async (orderId: string, status: string) => {
    const updated = await updateOrder(orderId, { status });
    setOrders((prev) => prev.map((o) => o.id === orderId ? updated as ClientOrder : o));
    setStatusPopupId(null);
    if (status === 'issued') {
      const freshClient = await getClient(client.id);
      setBalance((freshClient as { balance: number }).balance);
      const newHistory = await getBalanceHistory(client.id);
      setBalanceHistory(newHistory as BalanceEntry[]);
    }
  };

  const totalSpent = orders.filter((o) => o.status === 'done').reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Icon name="ChevronLeft" size={16} />
        Все клиенты
      </button>

      {/* Карточка клиента */}
      <div className="bg-white border border-border rounded-xl p-5">
        {editing ? (
          /* ── Режим редактирования ── */
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold">Редактирование клиента</span>
              <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              {(['individual', 'company'] as const).map((t) => (
                <button key={t} onClick={() => setEditForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-1.5 rounded-md text-sm border transition-colors ${editForm.type === t ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'}`}>
                  {t === 'individual' ? 'Физлицо' : 'Организация'}
                </button>
              ))}
            </div>

            {editForm.type === 'company' && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Название организации</label>
                <input value={editForm.companyName} onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {editForm.type === 'individual' && (
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Фамилия</label>
                  <input value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              )}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Имя *</label>
                <input value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              {editForm.type === 'individual' && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Отчество</label>
                  <input value={editForm.middleName} onChange={(e) => setEditForm((f) => ({ ...f, middleName: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Телефон *</label>
              <input type="tel" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Город</label>
                <input value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Адрес</label>
              <input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Примечание</label>
              <textarea value={editForm.note} onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))} rows={2}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>

            {/* VIN-номера */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">VIN автомобиля</label>
                <button
                  type="button"
                  onClick={() => setEditVins((v) => [...v, ''])}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name="Plus" size={12} />
                  Добавить ещё
                </button>
              </div>
              <div className="space-y-2">
                {editVins.map((vin, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={vin}
                      onChange={(e) => setEditVins((v) => v.map((x, j) => j === i ? e.target.value.toUpperCase() : x))}
                      placeholder="например: XTA21099080123456"
                      maxLength={17}
                      className="flex-1 px-3 py-2 border border-border rounded-md text-sm font-mono-data uppercase focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {editVins.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setEditVins((v) => v.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-red-500 transition-colors px-2"
                      >
                        <Icon name="X" size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditing(false)}
                className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors">
                Отмена
              </button>
              <button onClick={handleSaveEdit} disabled={savingEdit || !editForm.firstName || !editForm.phone}
                className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-50 transition-colors">
                {savingEdit ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Режим просмотра ── */
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
              localClient.type === 'company' ? 'bg-yellow-100 text-yellow-800' : 'bg-muted text-foreground'
            }`}>
              {clientInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">{clientName}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  localClient.type === 'company' ? 'bg-yellow-50 text-yellow-800' : 'bg-muted text-muted-foreground'
                }`}>
                  {localClient.type === 'company' ? 'Организация' : 'Частное лицо'}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 font-mono-data"><Icon name="Phone" size={13} />{localClient.phone}</span>
                {localClient.email && <span className="flex items-center gap-1"><Icon name="Mail" size={13} />{localClient.email}</span>}
                {localClient.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={13} />{localClient.city}{localClient.address ? `, ${localClient.address}` : ''}</span>}
              </div>
              {localClient.note && <div className="mt-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 italic">{localClient.note}</div>}
              {localClient.vins && localClient.vins.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {localClient.vins.map((vin) => (
                    <VinInfo key={vin} vin={vin} />
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 transition-colors shrink-0"
            >
              <Icon name="Pencil" size={12} />
              Изменить
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-bold font-mono-data">{orders.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Заказов всего</div>
          </div>
          <div className="text-center border-x border-border">
            <div className="text-2xl font-bold font-mono-data text-emerald-600">{totalSpent.toLocaleString()} ₽</div>
            <div className="text-xs text-muted-foreground mt-0.5">Выполнено на</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono-data text-amber-600">
              {orders.filter((o) => !['done', 'cancelled'].includes(o.status)).length}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">В работе</div>
          </div>
        </div>

        {/* Баланс */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon name="Wallet" size={15} className="text-muted-foreground" />
              <span className="text-sm font-medium">Баланс клиента</span>
              <span className={`font-mono-data font-semibold text-sm ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {balance >= 0 ? '+' : ''}{balance.toLocaleString()} ₽
              </span>
              {balance > 0 && <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">переплата</span>}
              {balance < 0 && <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">задолженность</span>}
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 transition-colors"
            >
              <Icon name="ArrowLeftRight" size={12} />
              Пополнить / Снять
            </button>
          </div>

          {/* Детализация баланса */}
          {(() => {
            const activeOrders = orders.filter((o) => !['cancelled', 'issued'].includes(o.status));
            const inWork = activeOrders.reduce((sum, o) => sum + o.total, 0);
            const deposited = balanceHistory.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
            return (
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-muted/40 rounded-lg px-3 py-2">
                  <div className="text-xs text-muted-foreground mb-0.5">Внесено</div>
                  <div className="font-mono-data font-semibold text-sm text-emerald-600">{deposited.toLocaleString()} ₽</div>
                </div>
                <div className="bg-muted/40 rounded-lg px-3 py-2">
                  <div className="text-xs text-muted-foreground mb-0.5">В работе</div>
                  <div className="font-mono-data font-semibold text-sm text-amber-600">{inWork.toLocaleString()} ₽</div>
                </div>
                <div className="bg-muted/40 rounded-lg px-3 py-2">
                  <div className="text-xs text-muted-foreground mb-0.5">Задолженность</div>
                  <div className={`font-mono-data font-semibold text-sm ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {balance > 0 ? '+' : ''}{balance.toLocaleString()} ₽
                  </div>
                </div>
              </div>
            );
          })()}

          {showBalance && (
            <div className="mt-3 border border-border rounded-lg p-3 space-y-2 animate-fade-in">
              <div className="flex gap-2">
                <button onClick={() => setBalanceMode('add')}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${balanceMode === 'add' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                  + Пополнить
                </button>
                <button onClick={() => setBalanceMode('remove')}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${balanceMode === 'remove' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                  − Снять
                </button>
              </div>
              <input type="number" min={0} value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="Сумма, ₽"
                className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input type="text" value={balanceNote}
                onChange={(e) => setBalanceNote(e.target.value)}
                placeholder="Комментарий (необязательно)"
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowBalance(false)}
                  className="flex-1 py-1.5 border border-border rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Отмена
                </button>
                <button onClick={handleBalanceSave} disabled={!balanceAmount || savingBalance}
                  className="px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-40 transition-colors">
                  {balanceSaved ? <Icon name="Check" size={16} /> : savingBalance ? '...' : 'OK'}
                </button>
              </div>
            </div>
          )}

          {balanceHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <button onClick={() => setShowHistory((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
                <Icon name="History" size={13} />
                <span>История операций</span>
                <span className="ml-1 bg-muted px-1.5 py-0.5 rounded text-xs">{balanceHistory.length}</span>
                <Icon name={showHistory ? 'ChevronUp' : 'ChevronDown'} size={13} className="ml-auto" />
              </button>

              {showHistory && (
                <div className="mt-2 space-y-1 animate-fade-in">
                  {balanceHistory.map((entry) => {
                    const isCredit = entry.type === 'add' || entry.type === 'prepaid';
                    const typeLabel = { add: 'Пополнение', remove: 'Списание', prepaid: 'Предоплата', refund: 'Возврат' }[entry.type];
                    const typeIcon = { add: 'ArrowDownLeft', remove: 'ArrowUpRight', prepaid: 'CreditCard', refund: 'Undo2' }[entry.type] as 'ArrowDownLeft';
                    return (
                      <div key={entry.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            <Icon name={typeIcon} size={12} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium">{typeLabel}</div>
                            {entry.note && <div className="text-xs text-muted-foreground truncate">{entry.note}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className="text-xs text-muted-foreground">{entry.date}</span>
                          <span className={`text-sm font-mono-data font-semibold ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                            {isCredit ? '+' : '−'}{entry.amount.toLocaleString()} ₽
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* История заказов */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon name="ShoppingCart" size={15} className="text-muted-foreground" />
            <span className="text-sm font-medium">История заказов</span>
          </div>
          <button onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 transition-colors">
            <Icon name="Plus" size={13} />
            Новый заказ
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Icon name="Loader" size={20} className="mx-auto mb-2 opacity-30 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-border rounded-lg py-12 text-center text-muted-foreground">
            <Icon name="ShoppingCart" size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Заказов пока нет</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const st = STATUS_MAP[order.status];
              return (
                <div key={order.id} className="bg-white border border-border rounded-lg p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-data text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                      <span className="text-sm text-muted-foreground">{order.date}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${st?.cls || 'text-muted-foreground bg-muted'}`}>
                        <Icon name={(st?.icon || 'Clock') as 'Clock'} size={11} />
                        {st?.label || order.status}
                      </span>
                      <span className="font-semibold font-mono-data text-sm">{order.total.toLocaleString()} ₽</span>
                      <button
                        onClick={() => openEditOrder(order)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 transition-colors"
                      >
                        <Icon name="Pencil" size={11} />
                        Изменить
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono-data text-xs text-muted-foreground shrink-0">{item.article}</span>
                          <span className="truncate">{item.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{item.brand}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2 text-xs text-muted-foreground">
                          <span>{item.quantity} шт</span>
                          <span className="font-mono-data">× {item.price.toLocaleString()} ₽</span>
                        </div>
                      </div>
                    ))}
                  </div>



                  {order.note && <div className="mt-2 text-xs text-muted-foreground italic">{order.note}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Модал нового заказа */}
      {showNewOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowNewOrder(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-semibold">Новый заказ</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{clientName}</p>
              </div>
              <button onClick={() => setShowNewOrder(false)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={18} /></button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Позиции заказа</div>

              {orderItems.map((item, idx) => (
                <div key={idx} className="border-2 border-border rounded-xl overflow-hidden shadow-sm">
                  {/* Шапка позиции */}
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                    <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                      ПОЗИЦИЯ {idx + 1}
                    </span>
                    {orderItems.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-red-500 transition-colors">
                        <Icon name="Trash2" size={14} />
                      </button>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                  <div className="relative">
                    <label className="block text-xs text-muted-foreground mb-1">Артикул</label>
                    <input
                      value={articleQuery[idx] ?? item.article}
                      onChange={(e) => handleArticleSearch(idx, e.target.value)}
                      placeholder="Поиск по артикулу..."
                      className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {(articleSuggestions[idx]?.length ?? 0) > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-md shadow-lg z-10 mt-1">
                        {articleSuggestions[idx].map((p) => (
                          <div key={p.id} onClick={() => selectSuggestion(idx, p)}
                            className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-0">
                            <div>
                              <span className="font-mono-data text-xs font-medium">{p.article}</span>
                              <span className="text-xs text-muted-foreground ml-2">{p.name} · {p.brand}</span>
                            </div>
                            <span className="text-xs font-mono-data text-muted-foreground">{p.price} ₽</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Наименование</label>
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(idx, 'name', e.target.value)}
                      placeholder="Название запчасти"
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Кол-во</label>
                      <input
                        type="number" min={1}
                        value={item.quantity === 0 ? '' : item.quantity}
                        placeholder="1"
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value === '' ? 0 : +e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Закупка, ₽</label>
                      <input
                        type="number" min={0}
                        value={item.costPrice === 0 ? '' : item.costPrice}
                        placeholder="0"
                        onChange={(e) => updateItem(idx, 'costPrice', e.target.value === '' ? 0 : +e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Продажа, ₽</label>
                      <input
                        type="number" min={0}
                        value={item.price === 0 ? '' : item.price}
                        placeholder="0"
                        onChange={(e) => updateItem(idx, 'price', e.target.value === '' ? 0 : +e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  {/* Итог по позиции */}
                  {(item.quantity > 0 && (item.price > 0 || (item.costPrice ?? 0) > 0)) && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 px-2 py-1.5 rounded-md">
                      <span>Итого: <span className="font-mono-data font-medium text-foreground">{(item.quantity * item.price).toLocaleString()} ₽</span></span>
                      {(item.costPrice ?? 0) > 0 && (
                        <span>Маржа: <span className={`font-mono-data font-medium ${item.price - (item.costPrice ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {((item.price - (item.costPrice ?? 0)) * item.quantity).toLocaleString()} ₽
                        </span></span>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Ожидаемое поступление</label>
                      <input
                        type="date"
                        value={item.expectedDate ?? ''}
                        onChange={(e) => updateItem(idx, 'expectedDate', e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Примечание к позиции</label>
                      <input
                        value={item.note ?? ''}
                        onChange={(e) => updateItem(idx, 'note', e.target.value)}
                        placeholder="Доп. информация..."
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  </div>
                </div>
              ))}

              <button onClick={addItem}
                className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-1.5">
                <Icon name="Plus" size={14} />
                Добавить позицию
              </button>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Примечание к заказу</label>
                <textarea value={orderNote} onChange={(e) => setOrderNote(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>

              {orderTotal > 0 && (
                <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Сумма продажи:</span>
                    <span className="font-semibold font-mono-data">{orderTotal.toLocaleString()} ₽</span>
                  </div>
                  {orderCostTotal > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Себестоимость:</span>
                        <span className="font-mono-data text-sm text-muted-foreground">{orderCostTotal.toLocaleString()} ₽</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Маржа:</span>
                        <span className={`font-mono-data text-sm font-semibold ${orderMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {orderMargin.toLocaleString()} ₽
                          {orderTotal > 0 && <span className="text-xs font-normal ml-1">({Math.round(orderMargin / orderTotal * 100)}%)</span>}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground shrink-0">Предоплата:</label>
                    <input type="number" min={0} value={orderPrepaid || ''}
                      onChange={(e) => setOrderPrepaid(+e.target.value)}
                      placeholder="0"
                      className="flex-1 px-3 py-1.5 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
                    <span className="text-sm text-muted-foreground">₽</span>
                  </div>
                  {orderPrepaid >= orderTotal && (
                    <div className="text-xs text-emerald-600 flex items-center gap-1">
                      <Icon name="CheckCircle2" size={12} /> Полная оплата
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowNewOrder(false)}
                className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors">
                Отмена
              </button>
              <button onClick={handleCreateOrder} disabled={savingOrder || !orderItems.some((i) => (i.article || i.name) && i.quantity > 0)}
                className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-50 transition-colors">
                {savingOrder ? 'Сохранение...' : 'Создать заказ'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Модал редактирования заказа */}
      {editingOrderId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditingOrderId(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-semibold">Редактировать заказ</h3>
                <p className="text-xs text-muted-foreground mt-0.5">#{editingOrderId.slice(0, 8)} · {clientName}</p>
              </div>
              <button onClick={() => setEditingOrderId(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={18} /></button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Позиции заказа</div>

              {orderItems.map((item, idx) => (
                <div key={idx} className="border-2 border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                    <span className="text-xs font-semibold text-muted-foreground tracking-wide">ПОЗИЦИЯ {idx + 1}</span>
                    {orderItems.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-red-500 transition-colors">
                        <Icon name="Trash2" size={14} />
                      </button>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="relative">
                      <label className="block text-xs text-muted-foreground mb-1">Артикул</label>
                      <input
                        value={articleQuery[idx] ?? item.article}
                        onChange={(e) => handleArticleSearch(idx, e.target.value)}
                        placeholder="Поиск по артикулу..."
                        className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {(articleSuggestions[idx]?.length ?? 0) > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-md shadow-lg z-10 mt-1">
                          {articleSuggestions[idx].map((p) => (
                            <div key={p.id} onClick={() => selectSuggestion(idx, p)}
                              className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-0">
                              <div>
                                <span className="font-mono-data text-xs font-medium">{p.article}</span>
                                <span className="text-xs text-muted-foreground ml-2">{p.name} · {p.brand}</span>
                              </div>
                              <span className="text-xs font-mono-data text-muted-foreground">{p.price} ₽</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Наименование</label>
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        placeholder="Название запчасти"
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Кол-во</label>
                        <input type="number" min={1}
                          value={item.quantity === 0 ? '' : item.quantity}
                          placeholder="1"
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value === '' ? 0 : +e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Закупка, ₽</label>
                        <input type="number" min={0}
                          value={item.costPrice === 0 ? '' : item.costPrice}
                          placeholder="0"
                          onChange={(e) => updateItem(idx, 'costPrice', e.target.value === '' ? 0 : +e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Продажа, ₽</label>
                        <input type="number" min={0}
                          value={item.price === 0 ? '' : item.price}
                          placeholder="0"
                          onChange={(e) => updateItem(idx, 'price', e.target.value === '' ? 0 : +e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    {(item.quantity > 0 && (item.price > 0 || (item.costPrice ?? 0) > 0)) && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 px-2 py-1.5 rounded-md">
                        <span>Итого: <span className="font-mono-data font-medium text-foreground">{(item.quantity * item.price).toLocaleString()} ₽</span></span>
                        {(item.costPrice ?? 0) > 0 && (
                          <span>Маржа: <span className={`font-mono-data font-medium ${item.price - (item.costPrice ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {((item.price - (item.costPrice ?? 0)) * item.quantity).toLocaleString()} ₽
                          </span></span>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Ожидаемое поступление</label>
                        <input type="date"
                          value={item.expectedDate ?? ''}
                          onChange={(e) => updateItem(idx, 'expectedDate', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Примечание к позиции</label>
                        <input
                          value={item.note ?? ''}
                          onChange={(e) => updateItem(idx, 'note', e.target.value)}
                          placeholder="Доп. информация..."
                          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={addItem}
                className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-1.5">
                <Icon name="Plus" size={14} />
                Добавить позицию
              </button>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Примечание к заказу</label>
                <textarea value={orderNote} onChange={(e) => setOrderNote(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>

              {orderTotal > 0 && (
                <div className="border border-border rounded-lg p-3 space-y-1.5 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Итого продажа:</span>
                    <span className="font-mono-data text-sm font-semibold">{orderTotal.toLocaleString()} ₽</span>
                  </div>
                  {orderCostTotal > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Себестоимость:</span>
                        <span className="font-mono-data text-sm text-muted-foreground">{orderCostTotal.toLocaleString()} ₽</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Маржа:</span>
                        <span className={`font-mono-data text-sm font-semibold ${orderMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {orderMargin.toLocaleString()} ₽
                          {orderTotal > 0 && <span className="text-xs font-normal ml-1">({Math.round(orderMargin / orderTotal * 100)}%)</span>}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setEditingOrderId(null)}
                className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors">
                Отмена
              </button>
              <button onClick={handleEditOrder} disabled={savingOrder || !orderItems.some((i) => (i.article || i.name) && i.quantity > 0)}
                className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-50 transition-colors">
                {savingOrder ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}