/**
 * RecallAI — Real AI Generation Service
 *
 * Provider priority: Google Gemini → OpenAI → OpenRouter
 * Uses the first configured (non-empty) API key.
 * Never falls back to hardcoded questions on API failure — returns a clear error instead.
 */


// ─── Provider configuration ──────────────────────────────────────────────────

function getProviders() {
  const providers = [];

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();

  if (geminiKey) {
    providers.push({
      name: 'gemini',
      key: geminiKey,
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
    });
  }
  if (openaiKey) {
    providers.push({
      name: 'openai',
      key: openaiKey,
      model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
    });
  }
  if (openrouterKey) {
    providers.push({
      name: 'openrouter',
      key: openrouterKey,
      model: process.env.OPENROUTER_MODEL?.trim() || 'google/gemini-flash-1.5',
    });
  }

  return providers;
}

// ─── Content preparation ─────────────────────────────────────────────────────

const MAX_CONTENT_CHARS = 12000; // ~3 000 tokens — keeps us within context limits

function prepareContent(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines (>2 in a row)
    .replace(/\n{3,}/g, '\n\n')
    // Remove purely decorative lines (====, ----, ####)
    .replace(/^[=\-#*]{4,}\s*$/gm, '')
    // Collapse runs of spaces inside lines
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  // Truncate intelligently at a paragraph boundary if too long
  if (text.length > MAX_CONTENT_CHARS) {
    const truncated = text.slice(0, MAX_CONTENT_CHARS);
    const lastPara = truncated.lastIndexOf('\n\n');
    text = lastPara > MAX_CONTENT_CHARS * 0.7 ? truncated.slice(0, lastPara) : truncated;
    text += '\n\n[Content truncated for processing — generate from the content above only]';
  }

  return text;
}

// ─── Prompt construction ──────────────────────────────────────────────────────

function buildPrompt({ content, subject, counts, requestedTypes }) {
  const fc  = requestedTypes.includes('flashcards')   ? (counts.flashcards   || 6) : 0;
  const mcq = requestedTypes.includes('mcqs')         ? (counts.mcqs         || 5) : 0;
  const tf  = requestedTypes.includes('true_false')   ? (counts.true_false   || 4) : 0;
  const sa  = requestedTypes.includes('short_answer') ? (counts.short_answer || 3) : 0;

  return `You are an expert educational content creator. Your task is to generate high-quality study materials strictly from the provided study notes.

SUBJECT: ${subject}

STUDY NOTES:
---
${content}
---

Generate ONLY from the content above. Do NOT invent facts, page numbers, or quotations that are not present in the text above.

OUTPUT REQUIREMENTS — return a single valid JSON object with these exact keys (omit any section whose count is 0):

{
  "topics": ["array of 1–5 main topic strings identified from the content"],${fc > 0 ? `
  "flashcards": [
    {
      "question": "Clear, self-contained question (${fc} total)",
      "answer": "Concise but complete answer (1–3 sentences)",
      "explanation": "Brief elaboration or context (1–2 sentences, optional)",
      "topic": "one of the topics from the topics array",
      "difficulty": "easy | medium | hard",
      "sourceReference": "section or concept heading from the content, or omit if none"
    }
  ],` : ''}${mcq > 0 ? `
  "mcqs": [
    {
      "question": "Question text (${mcq} total)",
      "options": ["Correct option", "Plausible distractor", "Plausible distractor", "Plausible distractor"],
      "correctAnswer": "Must be the exact text of one of the four options",
      "explanation": "Why this answer is correct",
      "topic": "one of the topics",
      "difficulty": "easy | medium | hard"
    }
  ],` : ''}${tf > 0 ? `
  "trueFalse": [
    {
      "question": "A clear statement that is definitively true or false (${tf} total)",
      "options": ["True", "False"],
      "correctAnswer": "True | False",
      "explanation": "Brief explanation supporting the answer",
      "topic": "one of the topics",
      "difficulty": "easy | medium | hard"
    }
  ],` : ''}${sa > 0 ? `
  "shortAnswers": [
    {
      "question": "Open-ended question requiring explanation (${sa} total)",
      "referenceAnswer": "Model answer (2–4 sentences)",
      "expectedKeyConcepts": ["key term 1", "key term 2", "key term 3"],
      "topic": "one of the topics",
      "difficulty": "easy | medium | hard"
    }
  ]` : ''}
}

QUALITY RULES:
1. All questions must be answerable solely from the provided notes.
2. Answers must be accurate and consistent with the notes.
3. No duplicate or near-duplicate questions.
4. MCQ correctAnswer must match one of the four option strings exactly.
5. MCQ distractors must be plausible but clearly incorrect given the notes.
6. Vary the position of the correct MCQ answer across items (not always first).
7. shortAnswers.expectedKeyConcepts must be key terms actually present in the notes.
8. Use "easy" for pure recall, "medium" for understanding, "hard" for application/analysis.
9. Return ONLY the JSON object — no markdown fences, no commentary before or after.`;
}

// ─── Provider call implementations ───────────────────────────────────────────

async function callGemini({ key, model, prompt }) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(key);
  const geminiModel = genAI.getGenerativeModel({
    model,
    // responseMimeType forces Gemini to emit valid JSON — no markdown fences, no commentary
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  const result = await Promise.race([
    geminiModel.generateContent(prompt),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini request timed out after 60s')), 60000)
    ),
  ]);

  return result.response.text();
}

async function callOpenAI({ key, model, prompt, baseURL }) {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    apiKey: key,
    ...(baseURL ? { baseURL } : {}),
    timeout: 60000,
    maxRetries: 1,
  });

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  return response.choices[0]?.message?.content || '';
}

