import Icon from '@/components/ui/icon';
import { ClientOrder, BalanceEntry } from '@/data/mockData';

interface Props {
  balance: number;
  orders: ClientOrder[];
  balanceHistory: BalanceEntry[];
  showBalance: boolean;
  balanceMode: 'add' | 'remove';
  balanceAmount: string;
  balanceNote: string;
  balanceSaved: boolean;
  savingBalance: boolean;
  showHistory: boolean;
  onToggleBalance: () => void;
  onBalanceModeChange: (mode: 'add' | 'remove') => void;
  onBalanceAmountChange: (v: string) => void;
  onBalanceNoteChange: (v: string) => void;
  onBalanceSave: () => void;
  onBalanceCancel: () => void;
  onToggleHistory: () => void;
}

export default function ClientBalancePanel({
  balance, orders, balanceHistory,
  showBalance, balanceMode, balanceAmount, balanceNote, balanceSaved, savingBalance,
  showHistory,
  onToggleBalance, onBalanceModeChange, onBalanceAmountChange, onBalanceNoteChange,
  onBalanceSave, onBalanceCancel, onToggleHistory,
}: Props) {
  const activeOrders = orders.filter((o) => !['cancelled', 'issued'].includes(o.status));
  const inWork = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const debt = inWork - balance;
  const hasDebt = debt > 0;

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name="Wallet" size={15} className="text-muted-foreground" />
          <span className="text-sm font-medium">Баланс клиента</span>
          <span className={`font-mono-data font-semibold text-sm ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
            {balance >= 0 ? '+' : ''}{balance.toLocaleString()} ₽
          </span>
          {balance > 0 && <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">переплата</span>}
          {balance < 0 && <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">задолженность</span>}
        </div>
        <button onClick={onToggleBalance}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 transition-colors">
          <Icon name="ArrowLeftRight" size={12} />
          Пополнить / Снять
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-muted/40 rounded-lg px-3 py-2">
          <div className="text-xs text-muted-foreground mb-0.5">Баланс</div>
          <div className={`font-mono-data font-semibold text-sm ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
            {balance > 0 ? '+' : ''}{balance.toLocaleString()} ₽
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg px-3 py-2">
          <div className="text-xs text-muted-foreground mb-0.5">В работе</div>
          <div className="font-mono-data font-semibold text-sm text-amber-600">
            {inWork > 0 ? `${inWork.toLocaleString()} ₽` : '—'}
          </div>
        </div>
        <div className={`rounded-lg px-3 py-2 ${hasDebt ? 'bg-red-50' : 'bg-muted/40'}`}>
          <div className="text-xs text-muted-foreground mb-0.5">Долг</div>
          <div className={`font-mono-data font-semibold text-sm ${hasDebt ? 'text-red-500' : 'text-emerald-600'}`}>
            {hasDebt ? `−${debt.toLocaleString()} ₽` : '—'}
          </div>
        </div>
      </div>

      {showBalance && (
        <div className="mt-3 border border-border rounded-lg p-3 space-y-2 animate-fade-in">
          <div className="flex gap-2">
            <button onClick={() => onBalanceModeChange('add')}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${balanceMode === 'add' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              + Пополнить
            </button>
            <button onClick={() => onBalanceModeChange('remove')}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${balanceMode === 'remove' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              − Снять
            </button>
          </div>
          <input type="number" min={0} value={balanceAmount}
            onChange={(e) => onBalanceAmountChange(e.target.value)}
            placeholder="Сумма, ₽"
            className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input type="text" value={balanceNote}
            onChange={(e) => onBalanceNoteChange(e.target.value)}
            placeholder="Комментарий (необязательно)"
            className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2 pt-1">
            <button onClick={onBalanceCancel}
              className="flex-1 py-1.5 border border-border rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors">
              Отмена
            </button>
            <button onClick={onBalanceSave} disabled={!balanceAmount || savingBalance}
              className="px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-40 transition-colors">
              {balanceSaved ? <Icon name="Check" size={16} /> : savingBalance ? '...' : 'OK'}
            </button>
          </div>
        </div>
      )}

      {balanceHistory.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <button onClick={onToggleHistory}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
            <Icon name="History" size={13} />
            <span>История операций</span>
            <span className="ml-1 bg-muted px-1.5 py-0.5 rounded text-xs">{balanceHistory.length}</span>
            <Icon name={showHistory ? 'ChevronUp' : 'ChevronDown'} size={13} className="ml-auto" />
          </button>

          {showHistory && (
            <div className="mt-2 space-y-1 animate-fade-in">
              {balanceHistory.map((entry) => {
                const isCredit = entry.type === 'add' || entry.type === 'prepaid';
                const typeLabel = { add: 'Пополнение', remove: 'Списание', prepaid: 'Предоплата', refund: 'Возврат' }[entry.type];
                const typeIcon = { add: 'ArrowDownLeft', remove: 'ArrowUpRight', prepaid: 'CreditCard', refund: 'Undo2' }[entry.type] as 'ArrowDownLeft';
                return (
                  <div key={entry.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        <Icon name={typeIcon} size={12} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{typeLabel}</div>
                        {entry.note && <div className="text-xs text-muted-foreground truncate">{entry.note}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-xs text-muted-foreground">{entry.date}</span>
                      <span className={`text-sm font-mono-data font-semibold ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isCredit ? '+' : '−'}{entry.amount.toLocaleString()} ₽
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
