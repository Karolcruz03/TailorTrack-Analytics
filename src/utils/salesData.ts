import {
  CsvColumnMapping,
  DatasetSchema,
  FilterState,
  Granularity,
  OrderGroup,
  ParsedCsvPreview,
  PaymentStat,
  PriceTier,
  ProductStat,
  SaleRecord,
  TimeSeriesPoint,
} from '../types/sales';

const MONTH_NAMES_ES: Record<string, string> = {
  '01': 'Ene',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dic',
};

const MONTH_FULL_NAMES_ES: Record<string, string> = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre',
};

const WEEKDAYS_MON_FIRST = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export const PAYMENT_COLORS: Record<string, string> = {
  'Credit Card': '#2563EB', // Cobalt
  'Debit Card': '#0D9488', // Teal
  eWallet: '#6366F1', // Indigo
  Cash: '#D97706', // Amber
};

const FALLBACK_PALETTE = [
  '#2563EB',
  '#0D9488',
  '#6366F1',
  '#D97706',
  '#0284C7',
  '#059669',
  '#7C3AED',
  '#E11D48',
];

export const DEFAULT_TIERS: [string, string, string] = [
  'Accesible (< $80)',
  'Estándar ($80 – $110)',
  'Premium (> $110)',
];

export const DEFAULT_TIER_COLORS: Record<string, string> = {
  'Accesible (< $80)': '#0D9488',
  'Estándar ($80 – $110)': '#2563EB',
  'Premium (> $110)': '#D97706',
};

export const TIER_COLORS = DEFAULT_TIER_COLORS;

export const DEFAULT_SCHEMA: DatasetSchema = {
  datasetName: 'Sales_data_5e94d700',
  isDefaultSalesData: true,
  idLabel: 'Pedido',
  primaryLabel: 'Producto',
  secondaryLabel: 'Método de Pago',
  valueLabel: 'Precio',
  dateLabel: 'Fecha',
  tiers: DEFAULT_TIERS,
  tierColors: DEFAULT_TIER_COLORS,
};

