import Icon from '@/components/ui/icon';
import { OrderItem, Part } from '@/data/mockData';

interface Props {
  mode: 'create' | 'edit';
  clientName: string;
  editingOrderId?: string | null;
  orderItems: OrderItem[];
  orderNote: string;
  orderPrepaid: number;
  savingOrder: boolean;
  articleQuery: Record<number, string>;
  articleSuggestions: Record<number, Part[]>;
  onClose: () => void;
  onSave: () => void;
  onAddItem: () => void;
  onRemoveItem: (idx: number) => void;
  onUpdateItem: (idx: number, field: keyof OrderItem, value: string | number) => void;
  onArticleSearch: (idx: number, val: string) => void;
  onSelectSuggestion: (idx: number, part: Part) => void;
  onNoteChange: (v: string) => void;
  onPrepaidChange: (v: number) => void;
}

const inputCls = 'w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export default function OrderFormModal({
  mode, clientName, editingOrderId,
  orderItems, orderNote, orderPrepaid, savingOrder,
  articleQuery, articleSuggestions,
  onClose, onSave, onAddItem, onRemoveItem, onUpdateItem,
  onArticleSearch, onSelectSuggestion, onNoteChange, onPrepaidChange,
}: Props) {
  const orderTotal = orderItems.reduce((s, i) => s + i.quantity * i.price, 0);
  const orderCostTotal = orderItems.reduce((s, i) => s + i.quantity * (i.costPrice ?? 0), 0);
  const orderMargin = orderTotal - orderCostTotal;

  const title = mode === 'create' ? 'Новый заказ' : 'Редактировать заказ';
  const subtitle = mode === 'create'
    ? clientName
    : `#${(editingOrderId || '').slice(0, 8)} · ${clientName}`;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Позиции заказа</div>

          {orderItems.map((item, idx) => (
            <div key={idx} className="border-2 border-border rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground tracking-wide">ПОЗИЦИЯ {idx + 1}</span>
                {orderItems.length > 1 && (
                  <button onClick={() => onRemoveItem(idx)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Icon name="Trash2" size={14} />
                  </button>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div className="relative">
                  <label className="block text-xs text-muted-foreground mb-1">Артикул</label>
                  <input
                    value={articleQuery[idx] ?? item.article}
                    onChange={(e) => onArticleSearch(idx, e.target.value)}
                    placeholder="Поиск по артикулу..."
                    className={`${inputCls} font-mono-data`}
                  />
                  {(articleSuggestions[idx]?.length ?? 0) > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-md shadow-lg z-10 mt-1">
                      {articleSuggestions[idx].map((p) => (
                        <div key={p.id} onClick={() => onSelectSuggestion(idx, p)}
                          className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-0">
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Наименование</label>
                    <input value={item.name} onChange={(e) => onUpdateItem(idx, 'name', e.target.value)}
                      placeholder="Название запчасти" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Бренд</label>
                    <input value={item.brand} onChange={(e) => onUpdateItem(idx, 'brand', e.target.value)}
                      placeholder="Производитель" className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Кол-во</label>
                    <input type="number" min={1}
                      value={item.quantity === 0 ? '' : item.quantity}
                      placeholder="1"
                      onChange={(e) => onUpdateItem(idx, 'quantity', e.target.value === '' ? 0 : +e.target.value)}
                      className={`${inputCls} font-mono-data`} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Закупка, ₽</label>
                    <input type="number" min={0}
                      value={item.costPrice === 0 ? '' : item.costPrice}
                      placeholder="0"
                      onChange={(e) => onUpdateItem(idx, 'costPrice', e.target.value === '' ? 0 : +e.target.value)}
                      className={`${inputCls} font-mono-data`} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Продажа, ₽</label>
                    <input type="number" min={0}
                      value={item.price === 0 ? '' : item.price}
                      placeholder="0"
                      onChange={(e) => onUpdateItem(idx, 'price', e.target.value === '' ? 0 : +e.target.value)}
                      className={`${inputCls} font-mono-data`} />
                  </div>
                </div>

                {(item.quantity > 0 && (item.price > 0 || (item.costPrice ?? 0) > 0)) && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 px-2 py-1.5 rounded-md">
                    <span>Итого: <span className="font-mono-data font-medium text-foreground">{(item.quantity * item.price).toLocaleString()} ₽</span></span>
                    {(item.costPrice ?? 0) > 0 && (
                      <span>Маржа: <span className={`font-mono-data font-medium ${item.price - (item.costPrice ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {((item.price - (item.costPrice ?? 0)) * item.quantity).toLocaleString()} ₽
                      </span></span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Ячейка на складе</label>
                    <input value={item.storageCell ?? ''} onChange={(e) => onUpdateItem(idx, 'storageCell', e.target.value)}
                      placeholder="A1, Б-3..." className={`${inputCls} font-mono-data`} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Примечание к позиции</label>
                    <input value={item.note ?? ''} onChange={(e) => onUpdateItem(idx, 'note', e.target.value)}
                      placeholder="Доп. информация..." className={inputCls} />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button onClick={onAddItem}
            className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-1.5">
            <Icon name="Plus" size={14} />
            Добавить позицию
          </button>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Примечание к заказу</label>
            <textarea value={orderNote} onChange={(e) => onNoteChange(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          {orderTotal > 0 && (
            <div className="border border-border rounded-lg p-3 space-y-1.5 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Итого продажа:</span>
                <span className="font-mono-data text-sm font-semibold">{orderTotal.toLocaleString()} ₽</span>
              </div>
              {orderCostTotal > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Себестоимость:</span>
                    <span className="font-mono-data text-sm text-muted-foreground">{orderCostTotal.toLocaleString()} ₽</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Маржа:</span>
                    <span className={`font-mono-data text-sm font-semibold ${orderMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {orderMargin.toLocaleString()} ₽
                      {orderTotal > 0 && <span className="text-xs font-normal ml-1">({Math.round(orderMargin / orderTotal * 100)}%)</span>}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground shrink-0">Предоплата:</label>
                <input type="number" min={0} value={orderPrepaid || ''}
                  onChange={(e) => onPrepaidChange(+e.target.value)}
                  placeholder="0"
                  className="flex-1 px-3 py-1.5 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
                <span className="text-sm text-muted-foreground">₽</span>
              </div>
              {orderPrepaid >= orderTotal && (
                <div className="text-xs text-emerald-600 flex items-center gap-1">
                  <Icon name="CheckCircle2" size={12} /> Полная оплата
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors">
            Отмена
          </button>
          <button onClick={onSave} disabled={savingOrder || !orderItems.some((i) => (i.article || i.name) && i.quantity > 0)}
            className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-50 transition-colors">
            {savingOrder ? 'Сохранение...' : mode === 'create' ? 'Создать заказ' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
