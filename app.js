// ─── State ────────────────────────────────────────────────────────────────────
let data;
let reviewQueue = [];
let libFilter    = 'all';
let libSearch    = '';
let libTagFilter = '';

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  await ImageStore.init();
  data = Storage.load();
  setupNav();
  setupReview();
  setupLibrary();
  setupAddCard();
  setupStats();
  registerSW();
  navigate('review');
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  });
}

function navigate(screen) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('[data-nav]').forEach(b  => b.classList.remove('active'));
  document.getElementById('screen-' + screen).classList.add('active');
  document.querySelector(`[data-nav="${screen}"]`).classList.add('active');
  if (screen === 'review')  renderReview();
  if (screen === 'library') renderLibrary();
  if (screen === 'stats')   renderStats();
}

// ─── Review ───────────────────────────────────────────────────────────────────
function setupReview() {
  document.getElementById('btn-show-answer').addEventListener('click', () => {
    document.getElementById('card-answer').hidden  = false;
    document.getElementById('card-divider').hidden = false;
    document.getElementById('btn-show-answer').hidden = true;
    document.getElementById('grade-area').hidden   = false;
    const aImg = document.getElementById('card-answer-img');
    if (aImg.dataset.hasImage === '1') aImg.hidden = false;
  });

  document.querySelectorAll('[data-grade]').forEach(btn => {
    btn.addEventListener('click', () => gradeCard(btn.dataset.grade));
  });
}

function renderReview() {
  data = Storage.load();
  reviewQueue = Scheduler.buildReviewQueue(data.cards, data.settings.newCardsPerDay);
  showCard();
}

async function showCard() {
  const card      = reviewQueue[0];
  const counter   = document.getElementById('review-counter');
  const cardArea  = document.getElementById('card-area');
  const emptyState = document.getElementById('empty-state');
  const qImg = document.getElementById('card-question-img');
  const aImg = document.getElementById('card-answer-img');

  if (!card) {
    counter.textContent = '';
    cardArea.hidden     = true;
    emptyState.hidden   = false;
    document.getElementById('btn-show-answer').hidden = true;
    document.getElementById('grade-area').hidden      = true;
    return;
  }

  const n = reviewQueue.length;
  counter.textContent = `${n} card${n !== 1 ? 's' : ''} left`;

  document.getElementById('card-question').textContent = card.question;
  document.getElementById('card-answer').textContent   = card.answer;
  document.getElementById('card-answer').hidden        = true;
  document.getElementById('card-divider').hidden       = true;
  document.getElementById('btn-show-answer').hidden    = false;
  document.getElementById('grade-area').hidden         = true;
  cardArea.hidden  = false;
  emptyState.hidden = true;

  // Show question image
  if (card.questionImage) {
    const url = await ImageStore.get(card.questionImage);
    if (url) { qImg.src = url; qImg.hidden = false; } else { qImg.hidden = true; }
  } else { qImg.hidden = true; qImg.src = ''; }

  // Show answer image (hidden until answer revealed)
  if (card.answerImage) {
    const url = await ImageStore.get(card.answerImage);
    if (url) { aImg.src = url; aImg.dataset.hasImage = '1'; } else { aImg.dataset.hasImage = ''; }
  } else { aImg.dataset.hasImage = ''; aImg.src = ''; }
  aImg.hidden = true;
}

function gradeCard(grade) {
  const card    = reviewQueue.shift();
  const updated = Scheduler.schedule(card, grade);

  const idx = data.cards.findIndex(c => c.id === card.id);
  if (idx !== -1) data.cards[idx] = updated;

  updateStreak();
  Storage.save(data);

  if (grade === 'again') reviewQueue.push(updated);
  showCard();
}

function updateStreak() {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (data.stats.lastReviewDate === today) return;
  data.stats.streak = (data.stats.lastReviewDate === yesterday) ? data.stats.streak + 1 : 1;
  data.stats.lastReviewDate = today;
}

// ─── Library ──────────────────────────────────────────────────────────────────
function setupLibrary() {
  document.getElementById('lib-search').addEventListener('input', e => {
    libSearch = e.target.value.toLowerCase();
    renderLibrary();
  });

  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      libFilter    = btn.dataset.filter;
      libTagFilter = '';
      renderLibrary();
    });
  });

  document.getElementById('card-list').addEventListener('click', e => {
    const item = e.target.closest('[data-card-id]');
    if (item) openCardModal(item.dataset.cardId);
  });

  document.getElementById('tag-chips').addEventListener('click', e => {
    const chip = e.target.closest('[data-tag]');
    if (!chip) return;
    libTagFilter = libTagFilter === chip.dataset.tag ? '' : chip.dataset.tag;
    renderLibrary();
  });
}

