export default async function handler(req, res) {
  // CORS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { model, messages, max_output_tokens = 300, stream = false } = req.body;

  try {
    // ⭐ 关键：messages → input（Responses API 结构）
    const input = (messages || []).map(m => ({
      role: m.role,
      content: m.content
    }));

    const body = {
      model: model || "gpt-5-mini",
      input,
      max_output_tokens,
      stream,
    };

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    res.setHeader("Access-Control-Allow-Origin", "*");

    // 非流式
    if (!stream) {
      const data = await openaiResponse.json();
      return res.status(openaiResponse.status).json(data);
    }

    // 流式
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    const reader = openaiResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }

    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
