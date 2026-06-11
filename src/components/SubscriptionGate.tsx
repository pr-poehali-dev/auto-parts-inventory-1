import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createPayment } from '@/api';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  if (!user) return <>{children}</>;
  if (user.is_admin || user.subscription_active !== false) return <>{children}</>;
  if (location.pathname.startsWith('/payment/')) return <>{children}</>;

  const handlePay = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { url } = await createPayment(token);
      window.location.href = url;
    } catch (e) {
      alert('Ошибка при создании платежа. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const freeUntil = user.free_until ? new Date(user.free_until) : null;
  const expired = freeUntil
    ? freeUntil.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Icon name="Lock" size={32} className="text-amber-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Бесплатный период завершён</h1>
          {expired && (
            <p className="text-muted-foreground text-sm">
              Ваш бесплатный период истёк {expired}
            </p>
          )}
          <p className="text-muted-foreground">
            Для продолжения работы с Долговиком оформите подписку
          </p>
        </div>

        <div className="border rounded-xl p-6 space-y-3 text-left">
          <div className="text-3xl font-bold">650 ₽<span className="text-base font-normal text-muted-foreground"> / месяц</span></div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {['Неограниченное число клиентов', 'Учёт заказов и долгов', 'История платежей', 'Поддержка'].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Icon name="Check" size={16} className="text-green-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <Button onClick={handlePay} disabled={loading} className="w-full h-12 text-base">
          {loading ? (
            <><Icon name="Loader2" size={18} className="animate-spin mr-2" />Подождите...</>
          ) : (
            <><Icon name="CreditCard" size={18} className="mr-2" />Оплатить 650 ₽</>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Оплата через Т-Банк. Безопасная передача данных.
        </p>
      </div>
    </div>
  );
}