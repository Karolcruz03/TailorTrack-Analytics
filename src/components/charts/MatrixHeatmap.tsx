import React, { useMemo, useState } from 'react';
import { DatasetSchema, SaleRecord } from '../../types/sales';
import { formatCurrency } from '../../utils/salesData';

interface MatrixHeatmapProps {
  records: SaleRecord[];
  schema: DatasetSchema;
  allProducts: string[];
  allPayments: string[];
  onSelectCell: (product: string, payment: string) => void;
  selectedProducts: string[];
  selectedPayments: string[];
}

type MatrixMode = 'revenue' | 'units' | 'row_pct';

export const MatrixHeatmap: React.FC<MatrixHeatmapProps> = ({
  records,
  schema,
  allProducts,
  allPayments,
  onSelectCell,
  selectedProducts,
  selectedPayments,
}) => {
  const [mode, setMode] = useState<MatrixMode>('revenue');

  const matrix = useMemo(() => {
    const prodTotals = new Map<string, { revenue: number; units: number }>();
    const payTotals = new Map<string, { revenue: number; units: number }>();
    const cells = new Map<string, { revenue: number; units: number }>();
    let grandRevenue = 0;
    let grandUnits = 0;

    for (const r of records) {
      grandRevenue += r.price;
      grandUnits += 1;

      const pt = prodTotals.get(r.product) || { revenue: 0, units: 0 };
      pt.revenue += r.price;
      pt.units += 1;
      prodTotals.set(r.product, pt);

      const pyt = payTotals.get(r.paymentMethod) || { revenue: 0, units: 0 };
      pyt.revenue += r.price;
      pyt.units += 1;
      payTotals.set(r.paymentMethod, pyt);

      const ck = `${r.product}|||${r.paymentMethod}`;
      const cell = cells.get(ck) || { revenue: 0, units: 0 };
      cell.revenue += r.price;
      cell.units += 1;
      cells.set(ck, cell);
    }

    let maxCellRev = 0;
    let maxCellUnits = 0;
    for (const c of cells.values()) {
      if (c.revenue > maxCellRev) maxCellRev = c.revenue;
      if (c.units > maxCellUnits) maxCellUnits = c.units;
    }

    const sortedProducts = [...allProducts]
      .sort((a, b) => (prodTotals.get(b)?.revenue || 0) - (prodTotals.get(a)?.revenue || 0))
      .slice(0, 20);

    const visiblePayments = [...allPayments]
      .sort((a, b) => (payTotals.get(b)?.revenue || 0) - (payTotals.get(a)?.revenue || 0))
      .slice(0, 8);

    return {
      prodTotals,
      payTotals,
      cells,
      grandRevenue,
      grandUnits,
      maxCellRev: maxCellRev || 1,
      maxCellUnits: maxCellUnits || 1,
      sortedProducts,
      visiblePayments,
    };
  }, [records, allProducts, allPayments]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Matriz {schema.primaryLabel} × {schema.secondaryLabel}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cruce completo de {schema.valueLabel.toLowerCase()} y volumen · Haz clic en una celda para cruzar ambos filtros
          </p>
        </div>

        <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg" role="group" aria-label="Métrica de matriz">
          {(
            [
              ['revenue', `${schema.valueLabel} ($)`],
              ['units', 'Registros (#)'],
              ['row_pct', '% Fila'],
            ] as Array<[MatrixMode, string]>
          ).map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMode(k)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === k
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <th className="py-2.5 px-3 text-left font-medium">{schema.primaryLabel}</th>
              {matrix.visiblePayments.map((pm) => (
                <th key={pm} className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                  {pm}
                </th>
              ))}
              <th className="py-2.5 px-3 text-right font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {matrix.sortedProducts.map((prod) => {
              const pTot = matrix.prodTotals.get(prod) || { revenue: 0, units: 0 };
              return (
                <tr key={prod} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {prod}
                  </td>
                  {matrix.visiblePayments.map((pm) => {
                    const cell = matrix.cells.get(`${prod}|||${pm}`) || { revenue: 0, units: 0 };
                    const ratio =
                      mode === 'units'
                        ? cell.units / matrix.maxCellUnits
                        : mode === 'row_pct'
                          ? pTot.revenue > 0
                            ? cell.revenue / pTot.revenue
                            : 0
                          : cell.revenue / matrix.maxCellRev;

                    const isSelected =
                      selectedProducts.includes(prod) && selectedPayments.includes(pm);

                    const bgOpacity = cell.units === 0 ? 0 : Math.max(0.08, Math.min(0.85, ratio * 0.85));

                    return (
                      <td key={pm} className="p-1 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectCell(prod, pm)}
                          style={{
                            backgroundColor:
                              cell.units > 0 ? `rgba(37, 99, 235, ${bgOpacity})` : undefined,
                          }}
                          className={`w-full py-1.5 px-2.5 rounded-md font-mono tabular-nums text-right transition-all cursor-pointer ${
                            cell.units === 0
                              ? 'text-slate-300 dark:text-slate-700'
                              : bgOpacity > 0.45
                                ? 'text-white font-medium'
                                : 'text-slate-800 dark:text-slate-200'
                          } ${isSelected ? 'ring-2 ring-amber-500' : 'hover:ring-1 hover:ring-blue-400'}`}
                        >
                          {cell.units === 0
                            ? '—'
                            : mode === 'revenue'
                              ? formatCurrency(cell.revenue, 0)
                              : mode === 'units'
                                ? `${cell.units}`
                                : `${pTot.revenue > 0 ? ((cell.revenue / pTot.revenue) * 100).toFixed(0) : 0}%`}
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {mode === 'units' ? `${pTot.units} reg` : formatCurrency(pTot.revenue, 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100">
              <td className="py-2.5 px-3">Total general</td>
              {matrix.visiblePayments.map((pm) => {
                const pt = matrix.payTotals.get(pm) || { revenue: 0, units: 0 };
                return (
                  <td key={pm} className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                    {mode === 'units'
                      ? `${pt.units} reg`
                      : mode === 'row_pct'
                        ? `${matrix.grandRevenue > 0 ? ((pt.revenue / matrix.grandRevenue) * 100).toFixed(1) : 0}%`
                        : formatCurrency(pt.revenue, 0)}
                  </td>
                );
              })}
              <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                {mode === 'units'
                  ? `${matrix.grandUnits} reg`
                  : formatCurrency(matrix.grandRevenue, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
