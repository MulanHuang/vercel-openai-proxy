// Vercel Serverless Function - 语音转文字代理
// 下载 fileUrl 对应的音频并调用 OpenAI 音频转写接口

export default async function handler(req, res) {
  // CORS 预检
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fileUrl, model = "whisper-1", language = "zh" } = req.body || {};
  if (!fileUrl) {
    return res.status(400).json({ error: "Missing fileUrl" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  const base = (process.env.OPENAI_BASE || "https://api.openai.com/v1").replace(
    /\/+$/,
    ""
  );

  try {
    // 下载音频为 Buffer
    const audioResp = await fetch(fileUrl);
    if (!audioResp.ok) {
      const text = await audioResp.text();
      return res
        .status(502)
        .json({ error: "Failed to download audio", detail: text });
    }
    const arrayBuffer = await audioResp.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });

    const form = new FormData();
    form.append("file", blob, "voice.mp3");
    form.append("model", model);
    form.append("response_format", "text");
    form.append("language", language);

    const openaiResp = await fetch(`${base}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      return res
        .status(openaiResp.status)
        .json({ error: "OpenAI request failed", detail: errText });
    }

    const text = await openaiResp.text();
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({ success: true, text });
  } catch (error) {
    console.error("Speech proxy error:", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res
      .status(500)
      .json({ error: "Speech proxy error", detail: error.message });
  }
}
