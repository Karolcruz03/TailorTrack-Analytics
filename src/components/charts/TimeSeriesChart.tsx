import React, { useMemo, useState } from 'react';
import { Granularity, MetricType, SaleRecord, TimeChartType } from '../../types/sales';
import { computeTimeSeries, formatCurrency, formatNumber } from '../../utils/salesData';

interface TimeSeriesChartProps {
  records: SaleRecord[];
  onSelectDate?: (date: string) => void;
  activeDate?: string | null;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  records,
  onSelectDate,
  activeDate,
}) => {
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [chartType, setChartType] = useState<TimeChartType>('area');
  const [metric, setMetric] = useState<MetricType>('revenue');
  const [showMovingAvg, setShowMovingAvg] = useState<boolean>(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const series = useMemo(() => computeTimeSeries(records, granularity), [records, granularity]);

  const getValue = (p: (typeof series)[number]) => {
    if (chartType === 'cumulative') {
      return metric === 'revenue' ? p.cumulativeRevenue : p.cumulativeUnits;
    }
    if (metric === 'revenue') return p.revenue;
    if (metric === 'units') return p.units;
    return p.orders;
  };

  const width = 880;
  const height = 290;
  const pad = { top: 18, right: 20, bottom: 38, left: 60 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxVal = useMemo(() => {
    if (series.length === 0) return 100;
    const rawMax = Math.max(
      ...series.map((p) =>
        Math.max(
          getValue(p),
          granularity === 'daily' && showMovingAvg && chartType !== 'cumulative' && metric === 'revenue'
            ? p.movingAvgRevenue || 0
            : 0
        )
      )
    );
    return rawMax === 0 ? 10 : rawMax * 1.12;
  }, [series, chartType, metric, granularity, showMovingAvg]);

  const yTicks = useMemo(() => {
    const count = 4;
    return Array.from({ length: count + 1 }, (_, i) => (maxVal / count) * i);
  }, [maxVal]);

  const xPos = (i: number) => {
    if (series.length <= 1) return pad.left + plotW / 2;
    if (chartType === 'bar') {
      const step = plotW / series.length;
      return pad.left + step * i + step / 2;
    }
    return pad.left + (i / (series.length - 1)) * plotW;
  };

  const yPos = (val: number) => pad.top + plotH - (val / maxVal) * plotH;

  const linePath = useMemo(() => {
    if (series.length === 0) return '';
    return series
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(getValue(p)).toFixed(1)}`)
      .join(' ');
  }, [series, chartType, metric, maxVal]);

  const areaPath = useMemo(() => {
    if (series.length === 0) return '';
    const base = pad.top + plotH;
    const firstX = xPos(0).toFixed(1);
    const lastX = xPos(series.length - 1).toFixed(1);
    return `${linePath} L ${lastX} ${base} L ${firstX} ${base} Z`;
  }, [linePath, series.length]);

  const maPath = useMemo(() => {
    if (granularity !== 'daily' || !showMovingAvg || chartType === 'cumulative' || metric !== 'revenue') {
      return '';
    }
    return series
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(p.movingAvgRevenue || 0).toFixed(1)}`)
      .join(' ');
  }, [series, granularity, showMovingAvg, chartType, metric, maxVal]);

  const formatTick = (v: number) => {
    if (metric === 'revenue') {
      return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`;
    }
    return `${Math.round(v)}`;
  };

  const hoveredPoint = hoverIdx !== null ? series[hoverIdx] : null;
  const barWidth = series.length > 0 ? Math.max(4, Math.min(44, (plotW / series.length) * 0.68)) : 12;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Evolución Temporal de Ventas
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {series.length} {granularity === 'daily' ? 'días' : granularity === 'weekly' ? 'semanas' : 'meses'} en rango · Haz clic en un punto diario para aislar esa fecha
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type */}
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg" role="group" aria-label="Tipo de gráfico temporal">
            {(
              [
                ['area', 'Área'],
                ['line', 'Línea'],
                ['bar', 'Barras'],
                ['cumulative', 'Acumulado'],
              ] as Array<[TimeChartType, string]>
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setChartType(k)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  chartType === k
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Granularity */}
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg" role="group" aria-label="Granularidad temporal">
            {(
              [
                ['daily', 'Diario'],
                ['weekly', 'Semanal'],
                ['monthly', 'Mensual'],
              ] as Array<[Granularity, string]>
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setGranularity(k)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  granularity === k
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Metric */}
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg" role="group" aria-label="Métrica">
            {(
              [
                ['revenue', 'Ingresos'],
                ['units', 'Unidades'],
                ['orders', 'Pedidos'],
              ] as Array<[MetricType, string]>
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                disabled={chartType === 'cumulative' && k === 'orders'}
                onClick={() => setMetric(k)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  metric === k
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {series.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          No hay datos temporales para los filtros actuales.
        </div>
      ) : (
        <div className="relative">
          {/* Legend / moving avg toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-600 inline-block" />
                {chartType === 'cumulative' ? 'Total acumulado' : metric === 'revenue' ? 'Ingresos ($)' : metric === 'units' ? 'Unidades' : 'Pedidos'}
              </span>
              {granularity === 'daily' && chartType !== 'cumulative' && metric === 'revenue' && (
                <button
                  type="button"
                  onClick={() => setShowMovingAvg((v) => !v)}
                  className={`inline-flex items-center gap-1.5 cursor-pointer transition-opacity ${
                    showMovingAvg ? 'opacity-100 text-amber-700 dark:text-amber-400' : 'opacity-50'
                  }`}
                >
                  <span className="w-3 h-0 border-t-2 border-dashed border-amber-600 inline-block" />
                  Promedio móvil 7d
                </button>
              )}
            </div>

            {hoveredPoint && (
              <div className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {hoveredPoint.fullLabel} · {formatCurrency(hoveredPoint.revenue, 2)} · {formatNumber(hoveredPoint.units)} uds · {hoveredPoint.orders} ped.
              </div>
            )}
          </div>

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none overflow-visible"
            role="img"
            aria-label="Gráfico de evolución temporal de ventas"
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="tsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            {yTicks.map((tk, i) => {
              const y = yPos(tk);
              return (
                <g key={i}>
                  <line
                    x1={pad.left}
                    x2={width - pad.right}
                    y1={y}
                    y2={y}
                    className="stroke-slate-200 dark:stroke-slate-800"
                    strokeWidth="1"
                    strokeDasharray={i === 0 ? undefined : '3 3'}
                  />
                  <text
                    x={pad.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 dark:fill-slate-500 text-[11px] font-mono tabular-nums"
                  >
                    {formatTick(tk)}
                  </text>
                </g>
              );
            })}

            {/* Area / Line / Cumulative */}
            {chartType === 'area' && (
              <path d={areaPath} fill="url(#tsAreaGrad)" />
            )}
            {(chartType === 'area' || chartType === 'line' || chartType === 'cumulative') && (
              <>
                {chartType === 'cumulative' && (
                  <path d={areaPath} fill="url(#tsAreaGrad)" />
                )}
                <path
                  d={linePath}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.25"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* Bars */}
            {chartType === 'bar' &&
              series.map((p, i) => {
                const val = getValue(p);
                const x = xPos(i) - barWidth / 2;
                const y = yPos(val);
                const h = Math.max(0, pad.top + plotH - y);
                const isSelected = activeDate === p.key;
                const isHovered = hoverIdx === i;
                return (
                  <rect
                    key={p.key}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={h}
                    rx="2"
                    className="transition-opacity cursor-pointer"
                    fill={isSelected ? '#D97706' : isHovered ? '#1D4ED8' : '#2563EB'}
                    opacity={activeDate && !isSelected ? 0.35 : 0.92}
                    onClick={() => granularity === 'daily' && onSelectDate?.(p.key)}
                  />
                );
              })}

            {/* 7-day moving average overlay */}
            {maPath && (
              <path
                d={maPath}
                fill="none"
                stroke="#D97706"
                strokeWidth="1.75"
                strokeDasharray="5 4"
              />
            )}

            {/* Hover crosshair and data points */}
            {hoverIdx !== null && series[hoverIdx] && (
              <line
                x1={xPos(hoverIdx)}
                x2={xPos(hoverIdx)}
                y1={pad.top}
                y2={pad.top + plotH}
                className="stroke-slate-400 dark:stroke-slate-600"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}

            {series.map((p, i) => {
              const cx = xPos(i);
              const cy = yPos(getValue(p));
              const isHovered = hoverIdx === i;
              const isSelected = activeDate === p.key;
              const showDot =
                chartType !== 'bar' &&
                (series.length <= 24 || isHovered || isSelected || getValue(p) > 0);
              const sliceW = series.length > 1 ? plotW / series.length : plotW;

              return (
                <g key={p.key}>
                  {showDot && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered || isSelected ? 5 : series.length > 30 ? 2.4 : 3.5}
                      fill={isSelected ? '#D97706' : '#2563EB'}
                      className="stroke-white dark:stroke-slate-900 pointer-events-none"
                      strokeWidth="1.5"
                    />
                  )}
                  {/* Invisible wide hit zone for smooth hovering & clicking */}
                  <rect
                    x={cx - sliceW / 2}
                    y={pad.top}
                    width={sliceW}
                    height={plotH}
                    fill="transparent"
                    className={granularity === 'daily' ? 'cursor-pointer' : 'cursor-crosshair'}
                    onMouseEnter={() => setHoverIdx(i)}
                    onClick={() => granularity === 'daily' && onSelectDate?.(p.key)}
                  />
                </g>
              );
            })}

            {/* X-axis labels (intelligently thinned to prevent overlap) */}
            {series.map((p, i) => {
              const step = series.length > 35 ? 7 : series.length > 16 ? 3 : 1;
              if (i % step !== 0 && i !== series.length - 1) return null;
              return (
                <text
                  key={`xl-${p.key}`}
                  x={xPos(i)}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-slate-400 dark:fill-slate-500 text-[11px] font-mono tabular-nums"
                >
                  {p.label}
                </text>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
};
