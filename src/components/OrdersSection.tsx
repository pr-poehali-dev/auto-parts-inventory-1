import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { ClientOrder, Client } from '@/data/mockData';
import { getOrders, getClients, updateOrder } from '@/api';

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
  done:        { label: 'Выполнен',          cls: 'text-emerald-700 bg-emerald-100 border-emerald-300',dot:'bg-emerald-600' },
  cancelled:   { label: 'Отменён',           cls: 'text-gray-500 bg-gray-100 border-gray-200',        dot: 'bg-gray-400' },
  in_progress: { label: 'В работе',          cls: 'text-amber-600 bg-amber-50 border-amber-200',      dot: 'bg-amber-400' },
};

const ACTIVE_STATUSES = ['new', 'ordered', 'in_stock', 'in_progress', 'issued'];
const ALL_STATUSES = ['new', 'ordered', 'in_stock', 'in_progress', 'issued', 'done', 'cancelled'];

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
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, Set<number>>>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([getOrders(), getClients()]).then(([ords, cls]) => {
      setOrders((ords as ClientOrder[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      const map: Record<string, Client> = {};
      (cls as Client[]).forEach((c) => { map[c.id] = c; });
      setClients(map);
    }).finally(() => setLoading(false));
  }, []);

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

  const applyItemStatus = async (orderId: string, newItemStatus: 'pending' | 'in_stock' | 'issued') => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const sel = selectedItems[orderId] ?? new Set();
    const newItems = order.items.map((item, i) => sel.has(i) ? { ...item, status: newItemStatus } : item);
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, items: newItems } : o));
    setSelectedItems((prev) => ({ ...prev, [orderId]: new Set() }));
    await updateOrder(orderId, { items: newItems });
  };

  const q = search.toLowerCase().trim();

  const displayed = orders.filter((o) => {
    if (filter === 'active' && !ACTIVE_STATUSES.includes(o.status)) return false;
    if (statusFilter && o.status !== statusFilter) return false;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="Loader" size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
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
          <div className="hidden md:grid grid-cols-[1fr_1.2fr_1.4fr_1fr_0.8fr_0.9fr] gap-3 px-4 py-2.5 bg-muted/40 border-b border-border text-xs text-muted-foreground font-medium">
            <span>Дата</span>
            <span>Клиент</span>
            <span>Состав</span>
            <span>Статус</span>
            <span>Сумма</span>
            <span>Оплата</span>
          </div>

          {displayed.map((order, idx) => {
            const client = clients[order.clientId];
            const isExpanded = expandedOrder === order.id;
            const st = STATUS_MAP[order.status] ?? STATUS_MAP['new'];
            const isPaid = order.prepaid >= order.total && order.total > 0;
            const isPartial = order.prepaid > 0 && order.prepaid < order.total;
            const firstName = order.items[0];

            return (
              <div key={order.id} className={idx > 0 ? 'border-t border-border' : ''}>
                {/* Desktop строка */}
                <div
                  className="hidden md:grid grid-cols-[1fr_1.2fr_1.4fr_1fr_0.8fr_0.9fr] gap-3 px-4 py-3 hover:bg-muted/20 cursor-pointer transition-colors items-center"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div>
                    <div className="text-sm font-medium">{fmtDate(order.date)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.date).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium truncate">{clientName(client)}</div>
                    {client?.phone && <div className="text-xs text-muted-foreground">{client.phone}</div>}
                  </div>
                  <div>
                    {firstName ? (
                      <>
                        <div className="text-sm truncate">{firstName.name || firstName.article}</div>
                        {order.items.length > 1 && (
                          <div className="text-xs text-muted-foreground">+{order.items.length - 1} позиций</div>
                        )}
                      </>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold font-mono-data">{order.total.toLocaleString('ru')} ₽</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isPaid ? (
                      <span className="text-xs text-emerald-600 font-medium">оплачен</span>
                    ) : isPartial ? (
                      <span className="text-xs text-amber-600 font-medium">{order.prepaid.toLocaleString('ru')} ₽</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
                      <div className="text-sm font-semibold">{clientName(client)}</div>
                      {client?.phone && <div className="text-xs text-muted-foreground">{client.phone}</div>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-semibold font-mono-data">{order.total.toLocaleString('ru')} ₽</div>
                        {isPaid && <div className="text-xs text-emerald-600">оплачен</div>}
                        {isPartial && <div className="text-xs text-amber-600">{order.prepaid.toLocaleString('ru')} ₽</div>}
                      </div>
                      <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(order.date)}, {new Date(order.date).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                      {firstName && <span className="ml-2 text-foreground">{firstName.name || firstName.article}{order.items.length > 1 ? ` +${order.items.length - 1}` : ''}</span>}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>
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
                              <div className="flex-1 min-w-0">
                                <span className="font-medium truncate block">{item.name || item.article}</span>
                                <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                                  {item.article && <span>{item.article}</span>}
                                  {item.brand && <span>{item.brand}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs border ${stInfo.cls}`}>
                                  {stInfo.label}
                                </span>
                                <div className="text-right text-xs">
                                  <div>{item.quantity} шт</div>
                                  <div className="text-muted-foreground">{(item.quantity * item.price).toLocaleString('ru')} ₽</div>
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
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground">Итого:</span>
                          <span className="font-semibold font-mono-data">{order.total.toLocaleString('ru')} ₽</span>
                          {order.prepaid > 0 && (
                            <>
                              <span className="text-muted-foreground">Предоплата:</span>
                              <span className="font-mono-data text-emerald-600">{order.prepaid.toLocaleString('ru')} ₽</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
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
    </div>
  );
}