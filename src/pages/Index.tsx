import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import SearchSection from '@/components/SearchSection';
import StockSection from '@/components/StockSection';
import AnalyticsSection from '@/components/AnalyticsSection';
import ClientsSection from '@/components/ClientsSection';
import OrdersSection from '@/components/OrdersSection';
import PartDetailModal from '@/components/PartDetailModal';
import AuthScreen from '@/components/AuthScreen';
import ProfileMenu from '@/components/ProfileMenu';
import { Part } from '@/data/mockData';
import { getParts } from '@/api';
import { useAuth } from '@/context/AuthContext';

type Tab = 'search' | 'clients' | 'orders' | 'stock' | 'analytics';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'search', label: 'Поиск', icon: 'Search' },
  { id: 'clients', label: 'Клиенты', icon: 'Users' },
  { id: 'orders', label: 'Заказы', icon: 'ClipboardList' },
  { id: 'stock', label: 'Склад', icon: 'Package' },
  { id: 'analytics', label: 'Аналитика', icon: 'BarChart3' },
];

const PAGE_TITLES: Record<Tab, { title: string; subtitle: string }> = {
  search: { title: 'Поиск по артикулу', subtitle: 'Найдите деталь по артикулу, названию, бренду или штрихкоду — система покажет аналоги' },
  clients: { title: 'Клиенты', subtitle: 'Управление клиентами, история заказов и оформление новых' },
  orders: { title: 'Заказы', subtitle: 'Список всех заказов с возможностью изменить статус' },
  stock: { title: 'Остатки на складе', subtitle: 'Полный список позиций на складе с фильтрами и управлением остатками' },
  analytics: { title: 'Аналитика', subtitle: 'Статистика движения товаров и состояние склада' },
};

export default function Index() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [stockKey, setStockKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    getParts().then((data: unknown[]) => {
      const count = (data as Array<{ quantity: number; min_quantity: number }>)
        .filter((p) => p.quantity === 0 || p.quantity <= p.min_quantity).length;
      setLowStockCount(count);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <Icon name="Loader" size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  const { title, subtitle } = PAGE_TITLES[activeTab];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 gap-3">
            {/* Лого */}
            <div className="flex items-center gap-2.5 shrink-0">
              <img
                src="https://cdn.poehali.dev/projects/2b463ec9-69d1-4be9-bdc9-a61939b858a4/files/78c0d8d9-2acb-4edb-ae0c-ac26cbb3db2a.jpg"
                alt="PartKeeper"
                className="w-7 h-7 rounded-md object-cover"
              />
              <span className="font-semibold text-sm tracking-tight hidden sm:block">
                PartKeeper<span className="text-muted-foreground font-normal">.pro</span>
              </span>
            </div>

            {/* Центр: навигация + предупреждение */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              {lowStockCount > 0 && (
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full hover:bg-amber-100 transition-colors shrink-0"
                >
                  <Icon name="AlertTriangle" size={12} />
                  <span className="hidden md:block">{lowStockCount} требуют внимания</span>
                </button>
              )}
              <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1">
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

            {/* Профиль */}
            <ProfileMenu />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>

        {activeTab === 'search' && <SearchSection onSelectPart={setSelectedPart} />}
        {activeTab === 'clients' && <ClientsSection />}
        {activeTab === 'orders' && <OrdersSection />}
        {activeTab === 'stock' && <StockSection key={stockKey} onSelectPart={setSelectedPart} />}
        {activeTab === 'analytics' && <AnalyticsSection key={Date.now()} />}
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