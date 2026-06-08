import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Client, ClientOrder } from '@/data/mockData';
import { getClients, getClient, createClient, updateClient, getOrders } from '@/api';
import ClientCard from '@/components/ClientCard';

function dbToClient(r: Record<string, unknown>): Client {
  return {
    id: r.id as string,
    type: r.type as 'individual' | 'company',
    firstName: r.firstName as string,
    lastName: (r.lastName as string) || undefined,
    middleName: (r.middleName as string) || undefined,
    companyName: (r.companyName as string) || undefined,
    phone: r.phone as string,
    email: (r.email as string) || undefined,
    city: (r.city as string) || undefined,
    address: (r.address as string) || undefined,
    note: (r.note as string) || undefined,
    balance: Number(r.balance),
    totalOrders: Number(r.totalOrders),
    totalSpent: Number(r.totalSpent),
    createdAt: (r.createdAt as string) || new Date().toISOString().slice(0, 10),
    vins: (r.vins as string[]) || [],
  };
}

export default function ClientsSection() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Client | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'orders' | 'spent'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [group, setGroup] = useState<'all' | 'new' | 'debt' | 'active' | 'deleted'>('all');
  const [form, setForm] = useState<Partial<Client>>({
    type: 'individual', firstName: '', lastName: '', middleName: '',
    companyName: '', phone: '', email: '', city: '', address: '', note: '',
  });
  const [formVins, setFormVins] = useState<string[]>(['']);
  const [addTab, setAddTab] = useState<'register' | 'invite'>('register');

  useEffect(() => {
    Promise.all([
      getClients().then((data: unknown[]) => setClients(data.map(dbToClient))),
      getOrders().then((data: ClientOrder[]) => setOrders(data)),
    ]).finally(() => setLoading(false));
  }, []);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
  };

  const isNew = (c: Client) => {
    const diff = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  };
  const hasDebt = (c: Client) => {
    const cos = orders.filter((o) => o.clientId === c.id && o.status !== 'cancelled');
    return cos.some((o) => o.prepaid < o.total) || c.balance < 0;
  };
  const hasActive = (c: Client) =>
    orders.some((o) => o.clientId === c.id && (o.status === 'new' || o.status === 'ordered' || o.status === 'in_stock'));

  const visibleClients = clients.filter((c) => !c.isDeleted);
  const deletedClients = clients.filter((c) => c.isDeleted);

  const counts = {
    all: visibleClients.length,
    new: visibleClients.filter(isNew).length,
    debt: visibleClients.filter(hasDebt).length,
    active: visibleClients.filter(hasActive).length,
    deleted: deletedClients.length,
  };

  const filtered = clients
    .filter((c) => {
      if (group === 'deleted') return !!c.isDeleted;
      if (c.isDeleted) return false;
      if (group === 'new') return isNew(c);
      if (group === 'debt') return hasDebt(c);
      if (group === 'active') return hasActive(c);
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
        const na = (a.type === 'company' ? a.companyName : `${a.lastName} ${a.firstName}`) || '';
        const nb = (b.type === 'company' ? b.companyName : `${b.lastName} ${b.firstName}`) || '';
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

  const getClientPaymentStatus = (clientId: string) => {
    const cos = orders.filter((o) => o.clientId === clientId && o.status !== 'cancelled');
    if (!cos.length) return null;
    if (cos.every((o) => o.prepaid >= o.total)) return 'paid';
    if (cos.some((o) => o.prepaid < o.total)) return 'debt';
    return null;
  };

  const handleAdd = async () => {
    if (!form.firstName || !form.phone) return;
    setSaving(true);
    try {
      const vins = formVins.map((v) => v.trim().toUpperCase()).filter(Boolean);
      const created = await createClient({ ...form, vins });
      setClients((prev) => [dbToClient(created), ...prev]);
      setShowAdd(false);
      setForm({ type: 'individual', firstName: '', lastName: '', middleName: '', companyName: '', phone: '', email: '', city: '', address: '' });
      setFormVins(['']);
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

  const clientName = (c: Client) =>
    c.type === 'company' ? c.companyName || c.firstName : [c.lastName, c.firstName, c.middleName].filter(Boolean).join(' ');

  const clientInitials = (c: Client) => {
    if (c.type === 'company') return (c.companyName || 'К').slice(0, 2).toUpperCase();
    return ((c.lastName?.[0] || '') + (c.firstName?.[0] || '')).toUpperCase() || '?';
  };

  if (selected) {
    return (
      <ClientCard
        client={selected}
        onBack={() => {
          setSelected(null);
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

      {/* Мобильные группы */}
      <div className="md:hidden overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {([
            { id: 'all', label: 'Все' },
            { id: 'new', label: 'Новые' },
            { id: 'debt', label: 'Долг' },
            { id: 'active', label: 'Активные' },
            { id: 'deleted', label: 'Удалённые' },
          ] as const).map((g) => (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 ${
                group === g.id
                  ? 'bg-yellow-400 text-black border-yellow-400'
                  : 'bg-white text-muted-foreground border-border'
              }`}
            >
              {g.label}
              <span className={`font-mono-data ${group === g.id ? 'text-black/70' : 'text-muted-foreground'}`}>{counts[g.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Левая панель групп */}
        <div className="w-52 shrink-0 hidden md:block">
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            {([
              { id: 'all', label: 'Все клиенты', icon: 'Users' },
              { id: 'new', label: 'Новые', icon: 'UserPlus' },
              { id: 'debt', label: 'Долг по балансу', icon: 'AlertTriangle' },
              { id: 'active', label: 'С активными заказами', icon: 'ShoppingCart' },
              { id: 'deleted', label: 'Удалённые', icon: 'Trash2' },
            ] as const).map((g, i, arr) => (
              <button
                key={g.id}
                onClick={() => setGroup(g.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  i !== arr.length - 1 ? 'border-b border-border' : ''
                } ${
                  group === g.id ? 'bg-yellow-400 text-black font-medium' : 'text-foreground hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon name={g.icon as 'Users'} size={14} />
                  {g.label}
                </div>
                <span className="font-mono-data text-xs">{counts[g.id]}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-border">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Сортировка</span>
            </div>
            {([
              { id: 'name', label: 'По алфавиту', icon: 'ArrowUpAZ' },
              { id: 'date', label: 'По дате', icon: 'Calendar' },
              { id: 'orders', label: 'По заказам', icon: 'ShoppingCart' },
              { id: 'spent', label: 'По сумме', icon: 'TrendingUp' },
            ] as const).map((s, i, arr) => (
              <button
                key={s.id}
                onClick={() => toggleSort(s.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  i !== arr.length - 1 ? 'border-b border-border' : ''
                } ${
                  sortBy === s.id ? 'bg-muted font-medium text-foreground' : 'text-foreground hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon name={s.icon as 'ArrowUpAZ'} size={14} />
                  {s.label}
                </div>
                {sortBy === s.id && (
                  <Icon name={sortDir === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={13} className="text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="hidden md:flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              {{ all: 'Все клиенты', new: 'Новые', debt: 'Долг по балансу', active: 'С активными заказами', deleted: 'Удалённые' }[group]}
            </span>
            <span className="text-xs text-muted-foreground">{filtered.length} клиентов</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Icon name="Loader" size={24} className="mx-auto mb-2 opacity-30 animate-spin" />
              Загрузка...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Icon name="Users" size={32} className="mx-auto mb-2 opacity-20" />
              {search ? 'Никого не нашли' : 'Клиентов пока нет'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((client) => {
                const payStatus = getClientPaymentStatus(client.id);
                return (
                  <div
                    key={client.id}
                    className="bg-white border border-border rounded-xl p-4 cursor-pointer hover:border-foreground/30 transition-all animate-fade-in"
                    onClick={() => {
                      if (client.isDeleted) return;
                      getClient(client.id)
                        .then((fresh) => setSelected(dbToClient(fresh as Record<string, unknown>)))
                        .catch(() => setSelected(client));
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                        client.type === 'company' ? 'bg-yellow-100 text-yellow-800' : 'bg-muted text-foreground'
                      }`}>
                        {clientInitials(client)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-semibold truncate">{clientName(client)}</span>
                          {client.type === 'company' && <Icon name="Building2" size={12} className="text-muted-foreground shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono-data">{client.phone}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isNew(client) && <span className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">новый</span>}
                        {payStatus === 'debt' && <Icon name="AlertTriangle" size={14} className="text-red-500" />}
                        {payStatus === 'paid' && <Icon name="CheckCircle" size={14} className="text-emerald-500" />}
                        {client.isDeleted ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRestore(client); }}
                            className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1"
                          >
                            Восстановить
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(client); }}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-colors p-1 rounded"
                          >
                            <Icon name="Trash2" size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {!client.isDeleted && (() => {
                      const clientOrders = orders.filter((o) => o.clientId === client.id && !['cancelled', 'issued'].includes(o.status));
                      const inWork = clientOrders.reduce((sum, o) => sum + o.total, 0);
                      return (
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
                          <div>
                            <div className="text-xs text-muted-foreground">Баланс</div>
                            <div className={`text-sm font-semibold font-mono-data ${client.balance > 0 ? 'text-emerald-600' : client.balance < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {client.balance >= 0 ? '+' : ''}{client.balance.toLocaleString()} ₽
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">В работе</div>
                            <div className="text-sm font-semibold font-mono-data text-amber-600">{inWork.toLocaleString()} ₽</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Задолжен</div>
                            <div className={`text-sm font-semibold font-mono-data ${client.balance > 0 ? 'text-emerald-600' : client.balance < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {client.balance >= 0 ? '+' : ''}{client.balance.toLocaleString()} ₽
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {client.city && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Icon name="MapPin" size={11} />
                        {client.city}
                      </div>
                    )}
                    {client.vins && client.vins.length > 0 && !client.isDeleted && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {client.vins.map((vin) => (
                          <span key={vin} className="inline-flex items-center gap-1 font-mono-data text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            <Icon name="Car" size={10} />
                            {vin}
                          </span>
                        ))}
                      </div>
                    )}
                    {client.isDeleted && (
                      <div className="mt-2 text-xs text-muted-foreground italic">Клиент удалён</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md mx-0 sm:mx-4 p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Новый клиент</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={18} /></button>
            </div>

            <div className="flex gap-2 mb-4">
              {(['register', 'invite'] as const).map((t) => (
                <button key={t} onClick={() => setAddTab(t)}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${addTab === t ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
                  {t === 'register' ? 'Ввести данные' : 'Пригласить'}
                </button>
              ))}
            </div>

            {addTab === 'register' ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {(['individual', 'company'] as const).map((t) => (
                    <button key={t} onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex-1 py-1.5 rounded-md text-sm border transition-colors ${form.type === t ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'}`}>
                      {t === 'individual' ? 'Физлицо' : 'Организация'}
                    </button>
                  ))}
                </div>

                {form.type === 'company' ? (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Название организации *</label>
                    <input value={form.companyName || ''} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs text-muted-foreground mb-1">Фамилия</label>
                      <input value={form.lastName || ''} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Имя *</label>
                      <input value={form.firstName || ''} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Отчество</label>
                      <input value={form.middleName || ''} onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                )}

                {form.type === 'company' && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Имя менеджера *</label>
                    <input value={form.firstName || ''} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Телефон *</label>
                  <input type="tel" value={form.phone || ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Email</label>
                  <input type="email" value={form.email || ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Город</label>
                  <input value={form.city || ''} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Примечание</label>
                  <textarea value={form.note || ''} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} rows={2}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>

                {/* VIN-номера */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">VIN автомобиля</label>
                    <button
                      type="button"
                      onClick={() => setFormVins((v) => [...v, ''])}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Icon name="Plus" size={12} />
                      Добавить ещё
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formVins.map((vin, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={vin}
                          onChange={(e) => setFormVins((v) => v.map((x, j) => j === i ? e.target.value.toUpperCase() : x))}
                          placeholder="например: XTA21099080123456"
                          maxLength={17}
                          className="flex-1 px-3 py-2 border border-border rounded-md text-sm font-mono-data uppercase focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {formVins.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setFormVins((v) => v.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-red-500 transition-colors px-2"
                          >
                            <Icon name="X" size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Icon name="Mail" size={28} className="mx-auto mb-2 opacity-30" />
                Функция приглашений будет доступна позже
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors">Отмена</button>
              <button onClick={handleAdd} disabled={saving || !form.firstName || !form.phone}
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