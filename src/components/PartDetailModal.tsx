import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Part } from '@/data/mockData';
import { getParts, updatePart } from '@/api';

interface Props {
  part: Part;
  onClose: () => void;
}

export default function PartDetailModal({ part, onClose }: Props) {
  const [qty, setQty] = useState(part.quantity);
  const [moveType, setMoveType] = useState<'in' | 'out'>('out');
  const [moveQty, setMoveQty] = useState(1);
  const [note, setNote] = useState('');
  const [moved, setMoved] = useState(false);

  const [editingOem, setEditingOem] = useState(false);
  const [oem, setOem] = useState(part.oemArticle || '');
  const [oemSaved, setOemSaved] = useState(false);

  const [analogParts, setAnalogParts] = useState<Part[]>([]);
  const [savingMove, setSavingMove] = useState(false);

  useEffect(() => {
    if (part.analogs.length > 0) {
      getParts().then((data: unknown[]) => {
        const all = data as Array<Record<string, unknown>>;
        setAnalogParts(
          all
            .filter((p) => part.analogs.includes(p.article as string))
            .map((p) => ({
              id: p.id as string, article: p.article as string, name: p.name as string,
              brand: (p.brand as string) || '', category: (p.category as string) || '',
              quantity: Number(p.quantity), minQuantity: Number(p.min_quantity),
              price: Number(p.price), location: (p.location as string) || '',
              analogs: (p.analogs as string[]) || [],
            }))
        );
      });
    }
  }, [part.id]);

  const handleMove = async () => {
    if (moveType === 'out' && moveQty > qty) return;
    const newQty = moveType === 'in' ? qty + moveQty : qty - moveQty;
    setSavingMove(true);
    try {
      await updatePart(part.id, {
        article: part.article, name: part.name, brand: part.brand,
        category: part.category, quantity: newQty, minQuantity: part.minQuantity,
        price: part.price, location: part.location, analogs: part.analogs,
        oemArticle: part.oemArticle,
      });
      setQty(newQty);
      setMoved(true);
      setTimeout(() => setMoved(false), 2000);
      setNote('');
      setMoveQty(1);
    } finally {
      setSavingMove(false);
    }
  };

  const handleSaveOem = async () => {
    const newOem = oem.trim() || undefined;
    await updatePart(part.id, {
      article: part.article, name: part.name, brand: part.brand,
      category: part.category, quantity: qty, minQuantity: part.minQuantity,
      price: part.price, location: part.location, analogs: part.analogs,
      oemArticle: newOem,
    });
    part.oemArticle = newOem;
    setEditingOem(false);
    setOemSaved(true);
    setTimeout(() => setOemSaved(false), 2000);
  };

  const stockStatus = qty === 0
    ? { label: 'Нет в наличии', cls: 'text-red-600 bg-red-50' }
    : qty <= part.minQuantity
    ? { label: 'Заканчивается', cls: 'text-amber-600 bg-amber-50' }
    : { label: 'В наличии', cls: 'text-emerald-600 bg-emerald-50' };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono-data text-sm font-semibold text-foreground">{part.article}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{part.brand}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stockStatus.cls}`}>{stockStatus.label}</span>
            </div>
            <h2 className="text-base font-semibold">{part.name}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-4 mt-0.5 shrink-0">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* OEM-артикул — отдельный блок с редактированием */}
          <div className="border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Icon name="Tag" size={13} className="text-yellow-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Оригинальный артикул (OEM)</span>
              </div>
              {!editingOem && (
                <button
                  onClick={() => setEditingOem(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name="Pencil" size={12} />
                  Изменить
                </button>
              )}
            </div>

            {editingOem ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={oem}
                  onChange={(e) => setOem(e.target.value)}
                  placeholder="Введите OEM-номер производителя..."
                  autoFocus
                  className="flex-1 px-3 py-1.5 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleSaveOem}
                  className="px-3 py-1.5 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 transition-colors"
                >
                  <Icon name="Check" size={14} />
                </button>
                <button
                  onClick={() => { setEditingOem(false); setOem(part.oemArticle || ''); }}
                  className="px-3 py-1.5 border border-border rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name="X" size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {oem ? (
                  <>
                    <span className="font-mono-data text-sm font-medium text-yellow-800 bg-yellow-50 px-2 py-1 rounded">{oem}</span>
                    {oemSaved && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1 animate-fade-in">
                        <Icon name="CheckCircle" size={12} /> Сохранено
                      </span>
                    )}
                  </>
                ) : (
                  <span
                    className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => setEditingOem(true)}
                  >
                    Не указан — нажмите чтобы добавить
                  </span>
                )}
              </div>
            )}

            {oem && (
              <p className="text-xs text-muted-foreground mt-2">
                При поиске по этому номеру система покажет данную деталь как заменитель
              </p>
            )}
          </div>

          {/* Характеристики */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Количество', value: `${qty} шт`, mono: true },
              { label: 'Мин. остаток', value: `${part.minQuantity} шт`, mono: true },
              { label: 'Цена', value: `${part.price.toLocaleString()} ₽`, mono: true },
              { label: 'Место', value: part.location || '—', mono: true },
              { label: 'Категория', value: part.category, mono: false },
              { label: 'Последнее движение', value: part.lastMovement || '—', mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label} className="bg-muted/40 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">{label}</div>
                <div className={`text-sm font-medium ${mono ? 'font-mono-data' : ''}`}>{value}</div>
              </div>
            ))}
          </div>

          {part.barcode && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name="Barcode" size={14} />
              <span className="font-mono-data">{part.barcode}</span>
            </div>
          )}

          {/* Движение */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Движение товара</div>
            <div className="flex gap-2">
              <button
                onClick={() => setMoveType('in')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${moveType === 'in' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                + Приход
              </button>
              <button
                onClick={() => setMoveType('out')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${moveType === 'out' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                − Расход
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={moveType === 'out' ? qty : undefined}
                value={moveQty}
                onChange={(e) => setMoveQty(Math.max(1, +e.target.value))}
                className="w-24 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono-data"
              />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Комментарий..."
                className="flex-1 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleMove}
                disabled={(moveType === 'out' && moveQty > qty) || savingMove}
                className="px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-40 transition-colors"
              >
                {moved ? <Icon name="Check" size={16} /> : savingMove ? '...' : 'OK'}
              </button>
            </div>
          </div>

          {/* Аналоги */}
          {analogParts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Icon name="GitMerge" size={14} className="text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Аналоги на складе</span>
              </div>
              <div className="space-y-1.5">
                {analogParts.map((ap) => (
                  <div key={ap.id} className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
                    <div className="min-w-0">
                      <span className="font-mono-data text-xs font-medium">{ap.article}</span>
                      {ap.oemArticle && (
                        <span className="font-mono-data text-xs text-blue-500 ml-1.5">OEM: {ap.oemArticle}</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-2">{ap.brand} · {ap.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs font-mono-data">{ap.price.toLocaleString()} ₽</span>
                      <span className={`text-xs font-mono-data font-medium ${ap.quantity === 0 ? 'text-red-500' : ap.quantity <= ap.minQuantity ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {ap.quantity} шт
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}