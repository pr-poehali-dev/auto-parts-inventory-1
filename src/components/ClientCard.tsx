import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Client, ClientOrder, OrderItem, BalanceEntry, Part } from '@/data/mockData';
import { getOrders, createOrder, updateOrder, getBalanceHistory, changeBalance, getParts, updateClient, getClient } from '@/api';
import ClientInfoCard from '@/components/ClientInfoCard';
import ClientBalancePanel from '@/components/ClientBalancePanel';
import ClientOrdersList from '@/components/ClientOrdersList';
import OrderFormModal from '@/components/OrderFormModal';

interface Props {
  client: Client;
  onBack: () => void;
  prefilledItems?: OrderItem[] | null;
}

export default function ClientCard({ client, onBack, prefilledItems }: Props) {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [balance, setBalance] = useState(client.balance);
  const [balanceHistory, setBalanceHistory] = useState<BalanceEntry[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const [showNewOrder, setShowNewOrder] = useState(!!prefilledItems);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    prefilledItems ?? [{ article: '', name: '', brand: '', quantity: 1, price: 0, costPrice: 0 }]
  );
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
    setOrderItems((items) => items.map((item, i) => i === idx ? { ...item, article: val } : item));
    if (val.length > 1) {
      const q = val.toLowerCase();
      const fromParts: Part[] = parts.filter(
        (p) => p.article.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
      ).slice(0, 5);
      const seen = new Set(fromParts.map(p => p.article.toLowerCase()));
      const fromHistory: Part[] = [];
      for (const o of orders) {
        for (const it of o.items) {
          if (!it.article) continue;
          const key = it.article.toLowerCase();
          if (!seen.has(key) && (key.includes(q) || (it.name || '').toLowerCase().includes(q))) {
            seen.add(key);
            fromHistory.push({ id: `hist-${key}`, article: it.article, name: it.name || '', brand: it.brand || '', price: it.price, quantity: 0, costPrice: it.costPrice ?? 0 } as Part);
            if (fromHistory.length >= 5) break;
          }
        }
        if (fromHistory.length >= 5) break;
      }
      setArticleSuggestions((s) => ({ ...s, [idx]: [...fromParts, ...fromHistory].slice(0, 7) }));
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

  const updateItem = (idx: number, field: keyof OrderItem, value: string | number) => {
    setOrderItems((items) => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItem = () => setOrderItems((i) => [...i, { article: '', name: '', brand: '', quantity: 1, price: 0, costPrice: 0 }]);
  const removeItem = (idx: number) => setOrderItems((i) => i.filter((_, j) => j !== idx));

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
        const freshClient = await getClient(client.id);
        setBalance((freshClient as { balance: number }).balance);
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

  const totalSpent = orders.filter((o) => o.status === 'issued' || o.status === 'done').reduce((s, o) => s + o.total, 0);

  // Подавление предупреждений о неиспользуемых переменных (используются в будущих фичах)
  void editPrepaidId; void editPrepaidVal; void setEditPrepaidId; void setEditPrepaidVal;
  void statusPopupId; void handleStatusChange; void handleSavePrepaid;

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Icon name="ChevronLeft" size={16} />
        Все клиенты
      </button>

      <ClientInfoCard
        localClient={localClient}
        orders={orders}
        editing={editing}
        savingEdit={savingEdit}
        editForm={editForm}
        editVins={editVins}
        clientName={clientName}
        clientInitials={clientInitials}
        totalSpent={totalSpent}
        onEditStart={() => setEditing(true)}
        onEditCancel={() => setEditing(false)}
        onEditSave={handleSaveEdit}
        onEditFormChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
        onEditVinsChange={setEditVins}
      />

      <div className="bg-white border border-border rounded-xl p-5">
        <ClientBalancePanel
          balance={balance}
          orders={orders}
          balanceHistory={balanceHistory}
          showBalance={showBalance}
          balanceMode={balanceMode}
          balanceAmount={balanceAmount}
          balanceNote={balanceNote}
          balanceSaved={balanceSaved}
          savingBalance={savingBalance}
          showHistory={showHistory}
          onToggleBalance={() => setShowBalance(!showBalance)}
          onBalanceModeChange={setBalanceMode}
          onBalanceAmountChange={setBalanceAmount}
          onBalanceNoteChange={setBalanceNote}
          onBalanceSave={handleBalanceSave}
          onBalanceCancel={() => setShowBalance(false)}
          onToggleHistory={() => setShowHistory((v) => !v)}
        />
      </div>

      <ClientOrdersList
        orders={orders}
        loading={loading}
        onNewOrder={() => {
          setShowNewOrder(true);
          setOrderItems([{ article: '', name: '', brand: '', quantity: 1, price: 0, costPrice: 0 }]);
          setOrderNote('');
          setOrderPrepaid(0);
          setArticleQuery({});
          setArticleSuggestions({});
        }}
        onEditOrder={openEditOrder}
      />

      {showNewOrder && (
        <OrderFormModal
          mode="create"
          clientName={clientName}
          orderItems={orderItems}
          orderNote={orderNote}
          orderPrepaid={orderPrepaid}
          savingOrder={savingOrder}
          articleQuery={articleQuery}
          articleSuggestions={articleSuggestions}
          onClose={() => setShowNewOrder(false)}
          onSave={handleCreateOrder}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
          onArticleSearch={handleArticleSearch}
          onSelectSuggestion={selectSuggestion}
          onNoteChange={setOrderNote}
          onPrepaidChange={setOrderPrepaid}
        />
      )}

      {editingOrderId && (
        <OrderFormModal
          mode="edit"
          clientName={clientName}
          editingOrderId={editingOrderId}
          orderItems={orderItems}
          orderNote={orderNote}
          orderPrepaid={orderPrepaid}
          savingOrder={savingOrder}
          articleQuery={articleQuery}
          articleSuggestions={articleSuggestions}
          onClose={() => setEditingOrderId(null)}
          onSave={handleEditOrder}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
          onArticleSearch={handleArticleSearch}
          onSelectSuggestion={selectSuggestion}
          onNoteChange={setOrderNote}
          onPrepaidChange={setOrderPrepaid}
        />
      )}
    </div>
  );
}