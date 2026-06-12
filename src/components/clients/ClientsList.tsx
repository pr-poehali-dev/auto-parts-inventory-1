import Icon from '@/components/ui/icon';
import EmptyBackground from '@/components/ui/empty-background';
import { Client } from '@/data/mockData';
import { clientName, clientInitials, isNew } from './clientsUtils';

type GroupFilter = 'all' | 'new' | 'debt' | 'active' | 'deleted';

interface ClientsListProps {
  clients: Client[];
  loading: boolean;
  search: string;
  group: GroupFilter;
  onSelect: (c: Client) => void;
  onRestore: (c: Client) => void;
}

export default function ClientsList({
  clients, loading, search, group, onSelect, onRestore,
}: ClientsListProps) {
  const getClientPaymentStatus = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return null;
    if (client.balance < 0) return 'debt';
    return null;
  };

  return (
    <div className="flex-1 min-w-0 w-full">
      <div className="hidden md:flex items-center justify-between mb-3">
        <span className="text-sm font-medium">
          {{ all: 'Все клиенты', new: 'Новые', debt: 'Долг по балансу', active: 'С активными заказами', deleted: 'Удалённые' }[group]}
        </span>
        <span className="text-xs text-muted-foreground">{clients.length} клиентов</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Icon name="Loader" size={24} className="mx-auto mb-2 opacity-30 animate-spin" />
          Загрузка...
        </div>
      ) : clients.length === 0 ? (
        <EmptyBackground
          icons={['Users', 'User', 'UserCheck', 'Phone', 'Car', 'Contact', 'UserCircle', 'BadgeCheck']}
          text={search ? 'Никого не нашли' : 'Клиентов пока нет'}
          minHeight="50vh"
        />
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {clients.map((client, idx) => {
            const payStatus = getClientPaymentStatus(client.id);
            return (
              <div
                key={client.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors active:bg-muted/50 ${idx > 0 ? 'border-t border-border' : ''}`}
                onClick={() => {
                  if (client.isDeleted) return;
                  onSelect(client);
                }}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  client.type === 'company' ? 'bg-yellow-100 text-yellow-800' : 'bg-muted text-foreground'
                }`}>
                  {clientInitials(client)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{clientName(client)}</span>
                    {client.type === 'company' && <Icon name="Building2" size={11} className="text-muted-foreground shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono-data">{client.phone}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {payStatus === 'debt' && <Icon name="AlertTriangle" size={13} className="text-red-500" />}
                  {isNew(client) && <span className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded min-w-[42px] text-center">новый</span>}
                  {!isNew(client) && payStatus !== 'debt' && <span className="min-w-[42px]" />}
                  {payStatus === 'paid' && <Icon name="Check" size={14} className="text-emerald-500" />}
                  {client.isDeleted && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRestore(client); }}
                      className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1"
                    >
                      Восстановить
                    </button>
                  )}
                  <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}