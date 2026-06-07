import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { decodeVin } from '@/api';

interface VinData {
  make?: string;
  model?: string;
  year?: string;
  cylinders?: string;
  displacement?: string;
  fuel?: string;
  drive?: string;
  transmission?: string;
  body?: string;
  country?: string;
  manufacturer?: string;
  vehicleType?: string;
  engineModel?: string;
  turbo?: string;
}

interface Props {
  vin: string;
}

const CATALOGS = [
  {
    name: 'Autodoc',
    icon: '🔧',
    url: (vin: string) => `https://www.autodoc.ru/car-catalog/?search=${vin}`,
  },
  {
    name: 'Exist.ru',
    icon: '🛒',
    url: (vin: string) => `https://exist.ru/?vin=${vin}`,
  },
  {
    name: 'Emex',
    icon: '📦',
    url: (vin: string) => `https://emex.ru/vin?vin=${vin}`,
  },
  {
    name: 'Avito Авто',
    icon: '🚗',
    url: (vin: string) => `https://www.avito.ru/rossiya/zapchasti_i_aksessuary?q=${vin}`,
  },
];

const FUEL_RU: Record<string, string> = {
  'Gasoline': 'Бензин',
  'Diesel': 'Дизель',
  'Electric': 'Электро',
  'Flex Fuel (FFV)': 'Гибрид/FFV',
  'Compressed Natural Gas(CNG)': 'Газ (CNG)',
  'Liquefied Petroleum Gas(LPG)': 'Газ (LPG)',
};

const DRIVE_RU: Record<string, string> = {
  'FWD/Front Wheel Drive': 'Передний',
  'RWD/ Rear Wheel Drive': 'Задний',
  'AWD/All Wheel Drive': 'Полный',
  '4WD/4-Wheel Drive/4x4': '4WD',
};

const TRANS_RU: Record<string, string> = {
  'Automatic': 'Автомат',
  'Manual/Standard': 'Механика',
  'CVT (Continuously Variable Transmission)': 'Вариатор',
  'Automated Manual Transmission(AMT)': 'Роботизированная',
};

export default function VinInfo({ vin }: Props) {
  const [data, setData] = useState<VinData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const handleDecode = async () => {
    if (data) { setOpen((v) => !v); return; }
    setLoading(true);
    setError('');
    try {
      const res = await decodeVin(vin) as { info: VinData };
      setData(res.info);
      setOpen(true);
    } catch {
      setError('Не удалось получить данные');
    } finally {
      setLoading(false);
    }
  };

  const carName = data
    ? [data.year, data.make, data.model].filter(Boolean).join(' ')
    : '';

  return (
    <div className="mt-1">
      {/* VIN плашка + кнопка */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2">
          <Icon name="Car" size={13} className="text-slate-400 shrink-0" />
          <span className="font-mono text-sm font-bold tracking-widest text-white uppercase">{vin}</span>
        </div>
        <button
          onClick={handleDecode}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-50 shrink-0"
        >
          {loading
            ? <Icon name="Loader" size={12} className="animate-spin" />
            : <Icon name={open ? 'ChevronUp' : 'Search'} size={12} />
          }
          {loading ? 'Поиск...' : open ? 'Скрыть' : 'Авто'}
        </button>
      </div>

      {/* Раскрывающийся блок */}
      {open && (
        <div className="mt-2 border border-border rounded-xl overflow-hidden animate-fade-in">
          {error ? (
            <div className="px-4 py-3 text-sm text-red-500">{error}</div>
          ) : data && Object.keys(data).length > 0 ? (
            <>
              {/* Шапка с названием авто */}
              {carName && (
                <div className="px-4 py-3 bg-slate-900 flex items-center gap-2">
                  <Icon name="Car" size={15} className="text-slate-400" />
                  <span className="text-white font-semibold text-sm">{carName}</span>
                  {data.body && <span className="text-slate-400 text-xs ml-auto">{data.body}</span>}
                </div>
              )}

              {/* Характеристики */}
              <div className="grid grid-cols-2 gap-0 divide-y divide-border bg-white">
                {[
                  data.displacement && data.cylinders && {
                    label: 'Двигатель',
                    value: `${data.displacement}л, ${data.cylinders} цил.${data.turbo === 'Yes' ? ' турбо' : ''}`,
                    icon: 'Gauge',
                  },
                  data.fuel && { label: 'Топливо', value: FUEL_RU[data.fuel] || data.fuel, icon: 'Fuel' },
                  data.drive && { label: 'Привод', value: DRIVE_RU[data.drive] || data.drive, icon: 'Navigation' },
                  data.transmission && { label: 'КПП', value: TRANS_RU[data.transmission] || data.transmission, icon: 'Settings' },
                  data.country && { label: 'Производство', value: data.country, icon: 'Globe' },
                  data.manufacturer && { label: 'Завод', value: data.manufacturer, icon: 'Factory' },
                ].filter(Boolean).map((item) => item && (
                  <div key={item.label} className="flex items-center gap-2 px-3 py-2">
                    <Icon name={item.icon as 'Gauge'} size={13} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                      <div className="text-xs font-medium truncate">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Каталоги */}
              <div className="px-3 py-3 bg-muted/30 border-t border-border">
                <div className="text-xs text-muted-foreground mb-2">Открыть каталог запчастей:</div>
                <div className="flex flex-wrap gap-2">
                  {CATALOGS.map((cat) => (
                    <a
                      key={cat.name}
                      href={cat.url(vin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white border border-border rounded-md hover:border-foreground/40 hover:bg-muted/40 transition-colors"
                    >
                      <span>{cat.icon}</span>
                      {cat.name}
                      <Icon name="ExternalLink" size={10} className="text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="px-4 py-3 bg-white">
              {/* Только каталоги если нет данных об авто */}
              <div className="text-xs text-muted-foreground mb-2">Данные об авто не найдены. Открыть каталог:</div>
              <div className="flex flex-wrap gap-2">
                {CATALOGS.map((cat) => (
                  <a
                    key={cat.name}
                    href={cat.url(vin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white border border-border rounded-md hover:border-foreground/40 transition-colors"
                  >
                    <span>{cat.icon}</span>
                    {cat.name}
                    <Icon name="ExternalLink" size={10} className="text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
