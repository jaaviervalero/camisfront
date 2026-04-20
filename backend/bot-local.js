"use strict";

require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const TelegramBot = require("node-telegram-bot-api");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

// ---------------------------------------------------------------
// Validación de entorno
// ---------------------------------------------------------------
const REQUIRED_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "PROVEEDOR_WHATSAPP",
  "SELLER_NAME",
  "SELLER_STREET",
  "SELLER_COUNTRY",
  "SELLER_PROVINCE",
  "SELLER_CITY",
  "SELLER_POSTAL",
  "SELLER_PHONE",
];
for (const v of REQUIRED_VARS) {
  if (!process.env[v]) {
    console.error(`[ERROR] Falta: ${v}`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const POLL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? "15000", 10);

// FIX #4 — SSRF: solo se permiten URLs del dominio Supabase del proyecto
function esUrlSegura(url) {
  try {
    return new URL(url).hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------
// Pedidos independientes pendientes (en memoria)
// TTL: 1 hora — purga cada 15 min
// ---------------------------------------------------------------
const pendingOrders = new Map();
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, p] of pendingOrders) {
    if (p._addedAt < cutoff) pendingOrders.delete(id);
  }
}, 15 * 60 * 1000);

// FIX #6 — Rehidratar pendingOrders desde BD al arrancar
async function rehidratarPendingOrders() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("es_comunitario", false)
    .eq("notificado", true)
    .eq("enviado_proveedor", false);
  if (error) { console.error("[ERROR] Rehidratación:", error.message); return; }
  for (const p of data ?? []) {
    p._addedAt = Date.now();
    pendingOrders.set(p.id, p);
  }
  console.log(`[INFO] Rehidratados ${data?.length ?? 0} pedidos independientes pendientes`);
}

// ---------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------
let waReady = false;

const waClient = new Client({
  authStrategy: new LocalAuth({ dataPath: "/app/.wwebjs_auth" }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  },
});
waClient.on("qr", (qr) => {
  console.log("[WA] Escaneá el QR:");
  qrcode.generate(qr, { small: true });
});
waClient.on("ready", () => {
  waReady = true;
  console.log("[WA] ✅ Conectado");
});
waClient.on("disconnected", (r) => {
  waReady = false;
  console.warn("[WA] Desconectado:", r);
});
waClient.initialize();

// ---------------------------------------------------------------
// Helpers de formato
// ---------------------------------------------------------------
function itemFicha(item) {
  return (
    `version: ${item.version}\n` +
    `size: ${item.talla}\n` +
    `name: ${item.nombre || "-"}\n` +
    `number: ${item.dorsal || "-"}`
  );
}

function formatItemsTelegram(items, includePrice) {
  return items
    .map((it, i) => {
      const pers =
        it.nombre || it.dorsal
          ? `\n   ✏️ ${[it.nombre, it.dorsal].filter(Boolean).join(" / ")}`
          : "";
      const price = includePrice ? ` · ${Number(it.precio_unitario).toFixed(2)}€` : "";
      return `  ${i + 1}. ${it.descripcion || "Camiseta"} · ${it.version} · ${it.talla}${price}${pers}`;
    })
    .join("\n");
}

function waHeaderIndependiente(pedido) {
  return (
    `nuevo pedido\n` +
    `name: ${pedido.envio_nombre}\n` +
    `street address: ${pedido.envio_direccion}\n` +
    `country: ${pedido.envio_pais}\n` +
    `state/province: ${pedido.envio_estado_provincia}\n` +
    `city: ${pedido.envio_ciudad}\n` +
    `postal code: ${pedido.envio_codigo_postal}\n` +
    `cellphone number: ${pedido.envio_telefono}`
  );
}

function waHeaderComunitario() {
  return (
    `nuevo pedido\n` +
    `name: ${process.env.SELLER_NAME}\n` +
    `street address: ${process.env.SELLER_STREET}\n` +
    `country: ${process.env.SELLER_COUNTRY}\n` +
    `state/province: ${process.env.SELLER_PROVINCE}\n` +
    `city: ${process.env.SELLER_CITY}\n` +
    `postal code: ${process.env.SELLER_POSTAL}\n` +
    `cellphone number: ${process.env.SELLER_PHONE}`
  );
}

function formatTelegramIndependiente(pedido) {
  const {
    id, created_at, envio_nombre, envio_email, envio_telefono,
    envio_direccion, envio_ciudad, envio_estado_provincia,
    envio_pais, envio_codigo_postal, items_json, precio_total,
  } = pedido;
  const fecha = new Date(created_at).toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
  return (
    `📦 *PEDIDO INDEPENDIENTE* — \`${id.slice(0, 8)}...\`\n` +
    `📅 ${fecha}\n\n` +
    `👤 ${envio_nombre} | 📞 ${envio_telefono}\n📧 ${envio_email}\n\n` +
    `🏠 ${envio_direccion}, ${envio_ciudad} ${envio_codigo_postal}\n${envio_estado_provincia}, ${envio_pais}\n\n` +
    `🎽 *Prendas*\n${formatItemsTelegram(items_json ?? [], true)}\n\n` +
    `💸 *Total: ${Number(precio_total).toFixed(2)}€*`
  );
}

