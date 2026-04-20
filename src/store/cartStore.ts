'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { CartItem } from '@/lib/types';
import { PRICES, PERSONALIZATION_PRICE } from '@/lib/config';
import type { Version } from '@/lib/config';

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'precio_unitario'>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

function computeUnitPrice(version: Version, nombre?: string, dorsal?: string): number {
  const hasPersonalization = Boolean(nombre?.trim() || dorsal?.trim());
  return PRICES[version] + (hasPersonalization ? PERSONALIZATION_PRICE : 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem(itemData) {
        const precio_unitario = computeUnitPrice(
          itemData.version,
          itemData.nombre,
          itemData.dorsal,
        );
        set((s) => ({ items: [...s.items, { ...itemData, id: uuidv4(), precio_unitario }] }));
      },

      removeItem(id) {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },

      clearCart() {
        set({ items: [] });
      },
    }),
    { name: 'camis-cart' },
  ),
);
