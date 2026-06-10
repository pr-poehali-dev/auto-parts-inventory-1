import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { ClientOrder, Client, OrderItem } from '@/data/mockData';
import { getOrders, getClients, updateOrder, deleteOrder } from '@/api';

function clientName(c?: Client): string {
  if (!c) return '—';
  if (c.type === 'company' && c.companyName) return c.companyName;
  const parts = [c.lastName, c.firstName, c.middleName].filter(Boolean);
  return parts.length ? parts.join(' ') : (c.phone ?? '—');
}

const STATUS_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  new:         { label: 'Новый',             cls: 'text-yellow-700 bg-yellow-50 border-yellow-200',   dot: 'bg-yellow-400' },
  ordered:     { label: 'Заказан',           cls: 'text-blue-600 bg-blue-50 border-blue-200',         dot: 'bg-blue-500' },
  in_stock:    { label: 'На складе',         cls: 'text-purple-600 bg-purple-50 border-purple-200',   dot: 'bg-purple-500' },
  issued:      { label: 'Выдан',             cls: 'text-emerald-600 bg-emerald-50 border-emerald-200',dot: 'bg-emerald-500' },
  cancelled:   { label: 'Отменён',           cls: 'text-gray-500 bg-gray-100 border-gray-200',        dot: 'bg-gray-400' },
};

const ACTIVE_STATUSES = ['new', 'ordered', 'in_stock'];
const ALL_STATUSES = ['new', 'ordered', 'in_stock', 'issued', 'cancelled'];

function fmtDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, '0');
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return `${day} ${months[d.getMonth()]}`;
}