function formatTelegramComunitario(pedido) {
  const { id, created_at, envio_nombre, envio_email, envio_telefono, items_json, precio_total } = pedido;
  const fecha = new Date(created_at).toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
  return (
    `🤝 *PEDIDO COMUNITARIO* — \`${id.slice(0, 8)}...\`\n` +
    `📅 ${fecha}\n\n` +
    `👤 ${envio_nombre} | 📞 ${envio_telefono}\n📧 ${envio_email}\n\n` +
    `🎽 *Prendas*\n${formatItemsTelegram(items_json ?? [], false)}\n\n` +
    `💸 *Total: ${Number(precio_total).toFixed(2)}€*\n` +
    `_Se enviará al proveedor con el próximo /comunitario_`
  );
}

// ---------------------------------------------------------------
// Enviar prendas al proveedor (un pedido)
// FIX #4 — SSRF: valida URL antes de descargar imagen
// ---------------------------------------------------------------
async function enviarPrendaWA(numero, pedido) {
  const items = pedido.items_json ?? [];
  for (const item of items) {
    const ficha = itemFicha(item);
    try {
      if (item.url_imagen && esUrlSegura(item.url_imagen)) {
        // FIX #4 — unsafeMime: false para no enviar archivos no-imagen
        const media = await MessageMedia.fromUrl(item.url_imagen, { unsafeMime: false });
        await waClient.sendMessage(numero, media, { caption: ficha });
      } else {
        if (item.url_imagen) console.warn("[WA] URL bloqueada (SSRF):", item.url_imagen.slice(0, 60));
        await waClient.sendMessage(numero, ficha);
      }
    } catch (err) {
      console.error("[WA] Error prenda:", err.message);
    }
  }
}

// ---------------------------------------------------------------
// Callback: botones inline
// FIX #3 — Validar chat_id antes de procesar cualquier callback
// ---------------------------------------------------------------
bot.on("callback_query", async (query) => {
  const { id: queryId, message, data } = query;

  // FIX #3 — Rechazar callbacks de chats no autorizados
  if (String(message.chat.id) !== String(CHAT_ID)) {
    await bot.answerCallbackQuery(queryId, { text: "No autorizado" });
    return;
  }

  // ---- Enviar pedido independiente al proveedor ----
  if (data?.startsWith("send_supplier:")) {
    const pedidoId = data.replace("send_supplier:", "");
    const pedido = pendingOrders.get(pedidoId);

    if (!pedido) {
      await bot.answerCallbackQuery(queryId, { text: "Pedido no encontrado" });
      await bot.editMessageText(
        message.text + "\n\n⚠️ _Pedido no encontrado (bot reiniciado?)_",
        { chat_id: message.chat.id, message_id: message.message_id, parse_mode: "Markdown" },
      );
      return;
    }

    // FIX #5 — Optimistic lock: solo actualiza si enviado_proveedor sigue en false
    const { data: updated } = await supabase
      .from("pedidos")
      .update({ enviado_proveedor: true, procesado: false })
      .eq("id", pedido.id)
      .eq("enviado_proveedor", false)
      .select("id");

    if (!updated?.length) {
      await bot.answerCallbackQuery(queryId, { text: "Ya enviado anteriormente" });
      pendingOrders.delete(pedidoId);
      return;
    }

    await bot.answerCallbackQuery(queryId, { text: "Enviando…" });

    if (!waReady) {
      await bot.sendMessage(CHAT_ID, "⚠️ WhatsApp no conectado");
      return;
    }

    const numero = process.env.PROVEEDOR_WHATSAPP;
    try { await waClient.sendMessage(numero, waHeaderIndependiente(pedido)); } catch (e) { console.error("[WA]", e.message); }
    await enviarPrendaWA(numero, pedido);

    await bot.editMessageText(
      formatTelegramIndependiente(pedido) + "\n\n✅ *Enviado al proveedor*",
      { chat_id: message.chat.id, message_id: message.message_id, parse_mode: "Markdown" },
    );

    pendingOrders.delete(pedidoId);
    return;
  }

  // ---- Confirmar envío de lote comunitario ----
  if (data === "confirm_comunitario") {
    await bot.answerCallbackQuery(queryId, { text: "Enviando lote…" });
    await enviarLoteComunitario();
    return;
  }
});

