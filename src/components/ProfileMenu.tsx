import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth, User } from '@/context/AuthContext';
import { authUpdate } from '@/api';

interface UpdateResult { user: User }

function PasswordInput({ value, onChange, placeholder, autoComplete }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        <Icon name={show ? 'EyeOff' : 'Eye'} size={16} />
      </button>
    </div>
  );
}

export default function ProfileMenu() {
  const { user, token, logout, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    oldPassword: '',
    password: '',
    password2: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: user.name || '', phone: user.phone || '' }));
  }, [user]);

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
      const payload: { name?: string; phone?: string; password?: string; oldPassword?: string } = {
        name: form.name,
        phone: form.phone,
      };
      if (form.password) {
        payload.password = form.password;
        payload.oldPassword = form.oldPassword;
      }
      const res = await authUpdate(token!, payload) as UpdateResult;
      setUser(res.user);
      setSuccess('Сохранено');
      setForm((f) => ({ ...f, oldPassword: '', password: '', password2: '' }));
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const openSettings = () => {
    setError(''); setSuccess('');
    setForm((f) => ({ ...f, oldPassword: '', password: '', password2: '' }));
    setShowSettings(true);
    setOpen(false);
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
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-border rounded-xl shadow-lg z-50 py-1 animate-fade-in">
          <div className="px-3 py-2.5 border-b border-border">
            <div className="text-sm font-semibold truncate">{displayName}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
          <button
            onClick={openSettings}
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-lg font-semibold">Настройки аккаунта</h2>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <Icon name="X" size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4 px-6 pb-6">
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

              {/* Смена пароля */}
              <div className="border-t border-border pt-4 flex flex-col gap-3">
                <div className="text-xs text-muted-foreground">Сменить пароль (оставьте пустым, если не хотите менять)</div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Текущий пароль</label>
                  <PasswordInput
                    value={form.oldPassword}
                    onChange={(v) => setForm((f) => ({ ...f, oldPassword: v }))}
                    placeholder="Введите текущий пароль"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Новый пароль</label>
                  <PasswordInput
                    value={form.password}
                    onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                    placeholder="Минимум 6 символов"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Повторите новый пароль</label>
                  <PasswordInput
                    value={form.password2}
                    onChange={(v) => setForm((f) => ({ ...f, password2: v }))}
                    placeholder="Повторите пароль"
                    autoComplete="new-password"
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
