import Link from 'next/link';

export const metadata = { title: 'Pedido confirmado — Camis' };

export default function PedidoConfirmado() {
  return (
    <div className="max-w-md mx-auto text-center py-20 space-y-6">
      <div className="text-7xl">✅</div>
      <h1 className="text-3xl font-extrabold text-gray-900">¡Pedido recibido!</h1>
      <p className="text-gray-600 text-lg">
        Nos pondremos en contacto contigo para coordinar el pago y el envío.
      </p>
      <Link
        href="/"
        className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl transition"
      >
        Hacer otro pedido
      </Link>
    </div>
  );
}
