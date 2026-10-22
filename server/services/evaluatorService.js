/**
 * Evaluates short-answer responses against expected key concepts and reference answers.
 * Implements concept presence extraction, token similarity, and constructive pedagogical feedback.
 */

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can',
  'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'my',
  'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who',
  'whom', 'why', 'with', 'won\'t', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
]);

function cleanText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getKeywords(text) {
  const cleaned = cleanText(text);
  const words = cleaned.split(' ').filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

export function evaluateShortAnswer({
  submittedAnswer,
  referenceAnswer,
  expectedKeyConcepts = [],
  questionText = '',
}) {
  const cleanSubmitted = cleanText(submittedAnswer);
  const cleanRef = cleanText(referenceAnswer);

  if (!cleanSubmitted || cleanSubmitted.length < 3) {
    return {
      isCorrect: false,
      score: 0,
      conceptsMatched: [],
      conceptsMissed: expectedKeyConcepts,
      summary: 'No answer or response too brief to evaluate.',
      guidance: 'Please provide a more detailed explanation covering the core concepts.',
    };
  }

  const studentWords = getKeywords(cleanSubmitted);
  const refWords = getKeywords(cleanRef);

  // 1. Concept matching
  const conceptsMatched = [];
  const conceptsMissed = [];

  for (const concept of expectedKeyConcepts) {
    const cleanConcept = cleanText(concept);
    const conceptWords = cleanConcept.split(' ').filter(Boolean);

    // Check if entire concept phrase exists in submitted text
    if (cleanSubmitted.includes(cleanConcept)) {
      conceptsMatched.push(concept);
      continue;
    }

    // Check if most words in the concept are present
    const matchedCount = conceptWords.filter((w) => studentWords.has(w) || cleanSubmitted.includes(w)).length;
    if (conceptWords.length > 0 && matchedCount / conceptWords.length >= 0.7) {
      conceptsMatched.push(concept);
    } else {
      conceptsMissed.push(concept);
    }
  }

  // 2. Keyword overlap with reference answer (Jaccard-like index on content words)
  let keywordOverlap = 0;
  if (refWords.size > 0) {
    let intersection = 0;
    for (const w of refWords) {
      if (studentWords.has(w)) intersection++;
    }
    keywordOverlap = intersection / refWords.size;
  }

  // 3. Composite score calculation
  const conceptWeight = expectedKeyConcepts.length > 0 ? 0.7 : 0.3;
  const keywordWeight = 1.0 - conceptWeight;

  const conceptScore = expectedKeyConcepts.length > 0 ? conceptsMatched.length / expectedKeyConcepts.length : keywordOverlap;
  const compositeScore = Math.min(1.0, Math.max(0.0, conceptScore * conceptWeight + keywordOverlap * keywordWeight));
  const roundedScore = Math.round(compositeScore * 100) / 100;

  const isCorrect = roundedScore >= 0.50 || (conceptsMatched.length >= 1 && (conceptsMatched.length / Math.max(1, expectedKeyConcepts.length)) >= 0.30 && roundedScore >= 0.35);

  // 4. Constructive feedback generation
  let summary = '';
  let guidance = '';

  if (isCorrect) {
    if (conceptsMissed.length === 0) {
      summary = 'Excellent understanding! You covered all essential key concepts.';
      guidance = 'Your explanation demonstrates high retention and conceptual clarity.';
    } else {
      summary = `Solid explanation. You correctly identified ${conceptsMatched.join(', ')}.`;
      guidance = `To make your response even stronger, also consider mentioning: ${conceptsMissed.join(', ')}.`;
    }
  } else {
    if (conceptsMatched.length > 0) {
      summary = `Partially correct. You noted ${conceptsMatched.join(', ')}, but missed key mechanisms.`;
      guidance = `Try reinforcing the following missing concepts: ${conceptsMissed.join(', ')}. Reference answer: "${referenceAnswer}"`;
    } else {
      summary = 'The response does not yet address the core mechanism.';
      guidance = `Focus on key principles: ${expectedKeyConcepts.join(', ') || 'review the reference concept'}. Reference answer: "${referenceAnswer}"`;
    }
  }

  return {
    isCorrect,
    score: roundedScore,
    conceptsMatched,
    conceptsMissed,
    summary,
    guidance,
  };
}
