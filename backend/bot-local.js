'use strict';

require('dotenv').config();

const { createClient }                    = require('@supabase/supabase-js');
const TelegramBot                         = require('node-telegram-bot-api');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode                              = require('qrcode-terminal');

// ---------------------------------------------------------------
// Validación de entorno
// ---------------------------------------------------------------
const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'PROVEEDOR_WHATSAPP',
];
for (const v of REQUIRED_VARS) {
  if (!process.env[v]) {
    console.error(`[ERROR] Falta la variable de entorno: ${v}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ---------------------------------------------------------------
// Telegram — polling habilitado para recibir callbacks de botones
// ---------------------------------------------------------------
const bot     = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Mapa en memoria: pedido_id → datos del pedido (para el callback)
const pendingOrders = new Map();

// ---------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------
let waReady = false;

const waClient = new Client({
  authStrategy: new LocalAuth({ dataPath: '/app/.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
});

waClient.on('qr', (qr) => {
  console.log('[WA] Escaneá este QR con tu WhatsApp:');
  qrcode.generate(qr, { small: true });
});
waClient.on('ready',       () => { waReady = true;  console.log('[WA] ✅ Conectado'); });
waClient.on('disconnected', (r) => { waReady = false; console.warn('[WA] Desconectado:', r); });
waClient.initialize();

// ---------------------------------------------------------------
// Formatear mensaje Telegram
// ---------------------------------------------------------------
function formatTelegramMessage(pedido) {
  const {
    id, created_at, es_comunitario,
    envio_nombre, envio_email, envio_telefono,
    envio_direccion, envio_ciudad, envio_estado_provincia,
    envio_pais, envio_codigo_postal,
    items_json, precio_total, estado,
  } = pedido;

  const fecha = new Date(created_at).toLocaleString('es-ES', {
    dateStyle: 'short', timeStyle: 'short',
  });

  const itemsText = (items_json ?? [])
    .map((item, idx) => {
      const pers = (item.nombre || item.dorsal)
        ? `\n   ✏️  ${[item.nombre, item.dorsal].filter(Boolean).join(' / ')}`
        : '';
      return (
        `  ${idx + 1}. ${item.descripcion || 'Camiseta'}\n` +
        `     ${item.version} | Talla ${item.talla} | $${item.precio_unitario}${pers}`
      );
    })
    .join('\n\n');

  return (
    `🆕 *NUEVO PEDIDO* — \`${id.slice(0, 8)}...\`\n` +
    `📅 ${fecha} | Estado: *${estado}*\n\n` +
    `👤 *Cliente*\n  ${envio_nombre}\n  📧 ${envio_email}\n  📞 ${envio_telefono}\n\n` +
    `📦 *Envío*\n  ${envio_direccion}\n  ${envio_ciudad}, ${envio_estado_provincia} ${envio_codigo_postal}\n  ${envio_pais}\n\n` +
    `🎽 *Prendas (${(items_json ?? []).length})*\n${itemsText}\n\n` +
    `💸 *Total: $${Number(precio_total).toFixed(2)}*\n` +
    `🤝 Pedido comunitario: ${es_comunitario ? '✅ Sí' : '❌ No'}\n`
  );
}

// ---------------------------------------------------------------
// Enviar prendas al proveedor por WhatsApp
// ---------------------------------------------------------------
async function enviarAlProveedor(pedido) {
  if (!waReady) {
    await bot.sendMessage(CHAT_ID, `⚠️ WhatsApp no conectado. No se pudo enviar el pedido \`${pedido.id.slice(0, 8)}\`.`, { parse_mode: 'Markdown' });
    return false;
  }

  const numero  = process.env.PROVEEDOR_WHATSAPP;
  const items   = pedido.items_json ?? [];

  const cabecera =
    `📦 *Pedido ${pedido.id.slice(0, 8)}*\n` +
    `Cliente: ${pedido.envio_nombre} | ${pedido.envio_telefono}\n` +
    `Dirección: ${pedido.envio_direccion}, ${pedido.envio_ciudad} ${pedido.envio_codigo_postal}, ${pedido.envio_pais}`;

  try {
    await waClient.sendMessage(numero, cabecera);
  } catch (err) {
    console.error('[WA] Error cabecera:', err.message);
  }

  for (const item of items) {
    const ficha =
      `version: ${item.version}\n` +
      `size: ${item.talla}\n` +
      `name: ${item.nombre || '-'}\n` +
      `number: ${item.dorsal || '-'}`;

    try {
      if (item.url_imagen) {
        const media = await MessageMedia.fromUrl(item.url_imagen, { unsafeMime: true });
        await waClient.sendMessage(numero, media, { caption: ficha });
      } else {
        await waClient.sendMessage(numero, ficha);
      }
      console.log(`[WA] Prenda enviada: ${item.descripcion || item.version}`);
    } catch (err) {
      console.error('[WA] Error prenda:', err.message);
    }
  }

  return true;
}

// ---------------------------------------------------------------
// Handler botón "Enviar al proveedor"
// ---------------------------------------------------------------
bot.on('callback_query', async (query) => {
  const { id: queryId, message, data } = query;

  if (!data?.startsWith('send_supplier:')) return;

  const pedidoId = data.replace('send_supplier:', '');
  const pedido   = pendingOrders.get(pedidoId);

  // Responder al callback para quitar el "reloj" en Telegram
  await bot.answerCallbackQuery(queryId, { text: 'Enviando al proveedor…' });

  if (!pedido) {
    await bot.editMessageText(
      message.text + '\n\n⚠️ _Pedido no encontrado en memoria (reinicio del bot)_',
      { chat_id: message.chat.id, message_id: message.message_id, parse_mode: 'Markdown' },
    );
    return;
  }

  const ok = await enviarAlProveedor(pedido);

  // Editar el mensaje original para confirmar el envío
  await bot.editMessageText(
    formatTelegramMessage(pedido) + (ok
      ? '\n✅ *Enviado al proveedor por WhatsApp*'
      : '\n❌ *Error al enviar por WhatsApp*'),
    {
      chat_id:    message.chat.id,
      message_id: message.message_id,
      parse_mode: 'Markdown',
    },
  );

  pendingOrders.delete(pedidoId);
});

// ---------------------------------------------------------------
// Polling Supabase
// ---------------------------------------------------------------
const POLL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? '15000', 10);
let running   = false;

