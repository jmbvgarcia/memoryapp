const Scheduler = (() => {

  function createCard(question, answer, tags = [], questionImage = null, answerImage = null) {
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      question,
      answer,
      tags,
      questionImage,
      answerImage,
      status: 'New',
      interval: 0,
      easeFactor: 2.5,
      nextReview: new Date().toISOString(), // due immediately (auto-start)
      lastReview: null,
      reviewCount: 0,
      lapses: 0,
    };
  }

  function schedule(card, grade) {
    const c = { ...card };
    const isFirst = c.reviewCount === 0;
    c.reviewCount++;
    c.lastReview = new Date().toISOString();

    if (isFirst) {
      c.interval = grade === 'easy' ? 4 : 1;
    } else {
      switch (grade) {
        case 'again':
          c.interval = 1;
          c.easeFactor = Math.max(1.3, c.easeFactor - 0.2);
          c.lapses++;
          break;
        case 'hard':
          c.interval = Math.max(1, Math.round(c.interval * 1.2));
          c.easeFactor = Math.max(1.3, c.easeFactor - 0.15);
          break;
        case 'good':
          c.interval = Math.max(1, Math.round(c.interval * c.easeFactor));
          break;
        case 'easy':
          c.interval = Math.max(1, Math.round(c.interval * c.easeFactor * 1.3));
          c.easeFactor = Math.min(2.5, c.easeFactor + 0.15);
          break;
      }
    }

    c.status = c.interval >= 7 ? 'Mature' : 'Learning';

    const next = new Date();
    next.setDate(next.getDate() + c.interval);
    next.setHours(0, 0, 0, 0);
    c.nextReview = next.toISOString();

    return c;
  }

  function isDue(card) {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return new Date(card.nextReview) <= endOfToday;
  }

  function buildReviewQueue(cards, newCardsPerDay) {
    const dueNonNew = cards.filter(c => c.status !== 'New' && isDue(c));
    const dueNew    = cards.filter(c => c.status === 'New'  && isDue(c)).slice(0, newCardsPerDay);
    return [...dueNonNew, ...dueNew];
  }

  return { createCard, schedule, isDue, buildReviewQueue };
})();
