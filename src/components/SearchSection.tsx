import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import EmptyBackground from '@/components/ui/empty-background';
import { Part } from '@/data/mockData';
import { getParts } from '@/api';

interface ExternalAnalog {
  article: string;
  brand: string;
  name: string;
  source: 'exist' | 'emex' | 'partsapi';
}

// Заглушка — будет заменена на реальный запрос к PartsAPI после подключения ключа
async function fetchExternalAnalogs(query: string): Promise<ExternalAnalog[]> {
  await new Promise((r) => setTimeout(r, 900));
  if (query.length < 4) return [];
  return [
    { article: 'BP02C', brand: 'SANGSIN', name: 'Колодки тормозные передние', source: 'exist' },
    { article: 'GDB1234', brand: 'FERODO', name: 'Колодки дисковые', source: 'emex' },
    { article: '0986494031', brand: 'BOSCH', name: 'Тормозные колодки', source: 'partsapi' },
  ];
}

interface SearchSectionProps {
  onSelectPart: (part: Part) => void;
}

interface SearchResult {
  direct: Part[];
  analogsByList: Part[];
  analogsByOem: Part[];
  oemMatchQuery: boolean;
}

function dbToPart(r: Record<string, unknown>): Part {
  return {
    id: r.id as string,
    article: r.article as string,
    name: r.name as string,
    brand: (r.brand as string) || '',
    category: (r.category as string) || '',
    quantity: Number(r.quantity),
    minQuantity: Number(r.min_quantity),
    price: Number(r.price),
    location: (r.location as string) || '',
    analogs: (r.analogs as string[]) || [],
    oemArticle: (r.oem_article as string) || undefined,
    barcode: (r.barcode as string) || undefined,
  };
}

function buildResults(allParts: Part[], value: string): SearchResult {
  const q = value.trim().toLowerCase();

  const direct = allParts.filter(
    (p) =>
      p.article.toLowerCase().includes(q) ||
      p.oemArticle?.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.barcode?.includes(q)
  );

  const directIds = new Set(direct.map((p) => p.id));

  const analogArticles = new Set(direct.flatMap((p) => p.analogs.map((a) => a.toLowerCase())));
  const analogsByList = allParts.filter(
    (p) => !directIds.has(p.id) && analogArticles.has(p.article.toLowerCase())
  );

  const oemMatchQuery = allParts.some((p) => p.oemArticle?.toLowerCase() === q);
  const analogsByOem = oemMatchQuery
    ? allParts.filter((p) => !directIds.has(p.id) && p.oemArticle?.toLowerCase() === q)
    : [];

  return { direct, analogsByList, analogsByOem, oemMatchQuery };
}

const stockBadge = (qty: number, min: number) => {
  if (qty === 0) return <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">нет</span>;
  if (qty <= min) return <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">{qty} шт</span>;
  return <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">{qty} шт</span>;
};

