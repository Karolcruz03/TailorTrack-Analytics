import React, { useMemo, useState } from 'react';
import { DatasetSchema, SaleRecord } from '../../types/sales';
import { formatCurrency, getPaymentColor, getTierColor } from '../../utils/salesData';

interface SankeyFlowChartProps {
  records: SaleRecord[];
  schema: DatasetSchema;
}

interface SankeyNode {
  id: string;
  label: string;
  col: number;
  value: number;
  y: number;
  h: number;
  color: string;
}

interface SankeyLink {
  id: string;
  source: SankeyNode;
  target: SankeyNode;
  value: number;
  y0: number;
  y1: number;
  thickness: number;
  color: string;
}

export const SankeyFlowChart: React.FC<SankeyFlowChartProps> = ({ records, schema }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const layout = useMemo(() => {
    const W = 760;
    const H = 310;
    const padTop = 28;
    const padBottom = 16;
    const availH = H - padTop - padBottom;
    const nodeW = 16;
    const colX = [36, W / 2 - nodeW / 2, W - 36 - nodeW];
    const gap = 12;

    const totalRev = records.reduce((s, r) => s + r.price, 0);
    if (totalRev === 0) return null;

    const sumMap = (items: Array<{ key: string; val: number }>) => {
      const m = new Map<string, number>();
      for (const it of items) m.set(it.key, (m.get(it.key) || 0) + it.val);
      return m;
    };

    // Derive dynamic months sorted chronologically (cap at 6)
    const monthOrder = Array.from(
      new Map(
        [...records]
          .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
          .map((r) => [r.monthLabel, r.monthKey])
      ).keys()
    ).slice(-6);

    const pTotalsRaw = sumMap(records.map((r) => ({ key: r.paymentMethod, val: r.price })));
    const payments = Array.from(pTotalsRaw.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k]) => k);

    const tiers = Array.from(new Set(schema.tiers));

    const filteredForSankey = records.filter(
      (r) => monthOrder.includes(r.monthLabel) && payments.includes(r.paymentMethod)
    );
    const activeTotal = filteredForSankey.reduce((s, r) => s + r.price, 0);
    if (activeTotal === 0) return null;

    const mTotals = sumMap(filteredForSankey.map((r) => ({ key: r.monthLabel, val: r.price })));
    const pTotals = sumMap(filteredForSankey.map((r) => ({ key: r.paymentMethod, val: r.price })));
    const tTotals = sumMap(filteredForSankey.map((r) => ({ key: r.priceTier, val: r.price })));

    const buildCol = (
      keys: string[],
      totals: Map<string, number>,
      col: number,
      colorFn: (k: string, i: number) => string
    ) => {
      const activeKeys = keys.filter((k) => (totals.get(k) || 0) > 0);
      const totalGaps = Math.max(0, activeKeys.length - 1) * gap;
      const scaleH = availH - totalGaps;
      let curY = padTop;
      const nodes: SankeyNode[] = [];
      activeKeys.forEach((k, idx) => {
        const val = totals.get(k) || 0;
        const h = Math.max(8, (val / activeTotal) * scaleH);
        nodes.push({
          id: `${col}:${k}`,
          label: k,
          col,
          value: val,
          y: curY,
          h,
          color: colorFn(k, idx),
        });
        curY += h + gap;
      });
      return nodes;
    };

    const slateShades = ['#475569', '#334155', '#1E293B', '#64748B', '#0F172A', '#3B82F6'];
    const col0 = buildCol(monthOrder, mTotals, 0, (_, i) => slateShades[i % slateShades.length]);
    const col1 = buildCol(payments, pTotals, 1, (k) => getPaymentColor(k));
    const col2 = buildCol(tiers, tTotals, 2, (k) => getTierColor(k, schema));

    const outOffset = new Map<string, number>();
    const inOffset = new Map<string, number>();
    [...col0, ...col1, ...col2].forEach((n) => {
      outOffset.set(n.id, n.y);
      inOffset.set(n.id, n.y);
    });

    const links: SankeyLink[] = [];

    for (const sNode of col0) {
      for (const tNode of col1) {
        const val = filteredForSankey
          .filter((r) => r.monthLabel === sNode.label && r.paymentMethod === tNode.label)
          .reduce((s, r) => s + r.price, 0);
        if (val <= 0) continue;
        const thickness = (val / sNode.value) * sNode.h;
        const tThickness = (val / tNode.value) * tNode.h;
        const y0 = outOffset.get(sNode.id)! + thickness / 2;
        const y1 = inOffset.get(tNode.id)! + tThickness / 2;
        outOffset.set(sNode.id, outOffset.get(sNode.id)! + thickness);
        inOffset.set(tNode.id, inOffset.get(tNode.id)! + tThickness);

        links.push({
          id: `${sNode.id}->${tNode.id}`,
          source: sNode,
          target: tNode,
          value: val,
          y0,
          y1,
          thickness: Math.max(1.5, (thickness + tThickness) / 2),
          color: tNode.color,
        });
      }
    }

    for (const sNode of col1) {
      for (const tNode of col2) {
        const val = filteredForSankey
          .filter((r) => r.paymentMethod === sNode.label && r.priceTier === tNode.label)
          .reduce((s, r) => s + r.price, 0);
        if (val <= 0) continue;
        const thickness = (val / sNode.value) * sNode.h;
        const tThickness = (val / tNode.value) * tNode.h;
        const y0 = outOffset.get(sNode.id)! + thickness / 2;
        const y1 = inOffset.get(tNode.id)! + tThickness / 2;
        outOffset.set(sNode.id, outOffset.get(sNode.id)! + thickness);
        inOffset.set(tNode.id, inOffset.get(tNode.id)! + tThickness);

        links.push({
          id: `${sNode.id}->${tNode.id}`,
          source: sNode,
          target: tNode,
          value: val,
          y0,
          y1,
          thickness: Math.max(1.5, (thickness + tThickness) / 2),
          color: sNode.color,
        });
      }
    }

    return { W, H, nodeW, colX, nodes: [...col0, ...col1, ...col2], links, totalRev: activeTotal };
  }, [records, schema]);

  const hoveredLink = layout?.links.find((l) => l.id === hoveredId);
  const hoveredNode = layout?.nodes.find((n) => n.id === hoveredId);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Flujo de Ingresos (Sankey): Mes → {schema.secondaryLabel} → Nivel de {schema.valueLabel}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pasa el cursor sobre cualquier nodo o banda para inspeccionar el flujo exacto
          </p>
        </div>

        <div className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300 min-h-[18px]">
          {hoveredLink
            ? `${hoveredLink.source.label} → ${hoveredLink.target.label}: ${formatCurrency(hoveredLink.value, 0)} (${((hoveredLink.value / (layout?.totalRev || 1)) * 100).toFixed(1)}%)`
            : hoveredNode
              ? `${hoveredNode.label}: ${formatCurrency(hoveredNode.value, 0)} (${((hoveredNode.value / (layout?.totalRev || 1)) * 100).toFixed(1)}%)`
              : ''}
        </div>
      </div>

      {!layout ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          Sin datos suficientes para trazar el diagrama de flujo.
        </div>
      ) : (
        <svg viewBox={`0 0 ${layout.W} ${layout.H}`} className="w-full h-auto select-none" role="img" aria-label="Diagrama Sankey de flujo">
          <text x={layout.colX[0]} y={14} className="fill-slate-400 text-[11px] font-medium">
            Mes
          </text>
          <text x={layout.colX[1] + layout.nodeW / 2} y={14} textAnchor="middle" className="fill-slate-400 text-[11px] font-medium">
            {schema.secondaryLabel}
          </text>
          <text x={layout.colX[2] + layout.nodeW} y={14} textAnchor="end" className="fill-slate-400 text-[11px] font-medium">
            Nivel de {schema.valueLabel}
          </text>

          {layout.links.map((lk) => {
            const x0 = layout.colX[lk.source.col] + layout.nodeW;
            const x1 = layout.colX[lk.target.col];
            const mx = (x0 + x1) / 2;
            const d = `M ${x0} ${lk.y0} C ${mx} ${lk.y0}, ${mx} ${lk.y1}, ${x1} ${lk.y1}`;
            const active =
              hoveredId === null ||
              hoveredId === lk.id ||
              hoveredId === lk.source.id ||
              hoveredId === lk.target.id;

            return (
              <path
                key={lk.id}
                d={d}
                fill="none"
                stroke={lk.color}
                strokeWidth={lk.thickness}
                strokeOpacity={hoveredId === lk.id ? 0.65 : active ? 0.28 : 0.06}
                className="transition-opacity duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredId(lk.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            );
          })}

          {layout.nodes.map((n) => {
            const x = layout.colX[n.col];
            const labelRight = n.col === 0;
            const labelLeft = n.col === 2;
            const isHighlighted = hoveredId === n.id;

            return (
              <g
                key={n.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <rect
                  x={x}
                  y={n.y}
                  width={layout.nodeW}
                  height={n.h}
                  rx="3"
                  fill={n.color}
                  opacity={hoveredId && !isHighlighted ? 0.7 : 1}
                />
                <text
                  x={labelLeft ? x - 8 : labelRight ? x + layout.nodeW + 8 : x + layout.nodeW + 8}
                  y={n.y + n.h / 2 - 2}
                  textAnchor={labelLeft ? 'end' : 'start'}
                  className="fill-slate-800 dark:fill-slate-200 text-[11px] font-medium pointer-events-none"
                >
                  {n.label}
                </text>
                <text
                  x={labelLeft ? x - 8 : labelRight ? x + layout.nodeW + 8 : x + layout.nodeW + 8}
                  y={n.y + n.h / 2 + 11}
                  textAnchor={labelLeft ? 'end' : 'start'}
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums pointer-events-none"
                >
                  {formatCurrency(n.value, 0)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};
