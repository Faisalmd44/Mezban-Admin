import React from 'react';
import { Order, RestaurantConfig } from '../types';

interface ThermalReceiptProps {
  order: Order | null;
  config: RestaurantConfig;
  onClose?: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ order, config, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-black p-6 rounded-lg max-w-sm w-full shadow-2xl font-mono text-xs leading-tight">
        {/* Print / Close Actions Header */}
        <div className="no-print flex items-center justify-between pb-4 mb-4 border-b border-zinc-200">
          <span className="font-sans font-bold text-zinc-800 text-sm">Receipt Preview (80mm)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-sans font-bold rounded text-xs transition"
            >
              🖨️ Print Receipt
            </button>
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-sans font-medium rounded text-xs"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Thermal Printable Content Container */}
        <div id="thermal-receipt" className="space-y-3 bg-white p-2">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-base font-extrabold uppercase tracking-wider">{config.name}</h2>
            <p className="text-[10px] text-zinc-600">{config.tagline}</p>
            <p className="text-[10px] text-zinc-600">{config.address}</p>
            <p className="text-[10px] text-zinc-600">Ph: {config.phone}</p>
            {config.gst_no && <p className="text-[10px] text-zinc-600">GSTIN: {config.gst_no}</p>}
          </div>

          <div className="border-b border-dashed border-zinc-400 my-2" />

          {/* Order Details */}
          <div className="flex justify-between text-[11px]">
            <div>
              <p><strong>Order #:</strong> {order.order_no}</p>
              <p><strong>Type:</strong> {(order.order_type || 'dine_in').toUpperCase()}</p>
              {order.table_no && <p><strong>Table:</strong> {order.table_no}</p>}
            </div>
            <div className="text-right">
              <p>{new Date(order.created_at).toLocaleDateString()}</p>
              <p>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <div className="text-[11px]">
            <p><strong>Customer:</strong> {order.user_name}</p>
            <p><strong>Phone:</strong> {order.user_phone}</p>
            {order.address && order.order_type !== 'dine_in' && (
              <p><strong>Address:</strong> {order.address}</p>
            )}
          </div>

          <div className="border-b border-dashed border-zinc-400 my-2" />

          {/* Items Table */}
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-zinc-300">
                <th className="pb-1">Item</th>
                <th className="pb-1 text-center">Qty</th>
                <th className="pb-1 text-right">Price</th>
                <th className="pb-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 pr-1 font-sans">
                    <span className="font-mono font-medium">{item.name}</span>
                    {item.notes && <div className="text-[9px] text-zinc-500 italic">Note: {item.notes}</div>}
                  </td>
                  <td className="py-1 text-center font-bold">{item.quantity}</td>
                  <td className="py-1 text-right">{config.currency}{item.price}</td>
                  <td className="py-1 text-right font-semibold">{config.currency}{item.price * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-b border-dashed border-zinc-400 my-2" />

          {/* Summary Breakdown */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{config.currency}{order.subtotal || order.total}</span>
            </div>
            {Boolean(order.discount) && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span>-{config.currency}{order.discount}</span>
              </div>
            )}
            {Boolean(order.tax) && (
              <div className="flex justify-between text-zinc-600">
                <span>Tax ({config.tax_percent}%):</span>
                <span>+{config.currency}{order.tax}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold pt-1 border-t border-zinc-800">
              <span>GRAND TOTAL:</span>
              <span>{config.currency}{order.total}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-zinc-400 my-2" />

          {/* Payment & Footer */}
          <div className="text-center space-y-1 text-[10px] text-zinc-600">
            <p className="font-semibold text-zinc-800 uppercase">
              PAYMENT METHOD: {order.payment_method.toUpperCase()} ({order.payment_status.toUpperCase()})
            </p>
            <p className="pt-2">Thank you for dining with us!</p>
            <p>Please visit again 🌿</p>
          </div>
        </div>
      </div>
    </div>
  );
};
