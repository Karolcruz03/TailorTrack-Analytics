export type PaymentMethod = 'Credit Card' | 'Debit Card' | 'eWallet' | 'Cash';

export type PriceTier = string;

export interface DatasetSchema {
  datasetName: string;
  isDefaultSalesData: boolean;
  idLabel: string; // e.g. "Pedido" or "ID"
  primaryLabel: string; // e.g. "Producto" or column header
  secondaryLabel: string; // e.g. "Método de Pago" or column header
  valueLabel: string; // e.g. "Precio" or column header
  dateLabel: string; // e.g. "Fecha" or column header
  tiers: [string, string, string];
  tierColors: Record<string, string>;
}

export interface CsvColumnMapping {
  orderCol: string; // '' means auto-generate row IDs
  primaryCol: string;
  secondaryCol: string; // '' means 'General'
  valueCol: string;
  quantityCol: string; // '' means 1 per row
  dateCol: string; // '' means single synthetic date
}

export interface ParsedCsvPreview {
  fileName: string;
  delimiter: string;
  headers: string[];
  rows: string[][];
  suggestedMapping: CsvColumnMapping;
}

export interface SaleRecord {
  id: string; // unique row key e.g. "TT-1001-0"
  orderNumber: string;
  product: string;
  price: number;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "Ago 2025"
  weekdayIndex: number; // 0 = Lun .. 6 = Dom
  weekdayLabel: string; // "Lunes" .. "Domingo"
  paymentMethod: string;
  priceTier: PriceTier;
}

export interface OrderGroup {
  orderNumber: string;
  date: string;
  monthLabel: string;
  items: SaleRecord[];
  totalAmount: number;
  itemCount: number;
  paymentMethods: string[];
  hasSplitPayment: boolean;
}

export interface FilterState {
  search: string;
  startDate: string;
  endDate: string;
  selectedMonth: string; // 'all' | 'YYYY-MM'
  selectedProducts: string[];
  selectedPayments: string[];
  selectedTier: string; // 'all' | PriceTier
  onlyMultiItemOrders: boolean;
}

export type Granularity = 'daily' | 'weekly' | 'monthly';
export type TimeChartType = 'area' | 'line' | 'bar' | 'cumulative';
export type MetricType = 'revenue' | 'units' | 'orders';

export type DashboardSection =
  | 'overview'
  | 'temporal'
  | 'products'
  | 'matrix_flow'
  | 'baskets'
  | 'ledger';

export interface ProductStat {
  product: string;
  unitPrice: number;
  revenue: number;
  units: number;
  orderCount: number;
  revenueShare: number;
  cumulativeShare: number;
  priceTier: PriceTier;
}

export interface PaymentStat {
  method: string;
  revenue: number;
  units: number;
  orderCount: number;
  revenueShare: number;
  avgItemPrice: number;
}

export interface TimeSeriesPoint {
  key: string;
  label: string;
  fullLabel: string;
  revenue: number;
  cumulativeRevenue: number;
  units: number;
  cumulativeUnits: number;
  orders: number;
  movingAvgRevenue?: number;
}

export interface AiTrendItem {
  titulo: string;
  detalle: string;
  impacto: 'positivo' | 'atencion' | 'neutral' | string;
}

export interface AiInsightsReport {
  resumenEjecutivo: string;
  tendenciasClave: AiTrendItem[];
  anomaliasYConcentracion: string[];
  recomendaciones: string[];
}
