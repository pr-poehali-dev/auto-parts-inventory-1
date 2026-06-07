import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth, User } from '@/context/AuthContext';
import { authUpdate } from '@/api';

interface UpdateResult { user: User }

export default function ProfileMenu() {
  const { user, token, logout, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Форма настроек
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', password: '', password2: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: user.name || '', phone: user.phone || '' }));
  }, [user]);

  // Закрытие по клику вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayName = user?.name || user?.email?.split('@')[0] || 'Аккаунт';
  const initials = (user?.name || user?.email || '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.password && form.password !== form.password2) {
      setError('Пароли не совпадают'); return;
    }
    if (form.password && form.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов'); return;
    }
    setSaving(true);
    try {
      const payload: { name?: string; phone?: string; password?: string } = {
        name: form.name,
        phone: form.phone,
      };
      if (form.password) payload.password = form.password;
      const res = await authUpdate(token!, payload) as UpdateResult;
      setUser(res.user);
      setSuccess('Сохранено');
      setForm((f) => ({ ...f, password: '', password2: '' }));
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      {/* Кнопка профиля */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center shrink-0">
          {initials}
        </div>
        <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">{displayName}</span>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={13} className="text-muted-foreground" />
      </button>

      {/* Выпадающее меню */}
      {open && !showSettings && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-border rounded-xl shadow-lg z-50 py-1 animate-fade-in">
          <div className="px-3 py-2.5 border-b border-border">
            <div className="text-sm font-semibold truncate">{displayName}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
          <button
            onClick={() => { setShowSettings(true); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <Icon name="Settings" size={15} className="text-muted-foreground" />
            Настройки аккаунта
          </button>
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Icon name="LogOut" size={15} />
              Выйти
            </button>
          </div>
        </div>
      )}

      {/* Модалка настроек */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Настройки аккаунта</h2>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <Icon name="X" size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Имя</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ваше имя"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Телефон</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+7 900 000 00 00"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="border-t border-border pt-3">
                <div className="text-xs text-muted-foreground mb-3">Сменить пароль (оставьте пустым, если не хотите менять)</div>
                <div className="flex flex-col gap-3">
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Новый пароль"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="password"
                    value={form.password2}
                    onChange={(e) => setForm((f) => ({ ...f, password2: e.target.value }))}
                    placeholder="Повторите пароль"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm flex items-center gap-2">
                  <Icon name="AlertCircle" size={14} className="shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 text-sm flex items-center gap-2">
                  <Icon name="CheckCircle" size={14} className="shrink-0" />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <Icon name="Loader" size={14} className="animate-spin" />}
                Сохранить
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
