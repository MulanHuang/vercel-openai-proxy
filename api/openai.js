// 最新版 OpenAI Responses API 代理（微信小程序完全兼容版）
// 支持 max_output_tokens + 流式 + 非流式
// Vercel Serverless Function

export default async function handler(req, res) {
  // ---------------------------
  // ① 处理微信小程序 OPTIONS 预检
  // ---------------------------
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  // ---------------------------
  // ② 限制只允许 POST
  // ---------------------------
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ---------------------------
  // ③ 解析请求 body
  // ---------------------------
  const { model, messages, max_output_tokens, stream } = req.body;

  try {
    // ---------------------------
    // ④ 构建 Responses API body
    // ---------------------------
    const body = {
      model: model || "gpt-5-mini",
      input: messages, // ⚠️ Responses API 使用 input
      max_output_tokens: max_output_tokens || 300,
      stream: stream === true,
    };

    // ---------------------------
    // ⑤ 调用 OpenAI Responses API
    // ---------------------------
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    // ---------------------------
    // ⑥ 小程序 CORS 允许返回
    // ---------------------------
    res.setHeader("Access-Control-Allow-Origin", "*");

    // ---------------------------
    // ⑦ 非流式 → 返回 JSON
    // ---------------------------
    if (!stream) {
      const data = await openaiResponse.json();
      return res.status(200).json(data);
    }

    // ---------------------------
    // ⑧ 流式 SSE 输出
    // ---------------------------
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    const reader = openaiResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      res.write(chunk);
    }

    res.end();
  } catch (error) {
    console.error("代理错误:", error);
    res.status(500).json({ error: error.message || "服务器错误" });
  }
}
