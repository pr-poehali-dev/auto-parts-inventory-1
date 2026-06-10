import { useRef } from 'react';
import Icon from '@/components/ui/icon';
import { ClientOrder, Client, OrderItem } from '@/data/mockData';

interface Props {
  orders: ClientOrder[];
  client?: Client;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

function clientName(c?: Client): string {
  if (!c) return '—';
  if (c.type === 'company' && c.companyName) return c.companyName;
  const parts = [c.lastName, c.firstName, c.middleName].filter(Boolean);
  return parts.length ? parts.join(' ') : (c.phone ?? '—');
}

export default function InvoiceModal({ orders, client, onConfirm, onClose, loading }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const allItems: (OrderItem & { orderNum: string })[] = orders.flatMap(o =>
    o.items.map(item => ({ ...item, orderNum: o.id.slice(0, 8) }))
  );

  const total = allItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const today = new Date().toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' });

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
          <div ref={printRef}>
            <h2 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>Товарная накладная</h2>
            <p style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>
              Клиент: {clientName(client)}{client?.phone ? ` · ${client.phone}` : ''} · Дата: {today}
            </p>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/40 text-xs text-muted-foreground">
                  <th className="text-left px-3 py-2 border border-border">№</th>
                  <th className="text-left px-3 py-2 border border-border">Артикул</th>
                  <th className="text-left px-3 py-2 border border-border">Наименование</th>
                  <th className="text-left px-3 py-2 border border-border">Бренд</th>
                  <th className="text-right px-3 py-2 border border-border">Кол-во</th>
                  <th className="text-right px-3 py-2 border border-border">Цена</th>
                  <th className="text-right px-3 py-2 border border-border">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((item, i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                    <td className="px-3 py-2 border border-border text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 border border-border font-mono text-xs">{item.article}</td>
                    <td className="px-3 py-2 border border-border">{item.name || item.article}</td>
                    <td className="px-3 py-2 border border-border text-muted-foreground">{item.brand || '—'}</td>
                    <td className="px-3 py-2 border border-border text-right">{item.quantity}</td>
                    <td className="px-3 py-2 border border-border text-right font-mono-data">{item.price.toLocaleString('ru')} ₽</td>
                    <td className="px-3 py-2 border border-border text-right font-mono-data font-medium">
                      {(item.price * item.quantity).toLocaleString('ru')} ₽
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/40 font-semibold">
                  <td colSpan={6} className="px-3 py-2 border border-border text-right">Итого:</td>
                  <td className="px-3 py-2 border border-border text-right font-mono-data">
                    {total.toLocaleString('ru')} ₽
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <div>
                <div style={{ borderTop: '1px solid #000', width: 200, paddingTop: 4 }}>Выдал: ________________</div>
              </div>
              <div>
                <div style={{ borderTop: '1px solid #000', width: 200, paddingTop: 4 }}>Получил: ________________</div>
              </div>
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
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
          >
            <Icon name="PackageCheck" size={15} />
            {loading ? 'Выдаём...' : 'Подтвердить выдачу'}
          </button>
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