async function poll() {
  if (running) return;
  running = true;
  try {
    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('notificado', false)
      .order('created_at', { ascending: true });

    if (error) { console.error('[ERROR] Supabase:', error.message); return; }
    if (!pedidos?.length) return;

    console.log(`[INFO] ${pedidos.length} pedido(s) nuevos`);

    for (const pedido of pedidos) {
      // Guardar en memoria para el callback
      pendingOrders.set(pedido.id, pedido);

      // Enviar a Telegram con botón de aprobación
      try {
        await bot.sendMessage(
          CHAT_ID,
          formatTelegramMessage(pedido),
          {
            parse_mode:   'Markdown',
            reply_markup: {
              inline_keyboard: [[
                {
                  text:          '📲 Enviar al proveedor',
                  callback_data: `send_supplier:${pedido.id}`,
                },
              ]],
            },
          },
        );
        console.log(`[OK] Telegram → pedido ${pedido.id}`);
      } catch (err) {
        console.error(`[ERROR] Telegram:`, err.message);
        pendingOrders.delete(pedido.id);
        continue;
      }

      // Marcar notificado en Supabase
      const { error: upErr } = await supabase
        .from('pedidos').update({ notificado: true }).eq('id', pedido.id);
      if (upErr) console.error('[ERROR] Update notificado:', upErr.message);
    }
  } catch (err) {
    console.error('[ERROR] Poll:', err.message);
  } finally {
    running = false;
  }
}

// ---------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------
console.log(`[INFO] Bot iniciado — polling cada ${POLL_MS / 1000}s`);
poll();
const interval = setInterval(poll, POLL_MS);

process.on('SIGTERM', () => {
  clearInterval(interval);
  waClient.destroy().finally(() => process.exit(0));
});
process.on('unhandledRejection', (reason) => {
  console.error('[ERROR] UnhandledRejection:', reason);
});