async function callOpenRouter({ key, model, prompt }) {
  return callOpenAI({
    key,
    model,
    prompt,
    baseURL: 'https://openrouter.ai/api/v1',
  });
}

// ─── Raw text → JSON extraction & repair ────────────────────────────────────

/**
 * Lightweight JSON repair for common LLM output issues:
 *  - Markdown fences
 *  - Trailing commas before ] or }
 *  - JavaScript-style // line comments
 *  - Truncated arrays (adds closing brackets if needed)
 */
function repairJSON(text) {
  // Remove JS-style line comments
  text = text.replace(/\/\/[^\n]*/g, '');

  // Remove trailing commas before closing brackets/braces
  text = text.replace(/,\s*([\]}])/g, '$1');

  // If the string ends mid-array (no closing ]), attempt to close open structures
  // Count unmatched braces/brackets and close them
  let open = 0;
  let openChar = '';
  const stack = [];
  for (const ch of text) {
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}') { if (stack[stack.length - 1] === '{') stack.pop(); }
    else if (ch === ']') { if (stack[stack.length - 1] === '[') stack.pop(); }
  }
  // Close any unclosed structures in reverse order
  while (stack.length > 0) {
    const opener = stack.pop();
    text += opener === '{' ? '}' : ']';
  }

  return text;
}

function extractJSON(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('Empty response from AI provider.');

  let text = raw.trim();

  // Strip possible markdown fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (fenceMatch) text = fenceMatch[1].trim();

  // Find outermost JSON object
  const firstBrace = text.indexOf('{');
  const lastBrace  = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('AI response does not contain a JSON object.');
  }
  text = text.slice(firstBrace, lastBrace + 1);

  // First attempt: direct parse (fast path — works when Gemini's JSON mode is used)
  try {
    return JSON.parse(text);
  } catch (_) {
    // Second attempt: repair common issues then re-parse
    try {
      const repaired = repairJSON(text);
      return JSON.parse(repaired);
    } catch (e) {
      throw new Error(`AI returned invalid JSON: ${e.message}`);
    }
  }
}

// ─── Schema validation & normalisation ───────────────────────────────────────

