# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Progressive Web App (PWA) for iPhone implementing spaced repetition flashcard learning. The full specification is in [spec.md](spec.md).

**Stack:** Vanilla HTML5/CSS3/JavaScript — no frameworks, no build tools, no npm. All data persists in browser `localStorage` as JSON.

## Architecture

This is a single-page app with four screens accessed via a bottom navigation bar:
- **Review** — main daily use screen (default)
- **Library** — browse, search, edit, delete cards
- **Add Card** — create new cards
- **Stats** — metrics dashboard

### Planned File Structure

```
index.html          — SPA shell with all screen markup
manifest.json       — PWA manifest (icons, display mode)
service-worker.js   — Offline caching
styles.css          — All styling (mobile-first, iPhone Safari target)
app.js              — App init, screen routing, navigation
storage.js          — localStorage abstraction (load/save/export/import)
scheduler.js        — SuperMemo 2 spaced repetition algorithm
```

### Data Model

All data lives in one `localStorage` key as JSON:

```javascript
{
  cards: [{
    question, answer, tags,
    status,       // 'New' | 'Learning' | 'Mature'
    interval,     // days until next review
    easeFactor,   // difficulty multiplier, starts 2.5, min 1.3, max 2.5
    nextReview, lastReview, reviewCount, lapses
  }],
  settings: { dailyReviewLimit, newCardsPerDay },
  stats: { /* global statistics */ }
}
```

### Spaced Repetition Algorithm (SuperMemo 2 variant)

First review of a new card: Again/Hard/Good → 1 day; Easy → 4 days.

Subsequent reviews:
- **Again**: interval = 1, easeFactor -= 0.2, lapses++
- **Hard**: interval = interval × 1.2, easeFactor -= 0.15
- **Good**: interval = interval × easeFactor
- **Easy**: interval = interval × easeFactor × 1.3, easeFactor += 0.15

All intervals rounded to nearest integer. Cards become Mature when interval ≥ 7 days.

## Key Constraints

- **No backend** — fully client-side, no server required
- **No framework** — vanilla JS only; do not introduce React, Vue, etc.
- **No build step** — files are served directly; avoid anything requiring compilation
- **iPhone Safari target** — all UI decisions prioritize iOS Safari compatibility
- **Minimum 44px tap targets** on interactive elements
