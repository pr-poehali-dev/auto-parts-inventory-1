import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Part, CATEGORIES } from '@/data/mockData';
import { getParts, updatePart, deletePart } from '@/api';

interface Props {
  part: Part;
  onClose: () => void;
  onUpdated?: (part: Part) => void;
  onDeleted?: (id: string) => void;
}

function dbToPart(p: Record<string, unknown>): Part {
  return {
    id: p.id as string, article: p.article as string, name: p.name as string,
    brand: (p.brand as string) || '', category: (p.category as string) || '',
    quantity: Number(p.quantity), minQuantity: Number(p.min_quantity),
    price: Number(p.price), location: (p.location as string) || '',
    analogs: (p.analogs as string[]) || [],
    oemArticle: (p.oem_article as string) || undefined,
    barcode: (p.barcode as string) || undefined,
    lastMovement: (p.last_movement as string) || undefined,
  };
}

export default function PartDetailModal({ part, onClose, onUpdated, onDeleted }: Props) {
  const [qty, setQty] = useState(part.quantity);
  const [moveType, setMoveType] = useState<'in' | 'out'>('out');
  const [moveQty, setMoveQty] = useState(1);
  const [note, setNote] = useState('');
  const [moved, setMoved] = useState(false);
  const [savingMove, setSavingMove] = useState(false);

  const [analogParts, setAnalogParts] = useState<Part[]>([]);

  // Режим редактирования
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editForm, setEditForm] = useState({
    article: part.article,
    name: part.name,
    brand: part.brand,
    category: part.category,
    quantity: part.quantity,
    minQuantity: part.minQuantity,
    price: part.price,
    location: part.location,
    oemArticle: part.oemArticle || '',
    barcode: part.barcode || '',
    analogs: part.analogs.join(', '),
  });

  useEffect(() => {
    if (part.analogs.length > 0) {
      getParts().then((data: unknown[]) => {
        const all = data as Array<Record<string, unknown>>;
        setAnalogParts(
          all
            .filter((p) => part.analogs.includes(p.article as string))
            .map(dbToPart)
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

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const payload = {
        article: editForm.article.trim(),
        name: editForm.name.trim(),
        brand: editForm.brand.trim(),
        category: editForm.category,
        quantity: Number(editForm.quantity),
        minQuantity: Number(editForm.minQuantity),
        price: Number(editForm.price),
        location: editForm.location.trim(),
        oemArticle: editForm.oemArticle.trim() || undefined,
        barcode: editForm.barcode.trim() || undefined,
        analogs: editForm.analogs.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const updated = await updatePart(part.id, payload);
      const updatedPart = dbToPart(updated as Record<string, unknown>);
      setQty(updatedPart.quantity);
      setEditing(false);
      onUpdated?.(updatedPart);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deletePart(part.id);
      onDeleted?.(part.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const stockStatus = qty === 0
    ? { label: 'Нет в наличии', cls: 'text-red-600 bg-red-50' }
    : qty <= part.minQuantity
    ? { label: 'Заканчивается', cls: 'text-amber-600 bg-amber-50' }
    : { label: 'В наличии', cls: 'text-emerald-600 bg-emerald-50' };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        {/* Шапка */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono-data text-sm font-semibold">{part.article}</span>
              {part.brand && <><span className="text-xs text-muted-foreground">·</span><span className="text-xs text-muted-foreground">{part.brand}</span></>}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stockStatus.cls}`}>{stockStatus.label}</span>
            </div>
            <h2 className="text-base font-semibold">{part.name}</h2>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 transition-colors"
              >
                <Icon name="Pencil" size={12} />
                Изменить
              </button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="X" size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* ── РЕЖИМ РЕДАКТИРОВАНИЯ ── */}
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Артикул *</label>
                  <input value={editForm.article} onChange={(e) => setEditForm((f) => ({ ...f, article: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">OEM артикул</label>
                  <input value={editForm.oemArticle} onChange={(e) => setEditForm((f) => ({ ...f, oemArticle: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Наименование *</label>
                <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Бренд</label>
                  <input value={editForm.brand} onChange={(e) => setEditForm((f) => ({ ...f, brand: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Место хранения</label>
                  <input value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Количество</label>
                  <input type="number" min={0} value={editForm.quantity}
                    onChange={(e) => setEditForm((f) => ({ ...f, quantity: +e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Мин. остаток</label>
                  <input type="number" min={0} value={editForm.minQuantity}
                    onChange={(e) => setEditForm((f) => ({ ...f, minQuantity: +e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Цена, ₽</label>
                  <input type="number" min={0} value={editForm.price}
                    onChange={(e) => setEditForm((f) => ({ ...f, price: +e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Категория</label>
                <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Аналоги (артикулы через запятую)</label>
                <input value={editForm.analogs} onChange={(e) => setEditForm((f) => ({ ...f, analogs: e.target.value }))}
                  placeholder="OP-641/1, W7008, OC217"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Штрихкод</label>
                <input value={editForm.barcode} onChange={(e) => setEditForm((f) => ({ ...f, barcode: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditing(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors">
                  Отмена
                </button>
                <button onClick={handleSaveEdit} disabled={saving || !editForm.article || !editForm.name}
                  className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-50 transition-colors">
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>

              <div className="border-t border-border pt-3">
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors">
                    <Icon name="Trash2" size={13} />
                    Удалить позицию со склада
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-red-600">Удалить навсегда?</span>
                    <button onClick={handleDelete} disabled={saving}
                      className="px-3 py-1 bg-red-500 text-white rounded-md text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50">
                      Да, удалить
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1 border border-border rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Отмена
                    </button>
                  </div>
                )}
              </div>
            </div>

          ) : (
            /* ── РЕЖИМ ПРОСМОТРА ── */
            <>
              {/* OEM-артикул */}
              {part.oemArticle && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  <Icon name="Tag" size={13} className="text-yellow-600 shrink-0" />
                  <span className="text-xs text-yellow-700">OEM:</span>
                  <span className="font-mono-data text-sm font-medium text-yellow-800">{part.oemArticle}</span>
                  <span className="text-xs text-yellow-600 ml-auto">система покажет эту деталь как заменитель</span>
                </div>
              )}

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
                  <button onClick={() => setMoveType('in')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${moveType === 'in' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                    + Приход
                  </button>
                  <button onClick={() => setMoveType('out')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${moveType === 'out' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                    − Расход
                  </button>
                </div>
                <div className="flex gap-2">
                  <input type="number" min={1} max={moveType === 'out' ? qty : undefined} value={moveQty}
                    onChange={(e) => setMoveQty(Math.max(1, +e.target.value))}
                    className="w-24 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono-data" />
                  <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="Комментарий..."
                    className="flex-1 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <button onClick={handleMove} disabled={(moveType === 'out' && moveQty > qty) || savingMove}
                    className="px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-40 transition-colors">
                    {moved ? <Icon name="Check" size={16} /> : savingMove ? '...' : 'OK'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Текущий остаток:</span>
                  <span className={`font-mono-data font-semibold ${qty === 0 ? 'text-red-500' : qty <= part.minQuantity ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {qty} шт
                  </span>
                </div>
              </div>

              {/* Аналоги */}
              {(part.analogs.length > 0 || analogParts.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="GitMerge" size={14} className="text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Аналоги</span>
                  </div>
                  {analogParts.length > 0 ? (
                    <div className="space-y-1.5">
                      {analogParts.map((a) => (
                        <div key={a.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                          <div>
                            <span className="font-mono-data text-xs font-medium">{a.article}</span>
                            <span className="text-xs text-muted-foreground ml-2">{a.name} · {a.brand}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono-data text-xs">{a.price.toLocaleString()} ₽</span>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${a.quantity === 0 ? 'text-red-600 bg-red-50' : a.quantity <= a.minQuantity ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>
                              {a.quantity} шт
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {part.analogs.map((a) => (
                        <span key={a} className="font-mono-data text-xs bg-muted px-2 py-1 rounded">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