function normaliseFlashcard(card, index, subject) {
  if (!card.question?.trim() || !card.answer?.trim()) return null;
  return {
    id: `ai_fc_${Date.now()}_${index}`,
    question: card.question.trim(),
    answer: card.answer.trim(),
    explanation: card.explanation?.trim() || '',
    topic: card.topic?.trim() || subject,
    difficulty: ['easy', 'medium', 'hard'].includes(card.difficulty) ? card.difficulty : 'medium',
    sourceReference: card.sourceReference?.trim() || '',
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    state: 'new',
    nextDueDate: new Date().toISOString(),
  };
}

function normaliseMCQ(q, index, subject) {
  if (
    !q.question?.trim() ||
    !Array.isArray(q.options) ||
    q.options.length < 2 ||
    !q.correctAnswer?.trim()
  ) return null;

  // correctAnswer must be one of the listed options (exact text match)
  const trimmedOptions = q.options.map((o) => String(o).trim());
  const trimmedCorrect = q.correctAnswer.trim();
  if (!trimmedOptions.includes(trimmedCorrect)) return null;

  return {
    id: `ai_mcq_${Date.now()}_${index}`,
    question: q.question.trim(),
    options: trimmedOptions,
    correctAnswer: trimmedCorrect,
    explanation: q.explanation?.trim() || '',
    topic: q.topic?.trim() || subject,
    difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
  };
}

function normaliseTrueFalse(q, index, subject) {
  if (!q.question?.trim() || !['True', 'False'].includes(q.correctAnswer)) return null;
  return {
    id: `ai_tf_${Date.now()}_${index}`,
    question: q.question.trim(),
    options: ['True', 'False'],
    correctAnswer: q.correctAnswer,
    explanation: q.explanation?.trim() || '',
    topic: q.topic?.trim() || subject,
    difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
  };
}

