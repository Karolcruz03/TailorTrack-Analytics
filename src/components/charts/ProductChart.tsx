import React, { useMemo, useState } from 'react';
import { DatasetSchema, SaleRecord } from '../../types/sales';
import { computeProductStats, formatCurrency, getTierColor } from '../../utils/salesData';

interface ProductChartProps {
  records: SaleRecord[];
  schema: DatasetSchema;
  selectedProducts: string[];
  onToggleProduct: (product: string) => void;
}

type ProductViewMode = 'bars_pareto' | 'lollipop' | 'scatter';

export const ProductChart: React.FC<ProductChartProps> = ({
  records,
  schema,
  selectedProducts,
  onToggleProduct,
}) => {
  const [viewMode, setViewMode] = useState<ProductViewMode>('bars_pareto');
  const [metric, setMetric] = useState<'revenue' | 'units'>('revenue');
  const [showAll, setShowAll] = useState<boolean>(false);
  const [hoveredProd, setHoveredProd] = useState<string | null>(null);

  const allStats = useMemo(() => {
    const base = computeProductStats(records);
    if (metric === 'units') {
      return [...base].sort((a, b) => b.units - a.units || b.revenue - a.revenue);
    }
    return base;
  }, [records, metric]);

  const stats = useMemo(
    () => (showAll ? allStats : allStats.slice(0, 15)),
    [allStats, showAll]
  );

  const maxMetric = useMemo(() => {
    if (stats.length === 0) return 1;
    return Math.max(...stats.map((s) => (metric === 'revenue' ? s.revenue : s.units)));
  }, [stats, metric]);

  const scatterBounds = useMemo(() => {
    if (stats.length === 0) return { minP: 0, maxP: 100, maxU: 10, avgP: 50, avgU: 5 };
    const prices = stats.map((s) => s.unitPrice);
    const units = stats.map((s) => s.units);
    const minP = Math.max(0, Math.min(...prices) * 0.88);
    const maxP = Math.max(...prices) * 1.1 || 10;
    const maxU = Math.max(...units) * 1.15 || 5;
    const avgP = prices.reduce((a, b) => a + b, 0) / prices.length;
    const avgU = units.reduce((a, b) => a + b, 0) / units.length;
    return { minP, maxP, maxU, avgP, avgU };
  }, [stats]);

  const hoveredItem = stats.find((s) => s.product === hoveredProd);
  const uniqueTiers = Array.from(new Set(schema.tiers));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Rendimiento por {schema.primaryLabel} ({allStats.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Haz clic en cualquier elemento para filtrar todo el panel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg" role="group" aria-label="Modo de visualización">
            {(
              [
                ['bars_pareto', 'Barras + Pareto'],
                ['lollipop', 'Lollipop'],
                ['scatter', 'Valor vs Volumen'],
              ] as Array<[ProductViewMode, string]>
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

          {viewMode !== 'scatter' && (
            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg" role="group" aria-label="Métrica">
              <button
                type="button"
                onClick={() => setMetric('revenue')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  metric === 'revenue'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {schema.valueLabel} ($)
              </button>
              <button
                type="button"
                onClick={() => setMetric('units')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  metric === 'units'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Cantidad (#)
              </button>
            </div>
          )}
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          Sin datos en la selección actual.
        </div>
      ) : viewMode === 'bars_pareto' ? (
        <div className="space-y-2.5">
          {stats.map((item) => {
            const val = metric === 'revenue' ? item.revenue : item.units;
            const pct = (val / maxMetric) * 100;
            const isSelected = selectedProducts.includes(item.product);
            const isDimmed = selectedProducts.length > 0 && !isSelected;
            const barColor = isSelected ? '#1D4ED8' : getTierColor(item.priceTier, schema);

            return (
              <button
                key={item.product}
                type="button"
                onClick={() => onToggleProduct(item.product)}
                onMouseEnter={() => setHoveredProd(item.product)}
                onMouseLeave={() => setHoveredProd(null)}
                className={`w-full text-left group rounded-lg px-2 py-1.5 transition-opacity cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                  isDimmed ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1 gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {item.product}
                  </span>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                    {metric === 'revenue'
                      ? `${formatCurrency(item.revenue, 0)} · ${item.units} reg · ${item.revenueShare.toFixed(1)}%`
                      : `${item.units} reg · ${formatCurrency(item.revenue, 0)}`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden relative">
                  <div
                    className="h-full rounded-sm transition-all duration-200"
                    style={{
                      width: `${Math.max(2, pct)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
                {metric === 'revenue' && (
                  <div className="flex justify-end mt-0.5">
                    <span className="text-[10px] font-mono tabular-nums text-slate-400">
                      Pareto acum. {item.cumulativeShare.toFixed(1)}% · Prom. {formatCurrency(item.unitPrice, 0)}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
          {allStats.length > 15 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline pt-1 cursor-pointer"
            >
              {showAll ? 'Mostrar solo Top 15' : `Ver todos (${allStats.length})`}
            </button>
          )}
        </div>
      ) : viewMode === 'lollipop' ? (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 640 ${stats.length * 32 + 24}`}
            className="w-full h-auto select-none"
            role="img"
            aria-label="Gráfico lollipop"
          >
            {stats.map((item, idx) => {
              const y = idx * 32 + 20;
              const labelW = 215;
              const chartW = 305;
              const val = metric === 'revenue' ? item.revenue : item.units;
              const xEnd = labelW + (val / maxMetric) * chartW;
              const isSelected = selectedProducts.includes(item.product);
              const isDimmed = selectedProducts.length > 0 && !isSelected;
              const color = getTierColor(item.priceTier, schema);

              return (
                <g
                  key={item.product}
                  className="cursor-pointer"
                  opacity={isDimmed ? 0.35 : 1}
                  onClick={() => onToggleProduct(item.product)}
                >
                  <text
                    x={labelW - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-700 dark:fill-slate-300 text-[11px] font-medium"
                  >
                    {item.product.length > 28 ? `${item.product.slice(0, 26)}…` : item.product}
                  </text>
                  <line
                    x1={labelW}
                    x2={labelW + chartW}
                    y1={y}
                    y2={y}
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth="1"
                  />
                  <line x1={labelW} x2={xEnd} y1={y} y2={y} stroke={color} strokeWidth="2.5" />
                  <circle
                    cx={xEnd}
                    cy={y}
                    r={isSelected ? 6.5 : 5}
                    fill={color}
                    className="stroke-white dark:stroke-slate-900"
                    strokeWidth="1.5"
                  />
                  <text
                    x={xEnd + 10}
                    y={y + 4}
                    className="fill-slate-700 dark:fill-slate-200 text-[11px] font-mono tabular-nums"
                  >
                    {metric === 'revenue'
                      ? `${formatCurrency(item.revenue, 0)} (${item.units})`
                      : `${item.units} reg (${formatCurrency(item.unitPrice, 0)})`}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              {uniqueTiers.map((tier) => (
                <span key={tier} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: getTierColor(tier, schema) }}
                  />
                  {tier}
                </span>
              ))}
            </div>
            {hoveredItem && (
              <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {hoveredItem.product} · {formatCurrency(hoveredItem.unitPrice, 0)} prom · {hoveredItem.units} reg · Total {formatCurrency(hoveredItem.revenue, 0)}
              </span>
            )}
          </div>

          <svg viewBox="0 0 640 320" className="w-full h-auto select-none" role="img" aria-label="Gráfico de dispersión valor contra volumen">
            {(() => {
              const pad = { top: 20, right: 24, bottom: 42, left: 48 };
              const pw = 640 - pad.left - pad.right;
              const ph = 320 - pad.top - pad.bottom;
              const { minP, maxP, maxU, avgP, avgU } = scatterBounds;
              const maxRev = Math.max(...stats.map((s) => s.revenue), 1);

              const px = (price: number) =>
                maxP === minP ? pad.left + pw / 2 : pad.left + ((price - minP) / (maxP - minP)) * pw;
              const py = (u: number) => pad.top + ph - (u / maxU) * ph;

              const xTicks = [minP, (minP + maxP) / 2, maxP];

              return (
                <>
                  <line
                    x1={px(avgP)}
                    x2={px(avgP)}
                    y1={pad.top}
                    y2={pad.top + ph}
                    className="stroke-slate-300 dark:stroke-slate-700"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={pad.left}
                    x2={pad.left + pw}
                    y1={py(avgU)}
                    y2={py(avgU)}
                    className="stroke-slate-300 dark:stroke-slate-700"
                    strokeDasharray="4 4"
                  />

                  <line x1={pad.left} x2={pad.left + pw} y1={pad.top + ph} y2={pad.top + ph} className="stroke-slate-200 dark:stroke-slate-800" />
                  <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + ph} className="stroke-slate-200 dark:stroke-slate-800" />

                  {xTicks.map((tick, idx) => (
                    <text
                      key={idx}
                      x={px(tick)}
                      y={pad.top + ph + 16}
                      textAnchor="middle"
                      className="fill-slate-400 text-[10px] font-mono tabular-nums"
                    >
                      {formatCurrency(tick, 0)}
                    </text>
                  ))}
                  <text
                    x={pad.left + pw / 2}
                    y={312}
                    textAnchor="middle"
                    className="fill-slate-500 text-[11px]"
                  >
                    {schema.valueLabel} Promedio
                  </text>

                  {[0, Math.round(maxU / 2), Math.round(maxU)].map((ut, idx) => (
                    <text
                      key={idx}
                      x={pad.left - 8}
                      y={py(ut) + 3}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-mono tabular-nums"
                    >
                      {ut}
                    </text>
                  ))}
                  <text
                    x={14}
                    y={pad.top + ph / 2}
                    textAnchor="middle"
                    transform={`rotate(-90 14 ${pad.top + ph / 2})`}
                    className="fill-slate-500 text-[11px]"
                  >
                    Registros
                  </text>

                  {stats.map((s) => {
                    const cx = px(s.unitPrice);
                    const cy = py(s.units);
                    const r = 6 + Math.sqrt(s.revenue / maxRev) * 16;
                    const isSelected = selectedProducts.includes(s.product);
                    const isHovered = hoveredProd === s.product;
                    const col = getTierColor(s.priceTier, schema);
                    return (
                      <g
                        key={s.product}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredProd(s.product)}
                        onMouseLeave={() => setHoveredProd(null)}
                        onClick={() => onToggleProduct(s.product)}
                      >
                        <circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill={col}
                          fillOpacity={isHovered || isSelected ? 0.9 : 0.65}
                          stroke={isSelected ? '#0F172A' : col}
                          strokeWidth={isSelected ? 2.5 : 1.25}
                        />
                        <text
                          x={cx}
                          y={cy - r - 4}
                          textAnchor="middle"
                          className="fill-slate-700 dark:fill-slate-300 text-[9px] font-medium pointer-events-none"
                        >
                          {s.product.split(' ').slice(-2).join(' ')}
                        </text>
                      </g>
                    );
                  })}
                </>
              );
            })()}
          </svg>
        </div>
      )}
    </div>
  );
};
