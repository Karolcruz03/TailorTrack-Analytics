import React from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { DatasetSchema, FilterState } from '../types/sales';
import { getPaymentColor } from '../utils/salesData';

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  allProducts: string[];
  allPayments: string[];
  availableMonths: Array<{ key: string; label: string }>;
  schema: DatasetSchema;
  minDate: string;
  maxDate: string;
  filteredCount: number;
  totalCount: number;
  isFiltered: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  onReset,
  allProducts,
  allPayments,
  availableMonths,
  schema,
  minDate,
  maxDate,
  filteredCount,
  totalCount,
  isFiltered,
}) => {
  const togglePayment = (method: string) => {
    const exists = filters.selectedPayments.includes(method);
    const next = exists
      ? filters.selectedPayments.filter((p) => p !== method)
      : [...filters.selectedPayments, method];
    onChange({ ...filters, selectedPayments: next });
  };

  const toggleProduct = (product: string) => {
    if (!product) {
      onChange({ ...filters, selectedProducts: [] });
      return;
    }
    const exists = filters.selectedProducts.includes(product);
    const next = exists
      ? filters.selectedProducts.filter((p) => p !== product)
      : [product];
    onChange({ ...filters, selectedProducts: next });
  };

  return (
    <section
      aria-label="Controles de filtrado"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3"
    >
      {/* Row 1: Search, Month segmented control, Date range, Reset */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[210px] max-w-sm">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder={`Buscar ${schema.idLabel.toLowerCase()} o ${schema.primaryLabel.toLowerCase()}...`}
            aria-label="Buscar registros"
            className="w-full h-10 pl-9 pr-8 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, search: '' })}
              aria-label="Borrar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic Month Segmented Tabs (or select if > 5 months) */}
        {availableMonths.length <= 5 ? (
          <div
            role="group"
            aria-label="Filtrar por mes"
            className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg overflow-x-auto max-w-full"
          >
            <button
              type="button"
              onClick={() => onChange({ ...filters, selectedMonth: 'all' })}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filters.selectedMonth === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Todo el periodo
            </button>
            {availableMonths.map((m) => {
              const active = filters.selectedMonth === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onChange({ ...filters, selectedMonth: m.key })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        ) : (
          <select
            value={filters.selectedMonth}
            onChange={(e) => onChange({ ...filters, selectedMonth: e.target.value })}
            aria-label="Filtrar por mes"
            className="h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
          >
            <option value="all">Todos los meses ({availableMonths.length})</option>
            {availableMonths.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        )}

        {/* Date range */}
        <div className="flex items-center gap-2 text-xs">
          <label className="text-slate-500 dark:text-slate-400 whitespace-nowrap" htmlFor="filter-start-date">
            Desde
          </label>
          <input
            id="filter-start-date"
            type="date"
            min={minDate}
            max={filters.endDate || maxDate}
            value={filters.startDate}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
            className="h-9 px-2.5 text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          />
          <label className="text-slate-500 dark:text-slate-400 whitespace-nowrap" htmlFor="filter-end-date">
            Hasta
          </label>
          <input
            id="filter-end-date"
            type="date"
            min={filters.startDate || minDate}
            max={maxDate}
            value={filters.endDate}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
            className="h-9 px-2.5 text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          />
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Row 2: Primary dim selector, Secondary dim buttons, Tier filter, Multi-item toggle */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <label htmlFor="filter-product-select" className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {schema.primaryLabel}
          </label>
          <select
            id="filter-product-select"
            value={filters.selectedProducts[0] || ''}
            onChange={(e) => toggleProduct(e.target.value)}
            className="h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 max-w-[230px]"
          >
            <option value="">Todos ({allProducts.length})</option>
            {allProducts.map((prod) => (
              <option key={prod} value={prod}>
                {prod}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label={`Filtrar por ${schema.secondaryLabel}`}>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1 whitespace-nowrap">
            {schema.secondaryLabel}
          </span>
          {allPayments.slice(0, 8).map((method) => {
            const active = filters.selectedPayments.includes(method);
            const color = getPaymentColor(method);
            return (
              <button
                key={method}
                type="button"
                onClick={() => togglePayment(method)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-xs shrink-0"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                {method}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-tier-select" className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Nivel
          </label>
          <select
            id="filter-tier-select"
            value={filters.selectedTier}
            onChange={(e) => onChange({ ...filters, selectedTier: e.target.value })}
            className="h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          >
            <option value="all">Todos los niveles</option>
            {Array.from(new Set(schema.tiers)).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => onChange({ ...filters, onlyMultiItemOrders: !filters.onlyMultiItemOrders })}
          aria-pressed={filters.onlyMultiItemOrders}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            filters.onlyMultiItemOrders
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:text-slate-900'
          }`}
        >
          Solo grupos multi-ítem
        </button>

        <div className="ml-auto text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
          Mostrando {filteredCount} / {totalCount} registros
        </div>
      </div>

      {/* Active filter summary line */}
      {isFiltered && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-1">
          <span className="font-medium text-slate-800 dark:text-slate-200">Filtros activos:</span>
          {filters.selectedMonth !== 'all' && <span>Mes {filters.selectedMonth}</span>}
          {filters.selectedProducts.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => onChange({ ...filters, selectedProducts: [] })}
                className="underline decoration-dotted hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {schema.primaryLabel}: {filters.selectedProducts.join(', ')} ×
              </button>
            </>
          )}
          {filters.selectedPayments.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => onChange({ ...filters, selectedPayments: [] })}
                className="underline decoration-dotted hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {schema.secondaryLabel}: {filters.selectedPayments.join(', ')} ×
              </button>
            </>
          )}
          {filters.selectedTier !== 'all' && (
            <>
              <span aria-hidden="true">·</span>
              <span>Nivel: {filters.selectedTier}</span>
            </>
          )}
          {(filters.startDate !== minDate || filters.endDate !== maxDate) && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Rango: {filters.startDate} → {filters.endDate}
              </span>
            </>
          )}
          {filters.onlyMultiItemOrders && (
            <>
              <span aria-hidden="true">·</span>
              <span>Grupos ≥ 2 ítems</span>
            </>
          )}
        </div>
      )}
    </section>
  );
};
