import { useState, useRef } from 'react';
import Icon from '@/components/ui/icon';

interface ImportedRow {
  article: string;
  name: string;
  brand: string;
  category: string;
  quantity: number;
  price: number;
  location: string;
  status: 'ok' | 'error';
  error?: string;
}

const REQUIRED_COLUMNS = ['article', 'name'];
const COLUMN_ALIASES: Record<string, string> = {
  'артикул': 'article', 'article': 'article',
  'наименование': 'name', 'название': 'name', 'name': 'name',
  'бренд': 'brand', 'производитель': 'brand', 'brand': 'brand',
  'категория': 'category', 'category': 'category',
  'количество': 'quantity', 'кол-во': 'quantity', 'qty': 'quantity', 'quantity': 'quantity',
  'цена': 'price', 'стоимость': 'price', 'price': 'price',
  'место': 'location', 'ячейка': 'location', 'location': 'location',
};

function parseCSV(text: string): ImportedRow[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  const mapped = headers.map((h) => COLUMN_ALIASES[h] || h);

  return lines.slice(1).map((line) => {
    const cells = line.split(separator).map((c) => c.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    mapped.forEach((key, i) => { row[key] = cells[i] || ''; });

    const missing = REQUIRED_COLUMNS.filter((c) => !row[c]);
    if (missing.length > 0) {
      return { article: row.article || '', name: row.name || '', brand: '', category: '', quantity: 0, price: 0, location: '', status: 'error', error: `Нет обязательных полей: ${missing.join(', ')}` } as ImportedRow;
    }

    return {
      article: row.article,
      name: row.name,
      brand: row.brand || '',
      category: row.category || 'Расходники',
      quantity: parseInt(row.quantity) || 0,
      price: parseFloat(row.price) || 0,
      location: row.location || '',
      status: 'ok',
    } as ImportedRow;
  });
}

export default function ImportSection() {
  const [preview, setPreview] = useState<ImportedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [imported, setImported] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setImported(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      setPreview(rows);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      handleFile(file);
    }
  };

  const okRows = preview.filter((r) => r.status === 'ok');
  const errRows = preview.filter((r) => r.status === 'error');

  const handleImport = () => {
    setImported(true);
  };

  const handleReset = () => {
    setPreview([]);
    setFileName('');
    setImported(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const sampleCSV = `article;name;brand;category;quantity;price;location
OP-641/1;Фильтр масляный;Mann;Фильтры;10;380;A1-01
W7008;Фильтр масляный;Mahle;Фильтры;5;410;A1-02
TRW-BF-L04;Колодки тормозные;TRW;Тормозная система;4;1850;B3-01`;

  const downloadSample = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sample_import.csv';
    a.click();
  };

  return (
    <div className="space-y-5">
      {!preview.length && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
            dragging ? 'border-foreground bg-muted/50' : 'border-border hover:border-muted-foreground'
          }`}
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="FileSpreadsheet" size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm font-medium mb-1">Перетащите CSV файл или нажмите для выбора</p>
          <p className="text-xs text-muted-foreground">Поддерживаются форматы .csv с разделителями «;» или «,»</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      <div className="bg-white border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon name="FileText" size={15} className="text-muted-foreground" />
            <span className="text-sm font-medium">Шаблон для импорта</span>
          </div>
          <button
            onClick={downloadSample}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md px-3 py-1.5"
          >
            <Icon name="Download" size={12} />
            Скачать шаблон
          </button>
        </div>
        <div className="font-mono-data text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre text-muted-foreground">
          {sampleCSV}
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
          {[
            { field: 'article', label: 'article / артикул', req: true },
            { field: 'name', label: 'name / наименование', req: true },
            { field: 'brand', label: 'brand / бренд', req: false },
            { field: 'category', label: 'category / категория', req: false },
            { field: 'quantity', label: 'quantity / количество', req: false },
            { field: 'price', label: 'price / цена', req: false },
            { field: 'location', label: 'location / место', req: false },
          ].map((col) => (
            <div key={col.field} className="flex items-center gap-1.5">
              <span className={`w-1 h-1 rounded-full ${col.req ? 'bg-red-400' : 'bg-muted-foreground/40'}`} />
              <span>{col.label}</span>
              {col.req && <span className="text-red-400">*</span>}
            </div>
          ))}
        </div>
      </div>

      {preview.length > 0 && (
        <div className="bg-white border border-border rounded-lg overflow-hidden animate-slide-up">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="FileCheck" size={15} className="text-muted-foreground" />
              <span className="text-sm font-medium">{fileName}</span>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{okRows.length} строк</span>
              {errRows.length > 0 && (
                <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{errRows.length} ошибок</span>
              )}
            </div>
            <button onClick={handleReset} className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="X" size={16} />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_0.5fr_0.5fr] gap-0 px-4 py-2 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide sticky top-0">
              <span>Артикул</span>
              <span>Наименование</span>
              <span>Бренд</span>
              <span>Категория</span>
              <span>Кол-во</span>
              <span>Цена</span>
            </div>
            {preview.map((row, i) => (
              <div key={i} className={`grid grid-cols-[1.5fr_1.5fr_1fr_1fr_0.5fr_0.5fr] gap-0 items-center px-4 py-2 border-b border-border last:border-0 text-xs ${
                row.status === 'error' ? 'bg-red-50' : ''
              }`}>
                {row.status === 'error' ? (
                  <div className="col-span-6 flex items-center gap-2 text-red-600">
                    <Icon name="AlertCircle" size={12} />
                    {row.error}
                  </div>
                ) : (
                  <>
                    <span className="font-mono-data font-medium">{row.article}</span>
                    <span className="truncate">{row.name}</span>
                    <span className="text-muted-foreground">{row.brand}</span>
                    <span className="text-muted-foreground">{row.category}</span>
                    <span className="font-mono-data">{row.quantity}</span>
                    <span className="font-mono-data">{row.price}</span>
                  </>
                )}
              </div>
            ))}
          </div>

          {!imported ? (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/20">
              <span className="text-xs text-muted-foreground">Будет добавлено: {okRows.length} позиций</span>
              <button
                onClick={handleImport}
                disabled={okRows.length === 0}
                className="flex items-center gap-2 px-4 py-1.5 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-40"
              >
                <Icon name="Upload" size={14} />
                Импортировать
              </button>
            </div>
          ) : (
            <div className="px-4 py-3 border-t border-border bg-emerald-50 flex items-center gap-2">
              <Icon name="CheckCircle" size={15} className="text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">Импортировано {okRows.length} позиций</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
