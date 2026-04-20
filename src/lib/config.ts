// =============================================================
// Configuración central de precios y reglas de negocio
// =============================================================

export type Version = 'Fan' | 'Player' | 'Retro' | 'Infantil';

export const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export const KIDS_SIZES  = ['4', '6', '8', '10', '12', '14', '16'] as const;

export type AdultSize = (typeof ADULT_SIZES)[number];
export type KidsSize  = (typeof KIDS_SIZES)[number];

// -------------------------------------------------------------
// Precios por versión
// -------------------------------------------------------------
export const PRICES: Record<Version, number> = {
  Fan:      8,
  Player:   12,
  Retro:    12,
  Infantil: 10,
};

export const PERSONALIZATION_PRICE = 1;

// -------------------------------------------------------------
// Lógica de pedido comunitario
//
// - < 4 prendas  → comunitario por defecto (el pedido va a casa
//                  del vendedor y se entrega en mano/grupo)
// - >= 4 prendas → independiente por defecto (necesita dirección)
// -------------------------------------------------------------
export const COMMUNITY_THRESHOLD = 4; // prendas

export function defaultIsCommunity(itemCount: number): boolean {
  return itemCount < COMMUNITY_THRESHOLD;
}

// Envío escalonado (sólo aplica a pedidos independientes)
export function getShippingCost(itemCount: number): number {
  if (itemCount >= 4) return 0;
  if (itemCount === 3) return 1;
  if (itemCount === 2) return 3;
  return 4;
}

// -------------------------------------------------------------
// Cálculo total
// -------------------------------------------------------------
export interface PriceBreakdown {
  subtotalPrendas: number;
  subtotalPersonalizacion: number;
  costoEnvio: number;
  total: number;
}

export function calculateOrderTotal(
  items: Array<{ version: Version; nombre?: string; dorsal?: string }>,
  isCommunity: boolean,
): PriceBreakdown {
  let subtotalPrendas         = 0;
  let subtotalPersonalizacion = 0;

  for (const item of items) {
    subtotalPrendas += PRICES[item.version];
    if (item.nombre?.trim() || item.dorsal?.trim()) {
      subtotalPersonalizacion += PERSONALIZATION_PRICE;
    }
  }

  const costoEnvio = isCommunity ? 0 : getShippingCost(items.length);

  return {
    subtotalPrendas,
    subtotalPersonalizacion,
    costoEnvio,
    total: subtotalPrendas + subtotalPersonalizacion + costoEnvio,
  };
}