function renderLibrary() {
  const allTags    = [...new Set(data.cards.flatMap(c => c.tags))].sort();
  const tagChipsEl = document.getElementById('tag-chips');
  tagChipsEl.hidden = allTags.length === 0;
  tagChipsEl.innerHTML = allTags.map(tag =>
    `<button class="tag-chip${libTagFilter === tag ? ' active' : ''}" data-tag="${esc(tag)}">${esc(tag)}</button>`
  ).join('');

  const filtered = data.cards.filter(card => {
    if (libFilter === 'due'      && !Scheduler.isDue(card))           return false;
    if (libFilter === 'new'      && card.status !== 'New')            return false;
    if (libFilter === 'learning' && card.status !== 'Learning')       return false;
    if (libFilter === 'mature'   && card.status !== 'Mature')         return false;
    if (libTagFilter && !card.tags.includes(libTagFilter))            return false;
    if (libSearch) {
      const hay = (card.question + ' ' + card.answer + ' ' + card.tags.join(' ')).toLowerCase();
      if (!hay.includes(libSearch)) return false;
    }
    return true;
  });

  const listEl = document.getElementById('card-list');
  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">No cards found.</p>';
    return;
  }

  listEl.innerHTML = filtered.map(card => {
    const preview = card.question.length > 120
      ? card.question.slice(0, 120) + '…'
      : card.question;
    const tags = card.tags.map(t => `<span class="tag-badge">${esc(t)}</span>`).join('');
    const interval = card.interval ? `<span class="interval-badge">${card.interval}d</span>` : '';
    const hasImg = (card.questionImage || card.answerImage) ? '<span class="image-indicator">IMG</span>' : '';
    return `
      <div class="card-item" data-card-id="${card.id}">
        <div class="card-item-q">${esc(preview)}</div>
        <div class="card-item-meta">
          <span class="status-badge status-${card.status.toLowerCase()}">${card.status}</span>
          ${interval}
          ${hasImg}
          ${tags}
        </div>
      </div>`;
  }).join('');
}

