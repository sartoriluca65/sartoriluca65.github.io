const allowedOrigins = new Set(["https://sticker-studio.sartori-luca65.chatgpt.site", "https://sartoriluca65.github.io"]);
const json = (value, status = 200, origin = null) => new Response(JSON.stringify(value), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...(origin && allowedOrigins.has(origin) ? {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "Content-Type",
      "vary": "Origin",
    } : {}),
  },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    if (url.pathname === "/api/ai/sticker" && request.method === "OPTIONS") {
      if (!origin || !allowedOrigins.has(origin)) return json({ error: "Richiesta non valida." }, 403);
      return new Response(null, { status: 204, headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "Content-Type",
        "access-control-max-age": "600",
        "vary": "Origin",
      } });
    }
    if (request.method === "POST" && url.pathname === "/api/ai/sticker") {
      if (!origin || !allowedOrigins.has(origin)) return json({ error: "Richiesta non valida." }, 403);
      if (!env?.AI_RATE_LIMITER?.limit) return json({ error: "Protezione anti-abuso non configurata." }, 503, origin);
      const ip = request.headers.get("cf-connecting-ip");
      if (!ip) return json({ error: "Identificazione richiesta non disponibile." }, 403, origin);
      try {
        const { success } = await env.AI_RATE_LIMITER.limit({ key: ip });
        if (!success) return json({ error: "Limite generazioni raggiunto. Riprova più tardi." }, 429, origin);
      } catch { return json({ error: "Protezione temporaneamente non disponibile." }, 503, origin); }
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (!contentLength) return json({ error: "Dimensione richiesta non disponibile." }, 411, origin);
      if (contentLength > 6_000_000) return json({ error: "La foto è troppo grande. Ridimensionala e riprova." }, 413, origin);
      let input;
      try { input = await request.json(); } catch { return json({ error: "Richiesta incompleta." }, 400, origin); }
      const { prompt, image } = input || {};
      const apiKey = env?.GEMINI_API_KEY;
      if (!apiKey) return json({ error: "Servizio Gemini non configurato." }, 503, origin);
      if (typeof prompt !== "string" || prompt.length > 2500 || !image || !["image/jpeg", "image/png", "image/webp"].includes(image.mimeType) || typeof image.data !== "string" || image.data.length > 5_500_000 || !/^[A-Za-z0-9+/]+=*$/.test(image.data)) return json({ error: "Foto o descrizione non valide." }, 400, origin);

      let upstream;
      try {
        upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent", {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: image.mimeType, data: image.data } }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"], responseFormat: { image: { aspectRatio: "1:1" } } },
          }),
        });
      } catch {
        return json({ error: "Non riesco a raggiungere Gemini. Controlla la connessione e riprova." }, 502, origin);
      }
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const message = data?.error?.message || "Gemini ha rifiutato la richiesta.";
        const status = upstream.status === 429 ? 429 : upstream.status === 400 || upstream.status === 403 ? 400 : 502;
        return json({ error: String(message).slice(0, 240) }, status, origin);
      }
      const parts = data?.candidates?.flatMap(candidate => candidate?.content?.parts || []) || [];
      const generated = parts.find(part => part.inlineData?.data || part.inline_data?.data);
      const generatedData = generated?.inlineData || generated?.inline_data;
      if (!generatedData?.data) return json({ error: "Gemini non ha restituito un’immagine. Prova un altro look o una foto più nitida." }, 502, origin);
      return json({ image: generatedData.data, mimeType: generatedData.mimeType || generatedData.mime_type || "image/png" }, 200, origin);
    }

    return json({ error: "Endpoint non disponibile." }, 404, origin);
  },
};
