import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  GitFork,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Sun,
  Table2,
  Upload,
  X,
} from 'lucide-react';
import { AiInsightsDrawer } from './components/AiInsightsDrawer';
import { CsvImportModal } from './components/CsvImportModal';
import { DataTableView } from './components/DataTableView';
import { FilterBar } from './components/FilterBar';
import { KpiStrip } from './components/KpiStrip';
import { OrderInspectorModal } from './components/OrderInspectorModal';
import { CalendarHeatmap } from './components/charts/CalendarHeatmap';
import { MatrixHeatmap } from './components/charts/MatrixHeatmap';
import { PaymentBreakdownChart } from './components/charts/PaymentBreakdownChart';
import { ProductChart } from './components/charts/ProductChart';
import { SankeyFlowChart } from './components/charts/SankeyFlowChart';
import { TimeSeriesChart } from './components/charts/TimeSeriesChart';
import { WeekdayAndBasketView } from './components/charts/WeekdayAndBasketView';
import {
  AiInsightsReport,
  DashboardSection,
  DatasetSchema,
  FilterState,
  OrderGroup,
  SaleRecord,
} from './types/sales';
import {
  buildInsightsDigest,
  DEFAULT_SCHEMA,
  filterRecords,
  groupOrders,
  parseDateParts,
  parseSalesCSV,
} from './utils/salesData';

const DATA_URL = '/assets/aistudio/Sales_data_5e94d700';

const NAV_ITEMS: Array<{
  id: DashboardSection;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Vista General', desc: 'Resumen ejecutivo completo', icon: LayoutDashboard },
  { id: 'temporal', label: 'Análisis Temporal', desc: 'Serie diaria y calendario', icon: CalendarDays },
  { id: 'products', label: 'Categorías y Valores', desc: 'Pareto, lollipop y dispersión', icon: Package },
  { id: 'matrix_flow', label: 'Matriz y Flujo', desc: 'Mapa de calor y Sankey', icon: GitFork },
  { id: 'baskets', label: 'Canasta y Ritmo', desc: 'Días y grupos múltiples', icon: ShoppingBag },
  { id: 'ledger', label: 'Tabla de Datos', desc: 'Registro maestro y CSV', icon: Table2 },
];

