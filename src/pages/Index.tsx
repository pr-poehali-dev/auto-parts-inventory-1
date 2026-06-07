import { useState } from 'react';
import Icon from '@/components/ui/icon';
import SearchSection from '@/components/SearchSection';
import StockSection from '@/components/StockSection';
import AnalyticsSection from '@/components/AnalyticsSection';
import ImportSection from '@/components/ImportSection';
import PartDetailModal from '@/components/PartDetailModal';
import { Part, mockParts } from '@/data/mockData';

type Tab = 'search' | 'stock' | 'analytics' | 'import';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'search', label: 'Поиск', icon: 'Search' },
  { id: 'stock', label: 'Склад', icon: 'Package' },
  { id: 'analytics', label: 'Аналитика', icon: 'BarChart3' },
  { id: 'import', label: 'Импорт', icon: 'Upload' },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);

  const lowStockCount = mockParts.filter((p) => p.quantity === 0 || p.quantity <= p.minQuantity).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-foreground rounded-md flex items-center justify-center">
                <Icon name="Wrench" size={14} className="text-background" />
              </div>
              <span className="font-semibold text-sm tracking-tight">АвтоСклад</span>
              <span className="text-xs text-muted-foreground hidden sm:block">Учёт запчастей</span>
            </div>

            <div className="flex items-center gap-1">
              {lowStockCount > 0 && (
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full hover:bg-amber-100 transition-colors mr-2"
                >
                  <Icon name="AlertTriangle" size={12} />
                  {lowStockCount} требуют внимания
                </button>
              )}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
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
          <h1 className="text-lg font-semibold">
            {activeTab === 'search' && 'Поиск по артикулу'}
            {activeTab === 'stock' && 'Остатки на складе'}
            {activeTab === 'analytics' && 'Аналитика'}
            {activeTab === 'import' && 'Импорт из CSV'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeTab === 'search' && 'Найдите деталь по артикулу, названию, бренду или штрихкоду — система покажет аналоги'}
            {activeTab === 'stock' && 'Полный список позиций на складе с фильтрами и управлением остатками'}
            {activeTab === 'analytics' && 'Статистика движения товаров и состояние склада'}
            {activeTab === 'import' && 'Быстрое добавление позиций из файла CSV или Excel'}
          </p>
        </div>

        {activeTab === 'search' && <SearchSection onSelectPart={setSelectedPart} />}
        {activeTab === 'stock' && <StockSection onSelectPart={setSelectedPart} />}
        {activeTab === 'analytics' && <AnalyticsSection />}
        {activeTab === 'import' && <ImportSection />}
      </main>

      {selectedPart && (
        <PartDetailModal part={selectedPart} onClose={() => setSelectedPart(null)} />
      )}
    </div>
  );
}
