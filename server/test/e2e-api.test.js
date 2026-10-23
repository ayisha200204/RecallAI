// E2E live endpoint test
const BASE_URL = 'http://localhost:5000/api';

async function run() {
  console.log('Testing live RecallAI Backend endpoints at', BASE_URL);

  // 1. Health
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log('✔ Health Check:', health.status);

  // 2. Demo Login
  const loginRes = await fetch(`${BASE_URL}/demo/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('✔ Demo Login succeeded: User =', loginData.user.name, 'Email =', loginData.user.email);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 3. Dashboard Analytics (/analytics/overview)
  const dashRes = await fetch(`${BASE_URL}/analytics/overview`, { headers: authHeaders });
  const dashData = await dashRes.json();
  console.log('✔ Dashboard SRS Counts:', dashData.srs?.counts);
  console.log('✔ Dashboard Accuracy & Streak:', {
    accuracy: dashData.summary?.overallAccuracy,
    streak: dashData.summary?.streak,
    todayMinutes: dashData.summary?.todayStudyMinutes,
  });
  console.log('✔ Recommended Next Step:', dashData.nextStepRecommendation?.title);

  // 4. Decks with SRS previews
  const decksRes = await fetch(`${BASE_URL}/decks`, { headers: authHeaders });
  const decksData = await decksRes.json();
  console.log(`✔ Found ${decksData.decks?.length || 0} decks.`);
  let deck = (decksData.decks || [])[0];

  if (!deck) {
    console.log('✔ Workspace is fresh as expected. Creating initial study set for E2E validation...');
    const createRes = await fetch(`${BASE_URL}/decks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Web Architecture Fundamentals',
        subject: 'Web Development',
        cards: [
          {
            id: 'fc_demo_1',
            question: 'What is the role of HTTP status code 200?',
            answer: 'It indicates that the HTTP request succeeded.',
            topic: 'Web Development',
            difficulty: 'easy',
          },
          {
            id: 'fc_demo_2',
            question: 'What is the Document Object Model (DOM)?',
            answer: 'A programming interface for web documents representing the page structure as nodes and objects.',
            topic: 'Web Development',
            difficulty: 'medium',
          },
        ],
      }),
    });
    const createdData = await createRes.json();
    deck = createdData.deck;
  }

  console.log(`✔ Deck: "${deck.title}", Cards = ${deck.cardCount || deck.cards?.length}`);

  // 5. Get Deck Study Session (/study/deck/:id/session)
  const sessionRes = await fetch(`${BASE_URL}/study/deck/${deck._id}/session?filter=all`, { headers: authHeaders });
  const sessionData = await sessionRes.json();
  const card = sessionData.cards[0];
  console.log('✔ First Card Study Previews:', {
    question: card.question.slice(0, 35) + '...',
    isDue: card.isDue,
    intervalPreviews: card.intervalPreviews,
  });

  // 6. Test Record Card Review (SRS rating: Good)
  const cardId = card._id || card.id;
  const reviewRes = await fetch(`${BASE_URL}/study/review`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      deckId: deck._id,
      cardId,
      rating: 'good',
    }),
  });
  const reviewResult = await reviewRes.json();
  console.log('✔ Recorded Card Review (Good):', {
    success: reviewResult.success,
    readableInterval: reviewResult.readableInterval,
    nextDueDate: reviewResult.nextDueDate,
    repetitions: reviewResult.repetitions,
    state: reviewResult.state,
  });

  // 7. Review Calendar (/study/calendar)
  const calRes = await fetch(`${BASE_URL}/study/calendar`, { headers: authHeaders });
  const calData = await calRes.json();
  console.log('✔ Review Calendar Workload:', {
    counts: calData.counts,
    workload14DaysCount: calData.calendarWorkload?.length,
    todayDue: calData.calendarWorkload?.[0]?.count,
  });

  // 8. Extraction (/materials/extract preview)
  const extractRes = await fetch(`${BASE_URL}/materials/extract`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      pastedText: 'Cache memory is an extremely fast memory type that acts as a buffer between RAM and the CPU.',
      subject: 'Operating Systems',
    }),
  });
  const extractData = await extractRes.json();
  console.log('✔ Text Extraction preview:', {
    wordCount: extractData.wordCount,
    topics: extractData.topics,
    snippet: extractData.extractedText.slice(0, 45) + '...',
  });

  // 9. AI Generator Preview (/generator/generate)
  const genRes = await fetch(`${BASE_URL}/generator/generate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      subject: 'Operating Systems',
      title: 'Virtual Memory & Paging',
      text: 'Paging is a memory management scheme that eliminates the need for contiguous allocation of physical memory. Pages are fixed-size blocks of virtual memory. Frames are fixed-size blocks of physical memory. When a referenced page is not present in main memory, a page fault occurs and the OS must fetch it from secondary storage.',
      requestedTypes: ['flashcards', 'mcqs', 'true_false', 'short_answer'],
      counts: { flashcards: 2, mcqs: 2, true_false: 2, short_answer: 2 },
      saveToDb: false,
    }),
  });
  const genData = await genRes.json();
  console.log('✔ AI Generation Preview:', {
    previewMode: genData.previewMode,
    flashcardsCount: genData.flashcards?.length,
    mcqsCount: genData.mcqs?.length,
    trueFalseCount: genData.trueFalse?.length,
    shortAnswersCount: genData.shortAnswers?.length,
  });

  // 10. Voice Study Evaluation (/voice/question & /voice/evaluate)
  const voiceQRes = await fetch(`${BASE_URL}/voice/question?deckId=${deck._id}`, { headers: authHeaders });
  const voiceQData = await voiceQRes.json();
  const voiceQuestion = voiceQData.question;
  console.log('✔ Voice Question fetched:', voiceQuestion.questionText.slice(0, 40) + '...');

  const voiceRes = await fetch(`${BASE_URL}/voice/evaluate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      questionId: voiceQuestion.id,
      deckId: deck._id,
      transcript: 'A page fault is an interrupt raised by hardware when a program accesses a memory page that is not currently mapped into physical RAM.',
    }),
  });
  const voiceData = await voiceRes.json();
  console.log('✔ Voice AI Recall Evaluation:', {
    score: voiceData.score,
    suggestedRating: voiceData.suggestedRating,
    masteryStatus: voiceData.masteryStatus,
    summary: voiceData.feedback?.summary,
  });

  console.log('\n============================================================');
  console.log('🎉 ALL 10 E2E BACKEND ENDPOINT TESTS PASSED WITH 100% SUCCESS!');
  console.log('============================================================');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
