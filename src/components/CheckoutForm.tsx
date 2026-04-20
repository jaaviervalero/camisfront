"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import {
  calculateOrderTotal,
  getShippingCost,
  defaultIsCommunity,
  COMMUNITY_THRESHOLD,
} from "@/lib/config";
import type { ShippingFormData } from "@/lib/types";

const EMPTY_SHIPPING: ShippingFormData = {
  envio_nombre:  "",
  envio_email:   "",
  envio_telefono: "",
  envio_direccion:        "",
  envio_pais:             "",
  envio_estado_provincia: "",
  envio_ciudad:           "",
  envio_codigo_postal:    "",
};

export default function CheckoutForm() {
  const router   = useRouter();
  const { items, clearCart } = useCartStore();

  const [shipping, setShipping]       = useState<ShippingFormData>(EMPTY_SHIPPING);
  const [isCommunity, setIsCommunity] = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Calcular el default según cuántas prendas hay
  useEffect(() => {
    setIsCommunity(defaultIsCommunity(items.length));
  }, [items.length]);

  const forceIndependent = items.length >= COMMUNITY_THRESHOLD;
  const breakdown        = calculateOrderTotal(items, isCommunity);
  const shippingCost     = getShippingCost(items.length);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setShipping((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, isCommunity, shipping }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al guardar el pedido");
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "No se pudo guardar el pedido");
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ---- Tipo de pedido ---- */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Tipo de pedido</h2>

        {forceIndependent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
            Con <strong>{items.length} prendas</strong> tu pedido es <strong>independiente</strong> — se envía directamente a tu dirección con envío gratuito.
          </div>
        ) : (
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition"
              style={{ borderColor: isCommunity ? '#16a34a' : '#e5e7eb', background: isCommunity ? '#f0fdf4' : 'white' }}>
              <input type="radio" name="tipo" checked={isCommunity} onChange={() => setIsCommunity(true)}
                className="mt-0.5 accent-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Pedido comunitario <span className="text-green-600 text-xs font-normal ml-1">Recomendado</span></p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tu pedido va incluido en el envío grupal. <strong>Envío gratuito.</strong> Te lo entregamos en mano.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition"
              style={{ borderColor: !isCommunity ? '#16a34a' : '#e5e7eb', background: !isCommunity ? '#f0fdf4' : 'white' }}>
              <input type="radio" name="tipo" checked={!isCommunity} onChange={() => setIsCommunity(false)}
                className="mt-0.5 accent-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Pedido independiente</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Se envía a tu dirección. Coste de envío: <strong>{shippingCost}€</strong>
                </p>
              </div>
            </label>
          </div>
        )}
      </section>

      {/* ---- Datos de contacto (siempre) ---- */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Datos de contacto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input type="text" name="envio_nombre" value={shipping.envio_nombre}
              onChange={handleChange} placeholder="Carlos García" required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input type="email" name="envio_email" value={shipping.envio_email}
              onChange={handleChange} placeholder="carlos@ejemplo.es" required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / Móvil</label>
          <input type="tel" name="envio_telefono" value={shipping.envio_telefono}
            onChange={handleChange} placeholder="+34 612 345 678" required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
        </div>
      </section>

      {/* ---- Dirección (sólo pedidos independientes) ---- */}
      {!isCommunity && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Dirección de envío</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input type="text" name="envio_direccion" value={shipping.envio_direccion ?? ""}
              onChange={handleChange} placeholder="Calle Mayor 12, 3º B" required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input type="text" name="envio_ciudad" value={shipping.envio_ciudad ?? ""}
                onChange={handleChange} placeholder="Madrid" required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
              <input type="text" name="envio_estado_provincia" value={shipping.envio_estado_provincia ?? ""}
                onChange={handleChange} placeholder="Madrid" required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código postal</label>
              <input type="text" name="envio_codigo_postal" value={shipping.envio_codigo_postal ?? ""}
                onChange={handleChange} placeholder="28001" required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
              <input type="text" name="envio_pais" value={shipping.envio_pais ?? ""}
                onChange={handleChange} placeholder="España" required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>
        </section>
      )}

      {/* ---- Resumen ---- */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Resumen</h2>
        <ul className="divide-y text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between py-2.5 gap-2">
              <span className="text-gray-700 truncate">
                {item.descripcion || "Camiseta"} · {item.version} · {item.talla}
                {(item.nombre || item.dorsal) && ` · ${[item.nombre, item.dorsal].filter(Boolean).join(" ")}`}
              </span>
              <span className="font-medium shrink-0">{item.precio_unitario}€</span>
            </li>
          ))}
        </ul>
        <div className="border-t pt-3 space-y-1.5 text-sm text-gray-700">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{(breakdown.subtotalPrendas + breakdown.subtotalPersonalizacion).toFixed(2)}€</span>
          </div>
          <div className="flex justify-between">
            <span>Envío</span>
            <span>{breakdown.costoEnvio === 0
              ? <span className="text-green-600 font-medium">Gratis</span>
              : `${breakdown.costoEnvio.toFixed(2)}€`}
            </span>
          </div>
          <div className="flex justify-between font-bold text-base text-gray-900 border-t pt-2">
            <span>Total</span>
            <span className="text-green-700">{breakdown.total.toFixed(2)}€</span>
          </div>
        </div>
        {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
        <button type="submit" disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition text-base">
          {submitting ? "Enviando pedido…" : "Confirmar pedido"}
        </button>
        <p className="text-center text-xs text-gray-400">Te enviaremos un resumen a tu correo</p>
      </section>
    </form>
  );
}
