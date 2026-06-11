import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

export default function PaymentFail() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <Icon name="XCircle" size={36} className="text-red-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Оплата не прошла</h1>
          <p className="text-muted-foreground">Что-то пошло не так. Попробуйте ещё раз или свяжитесь с поддержкой.</p>
        </div>
        <Button className="w-full" onClick={() => navigate('/')}>
          Попробовать снова
        </Button>
      </div>
    </div>
  );
}
