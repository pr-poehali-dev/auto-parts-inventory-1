import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Client, ClientOrder, OrderItem, mockClientOrders, mockParts } from '@/data/mockData';

interface Props {
  client: Client;
  onBack: () => void;
}

const STATUS_MAP = {
  new: { label: 'Новый', cls: 'text-blue-600 bg-blue-50' },
  in_progress: { label: 'В работе', cls: 'text-amber-600 bg-amber-50' },
  done: { label: 'Выполнен', cls: 'text-emerald-600 bg-emerald-50' },
  cancelled: { label: 'Отменён', cls: 'text-muted-foreground bg-muted' },
};

export default function ClientCard({ client, onBack }: Props) {
  const [orders, setOrders] = useState<ClientOrder[]>(
    mockClientOrders.filter((o) => o.clientId === client.id)
  );
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { article: '', name: '', brand: '', quantity: 1, price: 0 },
  ]);
  const [orderNote, setOrderNote] = useState('');
  const [articleQuery, setArticleQuery] = useState<Record<number, string>>({});
  const [articleSuggestions, setArticleSuggestions] = useState<Record<number, typeof mockParts>>({});

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
    const order: ClientOrder = {
      id: 'o' + Date.now(),
      clientId: client.id,
      date: new Date().toISOString().slice(0, 10),
      status: 'new',
      items: validItems,
      total: validItems.reduce((s, i) => s + i.quantity * i.price, 0),
      note: orderNote,
    };
    setOrders((prev) => [order, ...prev]);
    setShowNewOrder(false);
    setOrderItems([{ article: '', name: '', brand: '', quantity: 1, price: 0 }]);
    setOrderNote('');
    setArticleQuery({});
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

      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
            client.type === 'company' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-foreground'
          }`}>
            {clientInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{clientName}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                client.type === 'company' ? 'bg-blue-50 text-blue-700' : 'bg-muted text-muted-foreground'
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
      </div>

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
              return (
                <div key={order.id} className="bg-white border border-border rounded-lg p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-data text-xs text-muted-foreground">#{order.id}</span>
                      <span className="text-sm text-muted-foreground">{order.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
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
                  {order.note && (
                    <div className="mt-2 text-xs text-muted-foreground italic">{order.note}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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

              {orderTotal > 0 && (
                <div className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2">
                  <span className="text-sm text-muted-foreground">Итого</span>
                  <span className="font-semibold font-mono-data">{orderTotal.toLocaleString()} ₽</span>
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
