import { state, elements, escapeHtml } from './state.js';
import { api } from './api.js';
function statusLabel(status) {
  return {
    new: 'New',
    learning: 'Learning',
    familiar: 'Familiar',
    mastered: 'Mastered'
  }[status] || 'New';
}

function renderVocabulary(items, reviewItems) {
  elements.vocabCount.textContent = `${items.length} saved`;

  if (!reviewItems.length) {
    elements.reviewList.innerHTML = '<p class="muted">No words due today. Add a new phrase from your speaking practice.</p>';
  } else {
    elements.reviewList.innerHTML = reviewItems.map(item => `
      <article class="review-card">
        <div>
          <strong>${escapeHtml(item.term)}</strong>
          <p>${escapeHtml(item.meaning)}</p>
          ${item.example ? `<small>${escapeHtml(item.example)}</small>` : ''}
        </div>
        <div class="review-actions">
          <button type="button" class="secondary-button" data-review="${escapeHtml(item.id)}" data-result="again">Again</button>
          <button type="button" class="secondary-button" data-review="${escapeHtml(item.id)}" data-result="good">Good</button>
          <button type="button" class="primary-button" data-review="${escapeHtml(item.id)}" data-result="mastered">Mastered</button>
        </div>
      </article>
    `).join('');
  }

  if (!items.length) {
    elements.wordBank.innerHTML = '<p class="muted">Your vocabulary book is empty.</p>';
    return;
  }

  elements.wordBank.innerHTML = items.slice(0, 12).map(item => `
    <article class="word-item">
      <div>
        <strong>${escapeHtml(item.term)}</strong>
        <p>${escapeHtml(item.meaning)}</p>
        ${item.example ? `<small>${escapeHtml(item.example)}</small>` : ''}
      </div>
      <div>
        <span class="word-status">${statusLabel(item.status)}</span>
        <small>${escapeHtml(item.tag || 'speaking')}</small>
      </div>
    </article>
  `).join('');
}

async function loadVocabulary() {
  const [all, review] = await Promise.all([api('/api/vocabulary'), api('/api/vocabulary/review')]);
  renderVocabulary(all.items || [], review.items || []);
}

async function addVocabulary(event) {
  event.preventDefault();
  const payload = {
    term: elements.vocabTerm.value.trim(),
    meaning: elements.vocabMeaning.value.trim(),
    example: elements.vocabExample.value.trim(),
    tag: elements.vocabTag.value.trim()
  };
  if (!payload.term || !payload.meaning) {
    elements.vocabCount.textContent = 'Term and meaning required';
    return;
  }
  await api('/api/vocabulary', { method: 'POST', body: JSON.stringify(payload) });
  elements.vocabForm.reset();
  await loadVocabulary();
}

async function reviewVocabulary(event) {
  const button = event.target.closest('[data-review]');
  if (!button) return;
  await api(`/api/vocabulary/${button.dataset.review}/review`, {
    method: 'POST',
    body: JSON.stringify({ result: button.dataset.result })
  });
  await loadVocabulary();
}

function renderMistakes(items, reviewItems) {
  elements.mistakeCount.textContent = `${items.length} saved`;

  if (!reviewItems.length) {
    elements.mistakeReviewList.innerHTML = '<p class="muted">No mistake sentences due today. Save one from AI feedback or add one manually.</p>';
  } else {
    elements.mistakeReviewList.innerHTML = reviewItems.map(item => `
      <article class="review-card mistake-review-card">
        <div>
          <strong>${escapeHtml(item.originalSentence)}</strong>
          <p>${escapeHtml(item.correctedSentence || item.improvedSentence)}</p>
          ${item.explanation || item.note ? `<small>${escapeHtml(item.explanation || item.note)}</small>` : ''}
          <small>${escapeHtml(item.mistakeType || item.errorType || 'grammar')} - ${escapeHtml(item.reviewStatus || item.status || 'new')} - next: ${escapeHtml(item.nextReviewAt || 'today')}</small>
        </div>
        <div class="review-actions">
          <button type="button" class="secondary-button" data-mistake-review="${escapeHtml(item.id)}" data-result="again">Again</button>
          <button type="button" class="secondary-button" data-mistake-review="${escapeHtml(item.id)}" data-result="good">Good</button>
          <button type="button" class="primary-button" data-mistake-review="${escapeHtml(item.id)}" data-result="mastered">Mastered</button>
        </div>
      </article>
    `).join('');
  }

  if (!items.length) {
    elements.mistakeBank.innerHTML = '<p class="muted">Your mistake book is empty.</p>';
    return;
  }

  elements.mistakeBank.innerHTML = items.slice(0, 12).map(item => `
    <article class="mistake-item">
      <div>
        <span class="label">Original</span>
        <p>${escapeHtml(item.originalSentence)}</p>
      </div>
      <div>
        <span class="label">Corrected</span>
        <p>${escapeHtml(item.correctedSentence || item.improvedSentence)}</p>
        ${item.explanation || item.note ? `<small>${escapeHtml(item.explanation || item.note)}</small>` : ''}
      </div>
      <div class="mistake-meta">
        <span class="word-status">${statusLabel(item.reviewStatus || item.status)}</span>
        <small>${escapeHtml(item.mistakeType || item.errorType || 'grammar')} - next: ${escapeHtml(item.nextReviewAt || 'today')}</small>
      </div>
    </article>
  `).join('');
}

async function loadMistakes() {
  const [all, review] = await Promise.all([api('/api/mistakes'), api('/api/mistakes/review')]);
  renderMistakes(all.items || [], review.items || []);
}

async function addMistake(payload) {
  await api('/api/mistakes', { method: 'POST', body: JSON.stringify(payload) });
  await loadMistakes();
}

async function addMistakeFromForm(event) {
  event.preventDefault();
  const payload = {
    originalSentence: elements.mistakeOriginal.value.trim(),
    correctedSentence: elements.mistakeImproved.value.trim(),
    mistakeType: elements.mistakeType.value.trim(),
    explanation: elements.mistakeNote.value.trim(),
    source: 'manual'
  };
  if (!payload.originalSentence || !payload.correctedSentence) {
    elements.mistakeCount.textContent = 'Original and corrected required';
    return;
  }
  await addMistake(payload);
  elements.mistakeForm.reset();
}

async function saveMistakeFromButton(button) {
  const payload = {
    originalSentence: button.dataset.original || '',
    correctedSentence: button.dataset.improved || '',
    mistakeType: button.dataset.type || 'grammar',
    explanation: button.dataset.note || '',
    source: 'AI feedback'
  };
  if (!payload.originalSentence || !payload.correctedSentence) return;
  button.disabled = true;
  button.textContent = 'Saved';
  await addMistake(payload);
}

async function reviewMistake(event) {
  const button = event.target.closest('[data-mistake-review]');
  if (!button) return;
  await api('/api/mistakes/' + button.dataset.mistakeReview + '/review', {
    method: 'POST',
    body: JSON.stringify({ result: button.dataset.result })
  });
  await loadMistakes();
}

export {
  addMistakeFromForm,
  addVocabulary,
  loadMistakes,
  loadVocabulary,
  reviewMistake,
  reviewVocabulary,
  saveMistakeFromButton
};
