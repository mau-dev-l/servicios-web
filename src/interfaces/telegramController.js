const MAX_UPDATE_IDS = 500;

function createTelegramController({ ragService, telegram, webhookSecret }) {
  const seenUpdates = new Set();
  const seenOrder = [];

  function rememberUpdate(updateId) {
    if (updateId === undefined || updateId === null) {
      return true;
    }

    if (seenUpdates.has(updateId)) {
      return false;
    }

    seenUpdates.add(updateId);
    seenOrder.push(updateId);

    if (seenOrder.length > MAX_UPDATE_IDS) {
      seenUpdates.delete(seenOrder.shift());
    }

    return true;
  }

  async function handleMessage(message) {
    const chatId = message.chat?.id;
    const text = typeof message.text === "string" ? message.text.trim() : "";

    if (!chatId || message.from?.is_bot) {
      return;
    }

    if (!text) {
      await telegram.sendMessage(chatId, "Solo puedo responder mensajes de texto.");
      return;
    }

    const command = text.startsWith("/")
      ? text.split(/\s+/)[0].split("@")[0].toLowerCase()
      : null;

    if (command === "/start") {
      await telegram.sendMessage(
        chatId,
        "Hola. Pregúntame el precio de un producto. Ejemplo: ¿Cuánto cuesta el cable HDMI?"
      );
      return;
    }

    if (command === "/ayuda" || command === "/help") {
      await telegram.sendMessage(
        chatId,
        "Envíame el nombre o la descripción de un producto y te diré su precio y disponibilidad."
      );
      return;
    }

    try {
      const result = await ragService.ask(text);
      await telegram.sendMessage(chatId, result.answer);
    } catch (error) {
      console.error("Error procesando mensaje de Telegram:", error);

      const messageText = error.status
        ? error.message
        : "No pude procesar tu consulta. Intenta de nuevo.";

      await telegram
        .sendMessage(chatId, messageText)
        .catch((sendError) =>
          console.error("Error enviando mensaje a Telegram:", sendError.message)
        );
    }
  }

  return {
    webhook: (req, res) => {
      const secret = req.get("X-Telegram-Bot-Api-Secret-Token");

      if (!webhookSecret || secret !== webhookSecret) {
        return res.status(401).json({ ok: false });
      }

      const update = req.body;

      if (!update || typeof update !== "object") {
        return res.json({ ok: true });
      }

      if (!rememberUpdate(update.update_id)) {
        return res.json({ ok: true });
      }

      res.json({ ok: true });

      const message = update.message || update.edited_message;

      if (message) {
        handleMessage(message).catch((error) =>
          console.error("Error en webhook de Telegram:", error)
        );
      }
    },
  };
}

module.exports = createTelegramController;
