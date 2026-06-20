import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import EmptyBackground from '@/components/ui/empty-background';
import { Part, Client } from '@/data/mockData';
import { getParts, searchSuppliers, SupplierResult, getClients } from '@/api';
import { useAuth } from '@/context/AuthContext';

interface SearchSectionProps {
  onSelectPart: (part: Part) => void;
  onOpenApiSettings: () => void;
  onAddToOrder?: (item: SupplierResult, client: Client) => void;
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

export default function SearchSection({ onSelectPart, onOpenApiSettings, onAddToOrder }: SearchSectionProps) {
  const { token } = useAuth();
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ direct: [], analogsByList: [], analogsByOem: [], oemMatchQuery: false });
  const [searched, setSearched] = useState(false);
  const [supplierResults, setSupplierResults] = useState<SupplierResult[]>([]);
  const [supplierConnected, setSupplierConnected] = useState<string[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalExpanded, setExternalExpanded] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const externalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingItem, setPendingItem] = useState<SupplierResult | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);

  const handleAddToOrder = (item: SupplierResult) => {
    setPendingItem(item);
    setClientSearch('');
    setClientsLoading(true);
    getClients().then((data: unknown[]) => {
      setClients((data as Client[]).filter((c: Client) => !c.isDeleted));
      setClientsLoading(false);
    }).catch(() => setClientsLoading(false));
  };

  const handleSelectClient = (client: Client) => {
    if (pendingItem && onAddToOrder) {
      onAddToOrder(pendingItem, client);
    }
    setPendingItem(null);
  };

  useEffect(() => {
    getParts().then((data: unknown[]) => setAllParts(data.map(dbToPart)));
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    setSupplierResults([]);
    setExternalExpanded(false);
    if (value.trim().length > 1) {
      setResults(buildResults(allParts, value));
      setSearched(true);
    } else {
      setSearched(false);
      setExternalLoading(false);
      return;
    }
    if (externalTimerRef.current) clearTimeout(externalTimerRef.current);
    if (value.trim().length >= 4 && token) {
      setExternalLoading(true);
      externalTimerRef.current = setTimeout(() => {
        searchSuppliers(value.trim(), token).then((data) => {
          setSupplierResults(data.results);
          setSupplierConnected(data.connected);
          setExternalLoading(false);
        }).catch(() => setExternalLoading(false));
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

      {/* Инструкция по API поставщиков */}
      <div className="border border-border rounded-lg overflow-hidden bg-white">
        <button
          onClick={() => setGuideOpen((v) => !v)}
          className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-muted/30 transition-colors text-left"
        >
          <Icon name="BookOpen" size={14} className="text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground flex-1">Как подключить поставщиков и получить API-ключи?</span>
          <Icon name={guideOpen ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-muted-foreground shrink-0" />
        </button>

        {guideOpen && (
          <div className="border-t border-border px-4 py-4 space-y-4 text-sm">
            <p className="text-muted-foreground text-xs">
              Чтобы система показывала цены и наличие у поставщиков — нужно получить API-ключ и добавить его в{' '}
              <button onClick={onOpenApiSettings} className="text-blue-600 underline">настройках</button>.
              Обычный логин/пароль не подходит — нужен именно API-доступ.
            </p>

            <div className="space-y-3">
              {/* Авторусь */}
              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="font-medium text-sm flex items-center gap-2">
                  Авторусь (ARUS)
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-normal">самый простой</span>
                </div>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Зарегистрируйтесь на <a href="https://avtorus.ru" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">avtorus.ru</a></li>
                  <li>Войдите в личный кабинет → «Профиль» → «Настройки API»</li>
                  <li>Нажмите «Сгенерировать токен» — скопируйте его</li>
                  <li>Вставьте в настройках PartKeeper в поле «Авторусь»</li>
                </ol>
              </div>

              {/* Exist.ru */}
              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="font-medium text-sm">Exist.ru</div>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Нужен корпоративный аккаунт (не обычный покупательский)</li>
                  <li>Позвоните менеджеру Exist или напишите на <a href="mailto:api@exist.ru" className="text-blue-600 underline">api@exist.ru</a></li>
                  <li>Запросите «API-доступ для интеграции» — укажите ИНН и название компании</li>
                  <li>После подтверждения вам пришлют логин и пароль от API (они отличаются от обычных)</li>
                </ol>
              </div>

              {/* Rossko */}
              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="font-medium text-sm">Rossko</div>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Зарегистрируйтесь как юрлицо на <a href="https://rossko.ru" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">rossko.ru</a></li>
                  <li>Свяжитесь с вашим менеджером Rossko и запросите «ключи для API» (KEY1 и KEY2)</li>
                  <li>Вставьте оба ключа в настройках PartKeeper в поля «Rossko KEY1» и «KEY2»</li>
                </ol>
              </div>

              {/* Emex.ru */}
              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="font-medium text-sm flex items-center gap-2">
                  Emex.ru
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-normal">самый простой</span>
                </div>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Зарегистрируйтесь или войдите на <a href="https://emex.ru" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">emex.ru</a></li>
                  <li>Отдельный API-ключ не нужен — используется обычный логин и пароль от сайта</li>
                  <li>Введите их в настройках в поле «Emex.ru»</li>
                </ol>
              </div>

              {/* Armtek */}
              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="font-medium text-sm">Armtek</div>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Нужен активный договор с Armtek</li>
                  <li>Напишите менеджеру или в поддержку: запросите «токен для API-интеграции»</li>
                  <li>Вставьте полученный токен в настройках PartKeeper</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => { setGuideOpen(false); onOpenApiSettings(); }}
              className="w-full bg-foreground text-background rounded-lg py-2 text-xs font-semibold hover:bg-foreground/90 transition-colors"
            >
              Перейти в настройки и добавить ключи
            </button>
          </div>
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

      {/* Предложения от поставщиков */}
      {searched && query.trim().length >= 4 && (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <button
            className="w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/30 transition-colors"
            onClick={() => setExternalExpanded((v) => !v)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Icon name="Globe" size={14} className="text-blue-500 shrink-0" />
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Предложения поставщиков</span>
              {supplierConnected.length > 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                  {supplierConnected.map(k => k.replace('_token', '')).join(' · ')}
                </span>
              )}
              {externalLoading && (
                <span className="text-xs text-muted-foreground animate-pulse ml-1">ищем цены...</span>
              )}
              {!externalLoading && supplierResults.length > 0 && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1">{supplierResults.length}</span>
              )}
            </div>
            <Icon name={externalExpanded ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-muted-foreground shrink-0" />
          </button>

          {externalExpanded && (
            <>
              {externalLoading ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground border-t border-border">
                  <Icon name="Loader" size={20} className="mx-auto mb-2 opacity-40 animate-spin" />
                  Запрашиваем цены у поставщиков...
                </div>
              ) : supplierConnected.length === 0 ? (
                <div className="px-4 py-6 text-center border-t border-border">
                  <div className="text-sm text-muted-foreground">Нет подключённых поставщиков</div>
                  <button
                    onClick={onOpenApiSettings}
                    className="text-xs text-blue-600 underline mt-1 hover:text-blue-800 transition-colors"
                  >
                    Добавить API-токен в настройках
                  </button>
                </div>
              ) : supplierResults.length === 0 ? (
                <div className="px-4 py-6 text-center border-t border-border">
                  <div className="text-sm text-muted-foreground">Ничего не найдено у поставщиков</div>
                </div>
              ) : (
                <div className="border-t border-border divide-y divide-border">
                  {supplierResults.map((r, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono-data font-medium text-sm">{r.article}</span>
                          <span className="text-xs text-muted-foreground">{r.brand}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-700">{r.source}</span>
                        </div>
                        <div className="text-sm text-muted-foreground truncate mt-0.5">{r.name}</div>
                        {r.warehouse && <div className="text-xs text-muted-foreground/60 mt-0.5">{r.warehouse}</div>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          {r.price > 0 && <div className="text-sm font-semibold">{r.price.toLocaleString()} ₽</div>}
                          {r.quantity > 0 && <div className="text-xs text-emerald-600">{r.quantity} шт</div>}
                          {r.delivery_days && <div className="text-xs text-muted-foreground">{r.delivery_days}</div>}
                        </div>
                        <button
                          onClick={() => handleAddToOrder(r)}
                          className="flex items-center gap-1 text-xs bg-foreground text-background px-2.5 py-1.5 rounded-md hover:bg-foreground/80 transition-colors shrink-0"
                        >
                          <Icon name="Plus" size={12} />
                          В заказ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!searched && (
        <>
          <div className="mx-4 mt-4 mb-2 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="text-xl shrink-0 mt-0.5">🔑</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-amber-900">Подключите магазины автозапчастей</div>
              <div className="text-xs text-amber-700 mt-0.5">
                Чтобы видеть цены и сроки поставки от поставщиков прямо в поиске — добавьте API ключи магазинов в{' '}
                <button
                  onClick={onOpenApiSettings}
                  className="underline font-medium hover:text-amber-900 transition-colors"
                >
                  настройках
                </button>
              </div>
            </div>
          </div>
          <EmptyBackground
            icons={['ScanBarcode', 'Search', 'Tag', 'Package', 'Barcode', 'PackageSearch', 'Hash', 'Scan']}
            text="Введите артикул, OEM-номер, наименование или штрихкод."
            subtext="При вводе OEM-системы будут найдены все заменители на складе."
          />
        </>
      )}

      {/* Модальное окно выбора клиента */}
      {pendingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">Выберите клиента</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {pendingItem.article} · {pendingItem.brand} · {pendingItem.price.toLocaleString()} ₽
                </div>
              </div>
              <button onClick={() => setPendingItem(null)} className="text-muted-foreground hover:text-foreground">
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-border">
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Поиск клиента..."
                autoFocus
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {clientsLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Icon name="Loader" size={18} className="animate-spin" />
                </div>
              ) : (
                clients
                  .filter((c) =>
                    !clientSearch ||
                    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                    c.phone?.includes(clientSearch)
                  )
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectClient(c)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.name}</div>
                        {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}