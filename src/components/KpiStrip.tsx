import React from 'react';
import { OrderGroup, SaleRecord } from '../types/sales';
import { formatCurrency, formatNumber } from '../utils/salesData';

interface KpiStripProps {
  filteredRecords: SaleRecord[];
  allRecords: SaleRecord[];
  filteredOrders: OrderGroup[];
  allOrders: OrderGroup[];
  isFiltered: boolean;
}

export const KpiStrip: React.FC<KpiStripProps> = ({
  filteredRecords,
  allRecords,
  filteredOrders,
  allOrders,
  isFiltered,
}) => {
  const totalRevenue = filteredRecords.reduce((s, r) => s + r.price, 0);
  const baselineRevenue = allRecords.reduce((s, r) => s + r.price, 0);
  const revShare = baselineRevenue > 0 ? (totalRevenue / baselineRevenue) * 100 : 0;

  const uniqueOrdersCount = filteredOrders.length;
  const baselineOrdersCount = allOrders.length;
  const ordersShare = baselineOrdersCount > 0 ? (uniqueOrdersCount / baselineOrdersCount) * 100 : 0;

  const totalUnits = filteredRecords.length;
  const baselineUnits = allRecords.length;
  const avgItemsPerOrder = uniqueOrdersCount > 0 ? totalUnits / uniqueOrdersCount : 0;

  const avgOrderValue = uniqueOrdersCount > 0 ? totalRevenue / uniqueOrdersCount : 0;
  const baselineAvgOrderValue = baselineOrdersCount > 0 ? baselineRevenue / baselineOrdersCount : 0;
  const aovDelta = avgOrderValue - baselineAvgOrderValue;

  const avgUnitPrice = totalUnits > 0 ? totalRevenue / totalUnits : 0;

  const cards = [
    {
      label: 'Ingresos Totales',
      value: formatCurrency(totalRevenue, 2),
      meta: isFiltered
        ? `${revShare.toFixed(1)}% del total · Base ${formatCurrency(baselineRevenue, 0)}`
        : `Precio medio por prenda ${formatCurrency(avgUnitPrice, 2)}`,
    },
    {
      label: 'Pedidos Únicos',
      value: formatNumber(uniqueOrdersCount),
      meta: isFiltered
        ? `${ordersShare.toFixed(1)}% de ${formatNumber(baselineOrdersCount)} pedidos`
        : `${filteredOrders.filter((o) => o.itemCount > 1).length} pedidos con múltiples artículos`,
    },
    {
      label: 'Artículos Vendidos',
      value: formatNumber(totalUnits),
      meta: isFiltered
        ? `De ${formatNumber(baselineUnits)} registros totales · ${avgItemsPerOrder.toFixed(2)} uds/pedido`
        : `Promedio ${avgItemsPerOrder.toFixed(2)} artículos por pedido`,
    },
    {
      label: 'Ticket Promedio (Pedido)',
      value: formatCurrency(avgOrderValue, 2),
      meta: isFiltered
        ? `${aovDelta >= 0 ? '+' : ''}${formatCurrency(aovDelta, 2)} vs promedio general (${formatCurrency(baselineAvgOrderValue, 2)})`
        : `Rango de artículos $58.00 – $175.00`,
    },
  ];

  return (
    <section aria-label="Indicadores principales" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-3"
        >
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {c.label}
          </span>
          <div className="text-2xl sm:text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 font-mono tabular-nums">
            {c.value}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums truncate" title={c.meta}>
            {c.meta}
          </p>
        </div>
      ))}
    </section>
  );
};