export default function App() {
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [schema, setSchema] = useState<DatasetSchema>(DEFAULT_SCHEMA);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [section, setSection] = useState<DashboardSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [inspectedOrderNo, setInspectedOrderNo] = useState<string | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState<boolean>(false);

  // AI Insights state
  const [insightsOpen, setInsightsOpen] = useState<boolean>(false);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsReport, setInsightsReport] = useState<AiInsightsReport | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    startDate: '',
    endDate: '',
    selectedMonth: 'all',
    selectedProducts: [],
    selectedPayments: [],
    selectedTier: 'all',
    onlyMultiItemOrders: false,
  });

  const loadDefaultData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = parseSalesCSV(text);
      if (parsed.length === 0) throw new Error('El archivo CSV no contiene registros válidos.');
      setRecords(parsed);
      setSchema(DEFAULT_SCHEMA);
      setInsightsReport(null);
      const dates = parsed.map((r) => r.date).sort();
      setFilters({
        search: '',
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        selectedMonth: 'all',
        selectedProducts: [],
        selectedPayments: [],
        selectedTier: 'all',
        onlyMultiItemOrders: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos de ventas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefaultData();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [darkMode]);

  const { minDate, maxDate, allProducts, allPayments, availableMonths, allOrders, allOrdersMap } =
    useMemo(() => {
      const dates = records.map((r) => r.date).sort();
      const prods = Array.from(new Set(records.map((r) => r.product))).sort();
      const pays = Array.from(new Set(records.map((r) => r.paymentMethod)));
      const monthKeys = Array.from(new Set(records.map((r) => r.monthKey))).sort();
      const months = monthKeys.map((mk) => ({
        key: mk,
        label: parseDateParts(`${mk}-01`).monthFullLabel,
      }));
      const grouped = groupOrders(records);
      const map = new Map<string, OrderGroup>();
      grouped.forEach((g) => map.set(g.orderNumber, g));
      return {
        minDate: dates[0] || '',
        maxDate: dates[dates.length - 1] || '',
        allProducts: prods,
        allPayments: pays,
        availableMonths: months,
        allOrders: grouped,
        allOrdersMap: map,
      };
    }, [records]);

  const filteredRecords = useMemo(
    () => filterRecords(records, filters, allOrdersMap),
    [records, filters, allOrdersMap]
  );

  const filteredOrders = useMemo(() => groupOrders(filteredRecords), [filteredRecords]);

  const isFiltered = useMemo(() => {
    return (
      filters.search.trim() !== '' ||
      filters.selectedMonth !== 'all' ||
      filters.selectedProducts.length > 0 ||
      filters.selectedPayments.length > 0 ||
      filters.selectedTier !== 'all' ||
      filters.onlyMultiItemOrders ||
      (minDate !== '' && filters.startDate !== minDate) ||
      (maxDate !== '' && filters.endDate !== maxDate)
    );
  }, [filters, minDate, maxDate]);

  const resetFilters = () => {
    setFilters({
      search: '',
      startDate: minDate,
      endDate: maxDate,
      selectedMonth: 'all',
      selectedProducts: [],
      selectedPayments: [],
      selectedTier: 'all',
      onlyMultiItemOrders: false,
    });
  };

  const handleToggleProduct = (product: string) => {
    setFilters((prev) => {
      const exists = prev.selectedProducts.includes(product);
      return {
        ...prev,
        selectedProducts: exists ? prev.selectedProducts.filter((p) => p !== product) : [product],
      };
    });
  };

  const handleTogglePayment = (method: string) => {
    setFilters((prev) => {
      const exists = prev.selectedPayments.includes(method);
      return {
        ...prev,
        selectedPayments: exists
          ? prev.selectedPayments.filter((m) => m !== method)
          : [...prev.selectedPayments, method],
      };
    });
  };

  const handleSelectDate = (date: string) => {
    setFilters((prev) => {
      if (prev.startDate === date && prev.endDate === date) {
        return { ...prev, startDate: minDate, endDate: maxDate };
      }
      return { ...prev, startDate: date, endDate: date, selectedMonth: 'all' };
    });
  };

  const handleSelectMatrixCell = (product: string, payment: string) => {
    setFilters((prev) => {
      const same =
        prev.selectedProducts.length === 1 &&
        prev.selectedProducts[0] === product &&
        prev.selectedPayments.length === 1 &&
        prev.selectedPayments[0] === payment;
      if (same) {
        return { ...prev, selectedProducts: [], selectedPayments: [] };
      }
      return { ...prev, selectedProducts: [product], selectedPayments: [payment] };
    });
  };

  const handleImportedCsv = (nextRecords: SaleRecord[], nextSchema: DatasetSchema) => {
    setRecords(nextRecords);
    setSchema(nextSchema);
    setInsightsReport(null);
    const dates = nextRecords.map((r) => r.date).sort();
    setFilters({
      search: '',
      startDate: dates[0] || '',
      endDate: dates[dates.length - 1] || '',
      selectedMonth: 'all',
      selectedProducts: [],
      selectedPayments: [],
      selectedTier: 'all',
      onlyMultiItemOrders: false,
    });
  };

  const runAiInsights = async () => {
    setInsightsOpen(true);
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const digest = buildInsightsDigest(filteredRecords, filteredOrders, schema, isFiltered);
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digest }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Error del servidor (${res.status})`);
      }
      setInsightsReport(data.insights);
    } catch (err) {
      setInsightsError(
        err instanceof Error ? err.message : 'No se pudo obtener el análisis de IA Insights.'
      );
    } finally {
      setInsightsLoading(false);
    }
  };

  const activeNav = NAV_ITEMS.find((n) => n.id === section)!;
  const inspectedOrder = inspectedOrderNo ? allOrdersMap.get(inspectedOrderNo) || null : null;
  const activeSingleDate =
    filters.startDate && filters.startDate === filters.endDate ? filters.startDate : null;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        <div className="h-14 px-5 flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800">
          <BarChart3 className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="text-sm font-bold tracking-tight whitespace-nowrap">
            TailorTrack Analytics
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label="Vistas del panel">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs leading-tight whitespace-nowrap truncate">{item.label}</div>
                  <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
          <div className="space-y-1">
            <div className="text-slate-500 dark:text-slate-400">Fuente de datos activa</div>
            <div
              className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate"
              title={schema.datasetName}
            >
              {schema.datasetName}
            </div>
            <div className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
              {records.length} registros · {allOrders.length} grupos
            </div>
            {!schema.isDefaultSalesData && (
              <button
                type="button"
                onClick={loadDefaultData}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer pt-1"
              >
                <RotateCcw className="w-3 h-3" />
                Restaurar datos originales
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-slate-950/50"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">TailorTrack Analytics</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Cerrar menú"
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSection(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {darkMode ? 'Modo claro' : 'Modo oscuro'}
            </button>
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header Contract: Breadcrumbs left, max 2 primary actions right */}
        <header className="h-14 sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir navegación"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:inline truncate max-w-[180px]">
                {schema.datasetName}
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <h1 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {activeNav.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setCsvModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Subir CSV
            </button>

            <button
              type="button"
              onClick={runAiInsights}
              disabled={loading || filteredRecords.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              IA Insights
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 sm:p-6 space-y-5">
          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse"
                  />
                ))}
              </div>
              <div className="h-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
            </div>
          ) : error ? (
            <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-xl p-6 text-center space-y-3">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
              <button
                type="button"
                onClick={loadDefaultData}
                className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Reintentar carga
              </button>
            </div>
          ) : (
            <>
              <FilterBar
                filters={filters}
                onChange={setFilters}
                onReset={resetFilters}
                allProducts={allProducts}
                allPayments={allPayments}
                availableMonths={availableMonths}
                schema={schema}
                minDate={minDate}
                maxDate={maxDate}
                filteredCount={filteredRecords.length}
                totalCount={records.length}
                isFiltered={isFiltered}
              />

              <KpiStrip
                filteredRecords={filteredRecords}
                allRecords={records}
                filteredOrders={filteredOrders}
                allOrders={allOrders}
                isFiltered={isFiltered}
              />

              {section === 'overview' && (
                <div className="space-y-5">
                  <TimeSeriesChart
                    records={filteredRecords}
                    activeDate={activeSingleDate}
                    onSelectDate={handleSelectDate}
                  />

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
                    <div className="xl:col-span-7 flex flex-col [&>*]:flex-1">
                      <ProductChart
                        records={filteredRecords}
                        schema={schema}
                        selectedProducts={filters.selectedProducts}
                        onToggleProduct={handleToggleProduct}
                      />
                    </div>
                    <div className="xl:col-span-5 flex flex-col gap-5">
                      <PaymentBreakdownChart
                        records={filteredRecords}
                        schema={schema}
                        selectedPayments={filters.selectedPayments}
                        onTogglePayment={handleTogglePayment}
                      />
                      <CalendarHeatmap
                        records={filteredRecords}
                        minDate={minDate}
                        maxDate={maxDate}
                        activeDate={activeSingleDate}
                        onSelectDate={handleSelectDate}
                      />
                    </div>
                  </div>
                </div>
              )}

              {section === 'temporal' && (
                <div className="space-y-5">
                  <TimeSeriesChart
                    records={filteredRecords}
                    activeDate={activeSingleDate}
                    onSelectDate={handleSelectDate}
                  />
                  <CalendarHeatmap
                    records={filteredRecords}
                    minDate={minDate}
                    maxDate={maxDate}
                    activeDate={activeSingleDate}
                    onSelectDate={handleSelectDate}
                  />
                  <WeekdayAndBasketView
                    records={filteredRecords}
                    orders={filteredOrders}
                    onInspectOrder={setInspectedOrderNo}
                  />
                </div>
              )}

              {section === 'products' && (
                <div className="space-y-5">
                  <ProductChart
                    records={filteredRecords}
                    schema={schema}
                    selectedProducts={filters.selectedProducts}
                    onToggleProduct={handleToggleProduct}
                  />
                  <MatrixHeatmap
                    records={filteredRecords}
                    schema={schema}
                    allProducts={allProducts}
                    allPayments={allPayments}
                    onSelectCell={handleSelectMatrixCell}
                    selectedProducts={filters.selectedProducts}
                    selectedPayments={filters.selectedPayments}
                  />
                </div>
              )}

              {section === 'matrix_flow' && (
                <div className="space-y-5">
                  <SankeyFlowChart records={filteredRecords} schema={schema} />
                  <MatrixHeatmap
                    records={filteredRecords}
                    schema={schema}
                    allProducts={allProducts}
                    allPayments={allPayments}
                    onSelectCell={handleSelectMatrixCell}
                    selectedProducts={filters.selectedProducts}
                    selectedPayments={filters.selectedPayments}
                  />
                </div>
              )}

              {section === 'baskets' && (
                <div className="space-y-5">
                  <WeekdayAndBasketView
                    records={filteredRecords}
                    orders={filteredOrders}
                    onInspectOrder={setInspectedOrderNo}
                  />
                  <PaymentBreakdownChart
                    records={filteredRecords}
                    schema={schema}
                    selectedPayments={filters.selectedPayments}
                    onTogglePayment={handleTogglePayment}
                  />
                </div>
              )}

              {section === 'ledger' && (
                <DataTableView
                  records={filteredRecords}
                  orders={filteredOrders}
                  onInspectOrder={setInspectedOrderNo}
                />
              )}
            </>
          )}
        </main>
      </div>

      <OrderInspectorModal
        order={inspectedOrder}
        onClose={() => setInspectedOrderNo(null)}
        onFilterByOrder={(orderNo) => setFilters((prev) => ({ ...prev, search: orderNo }))}
      />

      <CsvImportModal
        open={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onImport={handleImportedCsv}
      />

      <AiInsightsDrawer
        open={insightsOpen}
        loading={insightsLoading}
        error={insightsError}
        report={insightsReport}
        datasetName={schema.datasetName}
        recordCount={filteredRecords.length}
        isFiltered={isFiltered}
        onClose={() => setInsightsOpen(false)}
        onRegenerate={runAiInsights}
      />
    </div>
  );
}
