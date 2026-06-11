import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authMe } from '@/api';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { token, login, user } = useAuth();

  useEffect(() => {
    if (!token) return;
    // Обновляем данные пользователя после оплаты
    setTimeout(() => {
      authMe(token)
        .then((data) => { if (user) login(token, data.user); })
        .catch(() => {});
    }, 2000);
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <Icon name="CheckCircle" size={36} className="text-green-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Оплата прошла успешно!</h1>
          <p className="text-muted-foreground">Подписка активирована на 30 дней. Спасибо!</p>
        </div>
        <Button className="w-full" onClick={() => navigate('/')}>
          Перейти в приложение
        </Button>
      </div>
    </div>
  );
}
