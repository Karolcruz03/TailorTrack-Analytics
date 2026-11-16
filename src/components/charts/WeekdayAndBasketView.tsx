import React, { useMemo, useState } from 'react';
import { OrderGroup, SaleRecord } from '../../types/sales';
import { formatCurrency } from '../../utils/salesData';

interface WeekdayAndBasketViewProps {
  records: SaleRecord[];
  orders: OrderGroup[];
  onInspectOrder: (orderNumber: string) => void;
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const WeekdayAndBasketView: React.FC<WeekdayAndBasketViewProps> = ({
  records,
  orders,
  onInspectOrder,
}) => {
  const [dayChartType, setDayChartType] = useState<'bars' | 'radar'>('bars');
  const [dayMetric, setDayMetric] = useState<'revenue' | 'orders' | 'avgOrder'>('revenue');

  const weekdayStats = useMemo(() => {
    const arr = DAYS.map((label, idx) => ({
      idx,
      label,
      short: label.slice(0, 3),
      revenue: 0,
      units: 0,
      orders: new Set<string>(),
    }));

    for (const r of records) {
      const target = arr[r.weekdayIndex];
      if (target) {
        target.revenue += r.price;
        target.units += 1;
        target.orders.add(r.orderNumber);
      }
    }

    return arr.map((d) => ({
      ...d,
      orderCount: d.orders.size,
      avgOrder: d.orders.size > 0 ? d.revenue / d.orders.size : 0,
    }));
  }, [records]);

  const maxDayVal = useMemo(() => {
    const vals = weekdayStats.map((d) =>
      dayMetric === 'revenue' ? d.revenue : dayMetric === 'orders' ? d.orderCount : d.avgOrder
    );
    return Math.max(...vals, 1);
  }, [weekdayStats, dayMetric]);

  const basketSummary = useMemo(() => {
    const single = orders.filter((o) => o.itemCount === 1);
    const multi = orders.filter((o) => o.itemCount > 1);
    const splitPayment = orders.filter((o) => o.hasSplitPayment);

    const singleRev = single.reduce((s, o) => s + o.totalAmount, 0);
    const multiRev = multi.reduce((s, o) => s + o.totalAmount, 0);
    const singleAvg = single.length > 0 ? singleRev / single.length : 0;
    const multiAvg = multi.length > 0 ? multiRev / multi.length : 0;

    return {
      singleCount: single.length,
      multiCount: multi.length,
      splitCount: splitPayment.length,
      singleRev,
      multiRev,
      singleAvg,
      multiAvg,
      multiOrders: multi,
    };
  }, [orders]);

  // Radar polygon points
  const radarData = useMemo(() => {
    const cx = 140;
    const cy = 135;
    const R = 92;
    const pts = weekdayStats.map((d, i) => {
      const val = dayMetric === 'revenue' ? d.revenue : dayMetric === 'orders' ? d.orderCount : d.avgOrder;
      const ratio = val / maxDayVal;
      const angle = (Math.PI * 2 * i) / 7 - Math.PI / 2;
      return {
        label: d.short,
        val,
        x: cx + Math.cos(angle) * R * ratio,
        y: cy + Math.sin(angle) * R * ratio,
        lx: cx + Math.cos(angle) * (R + 18),
        ly: cy + Math.sin(angle) * (R + 18),
        ax: cx + Math.cos(angle) * R,
        ay: cy + Math.sin(angle) * R,
      };
    });
    const polygon = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return { cx, cy, R, pts, polygon };
  }, [weekdayStats, dayMetric, maxDayVal]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* Left: Weekday Rhythm */}
      <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Ritmo por Día de la Semana
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compara la actividad comercial de lunes a domingo
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setDayChartType('bars')}
                className={`px-2 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  dayChartType === 'bars'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Barras
              </button>
              <button
                type="button"
                onClick={() => setDayChartType('radar')}
                className={`px-2 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  dayChartType === 'radar'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Radar
              </button>
            </div>

            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(
                [
                  ['revenue', 'Ingresos'],
                  ['orders', 'Pedidos'],
                  ['avgOrder', 'Ticket'],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDayMetric(k)}
                  className={`px-2 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    dayMetric === k
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {dayChartType === 'bars' ? (
          <div className="space-y-3 my-auto">
            {weekdayStats.map((d) => {
              const val =
                dayMetric === 'revenue'
                  ? d.revenue
                  : dayMetric === 'orders'
                    ? d.orderCount
                    : d.avgOrder;
              const pct = (val / maxDayVal) * 100;
              return (
                <div key={d.label} className="grid grid-cols-12 items-center gap-3 text-xs">
                  <span className="col-span-3 font-medium text-slate-700 dark:text-slate-300">
                    {d.label}
                  </span>
                  <div className="col-span-6 h-3 bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-sm transition-all duration-200"
                      style={{ width: `${Math.max(val > 0 ? 3 : 0, pct)}%` }}
                    />
                  </div>
                  <span className="col-span-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    {dayMetric === 'orders' ? `${d.orderCount} ped` : formatCurrency(val, 0)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex justify-center my-auto">
            <svg viewBox="0 0 280 270" className="w-64 h-auto select-none" role="img" aria-label="Gráfico radar por día de semana">
              {[0.25, 0.5, 0.75, 1].map((ring) => {
                const ringPts = Array.from({ length: 7 }, (_, i) => {
                  const angle = (Math.PI * 2 * i) / 7 - Math.PI / 2;
                  return `${(radarData.cx + Math.cos(angle) * radarData.R * ring).toFixed(1)},${(
                    radarData.cy +
                    Math.sin(angle) * radarData.R * ring
                  ).toFixed(1)}`;
                }).join(' ');
                return (
                  <polygon
                    key={ring}
                    points={ringPts}
                    fill="none"
                    className="stroke-slate-200 dark:stroke-slate-800"
                    strokeWidth="1"
                  />
                );
              })}

              {radarData.pts.map((p) => (
                <g key={p.label}>
                  <line
                    x1={radarData.cx}
                    y1={radarData.cy}
                    x2={p.ax}
                    y2={p.ay}
                    className="stroke-slate-200 dark:stroke-slate-800"
                    strokeWidth="1"
                  />
                  <text
                    x={p.lx}
                    y={p.ly + 3}
                    textAnchor="middle"
                    className="fill-slate-600 dark:fill-slate-400 text-[10px] font-medium"
                  >
                    {p.label}
                  </text>
                </g>
              ))}

              <polygon
                points={radarData.polygon}
                fill="#2563EB"
                fillOpacity="0.22"
                stroke="#2563EB"
                strokeWidth="2"
              />
              {radarData.pts.map((p) => (
                <circle key={p.label} cx={p.x} cy={p.y} r="3.5" fill="#2563EB" />
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* Right: Multi-Item Basket Analysis */}
      <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Estructura de Canasta y Pedidos Multi-artículo
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pedidos de 1 prenda frente a pedidos combinados (incluyendo pagos divididos)
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">1 artículo</div>
            <div className="text-base font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {basketSummary.singleCount} ped
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-500">
              Prom {formatCurrency(basketSummary.singleAvg, 0)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">2+ artículos</div>
            <div className="text-base font-semibold font-mono tabular-nums text-blue-600 dark:text-blue-400">
              {basketSummary.multiCount} ped
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-500">
              Prom {formatCurrency(basketSummary.multiAvg, 0)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Pago mixto</div>
            <div className="text-base font-semibold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {basketSummary.splitCount} ped
            </div>
            <div className="text-[11px] text-slate-500">2 métodos en 1 orden</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[250px] divide-y divide-slate-100 dark:divide-slate-800">
          {basketSummary.multiOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No hay pedidos multi-artículo en los filtros actuales.
            </div>
          ) : (
            basketSummary.multiOrders.map((o) => (
              <button
                key={o.orderNumber}
                type="button"
                onClick={() => onInspectOrder(o.orderNumber)}
                className="w-full py-2 px-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {o.orderNumber}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {o.date}
                    </span>
                    {o.hasSplitPayment && (
                      <>
                        <span className="text-slate-400">·</span>
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          Pago mixto ({o.paymentMethods.join(' + ')})
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                    {o.items.map((it) => it.product).join(' + ')}
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums shrink-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(o.totalAmount, 2)}
                  </div>
                  <div className="text-[11px] text-slate-500">{o.itemCount} prendas</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
