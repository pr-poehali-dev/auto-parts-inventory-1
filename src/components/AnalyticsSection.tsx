import Icon from '@/components/ui/icon';
import { mockParts, mockMovements } from '@/data/mockData';

export default function AnalyticsSection() {
  const totalParts = mockParts.length;
  const totalItems = mockParts.reduce((s, p) => s + p.quantity, 0);
  const totalValue = mockParts.reduce((s, p) => s + p.price * p.quantity, 0);
  const outOfStock = mockParts.filter((p) => p.quantity === 0).length;
  const lowStock = mockParts.filter((p) => p.quantity > 0 && p.quantity <= p.minQuantity).length;

  const recentIn = mockMovements.filter((m) => m.type === 'in').reduce((s, m) => s + m.quantity, 0);
  const recentOut = mockMovements.filter((m) => m.type === 'out').reduce((s, m) => s + m.quantity, 0);

  const categoryStats = mockParts.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = { count: 0, value: 0 };
    acc[p.category].count += p.quantity;
    acc[p.category].value += p.price * p.quantity;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const sortedCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1].value - a[1].value);

  const maxValue = Math.max(...sortedCategories.map(([, v]) => v.value));

  const stats = [
    { label: 'Позиций в каталоге', value: totalParts, icon: 'Package', color: 'text-foreground' },
    { label: 'Единиц на складе', value: totalItems.toLocaleString(), icon: 'Boxes', color: 'text-foreground' },
    { label: 'Стоимость склада', value: totalValue.toLocaleString() + ' ₽', icon: 'TrendingUp', color: 'text-emerald-600' },
    { label: 'Нет в наличии', value: outOfStock, icon: 'PackageX', color: 'text-red-500' },
    { label: 'Заканчивается', value: lowStock, icon: 'AlertTriangle', color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-border rounded-lg p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <Icon name={s.icon as 'Package'} size={15} className={s.color} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className={`text-xl font-semibold font-mono-data ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="BarChart3" size={15} className="text-muted-foreground" />
            <span className="text-sm font-medium">По категориям</span>
          </div>
          <div className="space-y-3">
            {sortedCategories.map(([cat, data]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-foreground font-medium">{cat}</span>
                  <span className="text-muted-foreground font-mono-data">{data.count} шт · {data.value.toLocaleString()} ₽</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full transition-all"
                    style={{ width: `${(data.value / maxValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="ArrowLeftRight" size={15} className="text-muted-foreground" />
            <span className="text-sm font-medium">Движение товаров</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                <Icon name="ArrowDownLeft" size={14} />
                <span className="text-xs font-medium">Приход</span>
              </div>
              <div className="text-xl font-semibold font-mono-data text-emerald-700">+{recentIn}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                <Icon name="ArrowUpRight" size={14} />
                <span className="text-xs font-medium">Расход</span>
              </div>
              <div className="text-xl font-semibold font-mono-data text-red-600">−{recentOut}</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Последние операции</div>
            {mockMovements.slice(0, 6).map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.type === 'in' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  <span className="font-mono-data text-xs text-muted-foreground truncate">{m.article}</span>
                  <span className="text-xs text-foreground truncate hidden sm:block">{m.partName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-xs font-mono-data font-medium ${m.type === 'in' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {m.type === 'in' ? '+' : '−'}{m.quantity}
                  </span>
                  <span className="text-xs text-muted-foreground">{m.date.slice(5)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="AlertCircle" size={15} className="text-amber-500" />
          <span className="text-sm font-medium">Требуют внимания</span>
        </div>
        <div className="space-y-2">
          {mockParts
            .filter((p) => p.quantity === 0 || p.quantity <= p.minQuantity)
            .map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${p.quantity === 0 ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <span className="text-sm">{p.name}</span>
                  <span className="font-mono-data text-xs text-muted-foreground">{p.article}</span>
                </div>
                <span className={`text-sm font-mono-data font-medium ${p.quantity === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                  {p.quantity === 0 ? 'Нет' : `${p.quantity} / мин. ${p.minQuantity}`}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
