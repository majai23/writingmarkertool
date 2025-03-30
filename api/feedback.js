export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ message: "✅ Feedback API is alive!" });
  }

  const { writing, level, mode } = req.body;

  console.log("🟡 FEEDBACK INPUT:", { level, mode, writingSnippet: writing?.slice(0, 100) });

  if (!writing || !level) {
    console.error("❌ Missing required fields: writing or level");
    return res.status(400).json({ error: "Missing writing or level" });
  }

  const max_tokens = mode === "detailed" ? 1200 : {
    "5": 1000,
    "5*": 1200,
    "5**": 1400
  }[level] || 1000;

  const detailedPrompt = \`
You are an experienced HKDSE English Paper 2 examiner.

Evaluate the student's writing and assign band scores (1–7) for:
- Content (C)
- Language (L)
- Organisation (O)

Then explain:
- What was done well (✅)
- What needs improvement (✘)
- Give tips to reach Level 5 and 5**

Use this format exactly:

📊 Estimated Band Scores
Content (C): ?/7 ✅ ... ✘ ...
Language (L): ?/7 ✅ ... ✘ ...
Organisation (O): ?/7 ✅ ... ✘ ...

🧠 Domain Comments
C: ...
L: ...
O: ...

🏁 Suggestions to reach Level 5 / 5**:
- ...
- ...

Student writing:
\${writing}
\`;

  const quickPrompt = \`
You are an experienced HKDSE English Paper 2 examiner.

Evaluate the student’s writing in 3 categories:
1. Content (C)
2. Language (L)
3. Organization (O)

For each:
- Write 2–4 sentences
- Reference specific words or sentences from the student writing
- Mention strengths and weaknesses
- Return in the format:
C: ...
L: ...
O: ...

Student's writing:
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
    console.log("🟢 FEEDBACK RESPONSE:", JSON.stringify(data, null, 2));

    const feedback = data.choices?.[0]?.message?.content;
    if (!feedback || !feedback.trim()) {
      console.error("⚠️ Empty feedback from model.");
      return res.status(500).json({ error: "Model returned empty feedback" });
    }

    res.status(200).json({ feedback });

  } catch (err) {
    console.error("🔥 Feedback generation error:", err);
    res.status(500).json({ error: "Failed to generate feedback" });
  }
}
