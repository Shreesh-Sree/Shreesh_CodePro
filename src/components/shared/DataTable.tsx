import { useState } from 'react';
import { MagnifyingGlass as Search, CaretDown as ChevronDown, CaretUp as ChevronUp, DotsThree as MoreHorizontal } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import AdvancedPagination from '@/components/shared/AdvancedPagination';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface Action<T> {
  label: string;
  onClick: (item: T) => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  /** When set, show a checkbox column for multi-select. selectedIds and onSelectionChange must both be provided. */
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  actions,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  emptyMessage = 'No data available',
  onRowClick,
  selectedIds,
  onSelectionChange,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // Increased to 6 to fill space

  // Filter data based on search
  const filteredData = data.filter(item => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return searchKeys.some(key => {
      const value = item[key];
      return String(value).toLowerCase().includes(searchLower);
    });
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = (a as Record<string, unknown>)[sortKey];
    const bVal = (b as Record<string, unknown>)[sortKey];

    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    const comparison = aVal < bVal ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Pagination logic
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getValue = (item: T, key: string): unknown => {
    return (item as Record<string, unknown>)[key];
  };

  const showSelection = selectedIds != null && onSelectionChange != null;
  const safeSelectedIds = selectedIds ?? new Set<string>();
  const allSelected = showSelection && sortedData.length > 0 && sortedData.every(item => safeSelectedIds.has(item.id));
  const toggleSelect = (id: string) => {
    const next = new Set(safeSelectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange?.(next);
  };
  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(sortedData.map(item => item.id)));
    }
  };

  return (
    <div className="data-table-container">
      {/* Search Header */}
      {searchKeys.length > 0 && (
        <div className="p-4 border-b flex items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="pl-9 azure-input h-10"
            />
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Page {currentPage} of {totalPages}</span>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              {showSelection && (
                <th className="px-4 py-3 w-10 border-r border-border/50 last:border-r-0" onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/50 last:border-r-0",
                    col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors",
                    col.className
                  )}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDirection === 'asc'
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16 border-r border-border/50 last:border-r-0">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <colgroup>
            {showSelection && <col className="w-10" />}
          </colgroup>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0) + (showSelection ? 1 : 0)}
                  className="px-4 py-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2 opacity-50">
                    <Search className="h-8 w-8" />
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map(item => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b last:border-0 hover:bg-muted/50 transition-colors group/row",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {showSelection && (
                    <td className="px-4 py-3 w-10 border-r border-border/50 last:border-r-0" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={safeSelectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label={`Select ${item.id}`}
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={String(col.key)} className={cn("px-4 py-3 text-sm transition-colors border-r border-border/50 last:border-r-0", col.className)}>
                      {col.render
                        ? col.render(item)
                        : String(getValue(item, String(col.key)) ?? '-')
                      }
                    </td>
                  ))}
                  {actions && actions.length > 0 && (
                    <td className="px-4 py-3 text-right border-r border-border/50 last:border-r-0" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-yellow-700 hover:bg-yellow-400/20 transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="animate-scale-in">
                          {actions.map((action, idx) => (
                            <DropdownMenuItem
                              key={idx}
                              onClick={() => action.onClick(item)}
                              className={cn(
                                "gap-2 cursor-pointer",
                                action.variant === 'destructive' && "text-destructive focus:text-destructive"
                              )}
                            >
                              {action.icon}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <div className="p-4 border-t bg-muted/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground order-2 sm:order-1">
              Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="font-medium">{totalItems}</span> results
            </p>
            <div className="order-1 sm:order-2">
              <AdvancedPagination
                totalPages={totalPages}
                initialPage={currentPage}
                onPageChange={handlePageChange}
                variant="rounded"
                className="py-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
