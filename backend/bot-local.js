/**
 * bot-local.js
 * ============
 * Backend local de automatización para el sistema CAMIS.
 *
 * - Escucha eventos INSERT en tiempo real de la tabla `pedidos` de Supabase.
 * - Formatea un resumen legible del pedido.
 * - Envía el resumen al chat de Telegram configurado.
 *
 * Uso:
 *   node bot-local.js
 *
 * Variables de entorno requeridas (ver .env.example):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

'use strict';

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const TelegramBot      = require('node-telegram-bot-api');

// ---------------------------------------------------------------
// Validación de variables de entorno
// ---------------------------------------------------------------
const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
];

for (const v of REQUIRED_VARS) {
  if (!process.env[v]) {
    console.error(`[ERROR] Falta la variable de entorno: ${v}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------

// Usamos la Service Role Key para que el bot pueda leer pedidos
// sin restricciones de RLS.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// polling: true → no requiere webhook ni servidor HTTPS
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ---------------------------------------------------------------
// Formateador de mensajes
// ---------------------------------------------------------------

/**
 * Construye un mensaje de texto Markdown-compatible con el resumen
 * completo del pedido para enviarlo por Telegram (y futuros canales).
 *
 * @param {object} pedido - Fila completa de la tabla `pedidos`
 * @returns {string} Mensaje formateado listo para enviar
 */
function formatPedidoMessage(pedido) {
  const {
    id,
    created_at,
    usa_codigo_descuento,
    es_comunitario,
    envio_nombre,
    envio_direccion,
    envio_ciudad,
    envio_estado_provincia,
    envio_pais,
    envio_codigo_postal,
    envio_telefono,
    items_json,
    precio_total,
    estado,
  } = pedido;

  const fecha = new Date(created_at).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  // Bloque de ítems
  const itemsText = (items_json ?? [])
    .map((item, idx) => {
      const personalizacion =
        item.nombre || item.dorsal
          ? `   ✏️  ${[item.nombre, item.dorsal].filter(Boolean).join(' / ')}`
          : '';
      return (
        `  ${idx + 1}. ${item.equipo} — ${item.temporada}\n` +
        `     Versión: ${item.version} | Talla: ${item.talla}\n` +
        `     Precio unitario: $${item.precio_unitario}` +
        (personalizacion ? `\n${personalizacion}` : '')
      );
    })
    .join('\n\n');

  const flagDescuento  = usa_codigo_descuento ? '✅ Sí (AMIGOS2024)' : '❌ No';
  const flagComunitario = es_comunitario       ? '✅ Sí'              : '❌ No';

  return (
    `🆕 *NUEVO PEDIDO* — \`${id.slice(0, 8)}...\`\n` +
    `📅 ${fecha} | Estado: *${estado}*\n` +
    `\n` +
    `👤 *Cliente*\n` +
    `  Nombre:    ${envio_nombre}\n` +
    `  Teléfono:  ${envio_telefono}\n` +
    `\n` +
    `📦 *Envío*\n` +
    `  ${envio_direccion}\n` +
    `  ${envio_ciudad}, ${envio_estado_provincia} ${envio_codigo_postal}\n` +
    `  ${envio_pais}\n` +
    `\n` +
    `🎽 *Prendas (${(items_json ?? []).length})*\n` +
    `${itemsText}\n` +
    `\n` +
    `💸 *Precio total: $${precio_total.toFixed(2)}*\n` +
    `🏷️  Código descuento: ${flagDescuento}\n` +
    `🤝 Pedido comunitario: ${flagComunitario}\n`
  );
}

// ---------------------------------------------------------------
// Manejador del evento INSERT
// ---------------------------------------------------------------

/**
 * Se ejecuta cada vez que se inserta un nuevo pedido en Supabase.
 * Aquí se centraliza toda la lógica de notificación.
 *
 * @param {object} payload - Payload del evento Realtime de Supabase
 */
async function handleNewPedido(payload) {
  const pedido = payload.new;
  console.log(`[INFO] Nuevo pedido recibido: ${pedido.id}`);

  const mensaje = formatPedidoMessage(pedido);

  // ------------------------------------------------------------------
  // NOTIFICACIÓN 1: Telegram (operativo)
  // ------------------------------------------------------------------
  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, mensaje, { parse_mode: 'Markdown' });
    console.log(`[INFO] Mensaje Telegram enviado para pedido ${pedido.id}`);
  } catch (err) {
    console.error('[ERROR] Telegram:', err.message);
  }

  // ------------------------------------------------------------------
  // NOTIFICACIÓN 2 (PROVEEDOR): Inyectar WhatsApp Web aquí
  // ------------------------------------------------------------------
  //
  // Para notificar al proveedor vía WhatsApp, instala la librería:
  //   npm install whatsapp-web.js qrcode-terminal
  //
  // Luego sigue estos pasos:
  //
  //   1. Inicializa el cliente al arrancar el script (fuera de este handler):
  //
  //      const { Client, LocalAuth } = require('whatsapp-web.js');
  //      const qrcode = require('qrcode-terminal');
  //
  //      const waClient = new Client({ authStrategy: new LocalAuth() });
  //      waClient.on('qr', (qr) => qrcode.generate(qr, { small: true }));
  //      waClient.on('ready', () => console.log('[WA] WhatsApp listo'));
  //      waClient.initialize();
  //
  //   2. Dentro de esta función, después del bloque de Telegram,
  //      envía el mensaje al número del proveedor:
  //
  //      const PROVEEDOR_WA = process.env.PROVEEDOR_WHATSAPP; // "5491123456789@c.us"
  //      try {
  //        await waClient.sendMessage(PROVEEDOR_WA, mensaje);
  //        console.log(`[INFO] WhatsApp enviado al proveedor para pedido ${pedido.id}`);
  //      } catch (err) {
  //        console.error('[ERROR] WhatsApp:', err.message);
  //      }
  //
  // ------------------------------------------------------------------
}

// ---------------------------------------------------------------
// Suscripción Realtime
// ---------------------------------------------------------------

function startRealtime() {
  console.log('[INFO] Conectando a Supabase Realtime…');

  supabase
    .channel('pedidos-nuevos')
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'pedidos',
      },
      handleNewPedido,
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[INFO] ✅ Suscrito a pedidos en tiempo real. Esperando pedidos…');
      } else {
        console.log(`[INFO] Estado de suscripción: ${status}`);
      }
    });
}

// ---------------------------------------------------------------
// Señales del proceso
// ---------------------------------------------------------------

process.on('SIGINT', () => {
  console.log('\n[INFO] Cerrando bot…');
  supabase.removeAllChannels().then(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  console.error('[ERROR] UnhandledRejection:', reason);
});

// ---------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------

startRealtime();
