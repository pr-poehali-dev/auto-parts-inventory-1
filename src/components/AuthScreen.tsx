import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/context/AuthContext';
import { authLogin, authRegister, authForgot, authReset } from '@/api';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthResult {
  token: string;
  user: { id: string; email: string; phone: string; name: string };
}

export default function AuthScreen() {
  const { login } = useAuth();

  // Определяем режим по URL-параметру reset_token
  const params = new URLSearchParams(window.location.search);
  const resetTokenFromUrl = params.get('reset_token') || '';

  const [mode, setMode] = useState<Mode>(resetTokenFromUrl ? 'reset' : 'login');
  const [form, setForm] = useState({
    email: '', phone: '', name: '', password: '', password2: '', resetToken: resetTokenFromUrl,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resetTokenFromUrl) setMode('reset');
  }, [resetTokenFromUrl]);

  const set = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await authLogin({ email: form.email, password: form.password }) as AuthResult;
        login(res.token, res.user);

      } else if (mode === 'register') {
        if (form.password !== form.password2) {
          setError('Пароли не совпадают'); setLoading(false); return;
        }
        if (form.password.length < 6) {
          setError('Пароль должен быть не менее 6 символов'); setLoading(false); return;
        }
        const res = await authRegister({ email: form.email, phone: form.phone, name: form.name, password: form.password }) as AuthResult;
        login(res.token, res.user);

      } else if (mode === 'forgot') {
        await authForgot(form.email);
        setSuccess('Если аккаунт существует — ссылка для сброса пароля отправлена на почту.');

      } else if (mode === 'reset') {
        await authReset(form.resetToken, form.password);
        setSuccess('Пароль успешно обновлён!');
        setTimeout(() => {
          window.history.replaceState({}, '', '/');
          setMode('login');
          setSuccess('');
        }, 2000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Mode, string> = {
    login: 'Войти в аккаунт',
    register: 'Регистрация',
    forgot: 'Восстановление пароля',
    reset: 'Новый пароль',
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Логотип */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 bg-foreground rounded-lg flex items-center justify-center">
            <Icon name="Wrench" size={18} className="text-background" />
          </div>
          <span className="font-bold text-lg tracking-tight">PartKeeper<span className="text-muted-foreground font-normal">.pro</span></span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h1 className="text-xl font-semibold mb-5">{titles[mode]}</h1>

          {success ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-4 text-sm flex items-start gap-2">
              <Icon name="CheckCircle" size={16} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Email</label>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              {/* Имя + Телефон — только при регистрации */}
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Имя <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      autoComplete="name"
                      required
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="Иван Иванов"
                      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Телефон</label>
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      placeholder="+7 900 000 00 00"
                      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </>
              )}

              {/* Пароль */}
              {(mode === 'login' || mode === 'register' || mode === 'reset') && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    {mode === 'reset' ? 'Новый пароль' : 'Пароль'}
                  </label>
                  <input
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              {/* Повтор пароля */}
              {(mode === 'register' || mode === 'reset') && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Повторите пароль</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={form.password2}
                    onChange={(e) => set('password2', e.target.value)}
                    placeholder="Повторите пароль"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              {/* Ошибка */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 text-sm flex items-center gap-2">
                  <Icon name="AlertCircle" size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              {/* Забыл пароль — только при входе */}
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); }}
                  className="text-xs text-muted-foreground hover:text-foreground text-right -mt-2 transition-colors"
                >
                  Забыли пароль?
                </button>
              )}

              {/* Кнопка */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              >
                {loading && <Icon name="Loader" size={14} className="animate-spin" />}
                {mode === 'login' && 'Войти'}
                {mode === 'register' && 'Создать аккаунт'}
                {mode === 'forgot' && 'Отправить ссылку'}
                {mode === 'reset' && 'Сохранить пароль'}
              </button>
            </form>
          )}

          {/* Переключатели */}
          <div className="mt-5 pt-4 border-t border-border text-center text-sm text-muted-foreground">
            {mode === 'login' && (
              <>Нет аккаунта?{' '}
                <button onClick={() => { setMode('register'); setError(''); setSuccess(''); }} className="text-foreground font-medium hover:underline">
                  Зарегистрироваться
                </button>
              </>
            )}
            {(mode === 'register' || mode === 'forgot' || mode === 'reset') && (
              <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-foreground font-medium hover:underline flex items-center gap-1 mx-auto">
                <Icon name="ArrowLeft" size={13} />
                Вернуться ко входу
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}