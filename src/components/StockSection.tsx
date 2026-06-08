import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { Part, CATEGORIES } from '@/data/mockData';
import { getParts, createPart, deletePart } from '@/api';

interface StockSectionProps {
  onSelectPart: (part: Part) => void;
}

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
    costPrice: r.cost_price ? Number(r.cost_price) : undefined,
    location: (r.location as string) || '',
    analogs: (r.analogs as string[]) || [],
    oemArticle: (r.oem_article as string) || undefined,
    barcode: (r.barcode as string) || undefined,
    lastMovement: (r.last_movement as string) || undefined,
  };
}

export default function StockSection({ onSelectPart }: StockSectionProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStock, setFilterStock] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price'>('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [barcodeExisting, setBarcodeExisting] = useState<Part | null>(null);
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [barcodeFound, setBarcodeFound] = useState<Part | null | 'not_found'>(null);
  const [showBarcodeSearch, setShowBarcodeSearch] = useState(false);
  const articleInputRef = useRef<HTMLInputElement>(null);
  const scanSearchRef = useRef<HTMLInputElement>(null);
  const [newPart, setNewPart] = useState({
    article: '', oemArticle: '', name: '', brand: '', category: CATEGORIES[0], quantity: 0, minQuantity: 3, price: 0, costPrice: 0, location: '', barcode: '',
  });
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getParts()
      .then((data: unknown[]) => setParts(data.map(dbToPart)))
      .finally(() => setLoading(false));
  }, []);

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

  const handleBarcodeSearch = (value: string) => {
    setBarcodeQuery(value);
    if (!value.trim()) { setBarcodeFound(null); return; }
    const found = parts.find((p) => p.barcode === value.trim());
    setBarcodeFound(found ?? 'not_found');
  };

  const handleAddPart = async () => {
    if (!newPart.article || !newPart.name) return;
    setSaving(true);
    try {
      const created = await createPart(newPart);
      setParts((prev) => [...prev, dbToPart(created)]);
      setShowAddModal(false);
      setBarcodeExisting(null);
      setNewPart({ article: '', oemArticle: '', name: '', brand: '', category: CATEGORIES[0], quantity: 0, minQuantity: 3, price: 0, costPrice: 0, location: '', barcode: '' });
    } finally {
      setSaving(false);
    }
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setBarcodeFound(null); setBarcodeQuery(''); setShowBarcodeSearch(true); setTimeout(() => scanSearchRef.current?.focus(), 50); }}
            className="flex items-center gap-2 px-4 py-1.5 border border-border bg-white rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            <Icon name="Barcode" size={14} />
            Найти по сканеру
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 transition-colors"
          >
            <Icon name="Plus" size={14} />
            Добавить деталь
          </button>
        </div>
      </div>

      {/* Поиск по штрихкоду */}
      {showBarcodeSearch && (
        <div className="bg-white border border-border rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Icon name="Barcode" size={15} className="text-muted-foreground shrink-0" />
            <input
              ref={scanSearchRef}
              type="text"
              value={barcodeQuery}
              onChange={(e) => handleBarcodeSearch(e.target.value)}
              placeholder="Наведи сканер на штрихкод..."
              className="flex-1 text-sm font-mono-data focus:outline-none placeholder:font-sans placeholder:text-muted-foreground"
              autoFocus
            />
            <button onClick={() => { setBarcodeQuery(''); setBarcodeFound(null); setShowBarcodeSearch(false); }} className="text-muted-foreground hover:text-foreground shrink-0">
              <Icon name="X" size={14} />
            </button>
          </div>
          {barcodeFound === 'not_found' && (
            <div className="text-xs text-red-500 pl-6">Деталь с таким штрихкодом не найдена</div>
          )}
          {barcodeFound && barcodeFound !== 'not_found' && (
            <button
              onClick={() => { onSelectPart(barcodeFound as Part); setBarcodeQuery(''); setBarcodeFound(null); setShowBarcodeSearch(false); }}
              className="flex items-center justify-between gap-3 pl-6 pr-2 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-emerald-800">{(barcodeFound as Part).name}</div>
                <div className="text-xs text-emerald-600 font-mono-data">{(barcodeFound as Part).article} · {(barcodeFound as Part).quantity} шт</div>
              </div>
              <Icon name="ChevronRight" size={14} className="text-emerald-600 shrink-0" />
            </button>
          )}
        </div>
      )}

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-0 px-4 py-2 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>Наименование / Артикул</span>
          <span>Категория</span>
          <span>Место</span>
          <span>Кол-во</span>
          <span>Цена</span>
          <span></span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Icon name="Loader" size={24} className="mx-auto mb-2 opacity-30 animate-spin" />
            Загрузка...
          </div>
        ) : filtered.length === 0 ? (
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
                <div className="font-mono-data text-xs text-muted-foreground mt-0.5 ml-3.5 flex items-center gap-1.5 flex-wrap">
                  <span>{part.article}</span>
                  {part.oemArticle && (
                    <>
                      <span className="text-border">·</span>
                      <span className="text-yellow-600" title="OEM артикул">{part.oemArticle}</span>
                    </>
                  )}
                  {part.brand && <><span className="text-border">·</span><span>{part.brand}</span></>}
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowAddModal(false); setBarcodeExisting(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold">Новая деталь</h3>
              <button onClick={() => { setShowAddModal(false); setBarcodeExisting(null); }} className="text-muted-foreground hover:text-foreground">
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {/* Штрихкод — первым, со сканером */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Штрихкод</label>
                <div className="flex gap-2">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={newPart.barcode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewPart((p) => ({ ...p, barcode: val }));
                      const found = parts.find((p) => p.barcode === val.trim());
                      setBarcodeExisting(found ?? null);
                    }}
                    placeholder="Наведи сканер и нажми кнопку"
                    className="flex-1 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono-data placeholder:font-sans placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => { barcodeInputRef.current?.focus(); barcodeInputRef.current?.select(); }}
                    title="Нажми и сканируй штрих-код"
                    className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-md text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:bg-muted/40 transition-colors whitespace-nowrap"
                  >
                    <Icon name="Barcode" size={16} />
                    <span className="hidden sm:inline">Сканер</span>
                  </button>
                </div>
                {/* Найдена существующая деталь */}
                {barcodeExisting && (
                  <div className="mt-2 flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-xs text-amber-700 font-medium">Деталь уже есть на складе</div>
                      <div className="text-sm font-semibold text-amber-900">{barcodeExisting.name}</div>
                      <div className="text-xs text-amber-600 font-mono-data">{barcodeExisting.article} · {barcodeExisting.quantity} шт</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { onSelectPart(barcodeExisting); setShowAddModal(false); setBarcodeExisting(null); }}
                      className="shrink-0 text-xs px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
                    >
                      Открыть
                    </button>
                  </div>
                )}
              </div>
              {/* Артикул — обычное поле */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Артикул *</label>
                <input
                  ref={articleInputRef}
                  type="text"
                  value={newPart.article}
                  onChange={(e) => setNewPart((p) => ({ ...p, article: e.target.value }))}
                  placeholder="Каталожный номер"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono-data placeholder:font-sans placeholder:text-muted-foreground"
                />
              </div>
              {[
                { key: 'oemArticle', label: 'Оригинальный артикул (OEM)', type: 'text', placeholder: 'Заводской номер производителя' },
                { key: 'name', label: 'Наименование *', type: 'text', placeholder: '' },
                { key: 'brand', label: 'Бренд', type: 'text', placeholder: '' },
                { key: 'location', label: 'Место хранения', type: 'text', placeholder: '' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                  <input
                    type={type}
                    value={(newPart as Record<string, unknown>)[key] as string}
                    onChange={(e) => setNewPart((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono-data placeholder:font-sans placeholder:text-muted-foreground"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Кол-во</label>
                  <input inputMode="numeric" value={newPart.quantity === 0 ? '' : newPart.quantity}
                    placeholder="0"
                    onChange={(e) => setNewPart((p) => ({ ...p, quantity: parseInt(e.target.value.replace(/\D/g, '')) || 0 }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Мин. остаток</label>
                  <input inputMode="numeric" value={newPart.minQuantity === 0 ? '' : newPart.minQuantity}
                    placeholder="0"
                    onChange={(e) => setNewPart((p) => ({ ...p, minQuantity: parseInt(e.target.value.replace(/\D/g, '')) || 0 }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Закупка, ₽</label>
                  <input inputMode="decimal" value={newPart.costPrice === 0 ? '' : newPart.costPrice}
                    placeholder="0"
                    onChange={(e) => setNewPart((p) => ({ ...p, costPrice: parseFloat(e.target.value.replace(/[^\d.]/g, '')) || 0 }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Продажа, ₽</label>
                  <input inputMode="decimal" value={newPart.price === 0 ? '' : newPart.price}
                    placeholder="0"
                    onChange={(e) => setNewPart((p) => ({ ...p, price: parseFloat(e.target.value.replace(/[^\d.]/g, '')) || 0 }))}
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
              <button onClick={handleAddPart} disabled={saving}
                className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-50">
                {saving ? 'Сохранение...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}