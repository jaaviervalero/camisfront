'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { CartItem } from '@/lib/types';
import type { Version } from '@/lib/config';
import { getItemBasePrice, getPersonalizationPrice } from '@/lib/config';

interface CartState {
  items: CartItem[];
  discountApplied: boolean;

  addItem: (item: Omit<CartItem, 'id' | 'precio_unitario'>, withDiscount: boolean) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setDiscount: (applied: boolean) => void;
  recalcPrices: (withDiscount: boolean) => void;
}

function computeUnitPrice(
  version: Version,
  nombre: string | undefined,
  dorsal: string | undefined,
  withDiscount: boolean,
): number {
  const base = getItemBasePrice(version, withDiscount);
  const hasPersonalization = Boolean(nombre?.trim() || dorsal?.trim());
  return base + (hasPersonalization ? getPersonalizationPrice(withDiscount) : 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      discountApplied: false,

      addItem(itemData, withDiscount) {
        const precio_unitario = computeUnitPrice(
          itemData.version,
          itemData.nombre,
          itemData.dorsal,
          withDiscount,
        );
        const newItem: CartItem = { ...itemData, id: uuidv4(), precio_unitario };
        set((s) => ({ items: [...s.items, newItem] }));
      },

      removeItem(id) {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },

      clearCart() {
        set({ items: [], discountApplied: false });
      },

      setDiscount(applied) {
        set({ discountApplied: applied });
        get().recalcPrices(applied);
      },

      recalcPrices(withDiscount) {
        set((s) => ({
          items: s.items.map((item) => ({
            ...item,
            precio_unitario: computeUnitPrice(
              item.version,
              item.nombre,
              item.dorsal,
              withDiscount,
            ),
          })),
        }));
      },
    }),
    { name: 'camis-cart' },
  ),
);
