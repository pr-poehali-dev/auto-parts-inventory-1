import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createPayment } from '@/api';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const PLANS = [
  { months: 1,  label: '1 месяц',   price: 650,  pricePerMonth: 650,  badge: null },
  { months: 3,  label: '3 месяца',  price: 1755, pricePerMonth: 585,  badge: '-10%' },
  { months: 6,  label: '6 месяцев', price: 3315, pricePerMonth: 553,  badge: '-15%' },
  { months: 12, label: '1 год',     price: 6240, pricePerMonth: 520,  badge: '-20%' },
];

export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(1);
  const location = useLocation();

  if (!user) return <>{children}</>;
  if (user.is_admin || user.subscription_active !== false) return <>{children}</>;
  if (location.pathname.startsWith('/payment/')) return <>{children}</>;

  const handlePay = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { url } = await createPayment(token, selected);
      window.location.href = url;
    } catch {
      alert('Ошибка при создании платежа. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const freeUntil = user.free_until ? new Date(user.free_until) : null;
  const expired = freeUntil
    ? freeUntil.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const plan = PLANS.find(p => p.months === selected) || PLANS[0];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">

        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Icon name="Lock" size={28} className="text-amber-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Бесплатный период завершён</h1>
          {expired && (
            <p className="text-muted-foreground text-sm">Истёк {expired}</p>
          )}
          <p className="text-muted-foreground text-sm">Выберите тариф для продолжения работы</p>
        </div>

        {/* Выбор периода */}
        <div className="grid grid-cols-2 gap-3">
          {PLANS.map(p => (
            <button
              key={p.months}
              onClick={() => setSelected(p.months)}
              className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                selected === p.months
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              {p.badge && (
                <span className="absolute -top-2.5 right-3 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {p.badge}
                </span>
              )}
              <div className="font-semibold text-sm">{p.label}</div>
              <div className="text-2xl font-bold mt-1">{p.price} ₽</div>
              <div className="text-xs text-muted-foreground mt-0.5">{p.pricePerMonth} ₽/мес</div>
            </button>
          ))}
        </div>

        {/* Что входит */}
        <div className="border rounded-xl p-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {['Неограниченное число клиентов', 'Учёт заказов и долгов', 'История платежей', 'Поддержка'].map(f => (
              <li key={f} className="flex items-center gap-2">
                <Icon name="Check" size={15} className="text-green-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <Button onClick={handlePay} disabled={loading} className="w-full h-12 text-base">
          {loading ? (
            <><Icon name="Loader2" size={18} className="animate-spin mr-2" />Подождите...</>
          ) : (
            <><Icon name="CreditCard" size={18} className="mr-2" />Оплатить {plan.price} ₽ — {plan.label}</>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Оплата через Т-Банк. Безопасная передача данных.
        </p>
      </div>
    </div>
  );
}
