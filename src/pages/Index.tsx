import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import SearchSection from '@/components/SearchSection';
import StockSection from '@/components/StockSection';
import AnalyticsSection from '@/components/AnalyticsSection';
import ImportSection from '@/components/ImportSection';
import ClientsSection from '@/components/ClientsSection';
import PartDetailModal from '@/components/PartDetailModal';
import { Part } from '@/data/mockData';
import { getParts } from '@/api';

type Tab = 'search' | 'stock' | 'clients' | 'analytics' | 'import';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'search', label: 'Поиск', icon: 'Search' },
  { id: 'stock', label: 'Склад', icon: 'Package' },
  { id: 'clients', label: 'Клиенты', icon: 'Users' },
  { id: 'analytics', label: 'Аналитика', icon: 'BarChart3' },
  { id: 'import', label: 'Импорт', icon: 'Upload' },
];

const PAGE_TITLES: Record<Tab, { title: string; subtitle: string }> = {
  search: { title: 'Поиск по артикулу', subtitle: 'Найдите деталь по артикулу, названию, бренду или штрихкоду — система покажет аналоги' },
  stock: { title: 'Остатки на складе', subtitle: 'Полный список позиций на складе с фильтрами и управлением остатками' },
  clients: { title: 'Клиенты', subtitle: 'Управление клиентами, история заказов и оформление новых' },
  analytics: { title: 'Аналитика', subtitle: 'Статистика движения товаров и состояние склада' },
  import: { title: 'Импорт из CSV', subtitle: 'Быстрое добавление позиций из файла CSV или Excel' },
};

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [stockKey, setStockKey] = useState(0);

  useEffect(() => {
    getParts().then((data: unknown[]) => {
      const count = (data as Array<{ quantity: number; min_quantity: number }>)
        .filter((p) => p.quantity === 0 || p.quantity <= p.min_quantity).length;
      setLowStockCount(count);
    });
  }, []);
  const { title, subtitle } = PAGE_TITLES[activeTab];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center gap-2.5 shrink-0">
              <img
                src="https://cdn.poehali.dev/projects/2b463ec9-69d1-4be9-bdc9-a61939b858a4/files/78c0d8d9-2acb-4edb-ae0c-ac26cbb3db2a.jpg"
                alt="PartKeeper"
                className="w-7 h-7 rounded-md object-cover"
              />
              <span className="font-semibold text-sm tracking-tight">PartKeeper<span className="text-muted-foreground font-normal">.pro</span></span>
              <span className="text-xs text-muted-foreground hidden md:block">Учёт запчастей</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {lowStockCount > 0 && (
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full hover:bg-amber-100 transition-colors shrink-0"
                >
                  <Icon name="AlertTriangle" size={12} />
                  <span className="hidden sm:block">{lowStockCount} требуют внимания</span>
                </button>
              )}
              <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1 shrink-0">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-white text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon name={tab.icon as 'Search'} size={13} />
                    <span className="hidden sm:block">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>

        {activeTab === 'search' && <SearchSection onSelectPart={setSelectedPart} />}
        {activeTab === 'stock' && <StockSection key={stockKey} onSelectPart={setSelectedPart} />}
        {activeTab === 'clients' && <ClientsSection />}
        {activeTab === 'analytics' && <AnalyticsSection />}
        {activeTab === 'import' && <ImportSection />}
      </main>

      {selectedPart && (
        <PartDetailModal
          part={selectedPart}
          onClose={() => setSelectedPart(null)}
          onUpdated={(updated) => { setSelectedPart(updated); setStockKey((k) => k + 1); }}
          onDeleted={() => { setSelectedPart(null); setStockKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}