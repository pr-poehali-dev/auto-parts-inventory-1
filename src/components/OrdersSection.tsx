import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { ClientOrder, Client } from '@/data/mockData';
import { getOrders, getClients, updateOrder } from '@/api';

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

  const q = search.toLowerCase().trim();

  const displayed = orders.filter((o) => {
    if (filter === 'active' && !ACTIVE_STATUSES.includes(o.status)) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    if (q) {
      const client = clients[o.clientId];
      const clientMatch = client?.name?.toLowerCase().includes(q) || client?.phone?.includes(q);
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
                <div
                  className="grid grid-cols-[1fr_1.2fr] md:grid-cols-[1fr_1.2fr_1.4fr_1fr_0.8fr_0.9fr] gap-3 px-4 py-3 hover:bg-muted/20 cursor-pointer transition-colors items-center"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  {/* Дата */}
                  <div>
                    <div className="text-sm font-medium">{fmtDate(order.date)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.date).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Клиент */}
                  <div>
                    <div className="text-sm font-medium truncate">{client?.name ?? '—'}</div>
                    {client?.phone && (
                      <div className="text-xs text-muted-foreground">{client.phone}</div>
                    )}
                  </div>

                  {/* Состав (только desktop) */}
                  <div className="hidden md:block">
                    {firstName ? (
                      <>
                        <div className="text-sm truncate">{firstName.name || firstName.article}</div>
                        {order.items.length > 1 && (
                          <div className="text-xs text-muted-foreground">+{order.items.length - 1} позиций</div>
                        )}
                      </>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </div>

                  {/* Статус */}
                  <div className="hidden md:block">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>

                  {/* Сумма */}
                  <div className="hidden md:block">
                    <div className="text-sm font-semibold font-mono-data">
                      {order.total.toLocaleString('ru')} ₽
                    </div>
                  </div>

                  {/* Оплата */}
                  <div className="hidden md:flex items-center gap-1.5">
                    {isPaid ? (
                      <span className="text-xs text-emerald-600 font-medium">оплачен</span>
                    ) : isPartial ? (
                      <span className="text-xs text-amber-600 font-medium">
                        {order.prepaid.toLocaleString('ru')} ₽
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    <Icon
                      name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
                      size={14}
                      className="text-muted-foreground ml-auto"
                    />
                  </div>

                  {/* Mobile: статус + сумма */}
                  <div className="md:hidden flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                    <span className="text-sm font-semibold font-mono-data">
                      {order.total.toLocaleString('ru')} ₽
                    </span>
                  </div>
                </div>

                {/* Раскрытая детализация */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-muted/20 border-t border-border">
                    <div className="pt-3 space-y-3">
                      {/* Позиции */}
                      <div className="space-y-2">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 text-sm">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium truncate block">{item.name || item.article}</span>
                              <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                                {item.article && <span>{item.article}</span>}
                                {item.brand && <span>{item.brand}</span>}
                                {item.expectedDate && (
                                  <span className="text-amber-600">
                                    ожидается {fmtDate(item.expectedDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div>{item.quantity} шт × {item.price.toLocaleString('ru')} ₽</div>
                              <div className="text-xs text-muted-foreground">
                                {(item.quantity * item.price).toLocaleString('ru')} ₽
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}