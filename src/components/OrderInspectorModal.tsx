import React from 'react';
import { X } from 'lucide-react';
import { OrderGroup } from '../types/sales';
import { formatCurrency, getPaymentColor, parseDateParts } from '../utils/salesData';

interface OrderInspectorModalProps {
  order: OrderGroup | null;
  onClose: () => void;
  onFilterByOrder: (orderNumber: string) => void;
}

export const OrderInspectorModal: React.FC<OrderInspectorModalProps> = ({
  order,
  onClose,
  onFilterByOrder,
}) => {
  if (!order) return null;

  const dateInfo = parseDateParts(order.date);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-inspector-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Detalle de Pedido
            </div>
            <h3
              id="order-inspector-title"
              className="text-xl font-semibold font-mono text-slate-900 dark:text-slate-100 mt-0.5"
            >
              {order.orderNumber}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {dateInfo.weekdayLabel}, {order.date} · {order.itemCount}{' '}
              {order.itemCount === 1 ? 'artículo' : 'artículos'}
              {order.hasSplitPayment ? ' · Pago combinado' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar inspector"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
          {order.items.map((item) => (
            <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {item.product}
                </div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-xs"
                      style={{ backgroundColor: getPaymentColor(item.paymentMethod) }}
                    />
                    {item.paymentMethod}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{item.priceTier}</span>
                </div>
              </div>
              <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(item.price, 2)}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total del Pedido</span>
            <div className="text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {formatCurrency(order.totalAmount, 2)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onFilterByOrder(order.orderNumber);
                onClose();
              }}
              className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Aislar pedido en panel
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