// ---------------------------------------------------------------
// Lógica de envío del lote comunitario
// FIX #7 — Solo marca como enviados los pedidos que realmente se enviaron
// ---------------------------------------------------------------
async function enviarLoteComunitario() {
  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("es_comunitario", true)
    .eq("enviado_proveedor", false)
    .order("created_at", { ascending: true });

  if (error) { await bot.sendMessage(CHAT_ID, `❌ Error: ${error.message}`); return; }

  if (!pedidos?.length) {
    await bot.sendMessage(CHAT_ID, "✅ No hay pedidos comunitarios pendientes de enviar.");
    return;
  }

  if (!waReady) {
    await bot.sendMessage(CHAT_ID, "⚠️ WhatsApp no conectado. No se puede enviar.");
    return;
  }

  const numero = process.env.PROVEEDOR_WHATSAPP;
  const lote = new Date().toISOString().replace("T", " ").slice(0, 16);

  await bot.sendMessage(CHAT_ID, `📤 Enviando ${pedidos.length} pedido(s) comunitario(s) al proveedor…`);

  try {
    await waClient.sendMessage(
      numero,
      `🤝 *PEDIDO COMUNITARIO — Lote ${lote}*\n${pedidos.length} cliente(s)\n\n` +
        waHeaderComunitario(),
    );
  } catch (e) { console.error("[WA] cabecera lote:", e.message); }

  // FIX #7 — Acumular solo los ids enviados con éxito
  const enviados = [];
  for (const pedido of pedidos) {
    let headerOk = true;
    try {
      await waClient.sendMessage(numero, `👤 ${pedido.envio_nombre} | ${pedido.envio_telefono ?? ""}`);
    } catch (e) {
      console.error("[WA]", e.message);
      headerOk = false;
    }
    await enviarPrendaWA(numero, pedido);
    if (headerOk) enviados.push(pedido.id);
  }

  if (enviados.length > 0) {
    await supabase
      .from("pedidos")
      .update({ enviado_proveedor: true, lote_comunitario: lote, procesado: false })
      .in("id", enviados);
  }

  const fallidos = pedidos.length - enviados.length;
  const resumen = fallidos > 0
    ? `✅ Lote *${lote}* — ${enviados.length} enviados, ⚠️ ${fallidos} fallidos (revisa logs).`
    : `✅ Lote *${lote}* enviado — ${enviados.length} pedido(s) al proveedor.`;

  await bot.sendMessage(CHAT_ID, resumen, { parse_mode: "Markdown" });
}

// ---------------------------------------------------------------
// Comando /comunitario — preview + botón de confirmación
// ---------------------------------------------------------------
bot.onText(/\/comunitario/, async (msg) => {
  if (String(msg.chat.id) !== String(CHAT_ID)) return;

  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("es_comunitario", true)
    .eq("enviado_proveedor", false)
    .order("created_at", { ascending: true });

  if (error) { await bot.sendMessage(CHAT_ID, `❌ Error: ${error.message}`); return; }

  if (!pedidos?.length) {
    await bot.sendMessage(CHAT_ID, "✅ No hay pedidos comunitarios pendientes.");
    return;
  }

  const lote = new Date().toISOString().replace("T", " ").slice(0, 16);
  const resumen = pedidos
    .map((p, i) => {
      const prendas = formatItemsTelegram(p.items_json ?? [], false);
      return `*${i + 1}. ${p.envio_nombre}* (${p.envio_telefono ?? "-"})\n${prendas}`;
    })
    .join("\n\n");

  const totalGlobal = pedidos.reduce((s, p) => s + Number(p.precio_total), 0);

  await bot.sendMessage(
    CHAT_ID,
    `🤝 *LOTE COMUNITARIO — ${lote}*\n` +
      `${pedidos.length} cliente(s) · Total: *${totalGlobal.toFixed(2)}€*\n\n` +
      resumen +
      `\n\n📍 Se enviará con dirección: *${process.env.SELLER_NAME}*, ${process.env.SELLER_CITY}`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[
          { text: "📲 Confirmar y enviar al proveedor", callback_data: "confirm_comunitario" },
        ]],
      },
    },
  );
});

// ---------------------------------------------------------------
// Comando /limpiar — marca como procesados los ya enviados al proveedor
// ---------------------------------------------------------------
bot.onText(/\/limpiar/, async (msg) => {
  if (String(msg.chat.id) !== String(CHAT_ID)) return;

  const { data: listos } = await supabase
    .from("pedidos")
    .select("id")
    .eq("notificado", true)
    .eq("enviado_proveedor", true)
    .eq("procesado", false);

  if (!listos?.length) {
    await bot.sendMessage(CHAT_ID, "✅ No hay pedidos listos para limpiar (deben estar enviados al proveedor).");
    return;
  }

  const { error } = await supabase
    .from("pedidos")
    .update({ procesado: true })
    .in("id", listos.map((p) => p.id));

  if (error) { await bot.sendMessage(CHAT_ID, `❌ Error: ${error.message}`); return; }

  await bot.sendMessage(
    CHAT_ID,
    `🧹 *${listos.length} pedido(s)* marcados como procesados.`,
    { parse_mode: "Markdown" },
  );
});

