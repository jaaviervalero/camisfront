'use client';

import { useState, useRef } from 'react';
import { ADULT_SIZES, KIDS_SIZES, type Version } from '@/lib/config';
import { useCartStore } from '@/store/cartStore';
import { createClient } from '@/lib/supabase';

const VERSIONS: Version[] = ['Fan', 'Player', 'Retro', 'Infantil'];
const MAX_FILE_MB = 8;

interface Props {
  onItemAdded?: () => void;
}

export default function SearchForm({ onItemAdded }: Props) {
  const { addItem, discountApplied } = useCartStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paso 1 — foto
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string>('');
  const [descripcion, setDesc]    = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Paso 2 — configuración
  const [version, setVersion] = useState<Version>('Fan');
  const [talla, setTalla]     = useState('M');
  const [nombre, setNombre]   = useState('');
  const [dorsal, setDorsal]   = useState('');

  const [step, setStep] = useState<'foto' | 'configure'>('foto');

  const sizes = version === 'Infantil' ? [...KIDS_SIZES] : [...ADULT_SIZES];

  function handleFileChange(f: File | null) {
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadError(`El archivo supera los ${MAX_FILE_MB} MB`);
      return;
    }
    if (!f.type.startsWith('image/')) {
      setUploadError('Solo se aceptan imágenes');
      return;
    }
    setUploadError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFileChange(e.dataTransfer.files[0] ?? null);
  }

  async function handleNext() {
    if (!file) return;
    setUploading(true);
    setUploadError('');

    try {
      const supabase  = createClient();
      const ext       = file.name.split('.').pop() ?? 'jpg';
      const path      = `jerseys/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('jersey-images')
        .upload(path, file, { upsert: false, contentType: file.type });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data } = supabase.storage.from('jersey-images').getPublicUrl(path);
      addItem(
        {
          descripcion: descripcion.trim() || undefined,
          version,
          talla,
          nombre:    nombre.trim() || undefined,
          dorsal:    dorsal.trim() || undefined,
          url_imagen: data.publicUrl,
        },
        discountApplied,
      );

      // Reset
      setFile(null);
      setPreview('');
      setDesc('');
      setNombre('');
      setDorsal('');
      setVersion('Fan');
      setTalla('M');
      setStep('foto');
      onItemAdded?.();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">

      {/* ---- PASO 1: Subir foto ---- */}
      {step === 'foto' && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-gray-800">Subir foto de la camiseta</h2>

          {/* Zona de drop */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition
              ${preview ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50'}
            `}
            style={{ minHeight: 220 }}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Vista previa"
                  className="max-h-48 max-w-full object-contain rounded-xl"
                />
                <span className="text-xs text-gray-500">{file?.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(''); }}
                  className="absolute top-2 right-2 bg-white border rounded-full w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-500 shadow"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <div className="text-5xl text-gray-300">📷</div>
                <p className="text-sm font-medium text-gray-600">
                  Arrastrá una foto o hacé click para elegir
                </p>
                <p className="text-xs text-gray-400">JPG, PNG, WEBP — máx. {MAX_FILE_MB} MB</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />

          {/* Descripción opcional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción <span className="text-gray-400 font-normal">(opcional — ej: Real Madrid 2024/25)</span>
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={60}
              placeholder="Ej: Barcelona Local 2025"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {uploadError && <p className="text-red-600 text-sm">{uploadError}</p>}

          <button
            type="button"
            onClick={() => { if (file) setStep('configure'); }}
            disabled={!file}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold py-2 rounded-lg transition"
          >
            Configurar prenda →
          </button>
        </div>
      )}

      {/* ---- PASO 2: Configurar versión, talla y personalización ---- */}
      {step === 'configure' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Configurar camiseta</h2>
            <button
              onClick={() => setStep('foto')}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              ← Cambiar foto
            </button>
          </div>

          {preview && (
            <div className="flex gap-4 items-center">
              <img
                src={preview}
                alt="Camiseta"
                className="w-20 h-20 object-contain rounded-xl border bg-gray-50 shrink-0"
              />
              {descripcion && <p className="text-sm font-medium text-gray-700">{descripcion}</p>}
            </div>
          )}

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

          {uploadError && <p className="text-red-600 text-sm">{uploadError}</p>}

          <button
            type="button"
            onClick={handleNext}
            disabled={uploading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
          >
            {uploading ? 'Subiendo imagen…' : 'Agregar al carrito'}
          </button>
        </div>
      )}
    </div>
  );
}