export function getPaymentColor(method: string): string {
  if (PAYMENT_COLORS[method]) return PAYMENT_COLORS[method];
  let hash = 0;
  for (let i = 0; i < method.length; i++) {
    hash = (hash * 31 + method.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

export function getTierColor(tier: string, schema?: DatasetSchema): string {
  if (schema?.tierColors[tier]) return schema.tierColors[tier];
  if (DEFAULT_TIER_COLORS[tier]) return DEFAULT_TIER_COLORS[tier];
  return '#2563EB';
}

export function getPriceTier(price: number): PriceTier {
  if (price < 80) return 'Accesible (< $80)';
  if (price <= 110) return 'Estándar ($80 – $110)';
  return 'Premium (> $110)';
}

export function parseDateParts(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const jsDay = utcDate.getUTCDay();
  const monFirstIdx = jsDay === 0 ? 6 : jsDay - 1;
  const mm = String(m).padStart(2, '0');
  const monthKey = `${y}-${mm}`;
  const fullMonthName = MONTH_FULL_NAMES_ES[mm] || mm;
  return {
    year: y,
    month: m,
    day: d,
    monthKey,
    monthLabel: `${MONTH_NAMES_ES[mm] || mm} ${y}`,
    monthFullLabel: `${fullMonthName} ${y}`,
    weekdayIndex: monFirstIdx,
    weekdayLabel: WEEKDAYS_MON_FIRST[monFirstIdx],
    shortDate: `${String(d).padStart(2, '0')} ${MONTH_NAMES_ES[mm] || mm}`,
    utcDate,
  };
}

/**
 * RFC-4180 compliant CSV line splitter supporting quoted fields and custom delimiters.
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function detectDelimiter(sampleLine: string): string {
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let maxCount = 0;
  for (const delim of candidates) {
    const parts = splitCsvLine(sampleLine, delim);
    if (parts.length > maxCount) {
      maxCount = parts.length;
      best = delim;
    }
  }
  return best;
}

export function parseNumericValue(raw: string): number | null {
  if (!raw) return null;
  let cleaned = raw.replace(/[$€£¥₹\s]/g, '').trim();
  if (!cleaned) return null;
  // Handle European decimals like "1.234,56" or "88,50"
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+,\d{1,2}$/.test(cleaned)) {
    cleaned = cleaned.replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function normalizeDateString(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim().split('T')[0].split(' ')[0];
  // YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  // DD/MM/YYYY or MM/DD/YYYY (prefer DD/MM/YYYY if first > 12, else check)
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = Number(m[3]);
    const isDayFirst = a > 12 || b <= 12;
    const d = isDayFirst ? a : b;
    const mo = isDayFirst ? b : a;
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  // Fallback JS Date.parse for textual dates like "Aug 15, 2025"
  const ts = Date.parse(raw);
  if (!Number.isNaN(ts)) {
    const dt = new Date(ts);
    const y = dt.getUTCFullYear();
    const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  return null;
}

export function parseCsvForPreview(csvText: string, fileName: string): ParsedCsvPreview | null {
  const lines = csvText
    .replace(/^\uFEFF/, '') // strip UTF-8 BOM
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((h, i) => h || `Columna_${i + 1}`);
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitCsvLine(lines[i], delimiter);
    if (row.some((cell) => cell !== '')) {
      rows.push(row);
    }
  }

  if (rows.length === 0) return null;

  const suggestedMapping = inferCsvMapping(headers, rows);
  return {
    fileName,
    delimiter,
    headers,
    rows,
    suggestedMapping,
  };
}

export function inferCsvMapping(headers: string[], rows: string[][]): CsvColumnMapping {
  const sample = rows.slice(0, 30);

  const colStats = headers.map((header, idx) => {
    const vals = sample.map((r) => (r[idx] ?? '').trim()).filter(Boolean);
    const numericCount = vals.filter((v) => parseNumericValue(v) !== null).length;
    const dateCount = vals.filter((v) => normalizeDateString(v) !== null).length;
    const distinctCount = new Set(vals).size;
    return {
      header,
      lower: header.toLowerCase(),
      idx,
      numericRatio: vals.length ? numericCount / vals.length : 0,
      dateRatio: vals.length ? dateCount / vals.length : 0,
      distinctCount,
    };
  });

  const pickByKeywords = (
    keywords: string[],
    filterFn: (c: (typeof colStats)[number]) => boolean = () => true
  ) => {
    for (const kw of keywords) {
      const match = colStats.find((c) => filterFn(c) && c.lower.includes(kw));
      if (match) return match.header;
    }
    return '';
  };

  const dateCol =
    pickByKeywords(['date', 'fecha', 'time', 'día', 'dia', 'created', 'timestamp'], (c) => c.dateRatio >= 0.5) ||
    colStats.find((c) => c.dateRatio >= 0.7)?.header ||
    '';

  const valueCol =
    pickByKeywords(
      ['total', 'price', 'precio', 'amount', 'monto', 'revenue', 'ingreso', 'sales', 'venta', 'valor', 'importe', 'cost', 'costo'],
      (c) => c.numericRatio >= 0.6 && c.header !== dateCol
    ) ||
    colStats.find((c) => c.numericRatio >= 0.7 && c.header !== dateCol && !c.lower.includes('id'))?.header ||
    '';

  const quantityCol = pickByKeywords(
    ['qty', 'quantity', 'cantidad', 'units', 'unidades'],
    (c) => c.numericRatio >= 0.7 && c.header !== valueCol && c.header !== dateCol
  );

  const orderCol = pickByKeywords(
    ['order', 'pedido', 'invoice', 'factura', 'ticket', 'folio', 'transaction', 'transacción', 'id'],
    (c) => c.header !== dateCol && c.header !== valueCol
  );

  const used = new Set([dateCol, valueCol, quantityCol, orderCol].filter(Boolean));

  const primaryCol =
    pickByKeywords(
      ['product', 'producto', 'item', 'artículo', 'articulo', 'category', 'categoría', 'categoria', 'name', 'nombre', 'service', 'servicio', 'concepto', 'sku'],
      (c) => !used.has(c.header) && c.dateRatio < 0.5
    ) ||
    colStats.find((c) => !used.has(c.header) && c.numericRatio < 0.5 && c.dateRatio < 0.5)?.header ||
    headers.find((h) => h !== valueCol && h !== dateCol) ||
    headers[0];

  used.add(primaryCol);

  const secondaryCol =
    pickByKeywords(
      ['payment', 'pago', 'method', 'método', 'metodo', 'channel', 'canal', 'region', 'región', 'country', 'país', 'pais', 'segment', 'segmento', 'status', 'estado', 'type', 'tipo', 'ciudad', 'city'],
      (c) => !used.has(c.header) && c.dateRatio < 0.5
    ) ||
    colStats.find((c) => !used.has(c.header) && c.numericRatio < 0.5 && c.dateRatio < 0.5)?.header ||
    '';

  return {
    orderCol,
    primaryCol,
    secondaryCol,
    valueCol,
    quantityCol,
    dateCol,
  };
}

export function buildDatasetFromPreview(
  preview: ParsedCsvPreview,
  mapping: CsvColumnMapping
): { records: SaleRecord[]; schema: DatasetSchema } {
  const idxMap = new Map<string, number>();
  preview.headers.forEach((h, i) => idxMap.set(h, i));

  const getCell = (row: string[], col: string) => {
    if (!col) return '';
    const idx = idxMap.get(col);
    return idx !== undefined ? (row[idx] ?? '').trim() : '';
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const rawRows: Array<{
    orderNumber: string;
    product: string;
    price: number;
    date: string;
    paymentMethod: string;
  }> = [];

  for (let i = 0; i < preview.rows.length; i++) {
    const row = preview.rows[i];
    const primary = getCell(row, mapping.primaryCol) || `Elemento ${i + 1}`;
    const secondary = mapping.secondaryCol ? getCell(row, mapping.secondaryCol) || 'Sin categoría' : 'General';
    const orderNumber = mapping.orderCol
      ? getCell(row, mapping.orderCol) || `REG-${String(i + 1).padStart(4, '0')}`
      : `REG-${String(i + 1).padStart(4, '0')}`;

    const rawPrice = mapping.valueCol ? parseNumericValue(getCell(row, mapping.valueCol)) : 1;
    if (rawPrice === null) continue;

    let qty = 1;
    if (mapping.quantityCol) {
      const q = parseNumericValue(getCell(row, mapping.quantityCol));
      if (q !== null && q > 0) qty = q;
    }
    const totalPrice = rawPrice * qty;

    const parsedDate = mapping.dateCol ? normalizeDateString(getCell(row, mapping.dateCol)) : todayStr;
    const date = parsedDate || todayStr;

    rawRows.push({
      orderNumber,
      product: primary,
      price: totalPrice,
      date,
      paymentMethod: secondary,
    });
  }

  // Check if this matches the exact built-in sales dataset
  const isDefault =
    preview.fileName === 'Sales_data_5e94d700' &&
    mapping.primaryCol === 'Product' &&
    mapping.valueCol === 'Price';

  let tiers: [string, string, string] = DEFAULT_TIERS;
  let tierColors: Record<string, string> = DEFAULT_TIER_COLORS;
  let assignTier = (val: number) => getPriceTier(val);

  if (!isDefault && rawRows.length > 0) {
    const sortedPrices = rawRows.map((r) => r.price).sort((a, b) => a - b);
    const minV = sortedPrices[0];
    const maxV = sortedPrices[sortedPrices.length - 1];
    if (minV === maxV) {
      const label = `Nivel único (${formatCurrency(minV, 0)})`;
      tiers = [label, label, label];
      tierColors = { [label]: '#2563EB' };
      assignTier = () => label;
    } else {
      const p33 = sortedPrices[Math.floor(sortedPrices.length * 0.33)];
      const p66 = sortedPrices[Math.floor(sortedPrices.length * 0.66)];
      const tLow = `Bajo (< ${formatCurrency(p33, 0)})`;
      const tMid = `Medio (${formatCurrency(p33, 0)} – ${formatCurrency(p66, 0)})`;
      const tHigh = `Alto (> ${formatCurrency(p66, 0)})`;
      tiers = [tLow, tMid, tHigh];
      tierColors = {
        [tLow]: '#0D9488',
        [tMid]: '#2563EB',
        [tHigh]: '#D97706',
      };
      assignTier = (val: number) => {
        if (val < p33) return tLow;
        if (val <= p66) return tMid;
        return tHigh;
      };
    }
  }

  const records: SaleRecord[] = rawRows.map((r, i) => {
    const dInfo = parseDateParts(r.date);
    return {
      id: `${r.orderNumber}-${i}`,
      orderNumber: r.orderNumber,
      product: r.product,
      price: r.price,
      date: r.date,
      monthKey: dInfo.monthKey,
      monthLabel: dInfo.monthLabel,
      weekdayIndex: dInfo.weekdayIndex,
      weekdayLabel: dInfo.weekdayLabel,
      paymentMethod: r.paymentMethod,
      priceTier: assignTier(r.price),
    };
  });

  const schema: DatasetSchema = isDefault
    ? DEFAULT_SCHEMA
    : {
        datasetName: preview.fileName,
        isDefaultSalesData: false,
        idLabel: mapping.orderCol || 'Registro',
        primaryLabel: mapping.primaryCol || 'Categoría',
        secondaryLabel: mapping.secondaryCol || 'Segmento',
        valueLabel: mapping.valueCol || 'Valor',
        dateLabel: mapping.dateCol || 'Fecha',
        tiers,
        tierColors,
      };

  return { records, schema };
}

export function parseSalesCSV(csvText: string): SaleRecord[] {
  const preview = parseCsvForPreview(csvText, 'Sales_data_5e94d700');
  if (!preview) return [];
  return buildDatasetFromPreview(preview, preview.suggestedMapping).records;
}

export function groupOrders(records: SaleRecord[]): OrderGroup[] {
  const map = new Map<string, SaleRecord[]>();
  for (const r of records) {
    const arr = map.get(r.orderNumber);
    if (arr) {
      arr.push(r);
    } else {
      map.set(r.orderNumber, [r]);
    }
  }

  const orders: OrderGroup[] = [];
  for (const [orderNumber, items] of map.entries()) {
    const totalAmount = items.reduce((s, it) => s + it.price, 0);
    const paymentMethods = Array.from(new Set(items.map((it) => it.paymentMethod)));
    orders.push({
      orderNumber,
      date: items[0].date,
      monthLabel: items[0].monthLabel,
      items,
      totalAmount,
      itemCount: items.length,
      paymentMethods,
      hasSplitPayment: paymentMethods.length > 1,
    });
  }

  return orders.sort((a, b) => a.date.localeCompare(b.date) || a.orderNumber.localeCompare(b.orderNumber));
}

export function filterRecords(records: SaleRecord[], filters: FilterState, allOrdersMap: Map<string, OrderGroup>): SaleRecord[] {
  const q = filters.search.trim().toLowerCase();

  return records.filter((r) => {
    if (filters.startDate && r.date < filters.startDate) return false;
    if (filters.endDate && r.date > filters.endDate) return false;
    if (filters.selectedMonth !== 'all' && r.monthKey !== filters.selectedMonth) return false;
    if (filters.selectedProducts.length > 0 && !filters.selectedProducts.includes(r.product)) return false;
    if (filters.selectedPayments.length > 0 && !filters.selectedPayments.includes(r.paymentMethod)) return false;
    if (filters.selectedTier !== 'all' && r.priceTier !== filters.selectedTier) return false;
    if (filters.onlyMultiItemOrders) {
      const grp = allOrdersMap.get(r.orderNumber);
      if (!grp || grp.itemCount < 2) return false;
    }
    if (q) {
      const hay = `${r.orderNumber} ${r.product} ${r.paymentMethod} ${r.date}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function computeProductStats(records: SaleRecord[]): ProductStat[] {
  const totalRevenue = records.reduce((s, r) => s + r.price, 0);
  const byProd = new Map<string, { revenue: number; units: number; orders: Set<string>; priceSum: number; priceTier: PriceTier }>();

  for (const r of records) {
    const cur = byProd.get(r.product);
    if (cur) {
      cur.revenue += r.price;
      cur.units += 1;
      cur.priceSum += r.price;
      cur.orders.add(r.orderNumber);
    } else {
      byProd.set(r.product, {
        revenue: r.price,
        units: 1,
        priceSum: r.price,
        orders: new Set([r.orderNumber]),
        priceTier: r.priceTier,
      });
    }
  }

  const list: ProductStat[] = Array.from(byProd.entries())
    .map(([product, d]) => ({
      product,
      unitPrice: d.units > 0 ? d.priceSum / d.units : 0,
      revenue: d.revenue,
      units: d.units,
      orderCount: d.orders.size,
      revenueShare: totalRevenue > 0 ? (d.revenue / totalRevenue) * 100 : 0,
      cumulativeShare: 0,
      priceTier: d.priceTier,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  let running = 0;
  for (const item of list) {
    running += item.revenueShare;
    item.cumulativeShare = Math.min(100, running);
  }

  return list;
}

export function computePaymentStats(records: SaleRecord[]): PaymentStat[] {
  const totalRevenue = records.reduce((s, r) => s + r.price, 0);
  const byPay = new Map<string, { revenue: number; units: number; orders: Set<string> }>();

  for (const r of records) {
    const cur = byPay.get(r.paymentMethod);
    if (cur) {
      cur.revenue += r.price;
      cur.units += 1;
      cur.orders.add(r.orderNumber);
    } else {
      byPay.set(r.paymentMethod, {
        revenue: r.price,
        units: 1,
        orders: new Set([r.orderNumber]),
      });
    }
  }

  return Array.from(byPay.entries())
    .map(([method, d]) => ({
      method,
      revenue: d.revenue,
      units: d.units,
      orderCount: d.orders.size,
      revenueShare: totalRevenue > 0 ? (d.revenue / totalRevenue) * 100 : 0,
      avgItemPrice: d.units > 0 ? d.revenue / d.units : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function getMondayKey(dateStr: string): string {
  const { utcDate, weekdayIndex } = parseDateParts(dateStr);
  const monday = new Date(utcDate.getTime() - weekdayIndex * 86400000);
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const d = String(monday.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeTimeSeries(records: SaleRecord[], granularity: Granularity): TimeSeriesPoint[] {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];

  const buckets = new Map<string, { label: string; fullLabel: string; revenue: number; units: number; orders: Set<string> }>();

  if (granularity === 'daily') {
    const minD = parseDateParts(sorted[0].date).utcDate;
    const maxD = parseDateParts(sorted[sorted.length - 1].date).utcDate;
    const daySpan = Math.round((maxD.getTime() - minD.getTime()) / 86400000);

    // If span > 180 days on an uploaded CSV, only populate active dates to keep SVG crisp
    if (daySpan <= 180) {
      for (let t = minD.getTime(); t <= maxD.getTime(); t += 86400000) {
        const dt = new Date(t);
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dt.getUTCDate()).padStart(2, '0');
        const key = `${y}-${m}-${d}`;
        const info = parseDateParts(key);
        buckets.set(key, {
          label: info.shortDate,
          fullLabel: `${info.weekdayLabel}, ${info.day} ${MONTH_NAMES_ES[m]} ${y}`,
          revenue: 0,
          units: 0,
          orders: new Set<string>(),
        });
      }
    }

    for (const r of sorted) {
      let b = buckets.get(r.date);
      if (!b) {
        const info = parseDateParts(r.date);
        b = {
          label: info.shortDate,
          fullLabel: `${info.weekdayLabel}, ${info.day} ${info.monthLabel}`,
          revenue: 0,
          units: 0,
          orders: new Set<string>(),
        };
        buckets.set(r.date, b);
      }
      b.revenue += r.price;
      b.units += 1;
      b.orders.add(r.orderNumber);
    }
  } else if (granularity === 'weekly') {
    for (const r of sorted) {
      const wk = getMondayKey(r.date);
      const info = parseDateParts(wk);
      let b = buckets.get(wk);
      if (!b) {
        b = {
          label: `Sem ${info.shortDate}`,
          fullLabel: `Semana del ${info.shortDate} ${info.year}`,
          revenue: 0,
          units: 0,
          orders: new Set<string>(),
        };
        buckets.set(wk, b);
      }
      b.revenue += r.price;
      b.units += 1;
      b.orders.add(r.orderNumber);
    }
  } else {
    for (const r of sorted) {
      const key = r.monthKey;
      const info = parseDateParts(r.date);
      let b = buckets.get(key);
      if (!b) {
        b = {
          label: info.monthLabel,
          fullLabel: info.monthFullLabel,
          revenue: 0,
          units: 0,
          orders: new Set<string>(),
        };
        buckets.set(key, b);
      }
      b.revenue += r.price;
      b.units += 1;
      b.orders.add(r.orderNumber);
    }
  }

  const orderedEntries = Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  let cumRev = 0;
  let cumUnits = 0;
  const points: TimeSeriesPoint[] = orderedEntries.map(([key, b]) => {
    cumRev += b.revenue;
    cumUnits += b.units;
    return {
      key,
      label: b.label,
      fullLabel: b.fullLabel,
      revenue: b.revenue,
      cumulativeRevenue: cumRev,
      units: b.units,
      cumulativeUnits: cumUnits,
      orders: b.orders.size,
    };
  });

  if (granularity === 'daily') {
    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - 6);
      const slice = points.slice(start, i + 1);
      const avg = slice.reduce((s, p) => s + p.revenue, 0) / slice.length;
      points[i].movingAvgRevenue = avg;
    }
  }

  return points;
}

export function buildInsightsDigest(
  records: SaleRecord[],
  orders: OrderGroup[],
  schema: DatasetSchema,
  isFiltered: boolean
) {
  const totalValue = records.reduce((s, r) => s + r.price, 0);
  const dates = records.map((r) => r.date).sort();
  const productStats = computeProductStats(records);
  const paymentStats = computePaymentStats(records);
  const monthly = computeTimeSeries(records, 'monthly');
  const daily = computeTimeSeries(records, 'daily');

  const weekdayTotals = WEEKDAYS_MON_FIRST.map((day, idx) => {
    const sub = records.filter((r) => r.weekdayIndex === idx);
    return {
      dia: day,
      ingresos: Number(sub.reduce((s, r) => s + r.price, 0).toFixed(2)),
      registros: sub.length,
    };
  });

  const multiOrders = orders.filter((o) => o.itemCount > 1);
  const splitOrders = orders.filter((o) => o.hasSplitPayment);
  const sortedDays = [...daily].sort((a, b) => b.revenue - a.revenue);

  return {
    nombreDataset: schema.datasetName,
    subconjuntoFiltrado: isFiltered,
    esquemaColumnas: {
      identificador: schema.idLabel,
      dimensionPrincipal: schema.primaryLabel,
      dimensionSecundaria: schema.secondaryLabel,
      metricaValor: schema.valueLabel,
    },
    totales: {
      registros: records.length,
      pedidosUnicos: orders.length,
      valorTotal: Number(totalValue.toFixed(2)),
      ticketPromedioPorPedido: orders.length > 0 ? Number((totalValue / orders.length).toFixed(2)) : 0,
      valorPromedioPorRegistro: records.length > 0 ? Number((totalValue / records.length).toFixed(2)) : 0,
      rangoFechas: dates.length > 0 ? `${dates[0]} a ${dates[dates.length - 1]}` : 'N/A',
    },
    principalesElementos: productStats.slice(0, 12).map((p) => ({
      nombre: p.product,
      ingresos: Number(p.revenue.toFixed(2)),
      unidades: p.units,
      participacionPct: Number(p.revenueShare.toFixed(1)),
      paretoAcumuladoPct: Number(p.cumulativeShare.toFixed(1)),
      gama: p.priceTier,
    })),
    desgloseSecundario: paymentStats.map((p) => ({
      categoria: p.method,
      ingresos: Number(p.revenue.toFixed(2)),
      unidades: p.units,
      participacionPct: Number(p.revenueShare.toFixed(1)),
    })),
    evolucionMensual: monthly.map((m) => ({
      mes: m.fullLabel,
      ingresos: Number(m.revenue.toFixed(2)),
      unidades: m.units,
      pedidos: m.orders,
    })),
    mejoresDias: sortedDays.slice(0, 3).map((d) => ({
      fecha: d.key,
      etiqueta: d.fullLabel,
      ingresos: Number(d.revenue.toFixed(2)),
      pedidos: d.orders,
    })),
    ritmoSemanal: weekdayTotals,
    canastasMultiples: {
      pedidosMultiArticulo: multiOrders.length,
      porcentajePedidosMultiArticulo:
        orders.length > 0 ? Number(((multiOrders.length / orders.length) * 100).toFixed(1)) : 0,
      pedidosPagoMixto: splitOrders.length,
      ticketPromedioMulti:
        multiOrders.length > 0
          ? Number((multiOrders.reduce((s, o) => s + o.totalAmount, 0) / multiOrders.length).toFixed(2))
          : 0,
    },
  };
}

export function formatCurrency(val: number, decimals = 0): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('es-MX').format(val);
}

export function exportRecordsToCSV(records: SaleRecord[], filename = 'ventas_filtradas.csv') {
  const header = 'Order Number,Product,Price,Date,Payment Method';
  const rows = records.map(
    (r) => `${r.orderNumber},"${r.product.replace(/"/g, '""')}",$${r.price.toFixed(2)},${r.date},${r.paymentMethod}`
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
