import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Client, ClientOrder, OrderItem } from '@/data/mockData';
import { getClients, getClient, createClient, updateClient, getOrders, SupplierResult } from '@/api';
import ClientCard from '@/components/ClientCard';
import { dbToClient, isNew, hasDebt, hasActive } from '@/components/clients/clientsUtils';
import ClientsSidebar from '@/components/clients/ClientsSidebar';
import ClientsList from '@/components/clients/ClientsList';
import AddClientModal from '@/components/clients/AddClientModal';

interface ClientsSectionProps {
  pendingOrder?: { item: SupplierResult; client: Client } | null;
  onPendingOrderHandled?: () => void;
}

export default function ClientsSection({ pendingOrder, onPendingOrderHandled }: ClientsSectionProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Client | null>(null);
  const [prefilledItems, setPrefilledItems] = useState<OrderItem[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'orders'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [group, setGroup] = useState<'all' | 'new' | 'debt' | 'active' | 'deleted'>('all');

  useEffect(() => {
    Promise.all([
      getClients().then((data: unknown[]) => setClients(data.map(dbToClient))),
      getOrders().then((data: ClientOrder[]) => setOrders(data)),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (pendingOrder) {
      const { item, client } = pendingOrder;
      const newItem: OrderItem = {
        article: item.article,
        name: item.name,
        brand: item.brand,
        quantity: 1,
        price: item.price,
        costPrice: item.price,
      };
      setPrefilledItems([newItem]);
      getClient(client.id)
        .then((fresh) => setSelected(dbToClient(fresh as Record<string, unknown>)))
        .catch(() => setSelected(client));
      onPendingOrderHandled?.();
    }
  }, [pendingOrder]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
  };

  const visibleClients = clients.filter((c) => !c.isDeleted);
  const deletedClients = clients.filter((c) => c.isDeleted);

  const counts = {
    all: visibleClients.length,
    new: visibleClients.filter(isNew).length,
    debt: visibleClients.filter(hasDebt).length,
    active: visibleClients.filter((c) => hasActive(c, orders)).length,
    deleted: deletedClients.length,
  };

  const filtered = clients
    .filter((c) => {
      if (group === 'deleted') return !!c.isDeleted;
      if (c.isDeleted) return false;
      if (group === 'new') return isNew(c);
      if (group === 'debt') return hasDebt(c);
      if (group === 'active') return hasActive(c, orders);
      return true;
    })
    .filter((c) => {
      const q = search.toLowerCase();
      const name = c.type === 'company'
        ? c.companyName?.toLowerCase()
        : `${c.lastName} ${c.firstName} ${c.middleName}`.toLowerCase();
      const phoneDigits = c.phone.replace(/\D/g, '');
      const qDigits = q.replace(/\D/g, '');
      const phoneMatch = c.phone.includes(q) || (qDigits.length >= 4 && phoneDigits.slice(-4).endsWith(qDigits));
      const vinMatch = (c.vins || []).some((v) => v.toLowerCase().includes(q.replace(/\s/g, '')));
      return !q || name?.includes(q) || phoneMatch || c.email?.toLowerCase().includes(q) || vinMatch;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        const na = (a.type === 'company' ? a.companyName : (a.lastName || a.firstName || '')) || '';
        const nb = (b.type === 'company' ? b.companyName : (b.lastName || b.firstName || '')) || '';
        cmp = na.localeCompare(nb, 'ru');
      } else if (sortBy === 'date') {
        cmp = a.createdAt.localeCompare(b.createdAt);
      } else if (sortBy === 'orders') {
        cmp = a.totalOrders - b.totalOrders;
      } else if (sortBy === 'spent') {
        cmp = a.totalSpent - b.totalSpent;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const handleAdd = async (form: Partial<Client>, formVins: string[]) => {
    if (!form.firstName || !form.phone) return;
    setSaving(true);
    try {
      const vins = formVins.map((v) => v.trim().toUpperCase()).filter(Boolean);
      const created = await createClient({ ...form, vins });
      setClients((prev) => [dbToClient(created), ...prev]);
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Client) => {
    await updateClient(c.id, { isDeleted: true });
    setClients((prev) => prev.map((x) => x.id === c.id ? { ...x, isDeleted: true } : x));
  };

  const handleRestore = async (c: Client) => {
    await updateClient(c.id, { isDeleted: false });
    setClients((prev) => prev.map((x) => x.id === c.id ? { ...x, isDeleted: false } : x));
  };

  void handleDelete;

  if (selected) {
    return (
      <ClientCard
        client={selected}
        prefilledItems={prefilledItems}
        onBack={() => {
          setSelected(null);
          setPrefilledItems(null);
          getClients().then((data: unknown[]) => setClients(data.map(dbToClient)));
          getOrders().then((data: ClientOrder[]) => setOrders(data));
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, телефону, email или VIN..."
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/80 transition-colors shrink-0"
        >
          <Icon name="UserPlus" size={15} />
          Добавить клиента
        </button>
      </div>

      <div className="flex gap-4">
        <ClientsSidebar
          group={group}
          sortBy={sortBy}
          sortDir={sortDir}
          counts={counts}
          onGroupChange={setGroup}
          onToggleSort={toggleSort}
        />

        <ClientsList
          clients={filtered}
          loading={loading}
          search={search}
          group={group}
          onSelect={(client) => {
            getClient(client.id)
              .then((fresh) => setSelected(dbToClient(fresh as Record<string, unknown>)))
              .catch(() => setSelected(client));
          }}
          onRestore={handleRestore}
        />
      </div>

      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
          saving={saving}
        />
      )}
    </div>
  );
}
