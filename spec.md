# Spaced Repetition Flashcard App - Specification

## Overview
A Progressive Web App (PWA) for iPhone that implements spaced repetition learning. Users create flashcards, review them on a schedule determined by performance, and build long-term retention of material.

## Core Functionality

### 1. Card Library Management
**Card Creation**
- Simple form with two fields: Question and Answer
- Both fields support multi-line text
- Optional tags/categories for organization (e.g., "Chinese History", "Poetry", "Economics")
- "Add Card" button creates new card and adds to library
- New cards enter "New" status and won't appear in reviews until user opts in

**Card Editing**
- Browse all cards in library
- Edit question/answer text
- Delete cards
- Reset card scheduling (start over as if new)

**Card Organization**
- View cards by: All, Due Today, New, Learning, Mature
- Filter by tags/categories
- Search cards by question or answer text

### 2. Review System
**Daily Review Queue**
- Shows cards due for review today
- Counter: "X cards due today"
- Cards presented one at a time
- Question shown first, answer hidden
- "Show Answer" button reveals answer
- Four grading buttons: Again, Hard, Good, Easy

**Review Flow**
1. User sees question
2. User mentally recalls answer
3. User taps "Show Answer"
4. User grades themselves based on recall quality
5. Next card appears (or "All done!" if queue empty)

**Grading Guidelines** (shown to user)
- **Again**: Complete failure to recall; start over
- **Hard**: Recalled with significant difficulty
- **Good**: Recalled correctly with normal effort
- **Easy**: Recalled instantly, felt too easy

### 3. Spaced Repetition Algorithm

**Card States**
- **New**: Never reviewed
- **Learning**: Currently being learned (interval < 7 days)
- **Mature**: Well-learned (interval ≥ 7 days)

**Card Data Structure**
Each card stores:
- `question` (string)
- `answer` (string)
- `tags` (array of strings)
- `status` (New/Learning/Mature)
- `interval` (days until next review)
- `easeFactor` (difficulty multiplier, starts at 2.5)
- `nextReview` (date object)
- `lastReview` (date object)
- `reviewCount` (total reviews)
- `lapses` (times user clicked "Again")

**Scheduling Algorithm** (SuperMemo 2 variant)

For new cards on first review:
- Again: 1 day
- Hard: 1 day  
- Good: 1 day
- Easy: 4 days

For cards being reviewed again:
- **Again**: 
  - interval = 1 day
  - easeFactor -= 0.2 (minimum 1.3)
  - lapses += 1
  
- **Hard**:
  - interval = interval × 1.2
  - easeFactor -= 0.15
  
- **Good**:
  - interval = interval × easeFactor
  
- **Easy**:
  - interval = interval × easeFactor × 1.3
  - easeFactor += 0.15 (maximum 2.5)

All intervals rounded to nearest integer. Cards graduate to "Mature" when interval ≥ 7 days.

### 4. Statistics Dashboard
Simple stats display:
- Total cards in library
- Cards due today
- New cards not yet started
- Learning cards (interval < 7 days)
- Mature cards (interval ≥ 7 days)
- Review streak (consecutive days with reviews)

## User Interface Design

### Navigation Structure
Three main screens accessible via bottom navigation bar:
1. **Review** (home screen, primary use)
2. **Library** (browse/edit cards)
3. **Add Card** (create new cards)
4. **Stats** (progress dashboard)

### Screen Layouts

**Review Screen**
- Card counter at top: "5 cards due today"
- Large card display area showing question
- "Show Answer" button (when answer hidden)
- Four grading buttons (when answer shown)
- Empty state when no cards due: "All done! Come back tomorrow"

**Library Screen**  
- Filter tabs: All / Due / New / Learning / Mature
- Search bar
- List of cards showing question preview
- Tap card to see options: View, Edit, Delete, Reset

**Add Card Screen**
- Question textarea
- Answer textarea  
- Tag input (optional)
- "Add Card" button
- Success message on creation

**Stats Screen**
- Simple card with key metrics
- No graphs initially (can add later)

### Mobile-Specific Design
- Large tap targets (minimum 44px height)
- Clean typography, readable at default iPhone text size
- Minimal scrolling on review screen
- Swipe gestures optional (buttons are clearer for grading)

## Technical Implementation

### Technology Stack
- **Frontend**: HTML5, CSS3, vanilla JavaScript (no frameworks needed for MVP)
- **Storage**: localStorage (built into all browsers)
- **PWA Features**: Service worker for offline capability, web manifest for home screen installation

### Data Storage
All data stored in browser localStorage as JSON:
```javascript
{
  cards: [/* array of card objects */],
  settings: {/* user preferences */},
  stats: {/* global statistics */}
}
```

### PWA Requirements
- Web manifest file (app name, icons, display mode)
- Service worker for offline functionality
- Works without internet connection after first load
- Installable to iPhone home screen

## Additional Features

### Import/Export
- **Export**: Download all cards as JSON file
- **Import**: Upload JSON file to restore/merge cards
- Prevents data loss if localStorage is cleared

### Settings
- Daily review limit (default: unlimited)
- New cards per day (default: 20)
- Reset all progress (nuclear option)

### Future Enhancements (Not MVP)
- Reverse cards (answer → question practice)
- Image support in questions/answers
- Shared decks (export/import from others)
- Sync across devices
- Review history graphs
- Custom scheduling parameters

## Success Criteria
App is successful if:
1. Works reliably on iPhone Safari
2. Cards actually space out correctly (easy cards seen less frequently)
3. Data persists between sessions
4. Interface is fast and responsive
5. User can comfortably review 20+ cards in under 10 minutes

## Open Questions for Refinement
1. Should new cards automatically enter review queue or require manual opt-in?
2. Maximum characters for question/answer fields?
3. Should tags be free-form or predefined categories?
4. Import format: JSON only or also support Anki exports?