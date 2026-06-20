import { useRef, useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { ClientOrder, Client, OrderItem } from '@/data/mockData';
import { getCompanySettings } from '@/api';
import { useAuth } from '@/context/AuthContext';

interface IssuedItem {
  orderId: string;
  itemIndex: number;
  issuedQty: number;
}

interface Props {
  orders: ClientOrder[];
  client?: Client;
  onConfirm: (issuedItems: IssuedItem[]) => void;
  onClose: () => void;
  loading?: boolean;
}

interface CompanySettings {
  name: string; inn: string; ogrn: string; address: string; phone: string; email: string;
}

function clientName(c?: Client): string {
  if (!c) return '—';
  if (c.type === 'company' && c.companyName) return c.companyName;
  const parts = [c.lastName, c.firstName, c.middleName].filter(Boolean);
  return parts.length ? parts.join(' ') : (c.phone ?? '—');
}

export default function InvoiceModal({ orders, client, onConfirm, onClose, loading }: Props) {
  const { token } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [company, setCompany] = useState<CompanySettings>({ name: '', inn: '', ogrn: '', address: '', phone: '', email: '' });

  type FlatItem = OrderItem & { orderId: string; itemIndex: number; issuedQty: number };

  const [items, setItems] = useState<FlatItem[]>(() =>
    orders.flatMap(o =>
      o.items
        .filter(it => it.status !== 'returned')
        .map((item, i) => ({ ...item, orderId: o.id, itemIndex: i, issuedQty: item.quantity }))
    )
  );

  useEffect(() => {
    if (token) getCompanySettings(token).then((d: Record<string, string>) => setCompany(c => ({ ...c, ...d }))).catch(() => {});
  }, [token]);

  const today = new Date().toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const setQty = (idx: number, val: number) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const clamped = Math.max(0, Math.min(val, it.quantity));
      return { ...it, issuedQty: clamped };
    }));
  };

  const total = items.reduce((s, i) => s + i.price * i.issuedQty, 0);
  const hasPartial = items.some(it => it.issuedQty < it.quantity);
  const hasZero = items.some(it => it.issuedQty === 0);
  const allZero = items.every(it => it.issuedQty === 0);

  const handleConfirm = () => {
    const issuedItems: IssuedItem[] = items
      .filter(it => it.issuedQty > 0)
      .map(it => ({ orderId: it.orderId, itemIndex: it.itemIndex, issuedQty: it.issuedQty }));
    onConfirm(issuedItems);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Накладная</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; color: #000; margin: 20px; }
        h2 { font-size: 16px; margin-bottom: 4px; }
        .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; text-align: left; padding: 6px 8px; border: 1px solid #ddd; font-size: 12px; }
        td { padding: 6px 8px; border: 1px solid #ddd; font-size: 12px; }
        .total-row td { font-weight: bold; background: #fafafa; }
        .footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 12px; }
        .sign { border-top: 1px solid #000; width: 200px; padding-top: 4px; }
      </style>
      </head><body>${content.innerHTML}</body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <div className="text-base font-semibold">Товарная накладная</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {orders.length > 1 ? `${orders.length} заказа · ` : ''}{clientName(client)} · {today}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Контент накладной */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {hasPartial && (
            <div className="mb-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Icon name="Info" size={13} className="mt-0.5 shrink-0" />
              <span>Позиции с уменьшенным количеством останутся в заказе как невыданные.</span>
            </div>
          )}

          {/* Таблица с редактированием кол-ва */}
          <div className="border border-border rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/40 text-xs text-muted-foreground">
                  <th className="text-left px-3 py-2 border-b border-border">Позиция</th>
                  <th className="text-right px-3 py-2 border-b border-border">В заказе</th>
                  <th className="text-right px-3 py-2 border-b border-border">Выдаю</th>
                  <th className="text-right px-3 py-2 border-b border-border">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className={`${i % 2 === 0 ? '' : 'bg-muted/20'} ${item.issuedQty === 0 ? 'opacity-40' : ''}`}>
                    <td className="px-3 py-2 border-b border-border">
                      <div className="font-medium text-xs">{item.name || item.article}</div>
                      <div className="text-xs text-muted-foreground font-mono">{item.article}{item.brand ? ` · ${item.brand}` : ''}</div>
                    </td>
                    <td className="px-3 py-2 border-b border-border text-right text-muted-foreground">{item.quantity}</td>
                    <td className="px-3 py-2 border-b border-border text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setQty(i, item.issuedQty - 1)}
                          disabled={item.issuedQty <= 0}
                          className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/40 disabled:opacity-30 transition-colors"
                        >
                          <Icon name="Minus" size={11} />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={item.issuedQty}
                          onChange={e => setQty(i, Number(e.target.value))}
                          className="w-12 text-center border border-border rounded px-1 py-0.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button
                          onClick={() => setQty(i, item.issuedQty + 1)}
                          disabled={item.issuedQty >= item.quantity}
                          className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/40 disabled:opacity-30 transition-colors"
                        >
                          <Icon name="Plus" size={11} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-b border-border text-right font-mono-data font-medium">
                      {(item.price * item.issuedQty).toLocaleString('ru')} ₽
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/40 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-right text-sm">Итого к выдаче:</td>
                  <td className="px-3 py-2 text-right font-mono-data">{total.toLocaleString('ru')} ₽</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Скрытый printRef для печати */}
          <div ref={printRef} style={{ display: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
              <div style={{ flex: 1 }}>
                {company.name && <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>{company.name}</div>}
                {company.inn && <div style={{ fontSize: 12, color: '#555' }}>ИНН: {company.inn}</div>}
                {company.ogrn && <div style={{ fontSize: 12, color: '#555' }}>ОГРН: {company.ogrn}</div>}
                {company.address && <div style={{ fontSize: 12, color: '#555' }}>{company.address}</div>}
                {company.phone && <div style={{ fontSize: 12, color: '#555' }}>Тел: {company.phone}</div>}
                {!company.name && !company.inn && (
                  <div style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>Реквизиты не заполнены</div>
                )}
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>Покупатель</div>
                <div style={{ fontSize: 12, color: '#555' }}>{clientName(client)}</div>
                {client?.phone && <div style={{ fontSize: 12, color: '#555' }}>{client.phone}</div>}
              </div>
            </div>
            <h2 style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 4, borderTop: '1px solid #eee', paddingTop: 12 }}>
              Товарная накладная · {today}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', border: '1px solid #ddd', fontSize: 12 }}>№</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', border: '1px solid #ddd', fontSize: 12 }}>Артикул</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', border: '1px solid #ddd', fontSize: 12 }}>Наименование</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', border: '1px solid #ddd', fontSize: 12 }}>Бренд</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #ddd', fontSize: 12 }}>Кол-во</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #ddd', fontSize: 12 }}>Цена</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #ddd', fontSize: 12 }}>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {items.filter(it => it.issuedQty > 0).map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: 12, color: '#555' }}>{i + 1}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: 12, fontFamily: 'monospace' }}>{item.article}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: 12 }}>{item.name || item.article}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: 12, color: '#555' }}>{item.brand || '—'}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: 12, textAlign: 'right' }}>{item.issuedQty}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: 12, textAlign: 'right' }}>{item.price.toLocaleString('ru')} ₽</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: 12, textAlign: 'right', fontWeight: 'bold' }}>
                      {(item.price * item.issuedQty).toLocaleString('ru')} ₽
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f5f5f5', fontWeight: 'bold' }}>
                  <td colSpan={6} style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: 12, textAlign: 'right' }}>Итого:</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: 12, textAlign: 'right' }}>{total.toLocaleString('ru')} ₽</td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <div><div style={{ borderTop: '1px solid #000', width: 200, paddingTop: 4 }}>Выдал: ________________</div></div>
              <div><div style={{ borderTop: '1px solid #000', width: 200, paddingTop: 4 }}>Получил: ________________</div></div>
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-sm font-medium border border-border rounded-xl px-4 py-2.5 hover:bg-muted/40 transition-colors"
          >
            <Icon name="Printer" size={15} />
            Печать
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || allZero}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
          >
            <Icon name="PackageCheck" size={15} />
            {loading ? 'Выдаём...' : hasPartial && !allZero ? `Выдать частично (${items.filter(it => it.issuedQty > 0).length} поз.)` : 'Подтвердить выдачу'}
          </button>
          {hasZero && !allZero && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Icon name="Info" size={12} className="mr-1" />
              {items.filter(it => it.issuedQty === 0).length} поз. останется
            </div>
          )}
          <button
            onClick={onClose}
            className="text-sm font-medium border border-border rounded-xl px-4 py-2.5 hover:bg-muted/40 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}