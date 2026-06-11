import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Client } from '@/data/mockData';

interface AddClientModalProps {
  onClose: () => void;
  onAdd: (form: Partial<Client>, vins: string[]) => Promise<void>;
  saving: boolean;
}

export default function AddClientModal({ onClose, onAdd, saving }: AddClientModalProps) {
  const [addTab, setAddTab] = useState<'register' | 'invite'>('register');
  const [form, setForm] = useState<Partial<Client>>({
    type: 'individual', firstName: '', lastName: '', middleName: '',
    companyName: '', phone: '', email: '', city: '', address: '', note: '',
  });
  const [formVins, setFormVins] = useState<string[]>(['']);

  const handleSubmit = async () => {
    await onAdd(form, formVins);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md mx-0 sm:mx-4 p-6 animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Новый клиент</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {(['register', 'invite'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setAddTab(t)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                addTab === t ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
              }`}
            >
              {t === 'register' ? 'Зарегистрировать' : 'Пригласить'}
            </button>
          ))}
        </div>

        {addTab === 'register' ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(['individual', 'company'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-1.5 rounded-md text-sm border transition-colors ${
                    form.type === t ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'
                  }`}
                >
                  {t === 'individual' ? 'Физлицо' : 'Организация'}
                </button>
              ))}
            </div>

            {form.type === 'company' ? (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Название организации *</label>
                <input
                  value={form.companyName || ''}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Фамилия</label>
                  <input
                    value={form.lastName || ''}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Имя *</label>
                  <input
                    value={form.firstName || ''}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Отчество</label>
                  <input
                    value={form.middleName || ''}
                    onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {form.type === 'company' && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Имя менеджера *</label>
                <input
                  value={form.firstName || ''}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Телефон *</label>
              <input
                type="tel"
                value={form.phone || ''}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+7 (999) 000-00-00"
                className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono-data focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Email</label>
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Город</label>
              <input
                value={form.city || ''}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Примечание</label>
              <textarea
                value={form.note || ''}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">VIN автомобиля</label>
                <button
                  type="button"
                  onClick={() => setFormVins((v) => [...v, ''])}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name="Plus" size={12} />
                  Добавить ещё
                </button>
              </div>
              <div className="space-y-2">
                {formVins.map((vin, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={vin}
                      onChange={(e) => setFormVins((v) => v.map((x, j) => j === i ? e.target.value.toUpperCase() : x))}
                      placeholder="например: XTA21099080123456"
                      maxLength={17}
                      className="flex-1 px-3 py-2 border border-border rounded-md text-sm font-mono-data uppercase focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {formVins.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormVins((v) => v.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-red-500 transition-colors px-2"
                      >
                        <Icon name="X" size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Icon name="Mail" size={28} className="mx-auto mb-2 opacity-30" />
            Функция приглашений будет доступна позже
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.firstName || !form.phone}
            className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  );
}
