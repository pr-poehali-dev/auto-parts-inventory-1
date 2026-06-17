import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/context/AuthContext';
import { adminGetStats, adminGetUsers, adminToggleUser, adminGetOrders, adminGetDbInfo, adminGetFeedback, adminReplyFeedback, adminMarkFeedbackRead, adminExtendSubscription, adminGetVisits } from '@/api';

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
  paidUntil?: string | null;
  freeUntil?: string | null;
}

const EXTEND_PLANS = [
  { months: 1,  label: '1 мес' },
  { months: 3,  label: '3 мес' },
  { months: 6,  label: '6 мес' },
  { months: 12, label: '1 год' },
];

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

interface FeedbackItem {
  id: number;
  user_id: number | null;
  user_name: string;
  user_phone: string;
  message: string;
  reply: string | null;
  is_read: boolean;
  replied_at: string | null;
  created_at: string;
}

interface VisitsData {
  byTime: { time: string; visits: number; unique: number }[];
  byPage: { page: string; count: number }[];
  totals: { today: number; week: number; month: number; todayUnique: number };
}

type Tab = 'stats' | 'users' | 'orders' | 'db' | 'feedback' | 'visits';

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
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [visits, setVisits] = useState<VisitsData | null>(null);
  const [visitsPeriod, setVisitsPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [extendingUser, setExtendingUser] = useState<string | null>(null);
  const [extendMonths, setExtendMonths] = useState<Record<string, number>>({});
  const [extendLoading, setExtendLoading] = useState<string | null>(null);

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
      } else if (t === 'feedback') {
        const data = await adminGetFeedback(token);
        setFeedbackItems(data.items);
      } else if (t === 'visits') {
        const data = await adminGetVisits(token, visitsPeriod);
        setVisits(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(tab); }, [tab, visitsPeriod]);

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

  const handleExtend = async (userId: string) => {
    if (!token) return;
    const months = extendMonths[userId] || 1;
    setExtendLoading(userId);
    try {
      const res = await adminExtendSubscription(token, userId, months);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, paidUntil: res.paid_until } : u));
      setExtendingUser(null);
    } catch {
      alert('Ошибка при продлении подписки');
    } finally {
      setExtendLoading(null);
    }
  };

  const handleReply = async (id: number) => {
    if (!token || !replyText.trim()) return;
    setReplySending(true);
    try {
      await adminReplyFeedback(token, id, replyText.trim());
      setFeedbackItems(prev => prev.map(f => f.id === id ? { ...f, reply: replyText.trim(), is_read: true } : f));
      setReplyingId(null);
      setReplyText('');
    } finally {
      setReplySending(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    if (!token) return;
    await adminMarkFeedbackRead(token, id);
    setFeedbackItems(prev => prev.map(f => f.id === id ? { ...f, is_read: true } : f));
  };

  const unreadCount = feedbackItems.filter(f => !f.is_read).length;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'stats', label: 'Обзор', icon: 'BarChart3' },
    { id: 'visits', label: 'Посещения', icon: 'Activity' },
    { id: 'users', label: 'Пользователи', icon: 'Users' },
    { id: 'orders', label: 'Заказы', icon: 'ClipboardList' },
    { id: 'feedback', label: 'Сообщения', icon: 'MessageCircle' },
    { id: 'db', label: 'БД', icon: 'Database' },
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
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-1 justify-center ${
              tab === t.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <Icon name={t.icon as 'BarChart3'} size={13} />
            <span>{t.label}</span>
            {t.id === 'feedback' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-12 text-center text-muted-foreground">
          <Icon name="Loader" size={24} className="mx-auto mb-2 animate-spin opacity-40" />
        </div>
      )}

      {/* ПОСЕЩЕНИЯ */}
      {!loading && tab === 'visits' && (
        <div className="space-y-4">
          {/* Переключатель периода */}
          <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
            {(['day', 'week', 'month'] as const).map((p) => (
              <button key={p} onClick={() => setVisitsPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${visitsPeriod === p ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : 'Месяц'}
              </button>
            ))}
          </div>

          {visits ? (
            <>
              {/* Итоги */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'За сегодня', value: visits.totals.today, icon: 'Eye', color: 'text-blue-600' },
                  { label: 'Уникальных сегодня', value: visits.totals.todayUnique, icon: 'User', color: 'text-purple-600' },
                  { label: 'За неделю', value: visits.totals.week, icon: 'TrendingUp', color: 'text-emerald-600' },
                  { label: 'За месяц', value: visits.totals.month, icon: 'Calendar', color: 'text-orange-500' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} className="bg-white border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name={icon as 'Eye'} size={14} className={color} />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                    <div className="text-2xl font-bold font-mono-data">{value}</div>
                  </div>
                ))}
              </div>

              {/* График по времени */}
              {visits.byTime.length > 0 && (
                <div className="bg-white border border-border rounded-xl p-4">
                  <div className="text-xs font-medium text-muted-foreground mb-3">
                    Посещения ({visitsPeriod === 'day' ? 'по часам' : 'по дням'})
                  </div>
                  <div className="flex items-end gap-1 h-24">
                    {(() => {
                      const max = Math.max(...visits.byTime.map(d => d.visits), 1);
                      return visits.byTime.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-foreground text-background text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                            {d.visits} визитов
                          </div>
                          <div className="w-full bg-blue-100 rounded-sm transition-all"
                            style={{ height: `${Math.max(4, (d.visits / max) * 96)}px` }} />
                          {visits.byTime.length <= 14 && (
                            <span className="text-[9px] text-muted-foreground">
                              {visitsPeriod === 'day'
                                ? new Date(d.time).getHours() + 'ч'
                                : new Date(d.time).toLocaleDateString('ru', { day: 'numeric', month: 'numeric' })}
                            </span>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* По страницам */}
              {visits.byPage.length > 0 && (
                <div className="bg-white border border-border rounded-xl p-4">
                  <div className="text-xs font-medium text-muted-foreground mb-3">Популярные разделы</div>
                  <div className="space-y-2">
                    {visits.byPage.map(({ page, count }) => {
                      const max = visits.byPage[0].count;
                      const PAGE_NAMES: Record<string, string> = {
                        search: 'Поиск', clients: 'Клиенты', orders: 'Заказы',
                        stock: 'Склад', analytics: 'Аналитика', admin: 'Админ',
                      };
                      return (
                        <div key={page} className="flex items-center gap-3">
                          <span className="text-sm w-24 shrink-0">{PAGE_NAMES[page] || page}</span>
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                          <span className="text-sm font-mono-data text-muted-foreground w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {visits.byTime.length === 0 && (
                <div className="bg-white border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
                  Данных за этот период пока нет — посещения начнут записываться автоматически
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Icon name="Loader" size={24} className="mx-auto mb-2 animate-spin opacity-40" />
            </div>
          )}
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
                <div key={u.id} className="px-4 py-3 space-y-3">
                <div className="flex items-center gap-3">
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
                    <div className="flex flex-col gap-1 shrink-0 items-end">
                      <button
                        onClick={() => handleToggleUser(u.id)}
                        disabled={togglingUser === u.id}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                          u.isActive
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        } disabled:opacity-40`}
                      >
                        {togglingUser === u.id ? '...' : u.isActive ? 'Заблокировать' : 'Разблокировать'}
                      </button>
                      <button
                        onClick={() => setExtendingUser(extendingUser === u.id ? null : u.id)}
                        className="text-xs px-3 py-1.5 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        Подписка
                      </button>
                    </div>
                  )}
                </div>
                {extendingUser === u.id && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
                    <div className="text-xs font-medium text-blue-700">Продлить подписку</div>
                    {u.paidUntil && (
                      <div className="text-xs text-muted-foreground">
                        Активна до: {new Date(u.paidUntil).toLocaleDateString('ru')}
                      </div>
                    )}
                    <div className="flex gap-1.5 flex-wrap">
                      {EXTEND_PLANS.map(p => (
                        <button
                          key={p.months}
                          onClick={() => setExtendMonths(prev => ({ ...prev, [u.id]: p.months }))}
                          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                            (extendMonths[u.id] || 1) === p.months
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-blue-200 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExtend(u.id)}
                        disabled={extendLoading === u.id}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {extendLoading === u.id
                          ? <><Icon name="Loader2" size={12} className="animate-spin" />Продление...</>
                          : <><Icon name="CalendarPlus" size={12} />Продлить</>
                        }
                      </button>
                      <button
                        onClick={() => setExtendingUser(null)}
                        className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
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

      {/* ОБРАТНАЯ СВЯЗЬ */}
      {!loading && tab === 'feedback' && (
        <div className="space-y-3">
          {feedbackItems.length === 0 ? (
            <div className="bg-white border border-border rounded-xl py-12 text-center text-sm text-muted-foreground">
              <Icon name="MessageCircle" size={32} className="mx-auto mb-3 opacity-20" />
              Сообщений пока нет
            </div>
          ) : feedbackItems.map(item => (
            <div key={item.id} className={`bg-white border rounded-xl p-4 space-y-3 ${!item.is_read ? 'border-yellow-300 bg-yellow-50/30' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{item.user_name || 'Гость'}</span>
                    {!item.is_read && (
                      <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full">Новое</span>
                    )}
                  </div>
                  {item.user_phone && <div className="text-xs text-muted-foreground">{item.user_phone}</div>}
                  <div className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('ru')}</div>
                </div>
                {!item.is_read && (
                  <button onClick={() => handleMarkRead(item.id)} className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    Прочитано
                  </button>
                )}
              </div>
              <div className="text-sm bg-muted/50 rounded-lg px-3 py-2.5 whitespace-pre-wrap">{item.message}</div>
              {item.reply && (
                <div className="text-sm bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
                  <div className="text-xs text-emerald-600 font-medium mb-1 flex items-center gap-1">
                    <Icon name="CornerDownRight" size={11} />
                    Ваш ответ
                  </div>
                  <div className="whitespace-pre-wrap">{item.reply}</div>
                </div>
              )}
              {replyingId === item.id ? (
                <div className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Введите ответ..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReply(item.id)}
                      disabled={replySending || !replyText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-lg text-xs font-semibold disabled:opacity-50"
                    >
                      {replySending && <Icon name="Loader" size={12} className="animate-spin" />}
                      <Icon name="Send" size={12} />
                      Отправить
                    </button>
                    <button
                      onClick={() => { setReplyingId(null); setReplyText(''); }}
                      className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setReplyingId(item.id); setReplyText(item.reply || ''); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name="Reply" size={13} />
                  {item.reply ? 'Изменить ответ' : 'Ответить'}
                </button>
              )}
            </div>
          ))}
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