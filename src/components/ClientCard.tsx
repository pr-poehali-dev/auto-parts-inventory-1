import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Client, ClientOrder, OrderItem, BalanceEntry, mockClientOrders, mockParts } from '@/data/mockData';

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
  const [orders, setOrders] = useState<ClientOrder[]>(
    mockClientOrders.filter((o) => o.clientId === client.id)
  );
  const [balance, setBalance] = useState(client.balance);
  const [balanceHistory, setBalanceHistory] = useState<BalanceEntry[]>(() => {
    const entries: BalanceEntry[] = [];
    mockClientOrders
      .filter((o) => o.clientId === client.id && o.prepaid > 0)
      .forEach((o) => {
        entries.push({
          id: 'p' + o.id,
          date: o.date,
          type: 'prepaid',
          amount: o.prepaid,
          note: `Предоплата по заказу #${o.id}`,
          orderId: o.id,
        });
      });
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  });
  const [showHistory, setShowHistory] = useState(false);

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { article: '', name: '', brand: '', quantity: 1, price: 0 },
  ]);
  const [orderNote, setOrderNote] = useState('');
  const [orderPrepaid, setOrderPrepaid] = useState(0);
  const [articleQuery, setArticleQuery] = useState<Record<number, string>>({});
  const [articleSuggestions, setArticleSuggestions] = useState<Record<number, typeof mockParts>>({});

  const [showBalance, setShowBalance] = useState(false);
  const [balanceMode, setBalanceMode] = useState<'add' | 'remove'>('add');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceNote, setBalanceNote] = useState('');
  const [balanceSaved, setBalanceSaved] = useState(false);

  const [editPrepaidId, setEditPrepaidId] = useState<string | null>(null);
  const [editPrepaidVal, setEditPrepaidVal] = useState('');

  const clientName =
    client.type === 'company'
      ? client.companyName || client.firstName
      : [client.lastName, client.firstName, client.middleName].filter(Boolean).join(' ');

  const clientInitials =
    client.type === 'company'
      ? (client.companyName || 'К').slice(0, 2).toUpperCase()
      : ((client.lastName?.[0] || '') + (client.firstName?.[0] || '')).toUpperCase() || '?';

  const handleArticleSearch = (idx: number, val: string) => {
    setArticleQuery((q) => ({ ...q, [idx]: val }));
    if (val.length > 1) {
      const found = mockParts.filter(
        (p) => p.article.toLowerCase().includes(val.toLowerCase()) || p.name.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      setArticleSuggestions((s) => ({ ...s, [idx]: found }));
    } else {
      setArticleSuggestions((s) => ({ ...s, [idx]: [] }));
    }
  };

  const selectSuggestion = (idx: number, part: typeof mockParts[0]) => {
    setOrderItems((items) =>
      items.map((item, i) =>
        i === idx
          ? { article: part.article, name: part.name, brand: part.brand, quantity: item.quantity, price: part.price }
          : item
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

  const handleCreateOrder = () => {
    const validItems = orderItems.filter((i) => i.article && i.quantity > 0);
    if (!validItems.length) return;
    const total = validItems.reduce((s, i) => s + i.quantity * i.price, 0);
    const paid = Math.min(orderPrepaid, total);
    let newBalance = balance;
    if (orderPrepaid > total) {
      newBalance = balance + (orderPrepaid - total);
      setBalance(newBalance);
    }
    const order: ClientOrder = {
      id: 'o' + Date.now(),
      clientId: client.id,
      date: new Date().toISOString().slice(0, 10),
      status: 'new',
      items: validItems,
      total,
      prepaid: paid,
      note: orderNote,
    };
    setOrders((prev) => [order, ...prev]);
    setShowNewOrder(false);
    setOrderItems([{ article: '', name: '', brand: '', quantity: 1, price: 0 }]);
    setOrderNote('');
    setOrderPrepaid(0);
    setArticleQuery({});
  };

  const handleBalanceSave = () => {
    const amt = parseFloat(balanceAmount);
    if (!amt || amt <= 0) return;
    setBalance((b) => balanceMode === 'add' ? b + amt : Math.max(0, b - amt));
    const entry: BalanceEntry = {
      id: 'b' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      type: balanceMode,
      amount: amt,
      note: balanceNote || undefined,
    };
    setBalanceHistory((h) => [entry, ...h]);
    setBalanceAmount('');
    setBalanceNote('');
    setBalanceSaved(true);
    setTimeout(() => { setBalanceSaved(false); setShowBalance(false); }, 1500);
  };

  const handleSavePrepaid = (orderId: string) => {
    const val = parseFloat(editPrepaidVal);
    if (isNaN(val) || val < 0) return;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const paid = Math.min(val, o.total);
        const extra = val - o.total;
        if (extra > 0) setBalance((b) => b + extra);
        const entry: BalanceEntry = {
          id: 'p' + Date.now(),
          date: new Date().toISOString().slice(0, 10),
          type: 'prepaid',
          amount: paid,
          note: `Предоплата по заказу #${orderId}`,
          orderId,
        };
        setBalanceHistory((h) => [entry, ...h]);
        return { ...o, prepaid: paid };
      })
    );
    setEditPrepaidId(null);
  };

  const totalSpent = orders.filter((o) => o.status === 'done').reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Icon name="ChevronLeft" size={16} />
        Все клиенты
      </button>

      {/* Карточка клиента */}
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
            client.type === 'company' ? 'bg-yellow-100 text-yellow-800' : 'bg-muted text-foreground'
          }`}>
            {clientInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{clientName}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                client.type === 'company' ? 'bg-yellow-50 text-yellow-800' : 'bg-muted text-muted-foreground'
              }`}>
                {client.type === 'company' ? 'Организация' : 'Частное лицо'}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 font-mono-data">
                <Icon name="Phone" size={13} />{client.phone}
              </span>
              {client.email && (
                <span className="flex items-center gap-1">
                  <Icon name="Mail" size={13} />{client.email}
                </span>
              )}
              {client.city && (
                <span className="flex items-center gap-1">
                  <Icon name="MapPin" size={13} />{client.city}{client.address ? `, ${client.address}` : ''}
                </span>
              )}
            </div>
            {client.note && (
              <div className="mt-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 italic">{client.note}</div>
            )}
          </div>
        </div>

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

        {/* Блок баланса */}
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
                <button
                  onClick={() => setBalanceMode('add')}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${balanceMode === 'add' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  + Пополнить
                </button>
                <button
                  onClick={() => setBalanceMode('remove')}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${balanceMode === 'remove' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  − Снять
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="Сумма, ₽"
                  className="w-32 px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="text"
                  value={balanceNote}
                  onChange={(e) => setBalanceNote(e.target.value)}
                  placeholder="Комментарий..."
                  className="flex-1 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleBalanceSave}
                  disabled={!balanceAmount || parseFloat(balanceAmount) <= 0}
                  className="px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-40 transition-colors"
                >
                  {balanceSaved ? <Icon name="Check" size={16} /> : 'OK'}
                </button>
              </div>
            </div>
          )}

          {/* История операций */}
          {balanceHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                <Icon name="History" size={13} />
                <span>История операций</span>
                <span className="ml-1 bg-muted px-1.5 py-0.5 rounded text-xs">{balanceHistory.length}</span>
                <Icon name={showHistory ? 'ChevronUp' : 'ChevronDown'} size={13} className="ml-auto" />
              </button>

              {showHistory && (
                <div className="mt-2 space-y-1 animate-fade-in">
                  {balanceHistory.map((entry) => {
                    const isCredit = entry.type === 'add' || entry.type === 'prepaid';
                    const typeLabel = {
                      add: 'Пополнение',
                      remove: 'Списание',
                      prepaid: 'Предоплата',
                      refund: 'Возврат',
                    }[entry.type];
                    const typeIcon = {
                      add: 'ArrowDownLeft',
                      remove: 'ArrowUpRight',
                      prepaid: 'CreditCard',
                      refund: 'Undo2',
                    }[entry.type] as 'ArrowDownLeft';
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
          <button
            onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 transition-colors"
          >
            <Icon name="Plus" size={13} />
            Новый заказ
          </button>
        </div>

        {orders.length === 0 ? (
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
                      <span className="font-mono-data text-xs text-muted-foreground">#{order.id}</span>
                      <span className="text-sm text-muted-foreground">{order.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Статус оплаты */}
                      {ps === 'paid' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <Icon name="CheckCircle2" size={12} /> Оплачен
                        </span>
                      )}
                      {ps === 'partial' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Icon name="AlertCircle" size={12} /> Частично
                        </span>
                      )}
                      {ps === 'unpaid' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <Icon name="AlertTriangle" size={12} /> Не оплачен
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
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

                  {/* Блок предоплаты */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">Предоплата:</span>
                        {editPrepaidId === order.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              value={editPrepaidVal}
                              onChange={(e) => setEditPrepaidVal(e.target.value)}
                              autoFocus
                              className="w-28 px-2 py-1 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <button
                              onClick={() => handleSavePrepaid(order.id)}
                              className="p-1 text-emerald-600 hover:text-emerald-700"
                            >
                              <Icon name="Check" size={14} />
                            </button>
                            <button
                              onClick={() => setEditPrepaidId(null)}
                              className="p-1 text-muted-foreground hover:text-foreground"
                            >
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
                      {ps !== 'paid' && (
                        <span className="text-xs text-red-500 font-mono-data">
                          долг: {debt.toLocaleString()} ₽
                        </span>
                      )}
                      {ps === 'paid' && order.prepaid === order.total && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <Icon name="CheckCircle2" size={12} /> Заказ оплачен
                        </span>
                      )}
                    </div>
                  </div>

                  {order.note && (
                    <div className="mt-2 text-xs text-muted-foreground italic">{order.note}</div>
                  )}
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
              <button onClick={() => setShowNewOrder(false)} className="text-muted-foreground hover:text-foreground">
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Позиции заказа</div>

              {orderItems.map((item, idx) => (
                <div key={idx} className="border border-border rounded-lg p-3 space-y-2 relative">
                  {orderItems.length > 1 && (
                    <button
                      onClick={() => removeItem(idx)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 transition-colors"
                    >
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
                          <div
                            key={p.id}
                            onClick={() => selectSuggestion(idx, p)}
                            className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-0"
                          >
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
                    <div className="text-xs text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                      {item.name} · {item.brand}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Количество</label>
                      <input
                        type="number" min={1} value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', +e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Цена, ₽</label>
                      <input
                        type="number" min={0} value={item.price}
                        onChange={(e) => updateItem(idx, 'price', +e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addItem}
                className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <Icon name="Plus" size={14} />
                Добавить позицию
              </button>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Примечание к заказу</label>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* Предоплата в форме создания */}
              {orderTotal > 0 && (
                <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Итого:</span>
                    <span className="font-semibold font-mono-data">{orderTotal.toLocaleString()} ₽</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground shrink-0">Предоплата:</label>
                    <input
                      type="number"
                      min={0}
                      value={orderPrepaid || ''}
                      onChange={(e) => setOrderPrepaid(+e.target.value)}
                      placeholder="0"
                      className="flex-1 px-3 py-1.5 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-sm text-muted-foreground shrink-0">₽</span>
                  </div>
                  {orderPrepaid > 0 && (
                    <div className="text-xs">
                      {orderPrepaid >= orderTotal ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <Icon name="CheckCircle2" size={12} />
                          Оплачен полностью
                          {orderPrepaid > orderTotal && ` · +${(orderPrepaid - orderTotal).toLocaleString()} ₽ на баланс`}
                        </span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1">
                          <Icon name="AlertCircle" size={12} />
                          Остаток: {(orderTotal - orderPrepaid).toLocaleString()} ₽
                        </span>
                      )}
                    </div>
                  )}
                  {balance > 0 && (
                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                      <Icon name="Wallet" size={12} />
                      Баланс клиента: {balance.toLocaleString()} ₽ — можно использовать
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button onClick={() => setShowNewOrder(false)}
                className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors">
                Отмена
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={!orderItems.some((i) => i.article && i.quantity > 0)}
                className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-40 transition-colors"
              >
                Создать заказ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}