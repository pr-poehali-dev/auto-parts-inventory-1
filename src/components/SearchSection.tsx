import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { mockParts, Part } from '@/data/mockData';

interface SearchSectionProps {
  onSelectPart: (part: Part) => void;
}

interface SearchResult {
  direct: Part[];
  analogsByList: Part[];     // аналоги через поле analogs[]
  analogsByOem: Part[];      // детали, у которых oemArticle совпадает с запросом
  oemMatchQuery: boolean;    // запрос выглядит как OEM (найдено совпадение в oemArticle)
}

function buildResults(value: string): SearchResult {
  const q = value.trim().toLowerCase();

  // Прямое совпадение: артикул / наименование / бренд / штрихкод / OEM
  const direct = mockParts.filter(
    (p) =>
      p.article.toLowerCase().includes(q) ||
      p.oemArticle?.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.barcode?.includes(q)
  );

  const directIds = new Set(direct.map((p) => p.id));

  // Аналоги через поле analogs[] (кросс-артикулы)
  const analogArticles = new Set<string>();
  direct.forEach((p) => p.analogs.forEach((a) => analogArticles.add(a)));
  const analogsByList = mockParts.filter(
    (p) => analogArticles.has(p.article) && !directIds.has(p.id)
  );

  // Главная логика: если запрос совпадает с oemArticle какой-то детали —
  // считаем эту деталь «заменителем под оригинал»
  const oemMatchQuery = mockParts.some(
    (p) => p.oemArticle && p.oemArticle.toLowerCase().includes(q) && q.length >= 4
  );

  const analogsByOemIds = new Set([...directIds, ...analogsByList.map((p) => p.id)]);
  const analogsByOem = oemMatchQuery
    ? mockParts.filter(
        (p) =>
          p.oemArticle &&
          p.oemArticle.toLowerCase().includes(q) &&
          !analogsByOemIds.has(p.id)
      )
    : [];

  return { direct, analogsByList, analogsByOem, oemMatchQuery };
}

export default function SearchSection({ onSelectPart }: SearchSectionProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ direct: [], analogsByList: [], analogsByOem: [], oemMatchQuery: false });
  const [searched, setSearched] = useState(false);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults({ direct: [], analogsByList: [], analogsByOem: [], oemMatchQuery: false });
      setSearched(false);
      return;
    }
    setResults(buildResults(value));
    setSearched(true);
  };

  const stockBadge = (qty: number, min: number) => {
    if (qty === 0) return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Нет</span>;
    if (qty <= min) return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Мало: {qty}</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{qty} шт</span>;
  };

  const PartRow = ({ part, tag }: { part: Part; tag?: React.ReactNode }) => (
    <div
      className="hover-row flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-border last:border-0 animate-fade-in"
      onClick={() => onSelectPart(part)}
    >
      <div className="flex items-center gap-3 min-w-0">
        {tag}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono-data font-medium text-sm text-foreground">{part.article}</span>
            {part.oemArticle && (
              <span className="font-mono-data text-xs text-yellow-800 bg-yellow-50 px-1.5 py-0.5 rounded">
                OEM: {part.oemArticle}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{part.brand}</span>
          </div>
          <div className="text-sm text-muted-foreground truncate">{part.name}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <span className="text-sm font-medium">{part.price.toLocaleString()} ₽</span>
        <span className="text-xs text-muted-foreground">{part.location}</span>
        {stockBadge(part.quantity, part.minQuantity)}
        <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
      </div>
    </div>
  );

  const { direct, analogsByList, analogsByOem } = results;
  const totalFound = direct.length + analogsByList.length + analogsByOem.length;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Артикул, OEM-номер, наименование, бренд или штрихкод..."
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

          {/* Прямые результаты */}
          {direct.length > 0 ? (
            <>
              <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center gap-2">
                <Icon name="PackageSearch" size={14} className="text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Найдено: {direct.length}
                </span>
              </div>
              {direct.map((part) => <PartRow key={part.id} part={part} />)}
            </>
          ) : analogsByOem.length === 0 && analogsByList.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              <Icon name="SearchX" size={32} className="mx-auto mb-2 opacity-30" />
              Ничего не найдено по запросу «{query}»
            </div>
          ) : null}

          {/* Аналоги через поле analogs[] */}
          {analogsByList.length > 0 && (
            <>
              <div className="px-4 py-2 bg-amber-50 border-t border-border flex items-center gap-2">
                <Icon name="GitMerge" size={14} className="text-amber-600" />
                <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                  Аналоги на складе: {analogsByList.length}
                </span>
              </div>
              {analogsByList.map((part) => (
                <PartRow
                  key={part.id}
                  part={part}
                  tag={<span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shrink-0">аналог</span>}
                />
              ))}
            </>
          )}

          {/* Аналоги по OEM-совпадению */}
          {analogsByOem.length > 0 && (
            <>
              <div className="px-4 py-2 bg-yellow-50 border-t border-border flex items-center gap-2">
                <Icon name="Tag" size={14} className="text-yellow-600" />
                <span className="text-xs font-medium text-yellow-800 uppercase tracking-wide">
                  Заменители под оригинал: {analogsByOem.length}
                </span>
                <span className="text-xs text-yellow-700 ml-auto">OEM: {query.toUpperCase()}</span>
              </div>
              {analogsByOem.map((part) => (
                <PartRow
                  key={part.id}
                  part={part}
                  tag={<span className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded shrink-0">OEM замена</span>}
                />
              ))}
            </>
          )}

          {/* Сводка если несколько блоков */}
          {totalFound > 0 && (direct.length > 0 || analogsByList.length > 0) && analogsByOem.length > 0 && (
            <div className="px-4 py-2 bg-muted/20 border-t border-border text-xs text-muted-foreground text-right">
              Всего позиций: {totalFound}
            </div>
          )}

          {/* Ничего не найдено, но есть OEM-аналоги */}
          {direct.length === 0 && analogsByOem.length === 0 && analogsByList.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              <Icon name="SearchX" size={32} className="mx-auto mb-2 opacity-30" />
              Ничего не найдено по запросу «{query}»
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Scan" size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Введите артикул, OEM-номер, наименование или штрихкод</p>
          <p className="text-xs mt-1 opacity-60">При вводе OEM система покажет все заменители на складе</p>
        </div>
      )}
    </div>
  );
}