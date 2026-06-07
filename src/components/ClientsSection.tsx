import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { mockClients, mockClientOrders, Client } from '@/data/mockData';
import ClientCard from '@/components/ClientCard';

export default function ClientsSection() {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [selected, setSelected] = useState<Client | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'orders' | 'spent'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [group, setGroup] = useState<'all' | 'new' | 'debt' | 'active' | 'deleted'>('all');
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<Partial<Client>>({
    type: 'individual',
    firstName: '',
    lastName: '',
    middleName: '',
    companyName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    note: '',
  });
  const [addTab, setAddTab] = useState<'register' | 'invite'>('register');

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
  };

  const isNew = (c: Client) => {
    const d = new Date(c.createdAt);
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  };
  const hasDebt = (c: Client) => {
    const orders = mockClientOrders.filter((o) => o.clientId === c.id && o.status !== 'cancelled');
    return orders.some((o) => o.prepaid < o.total) || c.balance < 0;
  };
  const hasActive = (c: Client) =>
    mockClientOrders.some((o) => o.clientId === c.id && (o.status === 'new' || o.status === 'in_progress'));

  const counts = {
    all: clients.filter((c) => !deleted.has(c.id)).length,
    new: clients.filter((c) => !deleted.has(c.id) && isNew(c)).length,
    debt: clients.filter((c) => !deleted.has(c.id) && hasDebt(c)).length,
    active: clients.filter((c) => !deleted.has(c.id) && hasActive(c)).length,
    deleted: deleted.size,
  };

  const filtered = clients
    .filter((c) => {
      if (group === 'deleted') return deleted.has(c.id);
      if (deleted.has(c.id)) return false;
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
      const lastFour = phoneDigits.slice(-4);
      const qDigits = q.replace(/\D/g, '');
      const phoneMatch = c.phone.includes(q) || (qDigits.length >= 4 && lastFour.endsWith(qDigits));
      return !q || name?.includes(q) || phoneMatch || c.email?.toLowerCase().includes(q);
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
    const orders = mockClientOrders.filter((o) => o.clientId === clientId && o.status !== 'cancelled');
    if (!orders.length) return null;
    const hasUnpaid = orders.some((o) => o.prepaid < o.total);
    const allPaid = orders.every((o) => o.prepaid >= o.total);
    if (allPaid) return 'paid';
    if (hasUnpaid) return 'debt';
    return null;
  };

  const handleAdd = () => {
    if (!form.firstName || !form.phone) return;
    const client: Client = {
      id: 'c' + Date.now(),
      type: form.type as 'individual' | 'company',
      firstName: form.firstName || '',
      lastName: form.lastName,
      middleName: form.middleName,
      companyName: form.companyName,
      phone: form.phone || '',
      email: form.email,
      city: form.city,
      address: form.address,
      note: form.note,
      createdAt: new Date().toISOString().slice(0, 10),
      totalOrders: 0,
      totalSpent: 0,
      balance: 0,
    };
    setClients((prev) => [client, ...prev]);
    setShowAdd(false);
    setForm({ type: 'individual', firstName: '', lastName: '', middleName: '', companyName: '', phone: '', email: '', city: '', address: '' });
  };

  const clientName = (c: Client) =>
    c.type === 'company'
      ? c.companyName || c.firstName
      : [c.lastName, c.firstName, c.middleName].filter(Boolean).join(' ');

  const clientInitials = (c: Client) => {
    if (c.type === 'company') return (c.companyName || 'К').slice(0, 2).toUpperCase();
    return ((c.lastName?.[0] || '') + (c.firstName?.[0] || '')).toUpperCase() || '?';
  };

  if (selected) {
    return <ClientCard client={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Icon name="Search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, телефону или email..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/80 transition-colors shrink-0"
        >
          <Icon name="UserPlus" size={15} />
          Добавить клиента
        </button>
      </div>

      <div className="flex gap-4">
        {/* Левая панель групп */}
        <div className="w-52 shrink-0 hidden md:block">
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            {([
              { id: 'all',     label: 'Все клиенты',          icon: 'Users' },
              { id: 'new',     label: 'Новые',                icon: 'UserPlus' },
              { id: 'debt',    label: 'Долг по балансу',      icon: 'AlertTriangle' },
              { id: 'active',  label: 'С активными заказами', icon: 'ShoppingCart' },
              { id: 'deleted', label: 'Удалённые',            icon: 'Trash2' },
            ] as const).map((g, i, arr) => (
              <button
                key={g.id}
                onClick={() => setGroup(g.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  i !== arr.length - 1 ? 'border-b border-border' : ''
                } ${
                  group === g.id
                    ? 'bg-blue-500 text-white font-medium'
                    : 'text-foreground hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon name={g.icon as 'Users'} size={14} />
                  {g.label}
                </div>
                <span className={`text-xs font-mono-data font-semibold ${
                  group === g.id ? 'text-white/90' : counts[g.id] === 0 ? 'text-muted-foreground' : 'text-foreground'
                }`}>
                  {counts[g.id]}
                </span>
              </button>
            ))}
          </div>

          {/* Сортировка под панелью */}
          <div className="mt-3 space-y-1">
            <div className="text-xs text-muted-foreground px-1 mb-1">Сортировка</div>
            {([
              { id: 'name',   label: 'По алфавиту', icon: 'ArrowUpAZ' },
              { id: 'date',   label: 'По дате',      icon: 'Calendar' },
              { id: 'orders', label: 'По заказам',   icon: 'ShoppingCart' },
              { id: 'spent',  label: 'По сумме',     icon: 'TrendingUp' },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={() => toggleSort(opt.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  sortBy === opt.id
                    ? 'bg-foreground text-background'
                    : 'bg-white text-muted-foreground border border-border hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon name={opt.icon as 'Calendar'} size={12} />
                  {opt.label}
                </div>
                {sortBy === opt.id && <Icon name={sortDir === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={11} />}
              </button>
            ))}
          </div>
        </div>

        {/* Мобильные группы — горизонтальный скролл */}
        <div className="md:hidden -mx-0 overflow-x-auto pb-1">
          <div className="flex gap-2 min-w-max">
            {([
              { id: 'all',     label: 'Все' },
              { id: 'new',     label: 'Новые' },
              { id: 'debt',    label: 'Долг' },
              { id: 'active',  label: 'Активные' },
              { id: 'deleted', label: 'Удалённые' },
            ] as const).map((g) => (
              <button
                key={g.id}
                onClick={() => setGroup(g.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 ${
                  group === g.id
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-muted-foreground border-border'
                }`}
              >
                {g.label}
                <span className={`font-mono-data ${group === g.id ? 'text-white/80' : 'text-muted-foreground'}`}>{counts[g.id]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3 md:hidden">
            <span className="text-xs text-muted-foreground">{filtered.length} клиентов</span>
          </div>
          <div className="hidden md:flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              {{all:'Все клиенты',new:'Новые',debt:'Долг по балансу',active:'С активными заказами',deleted:'Удалённые'}[group]}
            </span>
            <span className="text-xs text-muted-foreground">{filtered.length} клиентов</span>
          </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((client) => (
          <div
            key={client.id}
            onClick={() => group !== 'deleted' && setSelected(client)}
            className={`bg-white border border-border rounded-lg p-4 transition-all animate-fade-in group ${group === 'deleted' ? 'opacity-60' : 'cursor-pointer hover:shadow-md hover:border-foreground/20'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                client.type === 'company'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-muted text-foreground'
              }`}>
                {clientInitials(client)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm font-semibold truncate">{clientName(client)}</span>
                  {client.type === 'company' && (
                    <Icon name="Building2" size={12} className="text-muted-foreground shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground font-mono-data">{client.phone}</div>
                {client.email && (
                  <div className="text-xs text-muted-foreground truncate">{client.email}</div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
                {(() => {
                  const ps = getClientPaymentStatus(client.id);
                  if (ps === 'paid') return <Icon name="CheckCircle2" size={16} className="text-emerald-500" title="Все заказы оплачены" />;
                  if (ps === 'debt') return <Icon name="AlertTriangle" size={16} className="text-red-500" title="Требуется оплата" />;
                  return null;
                })()}
                <Icon name="ChevronRight" size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-muted-foreground">Заказов</div>
                <div className="text-sm font-semibold font-mono-data">{client.totalOrders}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Сумма</div>
                <div className="text-sm font-semibold font-mono-data">{client.totalSpent.toLocaleString()} ₽</div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              {client.city ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon name="MapPin" size={11} />
                  {client.city}
                </div>
              ) : <span />}
              {client.balance !== 0 && (
                <div className={`flex items-center gap-1 text-xs font-mono-data font-medium ${client.balance > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  <Icon name="Wallet" size={11} />
                  {client.balance > 0 ? '+' : ''}{client.balance.toLocaleString()} ₽
                </div>
              )}
            </div>

            {/* Кнопки удаления/восстановления */}
            {group === 'deleted' ? (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleted((d) => { const s = new Set(d); s.delete(client.id); return s; }); }}
                className="mt-3 w-full py-1.5 text-xs border border-emerald-200 text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1"
              >
                <Icon name="Undo2" size={12} /> Восстановить
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleted((d) => new Set([...d, client.id])); if (group !== 'all') setGroup('all'); }}
                className="mt-3 w-full py-1.5 text-xs border border-red-100 text-red-400 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1"
              >
                <Icon name="Trash2" size={12} /> Удалить
              </button>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 py-16 text-center text-muted-foreground">
            <Icon name="Users" size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Клиентов не найдено</p>
          </div>
        )}
      </div>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <h3 className="text-base font-semibold">Добавить клиента</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="px-5 pt-4 space-y-4">
              <div className="grid grid-cols-2 rounded-md border border-border overflow-hidden">
                {(['register', 'invite'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAddTab(t)}
                    className={`py-2 text-sm font-medium transition-colors ${
                      addTab === t ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'register' ? 'Зарегистрировать' : 'Пригласить по e-mail'}
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                {(['individual', 'company'] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        form.type === t ? 'border-blue-500 bg-blue-500' : 'border-muted-foreground'
                      }`}
                    >
                      {form.type === t && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm">{t === 'individual' ? 'Частное лицо' : 'Юридическое лицо'}</span>
                  </label>
                ))}
              </div>

              {form.type === 'company' && (
                <div>
                  <label className="block text-sm text-foreground mb-1">Название компании</label>
                  <input value={form.companyName || ''} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-foreground mb-1">Фамилия</label>
                  <input value={form.lastName || ''} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-1">Имя *</label>
                  <input value={form.firstName || ''} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-foreground mb-1">Отчество</label>
                <input value={form.middleName || ''} onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              <div>
                <label className="block text-sm text-foreground mb-1">Телефон *</label>
                <input value={form.phone || ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+7 (___) ___-__-__"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono-data" />
              </div>

              <div>
                <label className="block text-sm text-foreground mb-1">Email</label>
                <input type="email" value={form.email || ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-foreground mb-1">Город</label>
                  <input value={form.city || ''} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-1">Адрес</label>
                  <input value={form.address || ''} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-foreground mb-1">Примечание</label>
                <textarea value={form.note || ''} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-border mt-4">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors">
                Отмена
              </button>
              <button onClick={handleAdd}
                disabled={!form.firstName || !form.phone}
                className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-40 transition-colors">
                Зарегистрировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}