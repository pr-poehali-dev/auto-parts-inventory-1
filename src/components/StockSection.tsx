import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { mockParts, Part, CATEGORIES } from '@/data/mockData';

interface StockSectionProps {
  onSelectPart: (part: Part) => void;
}

export default function StockSection({ onSelectPart }: StockSectionProps) {
  const [parts, setParts] = useState<Part[]>(mockParts);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStock, setFilterStock] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price'>('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPart, setNewPart] = useState({
    article: '', name: '', brand: '', category: CATEGORIES[0], quantity: 0, minQuantity: 3, price: 0, location: '',
  });

  const filtered = parts
    .filter((p) => !filterCategory || p.category === filterCategory)
    .filter((p) => {
      if (filterStock === 'low') return p.quantity > 0 && p.quantity <= p.minQuantity;
      if (filterStock === 'out') return p.quantity === 0;
      if (filterStock === 'ok') return p.quantity > p.minQuantity;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      if (sortBy === 'price') return b.price - a.price;
      return a.name.localeCompare(b.name);
    });

  const handleAddPart = () => {
    if (!newPart.article || !newPart.name) return;
    const part: Part = {
      ...newPart,
      id: Date.now().toString(),
      analogs: [],
    };
    setParts((prev) => [...prev, part]);
    setShowAddModal(false);
    setNewPart({ article: '', name: '', brand: '', category: CATEGORIES[0], quantity: 0, minQuantity: 3, price: 0, location: '' });
  };

  const stockIndicator = (qty: number, min: number) => {
    if (qty === 0) return 'bg-red-500';
    if (qty <= min) return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-sm border border-border rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Все категории</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="flex rounded-md border border-border overflow-hidden bg-white">
            {[
              { value: 'all', label: 'Все' },
              { value: 'ok', label: 'В норме' },
              { value: 'low', label: 'Мало' },
              { value: 'out', label: 'Нет' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterStock(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterStock === opt.value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'quantity' | 'price')}
            className="text-sm border border-border rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="name">По названию</option>
            <option value="quantity">По количеству</option>
            <option value="price">По цене</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-1.5 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 transition-colors"
        >
          <Icon name="Plus" size={14} />
          Добавить деталь
        </button>
      </div>

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-0 px-4 py-2 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>Наименование / Артикул</span>
          <span>Категория</span>
          <span>Место</span>
          <span>Кол-во</span>
          <span>Цена</span>
          <span></span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Icon name="Package" size={32} className="mx-auto mb-2 opacity-20" />
            Нет позиций
          </div>
        ) : (
          filtered.map((part) => (
            <div
              key={part.id}
              className="hover-row grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-0 items-center px-4 py-3 border-b border-border last:border-0 cursor-pointer transition-colors animate-fade-in"
              onClick={() => onSelectPart(part)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stockIndicator(part.quantity, part.minQuantity)}`} />
                  <span className="text-sm font-medium">{part.name}</span>
                </div>
                <div className="font-mono-data text-xs text-muted-foreground mt-0.5 ml-3.5">
                  {part.article} · {part.brand}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{part.category}</span>
              <span className="font-mono-data text-xs bg-muted px-1.5 py-0.5 rounded w-fit">{part.location || '—'}</span>
              <span className={`text-sm font-medium font-mono-data ${part.quantity === 0 ? 'text-red-500' : part.quantity <= part.minQuantity ? 'text-amber-600' : ''}`}>
                {part.quantity}
              </span>
              <span className="text-sm">{part.price.toLocaleString()} ₽</span>
              <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
            </div>
          ))
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Показано: {filtered.length} из {parts.length} позиций
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold">Новая деталь</h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { key: 'article', label: 'Артикул *', type: 'text' },
                { key: 'name', label: 'Наименование *', type: 'text' },
                { key: 'brand', label: 'Бренд', type: 'text' },
                { key: 'location', label: 'Место хранения', type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                  <input
                    type={type}
                    value={(newPart as Record<string, unknown>)[key] as string}
                    onChange={(e) => setNewPart((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Количество</label>
                  <input type="number" min={0} value={newPart.quantity}
                    onChange={(e) => setNewPart((p) => ({ ...p, quantity: +e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Мин. остаток</label>
                  <input type="number" min={0} value={newPart.minQuantity}
                    onChange={(e) => setNewPart((p) => ({ ...p, minQuantity: +e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Цена, ₽</label>
                  <input type="number" min={0} value={newPart.price}
                    onChange={(e) => setNewPart((p) => ({ ...p, price: +e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Категория</label>
                <select value={newPart.category}
                  onChange={(e) => setNewPart((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors">
                Отмена
              </button>
              <button onClick={handleAddPart}
                className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 transition-colors">
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
