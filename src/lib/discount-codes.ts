// =============================================================
//  CÓDIGOS DE DESCUENTO — editá este archivo para agregar,
//  quitar o cambiar códigos sin tocar ningún otro archivo.
// =============================================================
//
//  Cada entrada tiene:
//    code   → el código que escribe el cliente (mayúsculas)
//    label  → nombre descriptivo (sólo para tus registros)
//    active → true = funciona | false = desactivado sin borrarlo
//
// =============================================================

export interface DiscountCode {
  code: string;
  label: string;
  active: boolean;
}

export const DISCOUNT_CODES: DiscountCode[] = [
  { code: "AMIGOS2024", label: "Grupo amigos temporada 2024", active: false },
  {
    code: "nohaydossintres",
    label: "Promo Instagram mayo 2025",
    active: false,
  },
  // Agregá más códigos aquí ↓
  // { code: 'VERANO25', label: 'Campaña verano 2025', active: true },
];

// ---------------------------------------------------------------
//  No toques lo de abajo — lógica de validación
// ---------------------------------------------------------------

export function isValidDiscountCode(input: string): boolean {
  const normalized = input.trim().toUpperCase();
  return DISCOUNT_CODES.some((d) => d.active && d.code === normalized);
}

export function getDiscountLabel(input: string): string | undefined {
  const normalized = input.trim().toUpperCase();
  return DISCOUNT_CODES.find((d) => d.active && d.code === normalized)?.label;
}