async function openCardModal(id) {
  const card = data.cards.find(c => c.id === id);
  if (!card) return;

  document.getElementById('card-modal')?.remove();

  let modalQFile = null, modalAFile = null;
  let removeQImg = false, removeAImg = false;

  const qImgUrl = card.questionImage ? await ImageStore.get(card.questionImage) : null;
  const aImgUrl = card.answerImage   ? await ImageStore.get(card.answerImage)   : null;

  const modal = document.createElement('div');
  modal.id = 'card-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h3>Edit Card</h3>
      <label class="field-label">Question
        <textarea id="modal-q" rows="3">${esc(card.question)}</textarea>
      </label>
      <div class="image-upload-row">
        <button type="button" id="modal-btn-q-img" class="btn-secondary image-upload-btn">${qImgUrl ? 'Change Image' : 'Add Image'}</button>
        <input type="file" id="modal-input-q-img" accept="image/*" hidden>
        <div id="modal-preview-q" class="image-preview" ${qImgUrl ? '' : 'hidden'}>
          <img id="modal-preview-q-el" ${qImgUrl ? `src="${qImgUrl}"` : ''}>
          <button type="button" class="image-remove-btn" data-modal-clear="q">&times;</button>
        </div>
      </div>
      <label class="field-label">Answer
        <textarea id="modal-a" rows="3">${esc(card.answer)}</textarea>
      </label>
      <div class="image-upload-row">
        <button type="button" id="modal-btn-a-img" class="btn-secondary image-upload-btn">${aImgUrl ? 'Change Image' : 'Add Image'}</button>
        <input type="file" id="modal-input-a-img" accept="image/*" hidden>
        <div id="modal-preview-a" class="image-preview" ${aImgUrl ? '' : 'hidden'}>
          <img id="modal-preview-a-el" ${aImgUrl ? `src="${aImgUrl}"` : ''}>
          <button type="button" class="image-remove-btn" data-modal-clear="a">&times;</button>
        </div>
      </div>
      <label class="field-label">Tags (comma-separated)
        <input type="text" id="modal-tags" value="${esc(card.tags.join(', '))}">
      </label>
      <div class="modal-btns">
        <button id="modal-save"   class="btn-primary">Save</button>
        <button id="modal-reset"  class="btn-secondary">Reset Progress</button>
        <button id="modal-delete" class="btn-danger">Delete Card</button>
        <button id="modal-cancel" class="btn-ghost">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Image upload handlers
  modal.querySelector('#modal-btn-q-img').addEventListener('click', () => {
    modal.querySelector('#modal-input-q-img').click();
  });
  modal.querySelector('#modal-input-q-img').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    modalQFile = file; removeQImg = false;
    modal.querySelector('#modal-preview-q-el').src = URL.createObjectURL(file);
    modal.querySelector('#modal-preview-q').hidden = false;
    modal.querySelector('#modal-btn-q-img').textContent = 'Change Image';
  });
  modal.querySelector('#modal-btn-a-img').addEventListener('click', () => {
    modal.querySelector('#modal-input-a-img').click();
  });
  modal.querySelector('#modal-input-a-img').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    modalAFile = file; removeAImg = false;
    modal.querySelector('#modal-preview-a-el').src = URL.createObjectURL(file);
    modal.querySelector('#modal-preview-a').hidden = false;
    modal.querySelector('#modal-btn-a-img').textContent = 'Change Image';
  });

  modal.querySelectorAll('[data-modal-clear]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.modalClear === 'q') {
        modalQFile = null; removeQImg = true;
        modal.querySelector('#modal-preview-q').hidden = true;
        modal.querySelector('#modal-btn-q-img').textContent = 'Add Image';
      } else {
        modalAFile = null; removeAImg = true;
        modal.querySelector('#modal-preview-a').hidden = true;
        modal.querySelector('#modal-btn-a-img').textContent = 'Add Image';
      }
    });
  });

  const close = () => modal.remove();
  modal.querySelector('.modal-backdrop').addEventListener('click', close);
  modal.querySelector('#modal-cancel').addEventListener('click', close);

  modal.querySelector('#modal-save').addEventListener('click', async () => {
    const q = modal.querySelector('#modal-q').value.trim();
    const a = modal.querySelector('#modal-a').value.trim();
    if (!q || !a) return;
    const tags = modal.querySelector('#modal-tags').value.split(',').map(s => s.trim()).filter(Boolean);
    const idx  = data.cards.findIndex(c => c.id === card.id);

    let newQImg = card.questionImage;
    let newAImg = card.answerImage;

    if (modalQFile) {
      if (card.questionImage) await ImageStore.del(card.questionImage);
      newQImg = await ImageStore.save(modalQFile);
    } else if (removeQImg && card.questionImage) {
      await ImageStore.del(card.questionImage);
      newQImg = null;
    }

    if (modalAFile) {
      if (card.answerImage) await ImageStore.del(card.answerImage);
      newAImg = await ImageStore.save(modalAFile);
    } else if (removeAImg && card.answerImage) {
      await ImageStore.del(card.answerImage);
      newAImg = null;
    }

    data.cards[idx] = { ...card, question: q, answer: a, tags, questionImage: newQImg, answerImage: newAImg };
    Storage.save(data);
    close();
    renderLibrary();
  });

  modal.querySelector('#modal-reset').addEventListener('click', () => {
    if (!confirm("Reset this card's progress? It will start over as New.")) return;
    const idx   = data.cards.findIndex(c => c.id === card.id);
    const reset = Scheduler.createCard(card.question, card.answer, card.tags, card.questionImage, card.answerImage);
    reset.id    = card.id;
    data.cards[idx] = reset;
    Storage.save(data);
    close();
    renderLibrary();
  });

  modal.querySelector('#modal-delete').addEventListener('click', async () => {
    if (!confirm('Delete this card? This cannot be undone.')) return;
    if (card.questionImage) await ImageStore.del(card.questionImage);
    if (card.answerImage)   await ImageStore.del(card.answerImage);
    data.cards = data.cards.filter(c => c.id !== card.id);
    Storage.save(data);
    close();
    renderLibrary();
  });
}

// ─── Add Card ─────────────────────────────────────────────────────────────────
let pendingQFile = null;
let pendingAFile = null;

