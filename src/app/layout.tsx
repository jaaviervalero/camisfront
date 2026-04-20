import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Camis — Camisetas de Fútbol',
  description: 'Pedidos de camisetas de fútbol personalizadas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-100 min-h-screen`}>
        <header className="bg-green-700 text-white py-4 px-6 shadow-md">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="text-2xl font-extrabold tracking-tight">
              ⚽ Camis
            </a>
            <span className="text-sm opacity-80">Camisetas de fútbol a tu puerta</span>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="text-center text-xs text-gray-400 py-6">
          © {new Date().getFullYear()} Camis — Todos los derechos reservados
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
