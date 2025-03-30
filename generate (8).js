async function handler(req, res) {
  const { topic, type, level, original } = req.body;

  const tokenLimits = {
    "5": 1600,
    "5*": 1800,
    "5**": 2000
  };

  const wordLimits = {
    "5": { min: 480, max: 520 },
    "5*": { min: 580, max: 620 },
    "5**": { min: 730, max: 770 }
  };

  const typeHints = {
    "blog": "Use an engaging tone. Write as a student sharing your view on a blog. Include personal reflections and relatable experiences.",
    "speech": "Begin with a greeting (e.g. 'Good morning everyone'), use inclusive and persuasive language, and end with a thank you.",
    "letter to the editor": "Begin with 'Dear Editor', state your opinion clearly, support it with arguments and suggestions, and end with your name.",
    "formal letter": "Use a respectful and structured tone. Include a salutation, body, and closing phrase (e.g. 'Yours faithfully').",
    "proposal": "Use clear headings such as 'Introduction', 'Purpose', 'Details', and 'Conclusion'. Use a formal and objective tone.",
    "article": "Use a semi-formal tone. Start with a catchy lead, elaborate with facts or arguments, and end with a thoughtful conclusion.",
    "one-sided argumentative essay": "Argue strongly for one side only. Support each point clearly with explanations and real-life examples.",
    "two-sided argumentative essay": "Present both sides of the issue fairly. Use one paragraph per side and conclude with your own opinion."
  };

  const max_tokens = tokenLimits[level] || 1600;
  const minWords = wordLimits[level].min;
  const maxWords = wordLimits[level].max;
  const extraTypeHint = typeHints[type] || "";

  const styleGuidelines = {
    "5": "Write clearly and directly with basic to intermediate vocabulary. Support your ideas with two real-life examples.",
    "5*": "Write fluently using varied vocabulary and sentence structures. Include rhetorical questions or persuasive techniques. Use at least two well-developed real-life examples.",
    "5**": "Use a sophisticated tone and precise vocabulary. Structure arguments logically and provide three real-life examples from society, education, or youth issues. Use rhetorical devices and transitions."
  };

  let prompt = [
    "You are an HKDSE English Paper 2 examiner.",
    "",
    `Task:`,
    `Write a ${type} on the topic: "${topic}" that would be awarded Level ${level} in the HKDSE exam.`,
    "",
    "Instructions:",
    extraTypeHint,
    styleGuidelines[level],
    "",
    "IMPORTANT:",
    "- Structure the writing in at least 7 paragraphs.",
    `- You MUST write between ${minWords} and ${maxWords} words.`,
    "- Count only real words (not punctuation or blank lines).",
    "- End with: Word count: ___ words",
    "- Do NOT say what level the student is writing at."
  ].join("\n");

  if (original) {
    prompt += `

Here is the student's original writing:
${original}

Rewrite the piece to reach Level 5**:
- Use more advanced vocabulary and phrasing
- Improve clarity, logic, and examples
- Keep the structure and main ideas
- Highlight improved words/phrases by wrapping them in **bold**
`;
  }

  const openaiUrl = "https://dsewriterai.openai.azure.com/openai/deployments/gpt35-dse/chat/completions?api-version=2025-01-01-preview";
  const headers = {
    "Content-Type": "application/json",
    "api-key": process.env.AZURE_OPENAI_KEY
  };

  try {
    const writingRes = await fetch(openaiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are an HKDSE English writing examiner." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens
      })
    });

    const writingData = await writingRes.json();
    let fullText = writingData.choices?.[0]?.message?.content || "";

    const contentOnly = fullText.replace(/Word count:\s*\d+\s*words?/i, "").trim();
    const stripped = contentOnly
      .replace(/[.,!?;:\"'()\[\]{}<>\/\-]/g, " ")
      .replace(/\n+/g, " ");

    const cleanWords = stripped.split(/\s+/).filter(Boolean);
    const actualWordCount = cleanWords.length;

    const finalText = contentOnly + `\n\nWord count: ${actualWordCount} words`;

    res.status(200).json({ writing: finalText });
  } catch (err) {
    console.error("Final word length fix error:", err);
    res.status(500).json({ error: "Failed to generate writing." });
  }
}

module.exports = handler;
