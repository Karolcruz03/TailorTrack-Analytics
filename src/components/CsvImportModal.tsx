import React, { useRef, useState } from 'react';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { CsvColumnMapping, DatasetSchema, ParsedCsvPreview, SaleRecord } from '../types/sales';
import { buildDatasetFromPreview, parseCsvForPreview } from '../utils/salesData';

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (records: SaleRecord[], schema: DatasetSchema) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ open, onClose, onImport }) => {
  const [preview, setPreview] = useState<ParsedCsvPreview | null>(null);
  const [mapping, setMapping] = useState<CsvColumnMapping | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const processFile = (file: File) => {
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseCsvForPreview(text, file.name);
      if (!parsed) {
        setErrorMsg(
          'No se pudo leer el archivo. Asegúrate de que tenga al menos una fila de encabezados y una fila de datos.'
        );
        return;
      }
      setPreview(parsed);
      setMapping(parsed.suggestedMapping);
    };
    reader.onerror = () => {
      setErrorMsg('Error al leer el archivo local.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirm = () => {
    if (!preview || !mapping) return;
    const { records, schema } = buildDatasetFromPreview(preview, mapping);
    if (records.length === 0) {
      setErrorMsg(
        'No se encontraron filas válidas con la columna numérica seleccionada. Verifica el mapeo.'
      );
      return;
    }
    onImport(records, schema);
    setPreview(null);
    setMapping(null);
    onClose();
  };

  const delimLabel =
    preview?.delimiter === ';'
      ? 'Punto y coma (;)'
      : preview?.delimiter === '\t'
        ? 'Tabulador'
        : preview?.delimiter === '|'
          ? 'Barra vertical (|)'
          : 'Coma (,)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-import-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="csv-import-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Cargar cualquier archivo CSV
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Detecta automáticamente columnas de fecha, categorías, métricas numéricas e identificadores para generar todas las vistas al instante.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar cargador de CSV"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30'
              : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/60 dark:bg-slate-950/40'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) processFile(f);
              e.target.value = '';
            }}
            className="hidden"
          />
          <Upload className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {preview ? `Archivo seleccionado: ${preview.fileName}` : 'Arrastra tu archivo CSV aquí o haz clic para seleccionarlo'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Soporta delimitadores por coma, punto y coma o tabulador · Procesamiento local en tu navegador
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {preview && mapping && (
          <div className="space-y-5">
            {/* Metadata bar */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                {preview.fileName}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{preview.rows.length} filas detectadas</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{preview.headers.length} columnas</span>
              <span aria-hidden="true">·</span>
              <span>Delimitador: {delimLabel}</span>
            </div>

            {/* Column Mapping Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Dimensión principal (Producto / Categoría)
                </label>
                <select
                  value={mapping.primaryCol}
                  onChange={(e) => setMapping({ ...mapping, primaryCol: e.target.value })}
                  className="w-full h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Métrica numérica (Valor / Monto)
                </label>
                <select
                  value={mapping.valueCol}
                  onChange={(e) => setMapping({ ...mapping, valueCol: e.target.value })}
                  className="w-full h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="">Conteo de filas (1 por fila)</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Dimensión secundaria (Pago / Canal / Región)
                </label>
                <select
                  value={mapping.secondaryCol}
                  onChange={(e) => setMapping({ ...mapping, secondaryCol: e.target.value })}
                  className="w-full h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="">Sin dimensión secundaria (General)</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Columna de Fecha
                </label>
                <select
                  value={mapping.dateCol}
                  onChange={(e) => setMapping({ ...mapping, dateCol: e.target.value })}
                  className="w-full h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="">Sin columna de fecha (Usar hoy)</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  ID / Agrupador de Pedido
                </label>
                <select
                  value={mapping.orderCol}
                  onChange={(e) => setMapping({ ...mapping, orderCol: e.target.value })}
                  className="w-full h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="">Generar ID por fila (REG-0001)</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Multiplicar por Cantidad (opcional)
                </label>
                <select
                  value={mapping.quantityCol}
                  onChange={(e) => setMapping({ ...mapping, quantityCol: e.target.value })}
                  className="w-full h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="">No multiplicar (1 unidad)</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data Preview Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <tr>
                    {preview.headers.map((h) => (
                      <th key={h} className="py-2 px-2.5 text-left font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {preview.rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      {preview.headers.map((_, ci) => (
                        <td
                          key={ci}
                          className="py-1.5 px-2.5 text-slate-700 dark:text-slate-300 font-mono whitespace-nowrap max-w-[180px] truncate"
                        >
                          {row[ci] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!preview || !mapping}
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Visualizar datos al instante
          </button>
        </div>
      </div>
    </div>
  );
};
