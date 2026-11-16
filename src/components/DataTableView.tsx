import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react';
import { OrderGroup, SaleRecord } from '../types/sales';
import { exportRecordsToCSV, formatCurrency, getPaymentColor } from '../utils/salesData';

interface DataTableViewProps {
  records: SaleRecord[];
  orders: OrderGroup[];
  onInspectOrder: (orderNumber: string) => void;
}

type TableMode = 'items' | 'orders';
type SortField = 'orderNumber' | 'product' | 'price' | 'date' | 'paymentMethod';

export const DataTableView: React.FC<DataTableViewProps> = ({
  records,
  orders,
  onInspectOrder,
}) => {
  const [tableMode, setTableMode] = useState<TableMode>('items');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);
  const pageSize = 18;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'price' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const sortedItems = useMemo(() => {
    const arr = [...records];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'price') cmp = a.price - b.price;
      else if (sortField === 'date') cmp = a.date.localeCompare(b.date) || a.orderNumber.localeCompare(b.orderNumber);
      else if (sortField === 'orderNumber') cmp = a.orderNumber.localeCompare(b.orderNumber);
      else if (sortField === 'product') cmp = a.product.localeCompare(b.product);
      else cmp = a.paymentMethod.localeCompare(b.paymentMethod);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [records, sortField, sortDir]);

  const sortedOrders = useMemo(() => {
    const arr = [...orders];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'price') cmp = a.totalAmount - b.totalAmount;
      else if (sortField === 'date') cmp = a.date.localeCompare(b.date) || a.orderNumber.localeCompare(b.orderNumber);
      else if (sortField === 'orderNumber') cmp = a.orderNumber.localeCompare(b.orderNumber);
      else if (sortField === 'product') cmp = a.itemCount - b.itemCount;
      else cmp = a.paymentMethods.join(',').localeCompare(b.paymentMethods.join(','));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [orders, sortField, sortDir]);

  const activeTotal = tableMode === 'items' ? sortedItems.length : sortedOrders.length;
  const totalPages = Math.max(1, Math.ceil(activeTotal / pageSize));
  const safePage = Math.min(page, totalPages);

  const visibleItems = sortedItems.slice((safePage - 1) * pageSize, safePage * pageSize);
  const visibleOrders = sortedOrders.slice((safePage - 1) * pageSize, safePage * pageSize);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Registro Detallado de Transacciones
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {records.length} líneas de artículo · {orders.length} pedidos únicos · Haz clic en cualquier fila para inspeccionar el pedido
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg" role="group" aria-label="Modo de tabla">
            <button
              type="button"
              onClick={() => {
                setTableMode('items');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tableMode === 'items'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Por Artículo ({records.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setTableMode('orders');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tableMode === 'orders'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Por Pedido ({orders.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportRecordsToCSV(records)}
            disabled={records.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {activeTotal === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          No hay transacciones que coincidan con los filtros activos.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 px-3 text-left font-medium">
                    <button type="button" onClick={() => toggleSort('orderNumber')} className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                      Pedido <SortIcon field="orderNumber" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-left font-medium">
                    <button type="button" onClick={() => toggleSort('date')} className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                      Fecha <SortIcon field="date" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-left font-medium">
                    <button type="button" onClick={() => toggleSort('product')} className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                      {tableMode === 'items' ? 'Producto' : 'Artículos del Pedido'} <SortIcon field="product" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-left font-medium">
                    <button type="button" onClick={() => toggleSort('paymentMethod')} className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                      Método de Pago <SortIcon field="paymentMethod" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right font-medium">
                    <button type="button" onClick={() => toggleSort('price')} className="inline-flex items-center gap-1 ml-auto cursor-pointer hover:text-slate-900 dark:hover:text-white">
                      {tableMode === 'items' ? 'Precio' : 'Total Pedido'} <SortIcon field="price" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tableMode === 'items'
                  ? visibleItems.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => onInspectOrder(r.orderNumber)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {r.orderNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {r.date}
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100 font-medium">
                          {r.product}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span
                              className="w-2 h-2 rounded-xs shrink-0"
                              style={{ backgroundColor: getPaymentColor(r.paymentMethod) }}
                            />
                            {r.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCurrency(r.price, 2)}
                        </td>
                      </tr>
                    ))
                  : visibleOrders.map((o) => (
                      <tr
                        key={o.orderNumber}
                        onClick={() => onInspectOrder(o.orderNumber)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {o.orderNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {o.date}
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">
                          <span className="font-medium">{o.itemCount} {o.itemCount === 1 ? 'artículo' : 'artículos'}</span>
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {o.items.map((it) => it.product).join(', ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                          {o.paymentMethods.join(' + ')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCurrency(o.totalAmount, 2)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums">
              Página {safePage} de {totalPages} · {activeTotal} filas
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
