import CheckoutForm from '@/components/CheckoutForm';
import Link from 'next/link';

export const metadata = { title: 'Checkout — Camis' };

export default function CheckoutPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Seguir comprando</Link>
        <h1 className="text-2xl font-extrabold text-gray-900">Finalizar compra</h1>
      </div>
      <CheckoutForm />
    </div>
  );
}
