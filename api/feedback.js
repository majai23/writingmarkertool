export default async function handler(req, res) {
  const { writing, level, mode } = req.body;

  if (req.method === "GET") {
    return res.status(200).json({ message: "✅ Feedback API is alive!" });
  }

  if (!writing || !level) {
    return res.status(400).json({ error: "Missing writing or level" });
  }

  const max_tokens = mode === "detailed" ? 1000 : {
    "5": 800,
    "5*": 1000,
    "5**": 1100
  }[level] || 800;

  const detailedPrompt = \`
You are an HKDSE English Paper 2 examiner.

Evaluate the student's writing and assign a band (1–7) for each of the following:
Content, Language, and Organisation.

Give strengths and weaknesses for each category, and suggestions to reach Level 5 and 5**.

Format:
Content: ?/7
✅ ...
✘ ...

Language: ?/7
✅ ...
✘ ...

Organisation: ?/7
✅ ...
✘ ...

Suggestions to reach Level 5 and 5**:
- ...
- ...

Student writing:
\${writing}
\`;

  const quickPrompt = \`
You are an HKDSE English Paper 2 examiner.

Evaluate the student’s writing in 3 categories:
1. Content
2. Language
3. Organisation

For each, write 2–4 sentences commenting on strengths and weaknesses.

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenAI API error:", errorText);
      return res.status(500).json({ error: "OpenAI API failed", details: errorText });
    }

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content;

    if (!feedback || !feedback.trim()) {
      return res.status(500).json({ error: "No feedback returned from model." });
    }

    res.status(200).json({ feedback });

  } catch (err) {
    console.error("🔥 Feedback error:", err);
    res.status(500).json({ error: "Feedback generation failed." });
  }
}