export default function OrdersSection() {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all' | 'issued'>('active');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, Set<number>>>({});
  const [marginPopupId, setMarginPopupId] = useState<string | null>(null);
  const [itemMarginPopup, setItemMarginPopup] = useState<string | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('all');
  const [editingOrder, setEditingOrder] = useState<ClientOrder | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editNote, setEditNote] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteVal, setEditingNoteVal] = useState('');
  const [cellPopup, setCellPopup] = useState<{ orderId: string; cells: Record<number, string> } | null>(null);
  const [editingCell, setEditingCell] = useState<{ orderId: string; itemIdx: number; val: string } | null>(null);
  const [clientPopup, setClientPopup] = useState<Client | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (orderId: string) => {
    setDeleting(true);
    await deleteOrder(orderId);
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setConfirmDelete(null);
    setExpandedOrder(null);
    setDeleting(false);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getOrders(), getClients()]).then(([ords, cls]) => {
      // Автоисправление: если позиции уже в нужном статусе, но заказ отстал
      const fixedOrds = (ords as ClientOrder[]).map((o) => {
        if (!o.items?.length) return o;
        const allIssued = o.items.every((item) => item.status === 'issued');
        const allInStock = o.items.every((item) => item.status === 'in_stock' || item.status === 'issued');
        if (allIssued && o.status !== 'issued' && o.status !== 'cancelled') {
          updateOrder(o.id, { status: 'issued' });
          return { ...o, status: 'issued' };
        }
        if (allInStock && o.status === 'new' || allInStock && o.status === 'ordered') {
          updateOrder(o.id, { status: 'in_stock' });
          return { ...o, status: 'in_stock' };
        }
        return o;
      });
      setOrders(fixedOrds.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      const map: Record<string, Client> = {};
      (cls as Client[]).forEach((c) => { map[c.id] = c; });
      setClients(map);
    }).finally(() => setLoading(false));
  }, []);

  const openEdit = (order: ClientOrder) => {
    setEditingOrder(order);
    setEditItems(order.items.map(i => ({ ...i })));
    setEditNote(order.note ?? '');
  };

  const updateEditItem = (idx: number, field: keyof OrderItem, val: string | number) => {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    setSavingEdit(true);
    try {
      const updated = await updateOrder(editingOrder.id, { items: editItems, note: editNote });
      setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...o, ...(updated as ClientOrder) } : o));
      setEditingOrder(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);
    try {
      await updateOrder(orderId, { status: newStatus });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    } finally {
      setUpdatingStatus(null);
    }
  };

  const toggleItem = (orderId: string, idx: number) => {
    setSelectedItems((prev) => {
      const set = new Set(prev[orderId] ?? []);
      if (set.has(idx)) { set.delete(idx); } else { set.add(idx); }
      return { ...prev, [orderId]: set };
    });
  };

  const toggleAllItems = (orderId: string, total: number) => {
    setSelectedItems((prev) => {
      const set = prev[orderId] ?? new Set();
      const allSelected = set.size === total;
      return { ...prev, [orderId]: allSelected ? new Set() : new Set(Array.from({ length: total }, (_, i) => i)) };
    });
  };

  const applyItemStatus = async (orderId: string, newItemStatus: 'pending' | 'in_stock' | 'issued', cellsMap?: Record<number, string>) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const sel = selectedItems[orderId] ?? new Set();

    // При переводе "На склад" — спрашиваем ячейки
    if (newItemStatus === 'in_stock' && !cellsMap) {
      const initCells: Record<number, string> = {};
      sel.forEach((i) => { initCells[i] = order.items[i]?.storageCell ?? ''; });
      setCellPopup({ orderId, cells: initCells });
      return;
    }

    const newItems = order.items.map((item, i) => {
      if (!sel.has(i)) return item;
      const cell = cellsMap?.[i];
      return { ...item, status: newItemStatus, ...(cell !== undefined ? { storageCell: cell } : {}) };
    });

    let autoStatus: string | null = null;
    if (newItems.every((item) => item.status === 'issued')) {
      autoStatus = 'issued';
    } else if (newItems.every((item) => item.status === 'in_stock' || item.status === 'issued')) {
      autoStatus = 'in_stock';
    }

    const updatedOrder = autoStatus
      ? { ...order, items: newItems, status: autoStatus }
      : { ...order, items: newItems };

    setOrders((prev) => prev.map((o) => o.id === orderId ? updatedOrder : o));
    setSelectedItems((prev) => ({ ...prev, [orderId]: new Set() }));

    if (autoStatus) {
      await updateOrder(orderId, { items: newItems, status: autoStatus });
    } else {
      await updateOrder(orderId, { items: newItems });
    }
  };

  const saveCellAndApply = () => {
    if (!cellPopup) return;
    applyItemStatus(cellPopup.orderId, 'in_stock', cellPopup.cells);
    setCellPopup(null);
  };

  const saveSingleCell = async (orderId: string, itemIdx: number, val: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const newItems = order.items.map((item, i) => i === itemIdx ? { ...item, storageCell: val } : item);
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, items: newItems } : o));
    setEditingCell(null);
    await updateOrder(orderId, { items: newItems });
  };

  const saveNote = async (orderId: string) => {
    await updateOrder(orderId, { note: editingNoteVal });
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, note: editingNoteVal } : o));
    setEditingNoteId(null);
  };

  const q = search.toLowerCase().trim();

  const periodStart = (() => {
    const now = new Date();
    if (period === 'day') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; }
    if (period === 'month') { const d = new Date(now); d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d; }
    return null;
  })();

  const displayed = orders.filter((o) => {
    if (filter === 'active' && !ACTIVE_STATUSES.includes(o.status)) return false;
    if (filter === 'issued' && o.status !== 'issued') return false;
    if (statusFilter && o.status !== statusFilter) return false;
    if (periodStart && new Date(o.date) < periodStart) return false;
    if (q) {
      const client = clients[o.clientId];
      const clientMatch = clientName(client).toLowerCase().includes(q) || client?.phone?.includes(q);
      const itemMatch = o.items.some((i) =>
        i.name?.toLowerCase().includes(q) || i.article?.toLowerCase().includes(q)
      );
      if (!clientMatch && !itemMatch) return false;
    }
    return true;
  });

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
  const issuedCount = orders.filter((o) => o.status === 'issued').length;

  const totalSum = displayed.reduce((s, o) => s + o.total, 0);
  const totalMargin = displayed.reduce((s, o) => {
    const hasCost = o.items.some(i => (i.costPrice ?? 0) > 0);
    if (!hasCost) return s;
    return s + o.items.reduce((m, i) => m + (i.price - (i.costPrice ?? 0)) * i.quantity, 0);
  }, 0);
  const hasAnyMargin = displayed.some(o => o.items.some(i => (i.costPrice ?? 0) > 0));
  const totalMarginPct = totalSum > 0 && hasAnyMargin ? Math.round(totalMargin / totalSum * 100) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="Loader" size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      {/* Период */}
      <div className="flex items-center gap-1.5 mb-3">
        {([['day', 'Сегодня'], ['week', 'Неделя'], ['month', 'Месяц'], ['all', 'Всё время']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setPeriod(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
              period === val
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Поиск + фильтры */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Клиент, телефон, артикул..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <Icon name="X" size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFilter('active'); setStatusFilter(''); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
              filter === 'active' && !statusFilter
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
            }`}
          >
            Активные {activeCount > 0 && <span className="ml-1 opacity-70">{activeCount}</span>}
          </button>
          <button
            onClick={() => { setFilter('issued'); setStatusFilter(''); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
              filter === 'issued'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
            }`}
          >
            Выданные {issuedCount > 0 && <span className="ml-1 opacity-70">{issuedCount}</span>}
          </button>
          <button
            onClick={() => { setFilter('all'); setStatusFilter(''); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
              filter === 'all' && !statusFilter
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
            }`}
          >
            Все
          </button>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setFilter('all'); }}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground"
          >
            <option value="">Любой статус</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_MAP[s]?.label ?? s}</option>
            ))}
          </select>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="ClipboardList" size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{filter === 'active' ? 'Нет активных заказов' : 'Заказов пока нет'}</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden bg-white">
          {/* Шапка таблицы */}
          <div className="hidden md:grid grid-cols-[1fr_1.4fr_1fr_1fr_0.8fr_0.9fr] gap-3 px-4 py-2.5 bg-muted/40 border-b border-border text-xs text-muted-foreground font-medium">
            <span>Дата</span>
            <span>Клиент</span>
            <span>Статус</span>
            <span>Примечание</span>
            <span>Сумма</span>
            <span>Оплата</span>
          </div>

          {displayed.map((order, idx) => {
            const client = clients[order.clientId];
            const isExpanded = expandedOrder === order.id;
            const st = STATUS_MAP[order.status] ?? STATUS_MAP['new'];
            const balance = order.clientBalance ?? 0;
            const isFirstForClient = displayed.findIndex(o => o.clientId === order.clientId) === idx;
            const isPaid = isFirstForClient && balance >= 0;
            const isDebt = isFirstForClient && balance < 0;
            const firstName = order.items[0];

            const hasCost = order.items.some(i => (i.costPrice ?? 0) > 0);
            const margin = hasCost
              ? order.items.reduce((s, i) => s + (i.price - (i.costPrice ?? 0)) * i.quantity, 0)
              : null;
            const marginPct = margin !== null && order.total > 0
              ? Math.round(margin / order.total * 100)
              : null;

            return (
              <div key={order.id} className={idx > 0 ? 'border-t border-border' : ''}>
                {/* Desktop строка */}
                <div
                  className="hidden md:grid grid-cols-[1fr_1.4fr_1fr_1fr_0.8fr_0.9fr] gap-3 px-4 py-3 hover:bg-muted/20 cursor-pointer transition-colors items-center"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div>
                    <div className="text-sm font-medium">{fmtDate(order.date)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.date).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (client) setClientPopup(client); }}
                      className="text-sm font-medium truncate hover:underline text-left"
                    >
                      {clientName(client)}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {client?.phone && <span>{client.phone}</span>}
                      {order.items.length > 0 && (
                        <span className={client?.phone ? 'ml-2' : ''}>{order.items.length} поз.</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                    {(() => {
                      const cells = order.items.map(i => i.storageCell).filter(Boolean) as string[];
                      const unique = [...new Set(cells)];
                      if (!unique.length) return null;
                      return (
                        <div className="flex items-center gap-1 mt-1">
                          <Icon name="MapPin" size={10} className="text-blue-400 shrink-0" />
                          <span className="text-xs text-blue-700 font-mono-data">{unique.join(', ')}</span>
                        </div>
                      );
                    })()}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    {editingNoteId === order.id ? (
                      <input
                        autoFocus
                        value={editingNoteVal}
                        onChange={(e) => setEditingNoteVal(e.target.value)}
                        onBlur={() => saveNote(order.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveNote(order.id); if (e.key === 'Escape') setEditingNoteId(null); }}
                        placeholder="Примечание..."
                        className="w-full text-xs px-2 py-1 border border-primary rounded outline-none bg-white"
                      />
                    ) : (
                      <div
                        className="text-xs text-muted-foreground italic cursor-pointer hover:text-foreground transition-colors truncate"
                        onClick={() => { setEditingNoteId(order.id); setEditingNoteVal(order.note ?? ''); }}
                      >
                        {order.note || <span className="opacity-40">+ примечание</span>}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold font-mono-data">{order.total.toLocaleString('ru')} ₽</div>
                    {margin !== null && (
                      <div className={`text-xs font-mono-data font-medium ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {margin >= 0 ? '+' : ''}{margin.toLocaleString('ru')} ₽
                        {marginPct !== null && <span className="font-normal opacity-70 ml-1">({marginPct}%)</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isDebt && <span className="text-xs text-red-500 font-medium">{balance.toLocaleString('ru')} ₽</span>}
                    <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-muted-foreground ml-auto" />
                  </div>
                </div>

                {/* Mobile карточка */}
                <div
                  className="md:hidden px-4 py-3 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (client) setClientPopup(client); }}
                        className="text-sm font-semibold hover:underline text-left"
                      >
                        {clientName(client)}
                      </button>
                      {client?.phone && <div className="text-xs text-muted-foreground">{client.phone}</div>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-semibold font-mono-data">{order.total.toLocaleString('ru')} ₽</div>
                        {margin !== null && (
                          <div className={`text-xs font-mono-data font-medium ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {margin >= 0 ? '+' : ''}{margin.toLocaleString('ru')} ₽{marginPct !== null && ` (${marginPct}%)`}
                          </div>
                        )}
                        {isDebt && <div className="text-xs text-red-500">{balance.toLocaleString('ru')} ₽</div>}
                      </div>
                      <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(order.date)}, {new Date(order.date).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                      {(() => {
                        const cells = order.items.map(i => i.storageCell).filter(Boolean) as string[];
                        const unique = [...new Set(cells)];
                        if (!unique.length) return null;
                        return (
                          <div className="flex items-center gap-1">
                            <Icon name="MapPin" size={9} className="text-blue-400 shrink-0" />
                            <span className="text-xs text-blue-700 font-mono-data">{unique.join(', ')}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {editingNoteId === order.id ? (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={editingNoteVal}
                        onChange={(e) => setEditingNoteVal(e.target.value)}
                        onBlur={() => saveNote(order.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveNote(order.id); if (e.key === 'Escape') setEditingNoteId(null); }}
                        placeholder="Примечание..."
                        className="w-full text-xs px-2 py-1 border border-primary rounded outline-none bg-white"
                      />
                    </div>
                  ) : (
                    <div
                      className="mt-1.5 text-xs text-muted-foreground italic truncate cursor-pointer hover:text-foreground transition-colors"
                      onClick={(e) => { e.stopPropagation(); setEditingNoteId(order.id); setEditingNoteVal(order.note ?? ''); }}
                    >
                      {order.note || <span className="opacity-40">+ примечание</span>}
                    </div>
                  )}
                </div>



                {/* Раскрытая детализация */}
                {isExpanded && (() => {
                  const sel = selectedItems[order.id] ?? new Set<number>();
                  const allSelected = order.items.length > 0 && sel.size === order.items.length;
                  return (
                  <div className="px-4 pb-4 bg-muted/20 border-t border-border">
                    <div className="pt-3 space-y-3">
                      {/* Позиции */}
                      <div className="rounded-lg border border-border overflow-hidden bg-background">
                        {/* Шапка с выбором всех */}
                        <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-muted/30">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => toggleAllItems(order.id, order.items.length)}
                            className="w-4 h-4 rounded accent-primary cursor-pointer"
                          />
                          <span className="text-xs text-muted-foreground">
                            {sel.size > 0 ? `Выбрано: ${sel.size}` : 'Выбрать все'}
                          </span>
                        </div>

                        {order.items.map((item, i) => {
                          const itemSt = item.status ?? 'pending';
                          const checked = sel.has(i);
                          const ITEM_ST: Record<string, { label: string; cls: string }> = {
                            pending:  { label: 'Ожидается', cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
                            in_stock: { label: 'На складе',  cls: 'text-purple-700 bg-purple-50 border-purple-200' },
                            issued:   { label: 'Выдано',     cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                          };
                          const stInfo = ITEM_ST[itemSt] ?? ITEM_ST.pending;
                          return (
                            <div
                              key={i}
                              onClick={() => toggleItem(order.id, i)}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors text-sm ${i > 0 ? 'border-t border-border' : ''} ${checked ? 'bg-primary/5' : 'hover:bg-muted/20'}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => { e.stopPropagation(); toggleItem(order.id, i); }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded accent-primary cursor-pointer shrink-0"
                              />
                              <div className="shrink-0 w-20">
                                <span className="font-mono-data text-xs text-foreground font-medium">
                                  {item.article || <span className="text-muted-foreground">—</span>}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium truncate block">{item.name || item.article}</span>
                                {item.brand && <div className="text-xs text-muted-foreground mt-0.5">{item.brand}</div>}
                                {item.note && <div className="text-xs text-muted-foreground italic mt-0.5">{item.note}</div>}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {(item.storageCell || itemSt === 'in_stock') && (
                                  editingCell?.orderId === order.id && editingCell?.itemIdx === i ? (
                                    <input
                                      autoFocus
                                      value={editingCell.val}
                                      onChange={(e) => setEditingCell({ ...editingCell, val: e.target.value })}
                                      onBlur={() => saveSingleCell(order.id, i, editingCell.val)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') saveSingleCell(order.id, i, editingCell.val); if (e.key === 'Escape') setEditingCell(null); }}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="Ячейка..."
                                      className="w-24 px-2 py-0.5 border border-blue-300 rounded-md text-xs font-mono-data focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                    />
                                  ) : (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setEditingCell({ orderId: order.id, itemIdx: i, val: item.storageCell ?? '' }); }}
                                      className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-blue-200 bg-blue-50 text-blue-700 font-mono-data hover:bg-blue-100 transition-colors"
                                    >
                                      <Icon name="MapPin" size={10} />
                                      {item.storageCell || <span className="text-blue-400 italic">ячейка?</span>}
                                    </button>
                                  )
                                )}
                                <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs border ${stInfo.cls}`}>
                                  {stInfo.label}
                                </span>
                                <div className="text-right text-xs relative">
                                  <div>{item.quantity} шт</div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); const key = `${order.id}-${i}`; setItemMarginPopup(itemMarginPopup === key ? null : key); }}
                                    className="text-muted-foreground hover:text-foreground underline decoration-dotted transition-colors"
                                  >
                                    {(item.quantity * item.price).toLocaleString('ru')} ₽
                                  </button>
                                  {itemMarginPopup === `${order.id}-${i}` && (() => {
                                    const cost = (item.costPrice ?? 0) * item.quantity;
                                    const sale = item.price * item.quantity;
                                    const profit = sale - cost;
                                    const hasCost = (item.costPrice ?? 0) > 0;
                                    return (
                                      <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-border rounded-xl shadow-xl z-50 p-3 animate-fade-in text-left" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-xs font-medium truncate max-w-[140px]">{item.name || item.article}</span>
                                          <button onClick={() => setItemMarginPopup(null)} className="text-muted-foreground hover:text-foreground shrink-0"><Icon name="X" size={12} /></button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                          <span className="text-muted-foreground">Закупка (шт)</span>
                                          <span className="font-mono-data text-right">{hasCost ? (item.costPrice!).toLocaleString() + ' ₽' : '—'}</span>
                                          <span className="text-muted-foreground">Продажа (шт)</span>
                                          <span className="font-mono-data text-right">{item.price.toLocaleString()} ₽</span>
                                          <span className="text-muted-foreground">Кол-во</span>
                                          <span className="font-mono-data text-right">{item.quantity} шт</span>
                                          <div className="col-span-2 border-t border-border my-1" />
                                          <span className="text-muted-foreground">Закупка (сумма)</span>
                                          <span className="font-mono-data text-right">{hasCost ? cost.toLocaleString() + ' ₽' : '—'}</span>
                                          <span className="text-muted-foreground">Продажа (сумма)</span>
                                          <span className="font-mono-data font-medium text-right">{sale.toLocaleString()} ₽</span>
                                          {hasCost && <>
                                            <span className="text-muted-foreground">Профит</span>
                                            <span className={`font-mono-data font-bold text-right ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{profit >= 0 ? '+' : ''}{profit.toLocaleString()} ₽</span>
                                          </>}
                                        </div>
                                        {!hasCost && <div className="mt-2 text-xs text-amber-600">Укажи закупочную цену в карточке детали</div>}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Панель действий при выборе */}
                      {sel.size > 0 && (
                        <div className="flex items-center gap-2 p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                          <span className="text-xs text-muted-foreground mr-1">Отметить как:</span>
                          <button
                            onClick={() => applyItemStatus(order.id, 'pending')}
                            className="px-3 py-1 rounded-md text-xs border border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors font-medium"
                          >
                            Ожидается
                          </button>
                          <button
                            onClick={() => applyItemStatus(order.id, 'in_stock')}
                            className="px-3 py-1 rounded-md text-xs border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors font-medium"
                          >
                            На складе
                          </button>
                          <button
                            onClick={() => applyItemStatus(order.id, 'issued')}
                            className="px-3 py-1 rounded-md text-xs border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors font-medium"
                          >
                            Выдано
                          </button>
                        </div>
                      )}
                      

                      {order.note && (
                        <div className="text-xs text-muted-foreground bg-background rounded-md px-3 py-2 border border-border">
                          {order.note}
                        </div>
                      )}

                      {/* Итог + смена статуса */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-3 text-sm flex-wrap">
                          <span className="text-muted-foreground">Итого:</span>
                          <span className="font-semibold font-mono-data">{order.total.toLocaleString('ru')} ₽</span>
                          {order.prepaid > 0 && (
                            <>
                              <span className="text-muted-foreground">Предоплата:</span>
                              <span className="font-mono-data text-emerald-600">{order.prepaid.toLocaleString('ru')} ₽</span>
                            </>
                          )}
                          {(() => {
                            const margin = order.items.reduce((sum, it) => {
                              if (!it.costPrice) return sum;
                              return sum + (it.price - it.costPrice) * it.quantity;
                            }, 0);
                            const hasCost = order.items.some(it => it.costPrice);
                            if (!hasCost) return null;
                            return (
                              <>
                                <span className="text-muted-foreground">Маржа:</span>
                                <span className={`font-mono-data font-semibold ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {margin.toLocaleString('ru')} ₽
                                </span>
                              </>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(order); }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 transition-colors"
                          >
                            <Icon name="Pencil" size={11} />
                            Изменить
                          </button>
                          {confirmDelete === order.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-600">Удалить заказ?</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(order.id); }}
                                disabled={deleting}
                                className="text-xs text-white bg-red-500 hover:bg-red-600 rounded px-2 py-0.5 transition-colors disabled:opacity-50"
                              >
                                {deleting ? '...' : 'Да'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                                className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5 transition-colors"
                              >
                                Нет
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete(order.id); }}
                              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 rounded-md px-2 py-1 transition-colors"
                            >
                              <Icon name="Trash2" size={11} />
                              Удалить
                            </button>
                          )}
                          <span className="text-xs text-muted-foreground">Статус:</span>
                          <select
                            value={order.status}
                            disabled={updatingStatus === order.id}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className="text-xs border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s}>{STATUS_MAP[s]?.label ?? s}</option>
                            ))}
                          </select>
                          {updatingStatus === order.id && (
                            <Icon name="Loader" size={14} className="animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Итоговая строка */}
      {displayed.length > 0 && (
        <div className="mt-3 flex items-center justify-end gap-4 px-4 py-3 bg-white border border-border rounded-xl text-sm">
          <span className="text-muted-foreground">{displayed.length} заказов</span>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Сумма:</span>
            <span className="font-semibold font-mono-data">{totalSum.toLocaleString('ru')} ₽</span>
          </div>
          {hasAnyMargin && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Маржа:</span>
              <span className={`font-semibold font-mono-data ${totalMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {totalMargin >= 0 ? '+' : ''}{totalMargin.toLocaleString('ru')} ₽
              </span>
              {totalMarginPct !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${totalMargin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {totalMarginPct}%
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Модал редактирования заказа */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditingOrder(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-semibold">Редактировать заказ</h3>
                <p className="text-xs text-muted-foreground mt-0.5">#{editingOrder.id.slice(0, 8)} · {clientName(clients[editingOrder.clientId])}</p>
              </div>
              <button onClick={() => setEditingOrder(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={18} /></button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {editItems.map((item, idx) => (
                <div key={idx} className="border-2 border-border rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-muted/50 border-b border-border">
                    <span className="text-xs font-semibold text-muted-foreground tracking-wide">ПОЗИЦИЯ {idx + 1}</span>
                    {item.article && <span className="font-mono-data text-xs text-muted-foreground ml-2">{item.article}</span>}
                    {item.name && <span className="text-xs text-foreground ml-2 font-medium">{item.name}</span>}
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Кол-во</label>
                        <input type="number" min={1}
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) => updateEditItem(idx, 'quantity', e.target.value === '' ? 0 : +e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Закупка, ₽</label>
                        <input type="number" min={0}
                          value={item.costPrice === 0 ? '' : item.costPrice}
                          placeholder="0"
                          onChange={(e) => updateEditItem(idx, 'costPrice', e.target.value === '' ? 0 : +e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Продажа, ₽</label>
                        <input type="number" min={0}
                          value={item.price === 0 ? '' : item.price}
                          onChange={(e) => updateEditItem(idx, 'price', e.target.value === '' ? 0 : +e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    {item.quantity > 0 && item.price > 0 && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 px-2 py-1.5 rounded-md">
                        <span>Итого: <span className="font-mono-data font-medium text-foreground">{(item.quantity * item.price).toLocaleString('ru')} ₽</span></span>
                        {(item.costPrice ?? 0) > 0 && (
                          <span>Маржа: <span className={`font-mono-data font-medium ${item.price - (item.costPrice ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {((item.price - (item.costPrice ?? 0)) * item.quantity).toLocaleString('ru')} ₽
                          </span></span>
                        )}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Примечание к позиции</label>
                      <input
                        value={item.note ?? ''}
                        onChange={(e) => updateEditItem(idx, 'note', e.target.value)}
                        placeholder="Доп. информация..."
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Примечание к заказу</label>
                <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>

              {editItems.length > 0 && (
                <div className="border border-border rounded-lg p-3 bg-muted/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Итого продажа:</span>
                    <span className="font-mono-data font-semibold">
                      {editItems.reduce((s, i) => s + i.quantity * i.price, 0).toLocaleString('ru')} ₽
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setEditingOrder(null)}
                className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors">
                Отмена
              </button>
              <button onClick={handleSaveEdit} disabled={savingEdit}
                className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-50 transition-colors">
                {savingEdit ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Попап ввода ячейки при переводе "На склад" */}
      {cellPopup && (() => {
        const order = orders.find((o) => o.id === cellPopup.orderId);
        if (!order) return null;
        const idxs = Object.keys(cellPopup.cells).map(Number);
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCellPopup(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
                <div>
                  <h3 className="text-base font-semibold">Ячейка на складе</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Укажи, куда положить товар</p>
                </div>
                <button onClick={() => setCellPopup(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={18} /></button>
              </div>
              <div className="px-5 py-4 space-y-3">
                {idxs.map((i) => {
                  const item = order.items[i];
                  return (
                    <div key={i}>
                      <label className="block text-xs text-muted-foreground mb-1">
                        <span className="font-mono-data font-medium text-foreground">{item.article}</span>
                        {item.name && <span className="ml-1">{item.name}</span>}
                      </label>
                      <input
                        autoFocus={i === idxs[0]}
                        value={cellPopup.cells[i] ?? ''}
                        onChange={(e) => setCellPopup((p) => p ? { ...p, cells: { ...p.cells, [i]: e.target.value } } : p)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveCellAndApply(); }}
                        placeholder="Например: А-1, Б-3, Полка 2..."
                        className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 px-5 pb-5">
                <button onClick={() => setCellPopup(null)}
                  className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors">
                  Отмена
                </button>
                <button onClick={saveCellAndApply}
                  className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 transition-colors">
                  На склад
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Мини-карточка клиента */}
      {clientPopup && (() => {
        const c = clientPopup;
        const activeOrders = orders.filter((o) => o.clientId === c.id && ['new', 'ordered', 'in_stock'].includes(o.status));
        const inWork = activeOrders.reduce((s, o) => s + o.total, 0);
        const debt = inWork - c.balance;
        const hasDebt = debt > 0;
        return (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-start justify-center z-50 pt-20 px-4" onClick={() => setClientPopup(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold shrink-0">
                    {clientName(c).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-base leading-tight">{clientName(c)}</div>
                    {c.phone && <div className="text-sm text-muted-foreground font-mono-data mt-0.5">{c.phone}</div>}
                  </div>
                </div>
                <button onClick={() => setClientPopup(null)} className="text-muted-foreground hover:text-foreground mt-0.5"><Icon name="X" size={18} /></button>
              </div>
              <div className="px-5 pb-5 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                    <div className="text-xs text-muted-foreground mb-0.5">Баланс</div>
                    <div className={`text-base font-semibold font-mono-data ${c.balance > 0 ? 'text-emerald-600' : c.balance < 0 ? 'text-red-500' : 'text-foreground'}`}>
                      {c.balance >= 0 ? '+' : ''}{c.balance.toLocaleString('ru')} ₽
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                    <div className="text-xs text-muted-foreground mb-0.5">В работе</div>
                    <div className="text-base font-semibold font-mono-data text-amber-600">
                      {inWork > 0 ? `${inWork.toLocaleString('ru')} ₽` : '—'}
                    </div>
                  </div>
                </div>
                {hasDebt && (
                  <div className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600">
                      <Icon name="AlertTriangle" size={13} />
                      <span className="text-xs font-medium">Долг по заказам</span>
                    </div>
                    <span className="font-mono-data font-semibold text-sm text-red-600">−{debt.toLocaleString('ru')} ₽</span>
                  </div>
                )}
                {!hasDebt && inWork > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Icon name="CheckCircle" size={13} />
                      <span className="text-xs font-medium">Заказы оплачены</span>
                    </div>
                    <span className="font-mono-data font-semibold text-sm text-emerald-600">+{(c.balance - inWork).toLocaleString('ru')} ₽ сверх</span>
                  </div>
                )}
                {inWork === 0 && c.balance > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Icon name="Wallet" size={13} />
                      <span className="text-xs font-medium">Свободный баланс</span>
                    </div>
                    <span className="font-mono-data font-semibold text-sm text-emerald-600">+{c.balance.toLocaleString('ru')} ₽</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}