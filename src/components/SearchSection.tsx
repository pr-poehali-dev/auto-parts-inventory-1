import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { mockParts, Part } from '@/data/mockData';

interface SearchSectionProps {
  onSelectPart: (part: Part) => void;
}

export default function SearchSection({ onSelectPart }: SearchSectionProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Part[]>([]);
  const [analogs, setAnalogs] = useState<Part[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setAnalogs([]);
      setSearched(false);
      return;
    }
    const q = value.trim().toLowerCase();
    const found = mockParts.filter(
      (p) =>
        p.article.toLowerCase().includes(q) ||
        p.oemArticle?.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.barcode?.includes(q)
    );
    setResults(found);
    const analogArticles = new Set<string>();
    found.forEach((p) => p.analogs.forEach((a) => analogArticles.add(a)));
    const analogParts = mockParts.filter(
      (p) => analogArticles.has(p.article) && !found.find((f) => f.id === p.id)
    );
    setAnalogs(analogParts);
    setSearched(true);
  };

  const stockBadge = (qty: number, min: number) => {
    if (qty === 0) return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Нет</span>;
    if (qty <= min) return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Мало: {qty}</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{qty} шт</span>;
  };

  const PartRow = ({ part, isAnalog }: { part: Part; isAnalog?: boolean }) => (
    <div
      className="hover-row flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-border last:border-0 animate-fade-in"
      onClick={() => onSelectPart(part)}
    >
      <div className="flex items-center gap-4 min-w-0">
        {isAnalog && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">аналог</span>
        )}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono-data font-medium text-sm text-foreground">{part.article}</span>
            {part.oemArticle && (
              <span className="font-mono-data text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded" title="OEM">
                OEM: {part.oemArticle}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{part.brand}</span>
          </div>
          <div className="text-sm text-muted-foreground truncate">{part.name}</div>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 ml-4">
        <span className="text-sm font-medium">{part.price.toLocaleString()} ₽</span>
        <span className="text-xs text-muted-foreground">{part.location}</span>
        {stockBadge(part.quantity, part.minQuantity)}
        <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Артикул, OEM, наименование, бренд или штрихкод..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          autoFocus
        />
        {query && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="X" size={14} />
          </button>
        )}
      </div>

      {searched && (
        <div className="bg-white border border-border rounded-lg overflow-hidden animate-slide-up">
          {results.length > 0 ? (
            <>
              <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center gap-2">
                <Icon name="PackageSearch" size={14} className="text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Найдено: {results.length}
                </span>
              </div>
              {results.map((part) => (
                <PartRow key={part.id} part={part} />
              ))}
            </>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              <Icon name="SearchX" size={32} className="mx-auto mb-2 opacity-30" />
              Ничего не найдено по запросу «{query}»
            </div>
          )}

          {analogs.length > 0 && (
            <>
              <div className="px-4 py-2 bg-amber-50 border-t border-border flex items-center gap-2">
                <Icon name="GitMerge" size={14} className="text-amber-600" />
                <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                  Аналоги на складе: {analogs.length}
                </span>
              </div>
              {analogs.map((part) => (
                <PartRow key={part.id} part={part} isAnalog />
              ))}
            </>
          )}
        </div>
      )}

      {!searched && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Scan" size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Введите артикул, наименование или отсканируйте штрихкод</p>
          <p className="text-xs mt-1 opacity-60">Система автоматически найдёт аналоги</p>
        </div>
      )}
    </div>
  );
}