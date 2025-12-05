// 最新版 OpenAI Responses API 代理（微信小程序兼容版）

export default async function handler(req, res) {
  // ① 处理 OPTIONS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  // ② 限制只允许 POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ③ 解析 body
  const { model, input, max_output_tokens, stream } = req.body;

  if (!input) {
    return res.status(400).json({
      error: "Missing required field: input",
    });
  }

  try {
    // ④ 构建请求体
    const body = {
      model: model || "gpt-5-mini",
      input, // ✔ 使用前端传来的 input
      max_output_tokens: max_output_tokens || 300,
      stream: stream === true,
    };

    // ⑤ 调用 OpenAI Responses API
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    res.setHeader("Access-Control-Allow-Origin", "*");

    // ⑥ 非流式
    if (!stream) {
      const data = await openaiResponse.json();
      return res.status(200).json(data);
    }

    // ⑦ 流式 SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    const reader = openaiResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }

    res.end();
  } catch (err) {
    console.error("代理错误:", err);
    res.status(500).json({ error: err.message || "服务器错误" });
  }
}
