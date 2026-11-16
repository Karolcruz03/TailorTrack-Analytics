import React, { useMemo, useState } from 'react';
import { DatasetSchema, SaleRecord } from '../../types/sales';
import { computePaymentStats, formatCurrency, getPaymentColor } from '../../utils/salesData';

interface PaymentBreakdownChartProps {
  records: SaleRecord[];
  schema: DatasetSchema;
  selectedPayments: string[];
  onTogglePayment: (method: string) => void;
}

type PaymentViewMode = 'donut' | 'treemap' | 'monthly_stacked';

export const PaymentBreakdownChart: React.FC<PaymentBreakdownChartProps> = ({
  records,
  schema,
  selectedPayments,
  onTogglePayment,
}) => {
  const [viewMode, setViewMode] = useState<PaymentViewMode>('donut');
  const [hoveredMethod, setHoveredMethod] = useState<string | null>(null);

  const stats = useMemo(() => computePaymentStats(records), [records]);
  const totalRevenue = useMemo(() => stats.reduce((s, p) => s + p.revenue, 0), [stats]);

  const monthlyStacked = useMemo(() => {
    const monthEntries = Array.from(
      new Map(
        [...records]
          .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
          .map((r) => [r.monthKey, r.monthLabel])
      ).entries()
    ).slice(-6);

    return monthEntries
      .map(([mk, label]) => {
        const sub = records.filter((r) => r.monthKey === mk);
        const tot = sub.reduce((s, r) => s + r.price, 0);
        const byMethod: Record<string, number> = {};
        for (const r of sub) {
          byMethod[r.paymentMethod] = (byMethod[r.paymentMethod] || 0) + r.price;
        }
        return { monthKey: mk, label, total: tot, byMethod };
      })
      .filter((m) => m.total > 0);
  }, [records]);

  const hoveredStat = stats.find((s) => s.method === hoveredMethod);

  const donutSegments = useMemo(() => {
    const r = 68;
    const c = 2 * Math.PI * r;
    let offset = 0;
    return stats.map((s) => {
      const fraction = totalRevenue > 0 ? s.revenue / totalRevenue : 0;
      const len = fraction * c;
      const seg = {
        ...s,
        strokeDasharray: `${Math.max(0, len - 2)} ${c}`,
        strokeDashoffset: -offset,
      };
      offset += len;
      return seg;
    });
  }, [stats, totalRevenue]);

  const treemapRects = useMemo(() => {
    if (stats.length === 0 || totalRevenue === 0) return [];
    const W = 400;
    const H = 200;
    const sorted = [...stats].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    const subsetRev = sorted.reduce((s, i) => s + i.revenue, 0);
    const first = sorted[0];
    const rest = sorted.slice(1);
    const firstW = subsetRev > 0 ? (first.revenue / subsetRev) * W : W;

    const rects: Array<{
      method: string;
      revenue: number;
      share: number;
      units: number;
      x: number;
      y: number;
      w: number;
      h: number;
    }> = [
      {
        method: first.method,
        revenue: first.revenue,
        share: first.revenueShare,
        units: first.units,
        x: 0,
        y: 0,
        w: firstW,
        h: H,
      },
    ];

    const restRev = rest.reduce((s, i) => s + i.revenue, 0);
    let curY = 0;
    for (const item of rest) {
      const h = restRev > 0 ? (item.revenue / restRev) * H : 0;
      rects.push({
        method: item.method,
        revenue: item.revenue,
        share: item.revenueShare,
        units: item.units,
        x: firstW,
        y: curY,
        w: W - firstW,
        h,
      });
      curY += h;
    }
    return rects;
  }, [stats, totalRevenue]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Distribución por {schema.secondaryLabel}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Selecciona una categoría para aislar sus registros
          </p>
        </div>

        <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg" role="group" aria-label="Tipo de gráfico">
          {(
            [
              ['donut', 'Anillo'],
              ['treemap', 'Treemap'],
              ['monthly_stacked', 'Por Mes'],
            ] as Array<[PaymentViewMode, string]>
          ).map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => setViewMode(k)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === k
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          Sin registros en la selección actual.
        </div>
      ) : viewMode === 'donut' ? (
        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-5">
          <div className="sm:col-span-5 flex justify-center">
            <svg viewBox="0 0 180 180" className="w-44 h-44 select-none" role="img" aria-label="Gráfico de anillo">
              <g transform="rotate(-90 90 90)">
                {donutSegments.map((seg) => {
                  const isSelected = selectedPayments.includes(seg.method);
                  const isDimmed =
                    (selectedPayments.length > 0 && !isSelected) ||
                    (hoveredMethod !== null && hoveredMethod !== seg.method);
                  return (
                    <circle
                      key={seg.method}
                      cx="90"
                      cy="90"
                      r="68"
                      fill="transparent"
                      stroke={getPaymentColor(seg.method)}
                      strokeWidth={hoveredMethod === seg.method || isSelected ? 22 : 18}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      opacity={isDimmed ? 0.32 : 1}
                      className="transition-all duration-150 cursor-pointer"
                      onMouseEnter={() => setHoveredMethod(seg.method)}
                      onMouseLeave={() => setHoveredMethod(null)}
                      onClick={() => onTogglePayment(seg.method)}
                    />
                  );
                })}
              </g>
              <text
                x="90"
                y="84"
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-medium"
              >
                {hoveredStat ? hoveredStat.method : 'Total'}
              </text>
              <text
                x="90"
                y="102"
                textAnchor="middle"
                className="fill-slate-900 dark:fill-slate-100 text-[14px] font-semibold font-mono tabular-nums"
              >
                {formatCurrency(hoveredStat ? hoveredStat.revenue : totalRevenue, 0)}
              </text>
              {hoveredStat && (
                <text
                  x="90"
                  y="117"
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-mono tabular-nums"
                >
                  {hoveredStat.revenueShare.toFixed(1)}%
                </text>
              )}
            </svg>
          </div>

          <div className="sm:col-span-7 divide-y divide-slate-100 dark:divide-slate-800 max-h-[220px] overflow-y-auto">
            {stats.map((s) => {
              const isSelected = selectedPayments.includes(s.method);
              const isDimmed = selectedPayments.length > 0 && !isSelected;
              return (
                <button
                  key={s.method}
                  type="button"
                  onClick={() => onTogglePayment(s.method)}
                  onMouseEnter={() => setHoveredMethod(s.method)}
                  onMouseLeave={() => setHoveredMethod(null)}
                  className={`w-full py-2.5 px-2 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md transition-opacity cursor-pointer ${
                    isDimmed ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: getPaymentColor(s.method) }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                        {s.method}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {s.units} reg · {s.orderCount} grp · Prom {formatCurrency(s.avgItemPrice, 0)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(s.revenue, 0)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {s.revenueShare.toFixed(1)}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'treemap' ? (
        <div className="space-y-2">
          <svg viewBox="0 0 400 200" className="w-full h-auto rounded-lg overflow-hidden select-none" role="img" aria-label="Treemap">
            {treemapRects.map((r) => {
              const isSelected = selectedPayments.includes(r.method);
              const isDimmed = selectedPayments.length > 0 && !isSelected;
              return (
                <g
                  key={r.method}
                  className="cursor-pointer"
                  opacity={isDimmed ? 0.35 : 1}
                  onClick={() => onTogglePayment(r.method)}
                >
                  <rect
                    x={r.x + 1.5}
                    y={r.y + 1.5}
                    width={Math.max(0, r.w - 3)}
                    height={Math.max(0, r.h - 3)}
                    rx="4"
                    fill={getPaymentColor(r.method)}
                  />
                  {r.w > 70 && r.h > 42 && (
                    <>
                      <text
                        x={r.x + 10}
                        y={r.y + 20}
                        className="fill-white text-[12px] font-semibold"
                      >
                        {r.method}
                      </text>
                      <text
                        x={r.x + 10}
                        y={r.y + 36}
                        className="fill-white/90 text-[11px] font-mono tabular-nums"
                      >
                        {formatCurrency(r.revenue, 0)} · {r.share.toFixed(1)}%
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="space-y-4 py-1">
          {monthlyStacked.map((m) => (
            <div key={m.monthKey} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200">{m.label}</span>
                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  {formatCurrency(m.total, 0)}
                </span>
              </div>
              <div className="w-full h-6 rounded-md overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                {stats.map((s) => {
                  const v = m.byMethod[s.method] || 0;
                  const pct = m.total > 0 ? (v / m.total) * 100 : 0;
                  if (pct <= 0) return null;
                  return (
                    <button
                      key={s.method}
                      type="button"
                      onClick={() => onTogglePayment(s.method)}
                      title={`${m.label} · ${s.method}: ${formatCurrency(v, 0)} (${pct.toFixed(1)}%)`}
                      style={{ width: `${pct}%`, backgroundColor: getPaymentColor(s.method) }}
                      className="h-full text-[10px] font-mono tabular-nums text-white flex items-center justify-center hover:brightness-110 transition-all cursor-pointer border-r border-white/25 last:border-r-0"
                    >
                      {pct >= 12 ? `${pct.toFixed(0)}%` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400">
            {stats.slice(0, 8).map((s) => (
              <span key={s.method} className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: getPaymentColor(s.method) }} />
                {s.method}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
