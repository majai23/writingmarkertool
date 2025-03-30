export default async function handler(req, res) {
  const { writing, level } = req.body;

  console.log("FEEDBACK INPUT:", { level, writingSnippet: writing?.slice(0, 100) });

  if (!writing || !level) {
    console.error("Missing required fields: writing or level");
    return res.status(400).json({ error: "Missing writing or level" });
  }

  const max_tokens = {
    "5": 1000,
    "5*": 1200,
    "5**": 1400
  }[level] || 1000;

  const prompt = `
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
${writing}
`;

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
    console.log("FEEDBACK RESPONSE:", data);

    const feedback = data.choices?.[0]?.message?.content;
    if (!feedback) {
      console.error("No feedback content returned.");
      return res.status(500).json({ error: "No feedback returned from model" });
    }

    res.status(200).json({ feedback });

  } catch (err) {
    console.error("Feedback generation error:", err);
    res.status(500).json({ error: "Failed to generate feedback" });
  }
}
