import React from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { AiInsightsReport } from '../types/sales';

interface AiInsightsDrawerProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  report: AiInsightsReport | null;
  datasetName: string;
  recordCount: number;
  isFiltered: boolean;
  onClose: () => void;
  onRegenerate: () => void;
}

const IMPACT_LABELS: Record<string, { label: string; className: string }> = {
  positivo: {
    label: 'Tendencia positiva',
    className: 'text-emerald-700 dark:text-emerald-400',
  },
  atencion: {
    label: 'Punto de atención',
    className: 'text-amber-700 dark:text-amber-400',
  },
  neutral: {
    label: 'Observación',
    className: 'text-slate-600 dark:text-slate-400',
  },
};

export const AiInsightsDrawer: React.FC<AiInsightsDrawerProps> = ({
  open,
  loading,
  error,
  report,
  datasetName,
  recordCount,
  isFiltered,
  onClose,
  onRegenerate,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-insights-title"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <h2
                id="ai-insights-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                IA Insights — Resumen de Tendencias
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
              {datasetName} · {recordCount} registros {isFiltered ? '(con filtros activos)' : '(dataset completo)'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de IA Insights"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Analizando métricas, estacionalidad y concentración de datos...
              </div>
              <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
          ) : error ? (
            <div className="border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 rounded-xl p-5 space-y-3">
              <div className="text-sm font-semibold text-red-800 dark:text-red-300">
                No se pudo generar el análisis
              </div>
              <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={onRegenerate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reintentar
              </button>
            </div>
          ) : report ? (
            <>
              {/* Executive Summary */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Resumen Ejecutivo
                </h3>
                <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  {report.resumenEjecutivo}
                </p>
              </section>

              {/* Key Trends */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Tendencias Principales Detectadas
                </h3>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {report.tendenciasClave.map((t, idx) => {
                    const meta = IMPACT_LABELS[t.impacto] || IMPACT_LABELS.neutral;
                    return (
                      <div key={idx} className="p-4 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {t.titulo}
                          </span>
                          <span className={`text-[11px] font-medium shrink-0 ${meta.className}`}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {t.detalle}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Concentration & Anomalies */}
              <section className="space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Concentración y Patrones
                </h3>
                <ul className="space-y-2">
                  {report.anomaliasYConcentracion.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 pl-3 border-b border-slate-100 dark:border-slate-800/70 pb-2 last:border-b-0"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Recommendations */}
              <section className="space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Recomendaciones Accionables
                </h3>
                <ol className="space-y-2">
                  {report.recomendaciones.map((rec, idx) => (
                    <li
                      key={idx}
                      className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 rounded-lg p-3"
                    >
                      <span className="font-mono font-semibold text-blue-700 dark:text-blue-400 mr-1.5">
                        0{idx + 1}.
                      </span>
                      {rec}
                    </li>
                  ))}
                </ol>
              </section>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onRegenerate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Regenerar análisis
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </aside>
    </div>
  );
};
