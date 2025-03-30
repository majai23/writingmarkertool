export default async function handler(req, res) {
  const { writing, level, mode } = req.body;

  console.log("FEEDBACK INPUT:", { level, mode, writingSnippet: writing?.slice(0, 100) });

  if (!writing || !level) {
    console.error("Missing required fields: writing or level");
    return res.status(400).json({ error: "Missing writing or level" });
  }

  const max_tokens = mode === "detailed" ? 1800 : {
    "5": 1000,
    "5*": 1200,
    "5**": 1400
  }[level] || 1000;

  const detailedPrompt = \`
You are a strict and experienced HKDSE English Paper 2 examiner.

Evaluate the student's writing using the official HKDSE rubrics.

You must:
- Estimate a band score (1–7) for each domain:
  Content (C), Language (L), and Organisation (O)
- Give ✅ strengths and ✘ weaknesses for each domain
- Provide suggestions to reach Level 5 and Level 5**
- Follow the exact format below

FORMAT:

📊 Estimated Band Scores
Domain         Band     Comments
Content (C)     ?/7     ✅ ... ✘ ...
Language (L)    ?/7     ✅ ... ✘ ...
Organisation (O) ?/7    ✅ ... ✘ ...

🧠 Detailed Feedback by Domain
✅ CONTENT – ?/7
[Detailed analysis including examples and what was done well or poorly]

✅ LANGUAGE – ?/7
[Detailed notes on vocabulary, grammar, phrasing, sentence variety]

✅ ORGANISATION – ?/7
[Paragraph structure, flow, cohesion, transitions]

🏁 Final Assessment
C   L   O   → Overall Level: ? (e.g. Level 4 / 5 / 5*)

✅ Suggestions to improve to Level 5 and 5**:
- Bullet points with direct, clear suggestions
- Use real examples where possible

Student's writing:
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
