import Icon from '@/components/ui/icon';
import { Client, ClientOrder } from '@/data/mockData';
import VinInfo from '@/components/VinInfo';

interface EditForm {
  type: 'individual' | 'company';
  firstName: string;
  lastName: string;
  middleName: string;
  companyName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  note: string;
}

interface Props {
  localClient: Client;
  orders: ClientOrder[];
  editing: boolean;
  savingEdit: boolean;
  editForm: EditForm;
  editVins: string[];
  clientName: string;
  clientInitials: string;
  totalSpent: number;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onEditFormChange: (patch: Partial<EditForm>) => void;
  onEditVinsChange: (vins: string[]) => void;
}

export default function ClientInfoCard({
  localClient, orders, editing, savingEdit,
  editForm, editVins, clientName, clientInitials, totalSpent,
  onEditStart, onEditCancel, onEditSave, onEditFormChange, onEditVinsChange,
}: Props) {
  const inputCls = 'w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="bg-white border border-border rounded-xl p-5">
      {editing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">Редактирование клиента</span>
            <button onClick={onEditCancel} className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="X" size={16} />
            </button>
          </div>

          <div className="flex gap-2">
            {(['individual', 'company'] as const).map((t) => (
              <button key={t} onClick={() => onEditFormChange({ type: t })}
                className={`flex-1 py-1.5 rounded-md text-sm border transition-colors ${editForm.type === t ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'}`}>
                {t === 'individual' ? 'Физлицо' : 'Организация'}
              </button>
            ))}
          </div>

          {editForm.type === 'company' && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Название организации</label>
              <input value={editForm.companyName} onChange={(e) => onEditFormChange({ companyName: e.target.value })} className={inputCls} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {editForm.type === 'individual' && (
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Фамилия</label>
                <input value={editForm.lastName} onChange={(e) => onEditFormChange({ lastName: e.target.value })} className={inputCls} />
              </div>
            )}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Имя *</label>
              <input value={editForm.firstName} onChange={(e) => onEditFormChange({ firstName: e.target.value })} className={inputCls} />
            </div>
            {editForm.type === 'individual' && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Отчество</label>
                <input value={editForm.middleName} onChange={(e) => onEditFormChange({ middleName: e.target.value })} className={inputCls} />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Телефон *</label>
            <input type="tel" value={editForm.phone} onChange={(e) => onEditFormChange({ phone: e.target.value })}
              className={`${inputCls} font-mono-data`} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Email</label>
              <input type="email" value={editForm.email} onChange={(e) => onEditFormChange({ email: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Город</label>
              <input value={editForm.city} onChange={(e) => onEditFormChange({ city: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Адрес</label>
            <input value={editForm.address} onChange={(e) => onEditFormChange({ address: e.target.value })} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Примечание</label>
            <textarea value={editForm.note} onChange={(e) => onEditFormChange({ note: e.target.value })} rows={2}
              className={`${inputCls} resize-none`} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">VIN автомобиля</label>
              <button type="button" onClick={() => onEditVinsChange([...editVins, ''])}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="Plus" size={12} />
                Добавить ещё
              </button>
            </div>
            <div className="space-y-2">
              {editVins.map((vin, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={vin}
                    onChange={(e) => onEditVinsChange(editVins.map((x, j) => j === i ? e.target.value.toUpperCase() : x))}
                    placeholder="например: XTA21099080123456"
                    maxLength={17}
                    className={`flex-1 px-3 py-2 border border-border rounded-md text-sm font-mono-data uppercase focus:outline-none focus:ring-2 focus:ring-ring`}
                  />
                  {editVins.length > 1 && (
                    <button type="button" onClick={() => onEditVinsChange(editVins.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-red-500 transition-colors px-2">
                      <Icon name="X" size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onEditCancel}
              className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors">
              Отмена
            </button>
            <button onClick={onEditSave} disabled={savingEdit || !editForm.firstName || !editForm.phone}
              className="flex-1 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 disabled:opacity-50 transition-colors">
              {savingEdit ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
            localClient.type === 'company' ? 'bg-yellow-100 text-yellow-800' : 'bg-muted text-foreground'
          }`}>
            {clientInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{clientName}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                localClient.type === 'company' ? 'bg-yellow-50 text-yellow-800' : 'bg-muted text-muted-foreground'
              }`}>
                {localClient.type === 'company' ? 'Организация' : 'Частное лицо'}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 font-mono-data"><Icon name="Phone" size={13} />{localClient.phone}</span>
              {localClient.email && <span className="flex items-center gap-1"><Icon name="Mail" size={13} />{localClient.email}</span>}
              {localClient.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={13} />{localClient.city}{localClient.address ? `, ${localClient.address}` : ''}</span>}
            </div>
            {localClient.note && <div className="mt-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 italic">{localClient.note}</div>}
            {localClient.vins && localClient.vins.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {localClient.vins.map((vin) => (
                  <VinInfo key={vin} vin={vin} />
                ))}
              </div>
            )}
          </div>
          <button onClick={onEditStart}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 transition-colors shrink-0">
            <Icon name="Pencil" size={12} />
            Изменить
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-2xl font-bold font-mono-data">{orders.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Заказов всего</div>
        </div>
        <div className="text-center border-x border-border">
          <div className="text-2xl font-bold font-mono-data text-emerald-600">{totalSpent.toLocaleString()} ₽</div>
          <div className="text-xs text-muted-foreground mt-0.5">Выполнено на</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono-data text-amber-600">
            {orders.filter((o) => !['done', 'cancelled', 'issued'].includes(o.status)).length}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">В работе</div>
        </div>
      </div>
    </div>
  );
}