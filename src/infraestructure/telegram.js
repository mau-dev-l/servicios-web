function getToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN no está configurado");
  }

  return token;
}

async function callApi(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${getToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.ok) {
    const description = data?.description || `HTTP ${response.status}`;
    throw new Error(`Telegram ${method}: ${description}`);
  }

  return data.result;
}

function splitMessage(text, limit = 4000) {
  const value = String(text || "").trim();

  if (value.length <= limit) {
    return [value];
  }

  const chunks = [];
  let remaining = value;

  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf("\n", limit);

    if (cut < limit * 0.5) {
      cut = remaining.lastIndexOf(" ", limit);
    }

    if (cut < limit * 0.5) {
      cut = limit;
    }

    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

async function sendMessage(chatId, text) {
  for (const chunk of splitMessage(text)) {
    await callApi("sendMessage", { chat_id: chatId, text: chunk });
  }
}

async function setWebhook(url, secret) {
  return callApi("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message"],
  });
}

async function deleteWebhook() {
  return callApi("deleteWebhook", {});
}

async function getWebhookInfo() {
  return callApi("getWebhookInfo", {});
}

async function getMe() {
  return callApi("getMe", {});
}

module.exports = { sendMessage, setWebhook, deleteWebhook, getWebhookInfo, getMe };
