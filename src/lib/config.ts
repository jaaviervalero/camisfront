// =============================================================
// Configuración central de precios y reglas de negocio
// =============================================================

export const DISCOUNT_CODE = 'AMIGOS2024';

export const COMMUNITY_ORDER_MAX_ITEMS = 4;

export type Version = 'Fan' | 'Player' | 'Retro' | 'Infantil';

export const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export const KIDS_SIZES  = ['4', '6', '8', '10', '12', '14', '16'] as const;

export type AdultSize = (typeof ADULT_SIZES)[number];
export type KidsSize  = (typeof KIDS_SIZES)[number];

// -------------------------------------------------------------
// Tabla de precios
// -------------------------------------------------------------
export const PRICES = {
  standard: {
    Fan:      15,
    Player:   20,
    Retro:    20,
    Infantil: 18,
  },
  discount: {
    Fan:      8,
    Player:   12,
    Retro:    12,
    Infantil: 10,
  },
  personalization: {
    standard: 2,
    discount: 1,
  },
  shipping: {
    standard:      3,
    discount:      0,
    freeThreshold: 50, // gratis si subtotal de prendas >= $50
  },
} as const;

// -------------------------------------------------------------
// Funciones de cálculo
// -------------------------------------------------------------

export function getItemBasePrice(version: Version, withDiscount: boolean): number {
  return withDiscount ? PRICES.discount[version] : PRICES.standard[version];
}

export function getPersonalizationPrice(withDiscount: boolean): number {
  return withDiscount
    ? PRICES.personalization.discount
    : PRICES.personalization.standard;
}

export interface PriceBreakdown {
  subtotalPrendas: number;
  subtotalPersonalizacion: number;
  costoEnvio: number;
  total: number;
}

export function calculateOrderTotal(
  items: Array<{
    version: Version;
    nombre?: string;
    dorsal?: string;
  }>,
  withDiscount: boolean,
  isCommunity: boolean,
): PriceBreakdown {
  let subtotalPrendas = 0;
  let subtotalPersonalizacion = 0;

  for (const item of items) {
    subtotalPrendas += getItemBasePrice(item.version, withDiscount);
    const hasPersonalization = Boolean(item.nombre?.trim() || item.dorsal?.trim());
    if (hasPersonalization) {
      subtotalPersonalizacion += getPersonalizationPrice(withDiscount);
    }
  }

  let costoEnvio: number;
  if (withDiscount || isCommunity) {
    costoEnvio = 0;
  } else if (subtotalPrendas >= PRICES.shipping.freeThreshold) {
    costoEnvio = 0;
  } else {
    costoEnvio = PRICES.shipping.standard;
  }

  return {
    subtotalPrendas,
    subtotalPersonalizacion,
    costoEnvio,
    total: subtotalPrendas + subtotalPersonalizacion + costoEnvio,
  };
}

// Un código de descuento habilita pedido comunitario sólo si items <= 4
export function canJoinCommunityOrder(
  withDiscount: boolean,
  itemCount: number,
): boolean {
  return withDiscount && itemCount <= COMMUNITY_ORDER_MAX_ITEMS;
}
