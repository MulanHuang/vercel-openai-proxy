// Vercel Serverless Function
export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { model, messages, temperature, max_completion_tokens } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // 环境变量
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages,
        temperature: temperature || 1,
        max_completion_tokens: max_completion_tokens || 1000,
      }),
    });

    const data = await response.json();

    // 返回 OpenAI 原始格式
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