function setupAddCard() {
  const form = document.getElementById('add-form');
  form.addEventListener('submit', handleAddCard);
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddCard(e);
  });

  // Question image
  document.getElementById('btn-q-img').addEventListener('click', () => {
    document.getElementById('input-q-img').click();
  });
  document.getElementById('input-q-img').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    pendingQFile = file;
    const preview = document.getElementById('preview-q-img');
    document.getElementById('preview-q-img-el').src = URL.createObjectURL(file);
    preview.hidden = false;
    document.getElementById('btn-q-img').textContent = 'Change Image';
  });

  // Answer image
  document.getElementById('btn-a-img').addEventListener('click', () => {
    document.getElementById('input-a-img').click();
  });
  document.getElementById('input-a-img').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    pendingAFile = file;
    const preview = document.getElementById('preview-a-img');
    document.getElementById('preview-a-img-el').src = URL.createObjectURL(file);
    preview.hidden = false;
    document.getElementById('btn-a-img').textContent = 'Change Image';
  });

  // Remove image buttons
  document.querySelectorAll('.image-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.clear === 'q') {
        pendingQFile = null;
        document.getElementById('input-q-img').value = '';
        document.getElementById('preview-q-img').hidden = true;
        document.getElementById('btn-q-img').textContent = 'Add Image';
      } else {
        pendingAFile = null;
        document.getElementById('input-a-img').value = '';
        document.getElementById('preview-a-img').hidden = true;
        document.getElementById('btn-a-img').textContent = 'Add Image';
      }
    });
  });
}

async function handleAddCard(e) {
  e.preventDefault();
  const q = document.getElementById('new-q').value.trim();
  const a = document.getElementById('new-a').value.trim();
  if (!q || !a) return;
  const tags = document.getElementById('new-tags').value.split(',').map(s => s.trim()).filter(Boolean);

  let qImgKey = null, aImgKey = null;
  if (pendingQFile) qImgKey = await ImageStore.save(pendingQFile);
  if (pendingAFile) aImgKey = await ImageStore.save(pendingAFile);

  data.cards.push(Scheduler.createCard(q, a, tags, qImgKey, aImgKey));
  Storage.save(data);

  // Reset form and image state
  document.getElementById('add-form').reset();
  pendingQFile = null; pendingAFile = null;
  document.getElementById('preview-q-img').hidden = true;
  document.getElementById('preview-a-img').hidden = true;
  document.getElementById('btn-q-img').textContent = 'Add Image';
  document.getElementById('btn-a-img').textContent = 'Add Image';
  document.getElementById('new-q').focus();

  const msg = document.getElementById('add-success');
  msg.hidden = false;
  clearTimeout(msg._hideTimer);
  msg._hideTimer = setTimeout(() => { msg.hidden = true; }, 2000);
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function setupStats() {
  document.getElementById('btn-export').addEventListener('click', async () => {
    const d = Storage.load();
    const imageKeys = d.cards.flatMap(c => [c.questionImage, c.answerImage]).filter(Boolean);
    const images = await ImageStore.exportAll(imageKeys);
    const exportData = { ...d, _images: images };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `memoryapp-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-input').click();
  });

  document.getElementById('import-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const images = parsed._images || {};
        delete parsed._images;
        if (Storage.importJSON(JSON.stringify(parsed))) {
          await ImageStore.importAll(images);
          data = Storage.load();
          renderStats();
          alert('Import successful!');
        } else {
          alert('Import failed: invalid file format.');
        }
      } catch {
        alert('Import failed: invalid file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!confirm('Delete ALL cards and reset all progress? This cannot be undone.')) return;
    data = { cards: [], settings: { newCardsPerDay: 20 }, stats: { streak: 0, lastReviewDate: null } };
    Storage.save(data);
    renderStats();
  });

  document.getElementById('new-cards-input').addEventListener('change', e => {
    const val = Math.max(1, Math.min(200, parseInt(e.target.value, 10) || 20));
    e.target.value = val;
    data.settings.newCardsPerDay = val;
    Storage.save(data);
  });
}

function renderStats() {
  data = Storage.load();
  const cards = data.cards;
  const rows = [
    ['Total',    cards.length],
    ['Due Today', cards.filter(c => Scheduler.isDue(c)).length],
    ['New',       cards.filter(c => c.status === 'New').length],
    ['Learning',  cards.filter(c => c.status === 'Learning').length],
    ['Mature',    cards.filter(c => c.status === 'Mature').length],
    ['Streak',    data.stats.streak + (data.stats.streak === 1 ? ' day' : ' days')],
  ];
  document.getElementById('stats-grid').innerHTML = rows
    .map(([label, val]) =>
      `<div class="stat-card"><span class="stat-val">${val}</span><span class="stat-label">${label}</span></div>`)
    .join('');
  document.getElementById('new-cards-input').value = data.settings.newCardsPerDay;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
