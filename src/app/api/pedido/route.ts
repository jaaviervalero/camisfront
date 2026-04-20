import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  PRICES,
  PERSONALIZATION_PRICE,
  getShippingCost,
} from "@/lib/config";
import type { Version } from "@/lib/config";
import type { ShippingFormData } from "@/lib/types";

const VALID_VERSIONS = new Set<Version>(["Fan", "Player", "Retro", "Infantil"]);

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin env vars missing");
  return createClient(url, key);
}

export async function POST(req: Request) {
  let body: {
    items: Array<{ version: unknown; talla: unknown; nombre?: unknown; dorsal?: unknown; descripcion?: unknown; url_imagen?: unknown }>;
    isCommunity: unknown;
    shipping: ShippingFormData;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { items, isCommunity, shipping } = body;

  // Validar items
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
  }

  for (const item of items) {
    if (!VALID_VERSIONS.has(item.version as Version)) {
      return NextResponse.json({ error: `Versión inválida: ${item.version}` }, { status: 400 });
    }
    if (typeof item.talla !== "string" || !item.talla) {
      return NextResponse.json({ error: "Talla inválida" }, { status: 400 });
    }
  }

  // Validar datos de contacto
  const { envio_nombre, envio_email, envio_telefono } = shipping ?? {};
  if (!envio_nombre?.trim() || !envio_email?.trim() || !envio_telefono?.trim()) {
    return NextResponse.json({ error: "Datos de contacto incompletos" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(envio_email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const esComunitario = Boolean(isCommunity);

  // Validar dirección para pedidos independientes
  if (!esComunitario) {
    const { envio_direccion, envio_pais, envio_estado_provincia, envio_ciudad, envio_codigo_postal } = shipping;
    if (!envio_direccion?.trim() || !envio_pais?.trim() || !envio_estado_provincia?.trim() || !envio_ciudad?.trim() || !envio_codigo_postal?.trim()) {
      return NextResponse.json({ error: "Dirección de envío incompleta" }, { status: 400 });
    }
  }

  // Recalcular precios server-side — el cliente nunca determina el precio
  const itemsValidados = items.map((item) => {
    const version = item.version as Version;
    const nombre = typeof item.nombre === "string" ? item.nombre.trim() : "";
    const dorsal = typeof item.dorsal === "string" ? item.dorsal.trim() : "";
    const hasPersonalization = Boolean(nombre || dorsal);
    return {
      descripcion: typeof item.descripcion === "string" ? item.descripcion.slice(0, 60) : undefined,
      version,
      talla: String(item.talla),
      nombre: nombre || undefined,
      dorsal: dorsal || undefined,
      url_imagen: typeof item.url_imagen === "string" ? item.url_imagen : "",
      precio_unitario: PRICES[version] + (hasPersonalization ? PERSONALIZATION_PRICE : 0),
    };
  });

  const subtotal = itemsValidados.reduce((s, i) => s + i.precio_unitario, 0);
  const costoEnvio = esComunitario ? 0 : getShippingCost(itemsValidados.length);
  const precio_total = subtotal + costoEnvio;

  const pedido = {
    envio_nombre: envio_nombre.trim(),
    envio_email: envio_email.trim().toLowerCase(),
    envio_telefono: envio_telefono.trim(),
    es_comunitario: esComunitario,
    items_json: itemsValidados,
    precio_total,
    estado: "pendiente",
    ...(!esComunitario && {
      envio_direccion: shipping.envio_direccion!.trim(),
      envio_pais: shipping.envio_pais!.trim(),
      envio_estado_provincia: shipping.envio_estado_provincia!.trim(),
      envio_ciudad: shipping.envio_ciudad!.trim(),
      envio_codigo_postal: shipping.envio_codigo_postal!.trim(),
    }),
  };

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("pedidos").insert(pedido);
    if (error) throw error;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
