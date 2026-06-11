import Icon from '@/components/ui/icon';

type SortField = 'name' | 'date' | 'orders';
type GroupFilter = 'all' | 'new' | 'debt' | 'active' | 'deleted';

interface Counts {
  all: number;
  new: number;
  debt: number;
  active: number;
  deleted: number;
}

interface ClientsSidebarProps {
  group: GroupFilter;
  sortBy: SortField;
  sortDir: 'asc' | 'desc';
  counts: Counts;
  onGroupChange: (g: GroupFilter) => void;
  onToggleSort: (field: SortField) => void;
}

export default function ClientsSidebar({
  group, sortBy, sortDir, counts, onGroupChange, onToggleSort,
}: ClientsSidebarProps) {
  return (
    <>
      {/* Мобильные группы + сортировка */}
      <div className="md:hidden overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {([
            { id: 'name', label: 'А→Я', icon: 'ArrowUpAZ' },
            { id: 'date', label: 'Дата', icon: 'Calendar' },
            { id: 'orders', label: 'Заказы', icon: 'ShoppingCart' },
          ] as const).map((s) => (
            <button
              key={s.id}
              onClick={() => onToggleSort(s.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 ${
                sortBy === s.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-white text-muted-foreground border-border'
              }`}
            >
              <Icon name={s.icon as 'Calendar'} size={11} />
              {s.label}
              {sortBy === s.id && (
                <Icon name={sortDir === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={10} />
              )}
            </button>
          ))}
          <div className="w-px bg-border self-stretch mx-1" />
        </div>
        <div className="flex gap-2 min-w-max mt-2">
          {([
            { id: 'all', label: 'Все' },
            { id: 'new', label: 'Новые' },
            { id: 'debt', label: 'Долг' },
            { id: 'active', label: 'Активные' },
            { id: 'deleted', label: 'Удалённые' },
          ] as const).map((g) => (
            <button
              key={g.id}
              onClick={() => onGroupChange(g.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 ${
                group === g.id
                  ? 'bg-yellow-400 text-black border-yellow-400'
                  : 'bg-white text-muted-foreground border-border'
              }`}
            >
              {g.label}
              <span className={`font-mono-data ${group === g.id ? 'text-black/70' : 'text-muted-foreground'}`}>{counts[g.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="w-52 shrink-0 hidden md:block">
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {([
            { id: 'all', label: 'Все клиенты', icon: 'Users' },
            { id: 'new', label: 'Новые', icon: 'UserPlus' },
            { id: 'debt', label: 'Долг по балансу', icon: 'AlertTriangle' },
            { id: 'active', label: 'С активными заказами', icon: 'ShoppingCart' },
            { id: 'deleted', label: 'Удалённые', icon: 'Trash2' },
          ] as const).map((g, i, arr) => (
            <button
              key={g.id}
              onClick={() => onGroupChange(g.id)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                i !== arr.length - 1 ? 'border-b border-border' : ''
              } ${
                group === g.id ? 'bg-yellow-400 text-black font-medium' : 'text-foreground hover:bg-muted/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon name={g.icon as 'Users'} size={14} />
                {g.label}
              </div>
              <span className="font-mono-data text-xs">{counts[g.id]}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Сортировка</span>
          </div>
          {([
            { id: 'name', label: 'По алфавиту', icon: 'ArrowUpAZ' },
            { id: 'date', label: 'По дате', icon: 'Calendar' },
            { id: 'orders', label: 'По заказам', icon: 'ShoppingCart' },
          ] as const).map((s, i, arr) => (
            <button
              key={s.id}
              onClick={() => onToggleSort(s.id)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                i !== arr.length - 1 ? 'border-b border-border' : ''
              } ${
                sortBy === s.id ? 'bg-muted font-medium text-foreground' : 'text-foreground hover:bg-muted/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon name={s.icon as 'ArrowUpAZ'} size={14} />
                {s.label}
              </div>
              {sortBy === s.id && (
                <Icon name={sortDir === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={13} className="text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
