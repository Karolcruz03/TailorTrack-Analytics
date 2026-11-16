import React, { useMemo, useState } from 'react';
import { SaleRecord } from '../../types/sales';
import { formatCurrency, parseDateParts } from '../../utils/salesData';

interface CalendarHeatmapProps {
  records: SaleRecord[];
  minDate: string;
  maxDate: string;
  activeDate: string | null;
  onSelectDate: (date: string) => void;
}

const WEEKDAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  records,
  minDate,
  maxDate,
  activeDate,
  onSelectDate,
}) => {
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    revenue: number;
    units: number;
    orders: number;
    label: string;
  } | null>(null);

  const dailyMap = useMemo(() => {
    const map = new Map<string, { revenue: number; units: number; orders: Set<string> }>();
    for (const r of records) {
      const cur = map.get(r.date);
      if (cur) {
        cur.revenue += r.price;
        cur.units += 1;
        cur.orders.add(r.orderNumber);
      } else {
        map.set(r.date, { revenue: r.price, units: 1, orders: new Set([r.orderNumber]) });
      }
    }
    return map;
  }, [records]);

  const monthSpecs = useMemo(() => {
    const monthKeys = Array.from(new Set(records.map((r) => r.monthKey))).sort();
    const keys =
      monthKeys.length > 0
        ? monthKeys.slice(-6)
        : minDate
          ? [minDate.slice(0, 7)]
          : ['2025-08', '2025-09', '2025-10'];

    return keys.map((mk) => {
      const [y, m] = mk.split('-').map(Number);
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const info = parseDateParts(`${mk}-01`);
      return {
        year: y,
        month: m,
        name: info.monthFullLabel,
        days: daysInMonth,
      };
    });
  }, [records, minDate]);

  const maxDayRevenue = useMemo(() => {
    let max = 0;
    for (const v of dailyMap.values()) {
      if (v.revenue > max) max = v.revenue;
    }
    return max || 1;
  }, [dailyMap]);

  const getCellStyle = (revenue: number, inDatasetWindow: boolean) => {
    if (!inDatasetWindow) {
      return 'bg-slate-50 dark:bg-slate-950/60 text-slate-300 dark:text-slate-700 border-transparent';
    }
    if (revenue === 0) {
      return 'bg-slate-100 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 border-slate-200/70 dark:border-slate-700/60';
    }
    const ratio = revenue / maxDayRevenue;
    if (ratio < 0.25) {
      return 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-900';
    }
    if (ratio < 0.5) {
      return 'bg-blue-300 dark:bg-blue-800/80 text-slate-900 dark:text-white border-blue-400 dark:border-blue-700';
    }
    if (ratio < 0.75) {
      return 'bg-blue-500 text-white border-blue-600';
    }
    return 'bg-blue-700 text-white border-blue-800';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Mapa de Calor Calendario
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Intensidad diaria ({minDate || '—'} → {maxDate || '—'}) · Haz clic en un día para filtrar
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          {hoveredDay ? (
            <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
              {hoveredDay.label}: {formatCurrency(hoveredDay.revenue, 0)} · {hoveredDay.units} reg · {hoveredDay.orders} grp
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <span>Menor</span>
              <span className="w-3 h-3 rounded-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              <span className="w-3 h-3 rounded-xs bg-blue-100 dark:bg-blue-950" />
              <span className="w-3 h-3 rounded-xs bg-blue-300 dark:bg-blue-800" />
              <span className="w-3 h-3 rounded-xs bg-blue-500" />
              <span className="w-3 h-3 rounded-xs bg-blue-700" />
              <span>Mayor</span>
            </div>
          )}
        </div>
      </div>

      <div
        className={`grid grid-cols-1 ${
          monthSpecs.length === 1 ? 'md:grid-cols-1 max-w-sm' : monthSpecs.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
        } gap-6`}
      >
        {monthSpecs.map((m) => {
          const firstStr = `${m.year}-${String(m.month).padStart(2, '0')}-01`;
          const firstOffset = parseDateParts(firstStr).weekdayIndex;

          const cells: Array<{ day: number | null; dateStr?: string }> = [];
          for (let i = 0; i < firstOffset; i++) {
            cells.push({ day: null });
          }
          for (let d = 1; d <= m.days; d++) {
            const dateStr = `${m.year}-${String(m.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            cells.push({ day: d, dateStr });
          }

          return (
            <div key={m.name} className="space-y-2">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {m.name}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_SHORT.map((w) => (
                  <div
                    key={w}
                    className="text-[10px] font-medium text-center text-slate-400 dark:text-slate-500 pb-0.5"
                  >
                    {w}
                  </div>
                ))}
                {cells.map((c, idx) => {
                  if (!c.day || !c.dateStr) {
                    return <div key={`empty-${idx}`} className="h-8" />;
                  }
                  const inWindow =
                    (!minDate || c.dateStr >= minDate) && (!maxDate || c.dateStr <= maxDate);
                  const data = dailyMap.get(c.dateStr);
                  const rev = data ? data.revenue : 0;
                  const units = data ? data.units : 0;
                  const orders = data ? data.orders.size : 0;
                  const isSelected = activeDate === c.dateStr;

                  return (
                    <button
                      key={c.dateStr}
                      type="button"
                      disabled={!inWindow}
                      onClick={() => inWindow && onSelectDate(c.dateStr!)}
                      onMouseEnter={() => {
                        if (inWindow) {
                          const p = parseDateParts(c.dateStr!);
                          setHoveredDay({
                            date: c.dateStr!,
                            revenue: rev,
                            units,
                            orders,
                            label: `${p.weekdayLabel} ${p.shortDate}`,
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`h-8 rounded-md border text-[11px] font-mono tabular-nums flex items-center justify-center transition-transform ${
                        inWindow ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-50'
                      } ${getCellStyle(rev, inWindow)} ${
                        isSelected ? 'ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-slate-900' : ''
                      }`}
                      title={
                        inWindow
                          ? `${c.dateStr}: ${formatCurrency(rev, 0)} (${units} reg, ${orders} grp)`
                          : `${c.dateStr}: fuera del rango del archivo`
                      }
                    >
                      {c.day}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
