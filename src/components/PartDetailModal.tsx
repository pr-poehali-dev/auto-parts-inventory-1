import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Part, mockParts } from '@/data/mockData';

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

  const analogParts = mockParts.filter((p) => part.analogs.includes(p.article));

  const handleMove = () => {
    if (moveType === 'out' && moveQty > qty) return;
    const newQty = moveType === 'in' ? qty + moveQty : qty - moveQty;
    setQty(newQty);
    setMoved(true);
    setTimeout(() => setMoved(false), 2000);
    setNote('');
    setMoveQty(1);
  };

  const stockStatus = qty === 0
    ? { label: 'Нет в наличии', cls: 'text-red-600 bg-red-50' }
    : qty <= part.minQuantity
    ? { label: 'Заканчивается', cls: 'text-amber-600 bg-amber-50' }
    : { label: 'В наличии', cls: 'text-emerald-600 bg-emerald-50' };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono-data text-sm font-semibold text-foreground">{part.article}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{part.brand}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stockStatus.cls}`}>{stockStatus.label}</span>
            </div>
            <h2 className="text-base font-semibold">{part.name}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-4 mt-0.5">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
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
                disabled={moveType === 'out' && moveQty > qty}
                className="px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-40 transition-colors"
              >
                {moved ? <Icon name="Check" size={16} /> : 'OK'}
              </button>
            </div>
          </div>

          {analogParts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Icon name="GitMerge" size={14} className="text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Аналоги на складе</span>
              </div>
              <div className="space-y-1.5">
                {analogParts.map((ap) => (
                  <div key={ap.id} className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
                    <div>
                      <span className="font-mono-data text-xs font-medium">{ap.article}</span>
                      <span className="text-xs text-muted-foreground ml-2">{ap.brand} · {ap.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
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
