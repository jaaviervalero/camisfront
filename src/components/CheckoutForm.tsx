"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { createClient } from "@/lib/supabase";
import {
  calculateOrderTotal,
  canJoinCommunityOrder,
  getShippingCost,
} from "@/lib/config";
import type { PedidoInsert, ShippingFormData } from "@/lib/types";

const EMPTY_SHIPPING: ShippingFormData = {
  envio_nombre: "",
  envio_email: "",
  envio_direccion: "",
  envio_pais: "",
  envio_estado_provincia: "",
  envio_ciudad: "",
  envio_codigo_postal: "",
  envio_telefono: "",
};

export default function CheckoutForm() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();

  const [shipping, setShipping]       = useState<ShippingFormData>(EMPTY_SHIPPING);
  const [isCommunity, setIsCommunity] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState("");

  const showCommunity = canJoinCommunityOrder(items.length);
  const breakdown     = calculateOrderTotal(items, isCommunity && showCommunity);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setShipping((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);
    setSubmitError("");

    const activeCommunity = isCommunity && showCommunity;
    const finalBreakdown  = calculateOrderTotal(items, activeCommunity);

    const pedido: PedidoInsert = {
      ...shipping,
      es_comunitario: activeCommunity,
      items_json: items,
      precio_total: finalBreakdown.total,
      estado: "pendiente",
    };

    const supabase = createClient();
    const { error } = await supabase.from("pedidos").insert(pedido);

    if (error) {
      setSubmitError("No se pudo guardar el pedido: " + error.message);
      setSubmitting(false);
      return;
    }

    clearCart();
    router.push("/pedido-confirmado");
  }

  if (items.length === 0) {
    return (
      <div className="text-center text-gray-500 py-16 space-y-3">
        <p className="text-lg">No hay prendas en el carrito.</p>
        <a href="/" className="text-green-600 hover:underline">← Volver a la tienda</a>
      </div>
    );
  }

  const shippingCost = getShippingCost(items.length);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ---- Datos personales y de envío ---- */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Datos de envío</h2>

        {/* Nombre y email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input type="text" name="envio_nombre" value={shipping.envio_nombre}
              onChange={handleChange} placeholder="Carlos García López" required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input type="email" name="envio_email" value={shipping.envio_email}
              onChange={handleChange} placeholder="carlos@ejemplo.es" required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / Móvil</label>
          <input type="tel" name="envio_telefono" value={shipping.envio_telefono}
            onChange={handleChange} placeholder="+34 612 345 678" required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input type="text" name="envio_direccion" value={shipping.envio_direccion}
            onChange={handleChange} placeholder="Calle Mayor 12, 3º B" required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
        </div>

        {/* Ciudad, provincia, CP, país */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
            <input type="text" name="envio_ciudad" value={shipping.envio_ciudad}
              onChange={handleChange} placeholder="Madrid" required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
            <input type="text" name="envio_estado_provincia" value={shipping.envio_estado_provincia}
              onChange={handleChange} placeholder="Madrid" required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código postal</label>
            <input type="text" name="envio_codigo_postal" value={shipping.envio_codigo_postal}
              onChange={handleChange} placeholder="28001" required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
            <input type="text" name="envio_pais" value={shipping.envio_pais}
              onChange={handleChange} placeholder="España" required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
        </div>
      </section>

      {/* ---- Pedido comunitario (sólo si hay coste de envío) ---- */}
      {showCommunity && (
        <section className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={isCommunity}
              onChange={(e) => setIsCommunity(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Unirme a pedido comunitario</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Tu pedido se agrupa con otros clientes. El envío es <strong>gratuito</strong> independientemente del importe.
              </p>
            </div>
          </label>
        </section>
      )}

      {/* ---- Resumen ---- */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Resumen del pedido</h2>

        <ul className="divide-y text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between py-2.5 gap-2">
              <span className="text-gray-700 min-w-0 truncate">
                {item.descripcion || 'Camiseta'} · {item.version} · {item.talla}
                {(item.nombre || item.dorsal) && ` · ${[item.nombre, item.dorsal].filter(Boolean).join(' ')}`}
              </span>
              <span className="font-medium shrink-0">${item.precio_unitario}</span>
            </li>
          ))}
        </ul>

        <div className="border-t pt-3 space-y-1.5 text-sm text-gray-700">
          <div className="flex justify-between">
            <span>Subtotal prendas</span>
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
            <span>
              {breakdown.costoEnvio === 0
                ? <span className="text-green-600 font-medium">Gratis</span>
                : `$${breakdown.costoEnvio.toFixed(2)}`}
            </span>
          </div>
          {shippingCost > 0 && !isCommunity && (
            <p className="text-xs text-gray-400">
              Añade {4 - items.length} prenda{4 - items.length !== 1 ? 's' : ''} más para envío gratuito
            </p>
          )}
          <div className="flex justify-between font-bold text-base text-gray-900 border-t pt-2 mt-1">
            <span>Total</span>
            <span className="text-green-700">${breakdown.total.toFixed(2)}</span>
          </div>
        </div>

        {submitError && <p className="text-red-600 text-sm">{submitError}</p>}

        <button type="submit" disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition text-base shadow-sm">
          {submitting ? 'Enviando pedido…' : 'Confirmar pedido'}
        </button>

        <p className="text-center text-xs text-gray-400">
          Te enviaremos un resumen a tu correo al confirmar
        </p>
      </section>
    </form>
  );
}
