'use client';

import { useState } from 'react';
import { ADULT_SIZES, KIDS_SIZES, type Version } from '@/lib/config';
import { useCartStore } from '@/store/cartStore';

const VERSIONS: Version[] = ['Fan', 'Player', 'Retro', 'Infantil'];

interface Props {
  onItemAdded?: () => void;
}

export default function SearchForm({ onItemAdded }: Props) {
  const { addItem, discountApplied } = useCartStore();

  const [equipo, setEquipo]       = useState('');
  const [temporada, setTemporada] = useState('');
  const [urlImagen, setUrlImagen] = useState('');
  const [version, setVersion]     = useState<Version>('Fan');
  const [talla, setTalla]         = useState('M');
  const [nombre, setNombre]       = useState('');
  const [dorsal, setDorsal]       = useState('');
  const [step, setStep]           = useState<'info' | 'configure'>('info');

  const sizes = version === 'Infantil' ? [...KIDS_SIZES] : [...ADULT_SIZES];

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!equipo.trim() || !temporada.trim()) return;
    setStep('configure');
  }

  function handleAddToCart() {
    addItem(
      {
        equipo:     equipo.trim(),
        temporada:  temporada.trim(),
        version,
        talla,
        nombre:     nombre.trim() || undefined,
        dorsal:     dorsal.trim() || undefined,
        url_imagen: urlImagen.trim(),
      },
      discountApplied,
    );
    setEquipo(''); setTemporada(''); setUrlImagen('');
    setNombre(''); setDorsal('');
    setVersion('Fan'); setTalla('M');
    setStep('info');
    onItemAdded?.();
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">

      {/* ---- PASO 1: Datos de la camiseta ---- */}
      {step === 'info' && (
        <form onSubmit={handleNext} className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Agregar camiseta</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipo</label>
              <input
                type="text"
                value={equipo}
                onChange={(e) => setEquipo(e.target.value)}
                placeholder="Ej: Real Madrid"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporada</label>
              <input
                type="text"
                value={temporada}
                onChange={(e) => setTemporada(e.target.value)}
                placeholder="Ej: 2024/25"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL de imagen <span className="text-gray-400 font-normal">(opcional — pega el link de la foto)</span>
            </label>
            <input
              type="url"
              value={urlImagen}
              onChange={(e) => setUrlImagen(e.target.value)}
              placeholder="https://..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {urlImagen.trim() && (
            <img
              src={urlImagen}
              alt="Vista previa"
              className="h-32 object-contain rounded-xl border bg-gray-50 mx-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Configurar prenda →
          </button>
        </form>
      )}

      {/* ---- PASO 2: Configurar versión, talla y personalización ---- */}
      {step === 'configure' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Configurar camiseta</h2>
            <button onClick={() => setStep('info')} className="text-sm text-gray-500 hover:text-gray-700 underline">
              ← Volver
            </button>
          </div>

          <div className="flex gap-4 items-start">
            {urlImagen.trim() && (
              <img
                src={urlImagen}
                alt="Camiseta"
                className="w-20 h-20 object-contain rounded-xl border bg-gray-50 shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div>
              <p className="font-semibold text-gray-800">{equipo}</p>
              <p className="text-gray-500 text-sm">{temporada}</p>
            </div>
          </div>

          {/* Versión */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Versión</label>
            <div className="flex flex-wrap gap-2">
              {VERSIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setVersion(v); setTalla(v === 'Infantil' ? '8' : 'M'); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                    version === v
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Talla */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Talla</label>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTalla(s)}
                  className={`w-12 py-1.5 rounded-lg text-sm font-medium border transition ${
                    talla === s
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Personalización */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={20}
                placeholder="Ej: VINICIUS"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dorsal <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={dorsal}
                onChange={(e) => setDorsal(e.target.value.replace(/\D/g, '').slice(0, 2))}
                maxLength={2}
                placeholder="Ej: 7"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>
          {(nombre.trim() || dorsal.trim()) && (
            <p className="text-xs text-amber-600">
              +${discountApplied ? 1 : 2} por personalización
            </p>
          )}

          <button
            onClick={handleAddToCart}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition"
          >
            Agregar al carrito
          </button>
        </div>
      )}
    </div>
  );
}
