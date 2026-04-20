'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { supabase } from '@/lib/supabase';
import {
  calculateOrderTotal,
  canJoinCommunityOrder,
  DISCOUNT_CODE,
} from '@/lib/config';
import type { PedidoInsert, ShippingFormData } from '@/lib/types';

const EMPTY_SHIPPING: ShippingFormData = {
  envio_nombre: '',
  envio_direccion: '',
  envio_pais: '',
  envio_estado_provincia: '',
  envio_ciudad: '',
  envio_codigo_postal: '',
  envio_telefono: '',
};

export default function CheckoutForm() {
  const router = useRouter();
  const { items, discountApplied, setDiscount, clearCart } = useCartStore();

  const [shipping, setShipping]       = useState<ShippingFormData>(EMPTY_SHIPPING);
  const [codeInput, setCodeInput]     = useState('');
  const [codeError, setCodeError]     = useState('');
  const [isCommunity, setIsCommunity] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  const canCommunity   = canJoinCommunityOrder(discountApplied, items.length);
  const breakdown      = calculateOrderTotal(items, discountApplied, isCommunity && canCommunity);

  function handleShippingChange(e: React.ChangeEvent<HTMLInputElement>) {
    setShipping((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function applyDiscount() {
    setCodeError('');
    if (codeInput.trim().toUpperCase() === DISCOUNT_CODE) {
      setDiscount(true);
      setIsCommunity(false);
    } else {
      setCodeError('Código inválido');
      setDiscount(false);
    }
  }

  function removeDiscount() {
    setDiscount(false);
    setCodeInput('');
    setIsCommunity(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);
    setSubmitError('');

    const activeCommunity = isCommunity && canCommunity;
    const finalBreakdown  = calculateOrderTotal(items, discountApplied, activeCommunity);

    const pedido: PedidoInsert = {
      ...shipping,
      usa_codigo_descuento: discountApplied,
      es_comunitario: activeCommunity,
      items_json: items,
      precio_total: finalBreakdown.total,
      estado: 'pendiente',
    };

    const { error } = await supabase.from('pedidos').insert(pedido);

    if (error) {
      setSubmitError('No se pudo guardar el pedido: ' + error.message);
      setSubmitting(false);
      return;
    }

    clearCart();
    router.push('/pedido-confirmado');
  }

  if (items.length === 0) {
    return (
      <div className="text-center text-gray-500 py-16">
        <p>No hay ítems en el carrito.</p>
        <a href="/" className="text-green-600 hover:underline mt-2 inline-block">
          Volver al inicio
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ---- Datos de envío ---- */}
      <section className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-800">Datos de envío</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { name: 'envio_nombre',          label: 'Nombre completo',   placeholder: 'Juan García' },
            { name: 'envio_telefono',        label: 'Teléfono / Celular', placeholder: '+54 9 11 1234 5678' },
            { name: 'envio_pais',            label: 'País',               placeholder: 'Argentina' },
            { name: 'envio_estado_provincia',label: 'Estado / Provincia', placeholder: 'Buenos Aires' },
            { name: 'envio_ciudad',          label: 'Ciudad',             placeholder: 'La Plata' },
            { name: 'envio_codigo_postal',   label: 'Código postal',      placeholder: '1900' },
          ].map(({ name, label, placeholder }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="text"
                name={name}
                value={(shipping as any)[name]}
                onChange={handleShippingChange}
                placeholder={placeholder}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            type="text"
            name="envio_direccion"
            value={shipping.envio_direccion}
            onChange={handleShippingChange}
            placeholder="Calle Falsa 123, Piso 4 Dto B"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
      </section>

      {/* ---- Código de descuento ---- */}
      <section className="bg-white rounded-2xl shadow-lg p-6 space-y-3">
        <h2 className="text-lg font-bold text-gray-800">Código de descuento</h2>
        {discountApplied ? (
          <div className="flex items-center gap-3">
            <span className="bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">
              ✓ {DISCOUNT_CODE} aplicado
            </span>
            <button type="button" onClick={removeDiscount} className="text-sm text-red-500 hover:underline">
              Quitar
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="AMIGOS2024"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none uppercase"
            />
            <button
              type="button"
              onClick={applyDiscount}
              className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium px-4 rounded-lg transition"
            >
              Aplicar
            </button>
          </div>
        )}
        {codeError && <p className="text-red-600 text-sm">{codeError}</p>}
      </section>

      {/* ---- Pedido comunitario (sólo visible si aplica) ---- */}
      {canCommunity && (
        <section className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isCommunity}
              onChange={(e) => setIsCommunity(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-600"
            />
            <div>
              <p className="text-sm font-semibold text-blue-800">Unirse a pedido comunitario</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Tu pedido se agrupa con otros clientes. El envío es <strong>gratuito</strong> independientemente del monto.
              </p>
            </div>
          </label>
        </section>
      )}

      {/* ---- Resumen ---- */}
      <section className="bg-white rounded-2xl shadow-lg p-6 space-y-3">
        <h2 className="text-lg font-bold text-gray-800">Resumen del pedido</h2>
        <ul className="divide-y text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between py-2">
              <span className="text-gray-700">
                {item.equipo} {item.temporada} · {item.version} · {item.talla}
                {(item.nombre || item.dorsal) && ` (${[item.nombre, item.dorsal].filter(Boolean).join(' ')})`}
              </span>
              <span className="font-medium">${item.precio_unitario}</span>
            </li>
          ))}
        </ul>
        <div className="border-t pt-3 space-y-1 text-sm text-gray-700">
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
            <span>{breakdown.costoEnvio === 0 ? <span className="text-green-600 font-medium">Gratis</span> : `$${breakdown.costoEnvio.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2">
            <span>Total</span>
            <span>${breakdown.total.toFixed(2)}</span>
          </div>
        </div>
        {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-base"
        >
          {submitting ? 'Enviando pedido…' : 'Confirmar pedido'}
        </button>
      </section>
    </form>
  );
}
