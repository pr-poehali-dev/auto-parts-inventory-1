import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Part, Movement, Order } from '@/data/mockData';
import { getParts, getOrders } from '@/api';

function dbToPart(r: Record<string, unknown>): Part {
  return {
    id: r.id as string,
    article: r.article as string,
    name: r.name as string,
    brand: (r.brand as string) || '',
    category: (r.category as string) || 'Расходники',
    quantity: Number(r.quantity),
    minQuantity: Number(r.min_quantity),
    price: Number(r.price),
    location: (r.location as string) || '',
    analogs: (r.analogs as string[]) || [],
    oemArticle: (r.oem_article as string) || undefined,
    lastMovement: (r.last_movement as string) || undefined,
  };
}

export default function AnalyticsSection() {
  const [parts, setParts] = useState<Part[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getParts().then((data: unknown[]) => setParts(data.map(dbToPart))),
      getOrders().then((data: Order[]) => setOrders(data)),
    ]).finally(() => setLoading(false));
  }, []);

  const movements: Movement[] = [];

  const totalParts = parts.length;
  const totalItems = parts.reduce((s, p) => s + p.quantity, 0);
  const totalValue = parts.reduce((s, p) => s + p.price * p.quantity, 0);
  const outOfStock = parts.filter((p) => p.quantity === 0).length;
  const lowStock = parts.filter((p) => p.quantity > 0 && p.quantity <= p.minQuantity).length;

  const recentIn = movements.filter((m) => m.type === 'in').reduce((s, m) => s + m.quantity, 0);
  const recentOut = movements.filter((m) => m.type === 'out').reduce((s, m) => s + m.quantity, 0);

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalMargin = orders.reduce((sum, o) => {
    return sum + o.items.reduce((s, it) => {
      if (!it.costPrice) return s;
      return s + (it.price - it.costPrice) * it.quantity;
    }, 0);
  }, 0);
  const ordersWithCost = orders.filter(o => o.items.some(it => it.costPrice));
  const marginPercent = totalRevenue > 0 && ordersWithCost.length > 0
    ? Math.round((totalMargin / totalRevenue) * 100)
    : null;

  const categoryStats = parts.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = { count: 0, value: 0 };
    acc[p.category].count += p.quantity;
    acc[p.category].value += p.price * p.quantity;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const sortedCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1].value - a[1].value);

  const maxValue = Math.max(...sortedCategories.map(([, v]) => v.value), 1);

  const stats = [
    { label: 'Позиций в каталоге', value: totalParts, icon: 'Package', color: 'text-foreground' },
    { label: 'Единиц на складе', value: totalItems.toLocaleString(), icon: 'Boxes', color: 'text-foreground' },
    { label: 'Стоимость склада', value: totalValue.toLocaleString() + ' ₽', icon: 'TrendingUp', color: 'text-emerald-600' },
    { label: 'Нет в наличии', value: outOfStock, icon: 'PackageX', color: 'text-red-500' },
    { label: 'Мало на складе', value: lowStock, icon: 'AlertTriangle', color: 'text-amber-600' },
    { label: 'Поступлений (шт)', value: recentIn, icon: 'ArrowDownCircle', color: 'text-emerald-600' },
    { label: 'Продано (шт)', value: recentOut, icon: 'ArrowUpCircle', color: 'text-foreground' },
  ];

  const attention = parts.filter((p) => p.quantity === 0 || p.quantity <= p.minQuantity);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        <Icon name="Loader" size={28} className="mx-auto mb-2 opacity-30 animate-spin" />
        Загрузка аналитики...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Финансы по заказам */}
      {orders.length > 0 && (
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Icon name="TrendingUp" size={15} className="text-emerald-500" />
            Финансы по заказам
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Заказов всего</div>
              <div className="text-2xl font-bold font-mono-data">{orders.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Выручка</div>
              <div className="text-2xl font-bold font-mono-data text-foreground">{totalRevenue.toLocaleString('ru')} ₽</div>
            </div>
            {ordersWithCost.length > 0 && (
              <>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Маржа</div>
                  <div className={`text-2xl font-bold font-mono-data ${totalMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {totalMargin.toLocaleString('ru')} ₽
                  </div>
                </div>
                {marginPercent !== null && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Маржинальность</div>
                    <div className={`text-2xl font-bold font-mono-data ${marginPercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {marginPercent}%
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {ordersWithCost.length === 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              Укажите закупочную цену в позициях заказа, чтобы видеть маржу
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name={s.icon as 'Package'} size={15} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className={`text-2xl font-bold font-mono-data ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {sortedCategories.length > 0 && (
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">По категориям</h3>
          <div className="space-y-3">
            {sortedCategories.map(([cat, { count, value }]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{cat}</span>
                  <span className="text-muted-foreground font-mono-data">{value.toLocaleString()} ₽ · {count} шт</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full transition-all"
                    style={{ width: `${(value / maxValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {attention.length > 0 && (
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Icon name="AlertTriangle" size={15} className="text-amber-500" />
            Требуют внимания ({attention.length})
          </h3>
          <div className="space-y-2">
            {attention.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="font-mono-data text-xs text-muted-foreground ml-2">{p.article}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono-data font-medium ${p.quantity === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                    {p.quantity} шт
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${p.quantity === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {p.quantity === 0 ? 'нет' : 'мало'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parts.length === 0 && orders.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Icon name="BarChart3" size={32} className="mx-auto mb-2 opacity-20" />
          Добавьте товары на склад, чтобы видеть аналитику
        </div>
      )}
    </div>
  );
}