function normaliseShortAnswer(q, index, subject) {
  if (!q.question?.trim() || !q.referenceAnswer?.trim()) return null;
  return {
    id: `ai_sa_${Date.now()}_${index}`,
    question: q.question.trim(),
    referenceAnswer: q.referenceAnswer.trim(),
    expectedKeyConcepts: Array.isArray(q.expectedKeyConcepts)
      ? q.expectedKeyConcepts.map((c) => String(c).trim()).filter(Boolean)
      : [],
    topic: q.topic?.trim() || subject,
    difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
  };
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

function deduplicateByQuestion(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = (item.question || '')
      .toLowerCase()
      .replace(/\W+/g, ' ')
      .trim()
      .slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Validate & filter full response ─────────────────────────────────────────

function validateAndFilter({ parsed, subject, counts, requestedTypes }) {
  const fcLimit  = requestedTypes.includes('flashcards')   ? (counts.flashcards   || 6) : 0;
  const mcqLimit = requestedTypes.includes('mcqs')         ? (counts.mcqs         || 5) : 0;
  const tfLimit  = requestedTypes.includes('true_false')   ? (counts.true_false   || 4) : 0;
  const saLimit  = requestedTypes.includes('short_answer') ? (counts.short_answer || 3) : 0;

  const flashcards = deduplicateByQuestion(
    (Array.isArray(parsed.flashcards) ? parsed.flashcards : [])
      .map((c, i) => normaliseFlashcard(c, i, subject))
      .filter(Boolean)
  ).slice(0, fcLimit);

  const mcqs = deduplicateByQuestion(
    (Array.isArray(parsed.mcqs) ? parsed.mcqs : [])
      .map((q, i) => normaliseMCQ(q, i, subject))
      .filter(Boolean)
  ).slice(0, mcqLimit);

  const trueFalse = deduplicateByQuestion(
    (Array.isArray(parsed.trueFalse) ? parsed.trueFalse : [])
      .map((q, i) => normaliseTrueFalse(q, i, subject))
      .filter(Boolean)
  ).slice(0, tfLimit);

  const shortAnswers = deduplicateByQuestion(
    (Array.isArray(parsed.shortAnswers) ? parsed.shortAnswers : [])
      .map((q, i) => normaliseShortAnswer(q, i, subject))
      .filter(Boolean)
  ).slice(0, saLimit);

  const topics =
    Array.isArray(parsed.topics) && parsed.topics.length > 0
      ? parsed.topics.map((t) => String(t).trim()).filter(Boolean).slice(0, 8)
      : [subject];

  return { flashcards, mcqs, trueFalse, shortAnswers, topics };
}

// ─── Main export: generateStudyMaterials ─────────────────────────────────────

export async function generateStudyMaterials({
  text,
  subject = 'General Studies',
  requestedTypes = ['flashcards', 'mcqs', 'true_false', 'short_answer'],
  counts = {},
}) {
  // 1. Validate & prepare input content
  const content = prepareContent(text);
  if (!content || content.length < 20) {
    throw new Error(
      'The study content is too short or empty to generate questions. Please provide more text.'
    );
  }

  // 2. Require at least one configured provider
  const providers = getProviders();
  if (providers.length === 0) {
    throw new Error(
      'No AI provider is configured. Please set GEMINI_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY ' +
      'in your server .env file and restart the server.'
    );
  }

  // 3. Build the structured prompt
  const prompt = buildPrompt({ content, subject, counts, requestedTypes });

  // 4. Try providers in priority order
  let lastError = null;

  for (const provider of providers) {
    try {
      console.log(`[AI] Attempting generation with provider: ${provider.name}, model: ${provider.model}`);
      let rawText = '';

      if (provider.name === 'gemini') {
        rawText = await callGemini({ key: provider.key, model: provider.model, prompt });
      } else if (provider.name === 'openai') {
        rawText = await callOpenAI({ key: provider.key, model: provider.model, prompt });
      } else if (provider.name === 'openrouter') {
        rawText = await callOpenRouter({ key: provider.key, model: provider.model, prompt });
      }

      // 5. Parse JSON from the response
      const parsed = extractJSON(rawText);

      // 6. Validate & normalise against schema
      const validated = validateAndFilter({ parsed, subject, counts, requestedTypes });

      // 7. Ensure something useful was returned
      const totalItems =
        validated.flashcards.length +
        validated.mcqs.length +
        validated.trueFalse.length +
        validated.shortAnswers.length;

      if (totalItems === 0) {
        throw new Error(
          'AI returned valid JSON but no usable study items passed validation. ' +
          'The content may be too brief or the model output did not match the expected schema.'
        );
      }

      console.log(
        `[AI] ✓ Success via ${provider.name}: ` +
        `${validated.flashcards.length} flashcards, ${validated.mcqs.length} MCQs, ` +
        `${validated.trueFalse.length} T/F, ${validated.shortAnswers.length} SA`
      );

      return {
        success: true,
        provider: provider.name,
        model: provider.model,
        generationMode: `ai_${provider.name}`,
        topics: validated.topics,
        flashcards: validated.flashcards,
        mcqs: validated.mcqs,
        trueFalse: validated.trueFalse,
        shortAnswers: validated.shortAnswers,
        summary:
          `Generated ${validated.flashcards.length} flashcards, ${validated.mcqs.length} MCQs, ` +
          `${validated.trueFalse.length} True/False, and ${validated.shortAnswers.length} short-answer ` +
          `questions using ${provider.name} (${provider.model}).`,
      };
    } catch (err) {
      const msg = err.message || '';
      console.warn(`[AI] Provider ${provider.name} failed: ${msg}`);
      lastError = err;
      // Continue to next provider
    }
  }

  // 8. All providers failed — surface a clear error; do NOT fall back to fake questions
  throw new Error(
    `AI generation failed across all configured providers. ` +
    `Last error: ${lastError?.message || 'Unknown error'}. ` +
    `Please verify your API key(s) are valid and the account has quota remaining, then try again.`
  );
}