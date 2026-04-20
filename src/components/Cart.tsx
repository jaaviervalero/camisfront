'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { calculateOrderTotal, canJoinCommunityOrder } from '@/lib/config';

export default function Cart() {
  const { items, discountApplied, removeItem } = useCartStore();

  const breakdown = calculateOrderTotal(items, discountApplied, false);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center text-gray-500 text-sm">
        Tu carrito está vacío
      </div>
    );
  }

  const canCommunity = canJoinCommunityOrder(discountApplied, items.length);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Carrito ({items.length})</h2>

      <ul className="divide-y">
        {items.map((item) => (
          <li key={item.id} className="py-3 flex gap-3 items-start">
            <img
              src={item.url_imagen}
              alt={`${item.equipo} ${item.temporada}`}
              className="w-14 h-14 object-contain rounded-lg border bg-gray-50 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-jersey.png'; }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {item.equipo} — {item.temporada}
              </p>
              <p className="text-xs text-gray-500">
                {item.version} · Talla {item.talla}
                {(item.nombre || item.dorsal) && ` · ${item.nombre ?? ''} ${item.dorsal ?? ''}`.trim()}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-green-700">${item.precio_unitario}</p>
              <button
                onClick={() => removeItem(item.id)}
                className="text-xs text-red-400 hover:text-red-600 mt-1"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Resumen de precios */}
      <div className="border-t pt-3 space-y-1 text-sm text-gray-700">
        <div className="flex justify-between">
          <span>Prendas</span>
          <span>${breakdown.subtotalPrendas.toFixed(2)}</span>
        </div>
        {breakdown.subtotalPersonalizacion > 0 && (
          <div className="flex justify-between">
            <span>Personalización</span>
            <span>${breakdown.subtotalPersonalizacion.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Envío</span>
          <span>{breakdown.costoEnvio === 0 ? 'Gratis' : `$${breakdown.costoEnvio.toFixed(2)}`}</span>
        </div>
        <div className="flex justify-between font-bold text-base text-gray-900 border-t pt-2">
          <span>Total</span>
          <span>${breakdown.total.toFixed(2)}</span>
        </div>
      </div>

      {canCommunity && (
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
          Puedes unirte a un <strong>pedido comunitario</strong> al finalizar la compra.
        </p>
      )}

      <Link
        href="/checkout"
        className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition"
      >
        Finalizar compra →
      </Link>
    </div>
  );
}