// ---------------------------------------------------------------
// Comando /estado — resumen rápido
// ---------------------------------------------------------------
bot.onText(/\/estado/, async (msg) => {
  if (String(msg.chat.id) !== String(CHAT_ID)) return;

  const [
    { count: totalHoy },
    { count: comPend },
    { count: indPend },
    { count: sinProcesar },
  ] = await Promise.all([
    supabase.from("pedidos").select("id", { count: "exact", head: true })
      .gte("created_at", new Date().toISOString().slice(0, 10)),
    supabase.from("pedidos").select("id", { count: "exact", head: true })
      .eq("es_comunitario", true).eq("enviado_proveedor", false),
    supabase.from("pedidos").select("id", { count: "exact", head: true })
      .eq("es_comunitario", false).eq("enviado_proveedor", false).eq("notificado", true),
    supabase.from("pedidos").select("id", { count: "exact", head: true })
      .eq("procesado", false),
  ]);

  await bot.sendMessage(
    CHAT_ID,
    `📊 *Estado del sistema*\n\n` +
      `📅 Pedidos hoy: *${totalHoy ?? 0}*\n` +
      `🤝 Comunitarios sin enviar: *${comPend ?? 0}*\n` +
      `📦 Independientes sin aprobar: *${indPend ?? 0}*\n` +
      `⏳ Sin procesar en total: *${sinProcesar ?? 0}*\n\n` +
      `WhatsApp: ${waReady ? "✅ Conectado" : "❌ Desconectado"}`,
    { parse_mode: "Markdown" },
  );
});

// ---------------------------------------------------------------
// Polling Supabase — notificar nuevos pedidos
// FIX #8 — Alertar por Telegram tras 3 errores consecutivos
// ---------------------------------------------------------------
let running = false;
let pollErrorCount = 0;

async function poll() {
  if (running) return;
  running = true;
  try {
    const { data: pedidos, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("notificado", false)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[ERROR] Supabase:", error.message);
      pollErrorCount++;
      if (pollErrorCount >= 3) {
        bot.sendMessage(CHAT_ID,
          `⚠️ *Bot*: ${pollErrorCount} errores consecutivos en poll\n\`${error.message}\``,
          { parse_mode: "Markdown" },
        ).catch(() => {});
      }
      return;
    }

    pollErrorCount = 0;
    if (!pedidos?.length) return;

    for (const pedido of pedidos) {
      try {
        if (pedido.es_comunitario) {
          await bot.sendMessage(CHAT_ID, formatTelegramComunitario(pedido), { parse_mode: "Markdown" });
        } else {
          pedido._addedAt = Date.now();
          pendingOrders.set(pedido.id, pedido);
          await bot.sendMessage(CHAT_ID, formatTelegramIndependiente(pedido), {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[
                { text: "📲 Enviar al proveedor", callback_data: `send_supplier:${pedido.id}` },
              ]],
            },
          });
        }
        console.log(`[OK] Telegram → ${pedido.es_comunitario ? "comunitario" : "independiente"} ${pedido.id.slice(0, 8)}`);
      } catch (err) {
        console.error("[ERROR] Telegram:", err.message);
        pendingOrders.delete(pedido.id);
        continue;
      }

      await supabase.from("pedidos").update({ notificado: true }).eq("id", pedido.id);
    }
  } catch (err) {
    console.error("[ERROR] Poll:", err.message);
    pollErrorCount++;
    if (pollErrorCount >= 3) {
      bot.sendMessage(CHAT_ID,
        `⚠️ *Bot*: ${pollErrorCount} errores consecutivos en poll\n\`${err.message}\``,
        { parse_mode: "Markdown" },
      ).catch(() => {});
    }
  } finally {
    running = false;
  }
}

// ---------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------
console.log(`[INFO] Bot iniciado — polling cada ${POLL_MS / 1000}s`);
console.log("[INFO] Comandos: /comunitario · /limpiar · /estado");
rehidratarPendingOrders().then(() => poll());
const interval = setInterval(poll, POLL_MS);

process.on("SIGTERM", () => {
  clearInterval(interval);
  waClient.destroy().finally(() => process.exit(0));
});
process.on("unhandledRejection", (r) => console.error("[ERROR]", r));