export default function SearchSection({ onSelectPart }: SearchSectionProps) {
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ direct: [], analogsByList: [], analogsByOem: [], oemMatchQuery: false });
  const [searched, setSearched] = useState(false);
  const [externalAnalogs, setExternalAnalogs] = useState<ExternalAnalog[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalExpanded, setExternalExpanded] = useState(false);
  const externalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getParts().then((data: unknown[]) => setAllParts(data.map(dbToPart)));
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    setExternalAnalogs([]);
    setExternalExpanded(false);
    if (value.trim().length > 1) {
      setResults(buildResults(allParts, value));
      setSearched(true);
    } else {
      setSearched(false);
      setExternalLoading(false);
      return;
    }
    // Запрос внешних аналогов с задержкой — не дёргаем при каждой букве
    if (externalTimerRef.current) clearTimeout(externalTimerRef.current);
    if (value.trim().length >= 4) {
      setExternalLoading(true);
      externalTimerRef.current = setTimeout(() => {
        fetchExternalAnalogs(value.trim()).then((data) => {
          setExternalAnalogs(data);
          setExternalLoading(false);
        });
      }, 800);
    }
  };

  const PartRow = ({ part, tag }: { part: Part; tag?: React.ReactNode }) => (
    <div
      className="hover-row flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer transition-colors"
      onClick={() => onSelectPart(part)}
    >
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
          <button onClick={() => handleSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={14} />
          </button>
        )}
      </div>

      {searched && (
        <div className="bg-white border border-border rounded-lg overflow-hidden animate-slide-up">
          {direct.length > 0 ? (
            <>
              <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center gap-2">
                <Icon name="PackageSearch" size={14} className="text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Найдено: {direct.length}</span>
              </div>
              {direct.map((part) => <PartRow key={part.id} part={part} />)}
            </>
          ) : analogsByOem.length === 0 && analogsByList.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              <Icon name="SearchX" size={32} className="mx-auto mb-2 opacity-30" />
              Ничего не найдено по запросу «{query}»
            </div>
          ) : null}

          {analogsByList.length > 0 && (
            <>
              <div className="px-4 py-2 bg-amber-50 border-t border-border flex items-center gap-2">
                <Icon name="GitMerge" size={14} className="text-amber-600" />
                <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Аналоги на складе: {analogsByList.length}</span>
              </div>
              {analogsByList.map((part) => (
                <PartRow key={part.id} part={part}
                  tag={<span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shrink-0">аналог</span>} />
              ))}
            </>
          )}

          {analogsByOem.length > 0 && (
            <>
              <div className="px-4 py-2 bg-yellow-50 border-t border-border flex items-center gap-2">
                <Icon name="Tag" size={14} className="text-yellow-600" />
                <span className="text-xs font-medium text-yellow-800 uppercase tracking-wide">Заменители под оригинал: {analogsByOem.length}</span>
                <span className="text-xs text-yellow-700 ml-auto">OEM: {query.toUpperCase()}</span>
              </div>
              {analogsByOem.map((part) => (
                <PartRow key={part.id} part={part}
                  tag={<span className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded shrink-0">OEM замена</span>} />
              ))}
            </>
          )}

          {totalFound > 0 && (direct.length > 0 || analogsByList.length > 0) && analogsByOem.length > 0 && (
            <div className="px-4 py-2 bg-muted/20 border-t border-border text-xs text-muted-foreground text-right">
              Всего найдено: {totalFound} позиций
            </div>
          )}
        </div>
      )}

      {/* Аналоги из интернета (Exist / Emex) */}
      {searched && query.trim().length >= 4 && (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <button
            className="w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/30 transition-colors"
            onClick={() => setExternalExpanded((v) => !v)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Icon name="Globe" size={14} className="text-blue-500 shrink-0" />
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Аналоги из интернета</span>
              <span className="text-xs text-muted-foreground ml-1">Exist · Emex</span>
              {externalLoading && (
                <span className="text-xs text-muted-foreground animate-pulse ml-1">поиск...</span>
              )}
              {!externalLoading && externalAnalogs.length > 0 && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1">{externalAnalogs.length}</span>
              )}
            </div>
            <Icon name={externalExpanded ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-muted-foreground shrink-0" />
          </button>

          {externalExpanded && (
            <>
              {externalLoading ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground border-t border-border">
                  <Icon name="Loader" size={20} className="mx-auto mb-2 opacity-40 animate-spin" />
                  Ищем аналоги на Exist и Emex...
                </div>
              ) : externalAnalogs.length === 0 ? (
                <div className="px-4 py-6 text-center border-t border-border">
                  <div className="text-sm text-muted-foreground">Аналоги не найдены</div>
                  <div className="text-xs text-muted-foreground/60 mt-1">
                    Требуется подключение PartsAPI — обратитесь к разработчику
                  </div>
                </div>
              ) : (
                <div className="border-t border-border divide-y divide-border">
                  {externalAnalogs.map((a, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono-data font-medium text-sm">{a.article}</span>
                          <span className="text-xs text-muted-foreground">{a.brand}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            a.source === 'exist' ? 'bg-orange-50 text-orange-700' :
                            a.source === 'emex' ? 'bg-purple-50 text-purple-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {a.source === 'exist' ? 'Exist' : a.source === 'emex' ? 'Emex' : 'TecDoc'}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground truncate mt-0.5">{a.name}</div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0 italic">нет на складе</div>
                    </div>
                  ))}
                  <div className="px-4 py-2 bg-amber-50 text-xs text-amber-700 flex items-center gap-1.5">
                    <Icon name="Info" size={12} />
                    Это демо-данные. Подключи PartsAPI для реального поиска.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!searched && (
        <EmptyBackground
          icons={['ScanBarcode', 'Search', 'Tag', 'Package', 'Barcode', 'PackageSearch', 'Hash', 'Scan']}
          text="Введите артикул, OEM-номер, наименование или штрихкод."
          subtext="При вводе OEM-системы будут найдены все заменители на складе."
        />
      )}
    </div>
  );
}