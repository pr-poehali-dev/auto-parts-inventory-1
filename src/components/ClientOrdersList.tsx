import Icon from '@/components/ui/icon';
import { ClientOrder } from '@/data/mockData';

export const STATUS_MAP: Record<string, { label: string; cls: string; icon: string }> = {
  new:       { label: 'Новый',              cls: 'text-yellow-700 bg-yellow-50',   icon: 'Clock' },
  ordered:   { label: 'Заказан',            cls: 'text-blue-600 bg-blue-50',       icon: 'ShoppingCart' },
  in_stock:  { label: 'Получен на склад',   cls: 'text-purple-600 bg-purple-50',   icon: 'PackageCheck' },
  issued:    { label: 'Выдан клиенту',      cls: 'text-emerald-600 bg-emerald-50', icon: 'HandCoins' },
  cancelled: { label: 'Отменён',            cls: 'text-muted-foreground bg-muted', icon: 'XCircle' },
};

interface Props {
  orders: ClientOrder[];
  loading: boolean;
  onNewOrder: () => void;
  onEditOrder: (order: ClientOrder) => void;
}

export default function ClientOrdersList({ orders, loading, onNewOrder, onEditOrder }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name="ShoppingCart" size={15} className="text-muted-foreground" />
          <span className="text-sm font-medium">История заказов</span>
        </div>
        <button onClick={onNewOrder}
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
                      onClick={() => onEditOrder(order)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 transition-colors"
                    >
                      <Icon name="Pencil" size={11} />
                      Изменить
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {order.items.map((item, i) => {
                    const isReturned = item.status === 'returned';
                    return (
                      <div key={i} className={`flex items-center justify-between text-sm ${isReturned ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-mono-data text-xs text-muted-foreground shrink-0 ${isReturned ? 'line-through' : ''}`}>{item.article}</span>
                          <span className={`truncate ${isReturned ? 'line-through' : ''}`}>{item.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{item.brand}</span>
                          {isReturned && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200 shrink-0">возврат</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2 text-xs text-muted-foreground">
                          <span>{item.quantity} шт</span>
                          <span className={`font-mono-data ${isReturned ? 'line-through' : ''}`}>× {item.price.toLocaleString()} ₽</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {order.note && <div className="mt-2 text-xs text-muted-foreground italic">{order.note}</div>}

                {order.prepaid > 0 && (
                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Предоплата</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-data text-emerald-600 font-medium">+{order.prepaid.toLocaleString()} ₽</span>
                      {order.prepaid >= order.total
                        ? <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">оплачено</span>
                        : <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">долг {(order.total - order.prepaid).toLocaleString()} ₽</span>
                      }
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