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
  const itemsPerPage = 6;

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
    <div className="w-full space-y-4">
      {/* Search Header */}
      {searchKeys.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="pl-9 h-10 bg-card border-border"
            />
          </div>
          {totalPages > 1 && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <span>Page {currentPage} of {totalPages}</span>
            </div>
          )}
        </div>
      )}

      {/* Mobile Card View (Visible only on small screens) */}
      <div className="sm:hidden space-y-4">
        {paginatedData.map((item, index) => (
          <div
            key={item.id || index}
            className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3"
            onClick={() => onRowClick?.(item)}
          >
            {/* Header/Actions Row */}
            <div className="flex items-center justify-between">
              {/* Checkbox for mobile */}
              {showSelection && (
                <Checkbox
                  checked={safeSelectedIds.has(item.id)}
                  onCheckedChange={() => toggleSelect(item.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}

              {/* Primary Identifier (First Column) */}
              <div className="font-semibold text-foreground truncate flex-1 ml-2">
                {(() => {
                  const col = columns[0];
                  if (!col) return null;
                  const val = getValue(item, col.key as string);
                  return col.render ? col.render(item) : String(val ?? '');
                })()}
              </div>

              {/* Actions Dropdown */}
              {actions && actions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreHorizontal weight="bold" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {actions.map((action, i) => (
                      <DropdownMenuItem
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick(item);
                        }}
                        className={cn(action.variant === 'destructive' && "text-destructive focus:text-destructive")}
                      >
                        {action.icon && <span className="mr-2">{action.icon}</span>}
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Data Rows */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              {columns.slice(1).map((col, i) => (
                <div key={i} className="flex justify-between items-start text-sm">
                  <span className="text-muted-foreground font-medium shrink-0 mr-2">{col.header}</span>
                  <span className="text-foreground text-right break-words line-clamp-2">
                    {col.render ? col.render(item) : String(getValue(item, col.key as string) ?? '--')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {paginatedData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed border-border">
            {emptyMessage}
          </div>
        )}
      </div>

      {/* Desktop Table View (Hidden on small screens) */}
      <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                {showSelection && (
                  <th className="px-4 py-3 w-[40px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                )}
                {columns.map(col => (
                  <th
                    key={String(col.key)}
                    className={cn(
                      "px-4 py-3 whitespace-nowrap transition-colors hover:bg-muted/50 cursor-pointer select-none",
                      col.className
                    )}
                    onClick={() => col.sortable && handleSort(String(col.key))}
                  >
                    <div className="flex items-center gap-1 group">
                      {col.header}
                      {sortKey === String(col.key) && (
                        <span className="text-primary">
                          {sortDirection === 'asc' ? <ChevronUp weight="bold" /> : <ChevronDown weight="bold" />}
                        </span>
                      )}
                      {col.sortable && sortKey !== String(col.key) && (
                        <span className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors">
                          <ChevronDown weight="bold" />
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {actions && <th className="px-4 py-3 w-[50px]"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, i) => (
                  <tr
                    key={item.id || i}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      "group transition-colors hover:bg-muted/30",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {showSelection && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={safeSelectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={String(col.key)} className={cn("px-4 py-3 text-foreground", col.className)}>
                        {col.render ? col.render(item) : String(getValue(item, col.key as string) ?? '--')}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal weight="bold" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {actions.map((action, idx) => (
                              <DropdownMenuItem
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.onClick(item);
                                }}
                                className={cn(action.variant === 'destructive' && "text-destructive focus:text-destructive")}
                              >
                                {action.icon && <span className="mr-2">{action.icon}</span>}
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0) + (showSelection ? 1 : 0)} className="px-4 py-12 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4">
          <AdvancedPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
