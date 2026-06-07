import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Client, ClientOrder, OrderItem, BalanceEntry, Part } from '@/data/mockData';
import { getOrders, createOrder, updateOrder, getBalanceHistory, changeBalance, getParts, updateClient, getClient } from '@/api';
import VinInfo from '@/components/VinInfo';

interface Props {
  client: Client;
  onBack: () => void;
}

const STATUS_MAP = {
  new: { label: 'Новый', cls: 'text-yellow-700 bg-yellow-50' },
  in_progress: { label: 'В работе', cls: 'text-amber-600 bg-amber-50' },
  done: { label: 'Выполнен', cls: 'text-emerald-600 bg-emerald-50' },
  cancelled: { label: 'Отменён', cls: 'text-muted-foreground bg-muted' },
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
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { article: '', name: '', brand: '', quantity: 1, price: 0 },
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
      getOrders(client.id).then((data: ClientOrder[]) => setOrders(data)),
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
        i === idx ? { article: part.article, name: part.name, brand: part.brand, quantity: item.quantity, price: part.price } : item
      )
    );
    setArticleQuery((q) => ({ ...q, [idx]: part.article }));
    setArticleSuggestions((s) => ({ ...s, [idx]: [] }));
  };

  const updateItem = (idx: number, field: keyof OrderItem, val: string | number) => {
    setOrderItems((items) => items.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const addItem = () => setOrderItems((i) => [...i, { article: '', name: '', brand: '', quantity: 1, price: 0 }]);
  const removeItem = (idx: number) => setOrderItems((i) => i.filter((_, j) => j !== idx));

  const orderTotal = orderItems.reduce((s, i) => s + i.quantity * i.price, 0);

  const handleCreateOrder = async () => {
    const validItems = orderItems.filter((i) => i.article && i.quantity > 0);
    if (!validItems.length) return;
    setSavingOrder(true);
    try {
      const created = await createOrder({
        clientId: client.id,
        items: validItems,
        prepaid: orderPrepaid,
        note: orderNote,
        status: 'new',
      });
      setOrders((prev) => [created as ClientOrder, ...prev]);
      setShowNewOrder(false);
      setOrderItems([{ article: '', name: '', brand: '', quantity: 1, price: 0 }]);
      setOrderNote('');
      setOrderPrepaid(0);
      setArticleQuery({});
      if (orderPrepaid > 0) {
        setBalance((b) => b - orderPrepaid);
        const newHistory = await getBalanceHistory(client.id);
        setBalanceHistory(newHistory as BalanceEntry[]);
      }
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
      setBalance((result as { balance: number }).balance);
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

  const handleStatusChange = async (orderId: string, status: ClientOrder['status']) => {
    const updated = await updateOrder(orderId, { status });
    setOrders((prev) => prev.map((o) => o.id === orderId ? updated as ClientOrder : o));
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
              {orders.filter((o) => o.status === 'new' || o.status === 'in_progress').length}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">В работе</div>
          </div>
        </div>

        {/* Баланс */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
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
              const ps = paymentStatus(order);
              const debt = order.total - order.prepaid;
              return (
                <div key={order.id} className="bg-white border border-border rounded-lg p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-data text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                      <span className="text-sm text-muted-foreground">{order.date}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {ps === 'paid' && <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><Icon name="CheckCircle2" size={12} /> Оплачен</span>}
                      {ps === 'partial' && <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Icon name="AlertCircle" size={12} /> Частично</span>}
                      {ps === 'unpaid' && <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><Icon name="AlertTriangle" size={12} /> Не оплачен</span>}
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as ClientOrder['status'])}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none ${st.cls}`}
                      >
                        {Object.entries(STATUS_MAP).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                      <span className="font-semibold font-mono-data text-sm">{order.total.toLocaleString()} ₽</span>
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

                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">Предоплата:</span>
                        {editPrepaidId === order.id ? (
                          <div className="flex items-center gap-1.5">
                            <input type="number" min={0} value={editPrepaidVal}
                              onChange={(e) => setEditPrepaidVal(e.target.value)} autoFocus
                              className="w-28 px-2 py-1 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <button onClick={() => handleSavePrepaid(order.id)} className="p-1 text-emerald-600 hover:text-emerald-700">
                              <Icon name="Check" size={14} />
                            </button>
                            <button onClick={() => setEditPrepaidId(null)} className="p-1 text-muted-foreground hover:text-foreground">
                              <Icon name="X" size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditPrepaidId(order.id); setEditPrepaidVal(String(order.prepaid)); }}
                            className="flex items-center gap-1 font-mono-data font-medium hover:text-foreground transition-colors group"
                          >
                            <span className={ps === 'paid' ? 'text-emerald-600' : ps === 'partial' ? 'text-amber-600' : 'text-red-500'}>
                              {order.prepaid.toLocaleString()} ₽
                            </span>
                            <Icon name="Pencil" size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </div>
                      {ps !== 'paid' && <span className="text-xs text-red-500 font-mono-data">долг: {debt.toLocaleString()} ₽</span>}
                    </div>
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
                <div key={idx} className="border border-border rounded-lg p-3 space-y-2 relative">
                  {orderItems.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 transition-colors">
                      <Icon name="Trash2" size={13} />
                    </button>
                  )}
                  <div className="relative">
                    <label className="block text-xs text-muted-foreground mb-1">Артикул / Наименование</label>
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
                  {item.name && (
                    <div className="text-xs text-muted-foreground bg-muted/40 px-2 py-1 rounded">{item.name} · {item.brand}</div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Количество</label>
                      <input type="number" min={1} value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', +e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Цена, ₽</label>
                      <input type="number" min={0} value={item.price}
                        onChange={(e) => updateItem(idx, 'price', +e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
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
                    <span className="text-sm text-muted-foreground">Итого:</span>
                    <span className="font-semibold font-mono-data">{orderTotal.toLocaleString()} ₽</span>
                  </div>
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
              <button onClick={handleCreateOrder} disabled={savingOrder || !orderItems.some((i) => i.article && i.quantity > 0)}
                className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-50 transition-colors">
                {savingOrder ? 'Сохранение...' : 'Создать заказ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}