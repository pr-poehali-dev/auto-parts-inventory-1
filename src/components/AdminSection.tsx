import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/context/AuthContext';
import { adminGetStats, adminGetUsers, adminToggleUser, adminGetOrders, adminGetDbInfo } from '@/api';

interface Stats {
  totalUsers: number;
  totalClients: number;
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  totalParts: number;
  ordersByDay: { date: string; count: number }[];
}

interface AdminUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
  lastLogin: string | null;
  sessionCount: number;
}

interface AdminOrder {
  id: string;
  date: string;
  status: string;
  total: number;
  createdAt: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
}

interface DbTable {
  table: string;
  rows: number;
}

type Tab = 'stats' | 'users' | 'orders' | 'db';

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый', ordered: 'Заказан', in_stock: 'На складе', issued: 'Выдан', cancelled: 'Отменён',
};
const STATUS_CLS: Record<string, string> = {
  new: 'text-yellow-700 bg-yellow-50', ordered: 'text-blue-600 bg-blue-50',
  in_stock: 'text-purple-600 bg-purple-50', issued: 'text-emerald-600 bg-emerald-50',
  cancelled: 'text-gray-500 bg-gray-100',
};

export default function AdminSection() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [dbTables, setDbTables] = useState<DbTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  const load = async (t: Tab) => {
    if (!token) return;
    setLoading(true);
    try {
      if (t === 'stats') {
        const data = await adminGetStats(token);
        setStats(data);
      } else if (t === 'users') {
        const data = await adminGetUsers(token);
        setUsers(data);
      } else if (t === 'orders') {
        const data = await adminGetOrders(token, 100);
        setOrders(data);
      } else if (t === 'db') {
        const data = await adminGetDbInfo(token);
        setDbTables(data.tables);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(tab); }, [tab]);

  const handleToggleUser = async (userId: string) => {
    if (!token) return;
    setTogglingUser(userId);
    try {
      const result = await adminToggleUser(token, userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: result.isActive } : u));
    } finally {
      setTogglingUser(null);
    }
  };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'stats', label: 'Обзор', icon: 'BarChart3' },
    { id: 'users', label: 'Пользователи', icon: 'Users' },
    { id: 'orders', label: 'Заказы', icon: 'ClipboardList' },
    { id: 'db', label: 'База данных', icon: 'Database' },
  ];

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
          <Icon name="ShieldCheck" size={16} className="text-background" />
        </div>
        <div>
          <div className="text-sm font-semibold">Панель администратора</div>
          <div className="text-xs text-muted-foreground">Только для тебя</div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-full overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-1 justify-center ${
              tab === t.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <Icon name={t.icon as 'BarChart3'} size={13} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-12 text-center text-muted-foreground">
          <Icon name="Loader" size={24} className="mx-auto mb-2 animate-spin opacity-40" />
        </div>
      )}

      {/* ОБЗОР */}
      {!loading && tab === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Пользователей', value: stats.totalUsers, icon: 'User', color: 'text-blue-600' },
              { label: 'Клиентов', value: stats.totalClients, icon: 'Users', color: 'text-purple-600' },
              { label: 'Всего заказов', value: stats.totalOrders, icon: 'ClipboardList', color: 'text-yellow-600' },
              { label: 'Активных заказов', value: stats.activeOrders, icon: 'Clock', color: 'text-orange-500' },
              { label: 'Позиций на складе', value: stats.totalParts, icon: 'Package', color: 'text-emerald-600' },
              { label: 'Выручка', value: stats.totalRevenue.toLocaleString('ru') + ' ₽', icon: 'TrendingUp', color: 'text-emerald-600', big: true },
            ].map(({ label, value, icon, color, big }) => (
              <div key={label} className="bg-white border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={icon as 'User'} size={14} className={color} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <div className={`font-bold font-mono-data ${big ? 'text-lg' : 'text-2xl'}`}>{value}</div>
              </div>
            ))}
          </div>

          {stats.ordersByDay.length > 0 && (
            <div className="bg-white border border-border rounded-xl p-4">
              <div className="text-xs font-medium text-muted-foreground mb-3">Заказы за 30 дней</div>
              <div className="flex items-end gap-1 h-20">
                {stats.ordersByDay.map(({ date, count }) => {
                  const max = Math.max(...stats.ordersByDay.map(d => d.count));
                  const height = max > 0 ? Math.round((count / max) * 100) : 0;
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-full mb-1 bg-foreground text-background text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {date}: {count}
                      </div>
                      <div
                        className="w-full bg-primary/80 rounded-sm transition-all"
                        style={{ height: `${Math.max(height, 4)}%`, minHeight: '4px' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ПОЛЬЗОВАТЕЛИ */}
      {!loading && tab === 'users' && (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {users.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Нет пользователей</div>
          ) : (
            <div className="divide-y divide-border">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    u.isAdmin ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                  }`}>
                    {(u.name || u.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{u.name || '—'}</span>
                      {u.isAdmin && (
                        <span className="text-xs bg-foreground text-background px-1.5 py-0.5 rounded font-medium shrink-0">admin</span>
                      )}
                      {!u.isActive && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded shrink-0">заблокирован</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    {u.phone && <div className="text-xs text-muted-foreground">{u.phone}</div>}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Регистрация: {new Date(u.createdAt).toLocaleDateString('ru')}
                      {u.lastLogin && ` · Вход: ${new Date(u.lastLogin).toLocaleDateString('ru')}`}
                      {' · '}Сессий: {u.sessionCount}
                    </div>
                  </div>
                  {!u.isAdmin && (
                    <button
                      onClick={() => handleToggleUser(u.id)}
                      disabled={togglingUser === u.id}
                      className={`shrink-0 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                        u.isActive
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      } disabled:opacity-40`}
                    >
                      {togglingUser === u.id ? '...' : u.isActive ? 'Заблокировать' : 'Разблокировать'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ЗАКАЗЫ */}
      {!loading && tab === 'orders' && (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {orders.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Нет заказов</div>
          ) : (
            <div className="divide-y divide-border">
              {orders.map(o => (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono-data text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[o.status] ?? 'text-muted-foreground bg-muted'}`}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </div>
                    <div className="text-sm font-medium truncate">{o.clientName || '—'}</div>
                    {o.clientPhone && <div className="text-xs text-muted-foreground">{o.clientPhone}</div>}
                    <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString('ru')}</div>
                  </div>
                  <div className="text-sm font-semibold font-mono-data shrink-0">
                    {Number(o.total).toLocaleString('ru')} ₽
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* БАЗА ДАННЫХ */}
      {!loading && tab === 'db' && (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Таблицы</span>
          </div>
          {dbTables.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Нет данных</div>
          ) : (
            <div className="divide-y divide-border">
              {dbTables.map(t => (
                <div key={t.table} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Icon name="Table" size={13} className="text-muted-foreground" />
                    <span className="font-mono-data text-sm">{t.table}</span>
                  </div>
                  <span className="text-sm font-mono-data text-muted-foreground">{t.rows.toLocaleString('ru')} строк</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
