// 最新版 OpenAI Responses API 代理 (支持流式 + 非流式)
// Vercel Serverless Function

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { model, messages, max_output_tokens, stream } = req.body;

  try {
    // 构建请求 body —— 使用 Responses API
    const body = {
      model: model || "gpt-5-mini",
      input: messages, // Responses API 用 input，而不是 messages
      max_output_tokens: max_output_tokens || 300,
      stream: stream === true ? true : false,
    };

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    // 如果客户端不要求流式，直接返回 JSON
    if (!stream) {
      const data = await openaiResponse.json();
      return res.status(200).json(data);
    }

    // ---------------------------
    //  流式输出 (SSE)
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
