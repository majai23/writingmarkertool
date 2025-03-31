export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ message: "✅ Feedback API is alive!" });
  }

  const { writing, level, mode } = req.body;

  if (!writing || !level) {
    return res.status(400).json({ error: "Missing writing or level" });
  }

  const max_tokens = mode === "detailed" ? 1000 : {
    "5": 800,
    "5*": 1000,
    "5**": 1100
  }[level] || 800;

  const detailedPrompt = \`
You are an experienced HKDSE English Paper 2 examiner.

Evaluate the student's writing using the HKDSE rubrics. Give band scores from 1 to 7 for:
- Content (C)
- Language (L)
- Organisation (O)

Then give short feedback under each.

End with tips to help the student reach Level 5 and Level 5**.

Student writing:
\${writing}
\`;

  const quickPrompt = \`
You are an experienced HKDSE English Paper 2 examiner.

Give short feedback on the following student writing in three areas:
- Content (C)
- Language (L)
- Organisation (O)

Student writing:
\${writing}
\`;

  const prompt = mode === "detailed" ? detailedPrompt : quickPrompt;

  const openaiUrl = "https://dsewriterai.openai.azure.com/openai/deployments/gpt35-dse/chat/completions?api-version=2025-01-01-preview";
  const headers = {
    "Content-Type": "application/json",
    "api-key": process.env.AZURE_OPENAI_KEY
  };

  try {
    const response = await fetch(openaiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a professional HKDSE English writing examiner." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        max_tokens
      })
    });

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content;
    if (!feedback || !feedback.trim()) {
      return res.status(500).json({ error: "Model returned empty feedback" });
    }

    res.status(200).json({ feedback });

  } catch (err) {
    console.error("🔥 Feedback generation error:", err);
    res.status(500).json({ error: "Failed to generate feedback" });
  }
}
