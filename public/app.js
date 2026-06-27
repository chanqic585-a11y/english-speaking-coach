const state = {
  topic: null,
  feedback: null,
  remainingSeconds: 30 * 60,
  timerId: null
};

const elements = {
  apiStatus: document.querySelector('#apiStatus'),
  todayFocus: document.querySelector('#todayFocus'),
  todayTopic: document.querySelector('#todayTopic'),
  promptText: document.querySelector('#promptText'),
  sentenceFrame: document.querySelector('#sentenceFrame'),
  phraseBank: document.querySelector('#phraseBank'),
  answerInput: document.querySelector('#answerInput'),
  feedbackContent: document.querySelector('#feedbackContent'),
  feedbackState: document.querySelector('#feedbackState'),
  grammarNote: document.querySelector('#grammarNote'),
  logicNote: document.querySelector('#logicNote'),
  expressionNote: document.querySelector('#expressionNote'),
  historyList: document.querySelector('#historyList'),
  timer: document.querySelector('#timer')
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed.');
    error.payload = data;
    throw error;
  }
  return data;
}

function renderTopic(topic) {
  state.topic = topic;
  elements.todayFocus.textContent = topic.focus;
  elements.todayTopic.textContent = topic.topic;
  elements.promptText.textContent = topic.prompt;
  elements.sentenceFrame.textContent = topic.sentenceFrame;
  elements.phraseBank.innerHTML = '';
  for (const phrase of topic.phraseBank || []) {
    const item = document.createElement('span');
    item.textContent = phrase;
    elements.phraseBank.appendChild(item);
  }
}

function renderSettings(settings) {
  elements.apiStatus.textContent = settings.apiKeyConfigured ? `API ready: ${settings.model}` : 'API key missing';
  elements.apiStatus.classList.toggle('ready', settings.apiKeyConfigured);
  elements.apiStatus.classList.toggle('missing', !settings.apiKeyConfigured);
}

function setFeedbackLoading(isLoading) {
  document.querySelector('#requestFeedback').disabled = isLoading;
  elements.feedbackState.textContent = isLoading ? 'Getting feedback...' : 'Ready';
}

function renderFeedback(feedback) {
  state.feedback = feedback;
  elements.feedbackState.textContent = 'Feedback received';

  if (feedback.rawText || feedback.rawResponse) {
    elements.feedbackContent.innerHTML = card('Raw feedback', escapeHtml(feedback.rawText || JSON.stringify(feedback.rawResponse, null, 2)));
    return;
  }

  const grammar = Array.isArray(feedback.grammarFixes) && feedback.grammarFixes.length
    ? `<ul>${feedback.grammarFixes.map(item => `<li><strong>${escapeHtml(item.improved || '')}</strong><br><span>${escapeHtml(item.explanation || item.original || '')}</span></li>`).join('')}</ul>`
    : '<p>No major grammar fixes.</p>';

  const logic = Array.isArray(feedback.logicCoherence) && feedback.logicCoherence.length
    ? `<ul>${feedback.logicCoherence.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p>Your structure is clear enough for this answer.</p>';

  const expressions = Array.isArray(feedback.reusableExpressions) && feedback.reusableExpressions.length
    ? `<ul>${feedback.reusableExpressions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p>No reusable expressions returned.</p>';

  elements.feedbackContent.innerHTML = [
    card('Quick diagnosis', escapeHtml(feedback.quickDiagnosis || 'No quick diagnosis returned.')),
    card('Grammar fixes', grammar),
    card('Logic and coherence', logic),
    card('Natural version', `<p>${escapeHtml(feedback.naturalVersion || '')}</p>`),
    card('Repeat script', `<p>${escapeHtml(feedback.repeatScript || '')}</p>`),
    card('Reusable expressions', expressions)
  ].join('');
}

function renderFeedbackError(error) {
  elements.feedbackState.textContent = 'Feedback unavailable';
  const details = error.payload?.details ? `<pre>${escapeHtml(error.payload.details)}</pre>` : '<p>Copy .env.example to .env, add OPENAI_API_KEY, then restart the server.</p>';
  elements.feedbackContent.innerHTML = card('Setup or request issue', `<p>${escapeHtml(error.message)}</p>${details}`);
}

function card(title, body) {
  return `<article class="feedback-card"><h3>${title}</h3>${body.startsWith('<') ? body : `<p>${body}</p>`}</article>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function updateTimer() {
  const minutes = Math.floor(state.remainingSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(state.remainingSeconds % 60).toString().padStart(2, '0');
  elements.timer.textContent = `${minutes}:${seconds}`;
}

function startTimer() {
  if (state.timerId) return;
  state.timerId = setInterval(() => {
    state.remainingSeconds = Math.max(0, state.remainingSeconds - 1);
    updateTimer();
    if (state.remainingSeconds === 0) pauseTimer();
  }, 1000);
}

function pauseTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
}

function resetTimer() {
  pauseTimer();
  state.remainingSeconds = 30 * 60;
  updateTimer();
}

async function loadInitialData() {
  const [settings, topic] = await Promise.all([api('/api/settings'), api('/api/today')]);
  renderSettings(settings);
  renderTopic(topic);
  await loadHistory();
}

async function requestFeedback() {
  const answer = elements.answerInput.value.trim();
  if (answer.length < 20) {
    renderFeedbackError(new Error('Please enter a longer answer before requesting feedback.'));
    return;
  }

  setFeedbackLoading(true);
  try {
    const data = await api('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ answer, context: state.topic })
    });
    renderFeedback(data.feedback);
  } catch (error) {
    renderFeedbackError(error);
  } finally {
    setFeedbackLoading(false);
  }
}

async function saveSession() {
  const answer = elements.answerInput.value.trim();
  if (!answer) {
    renderFeedbackError(new Error('Write your answer before saving a session.'));
    return;
  }

  const payload = {
    ...state.topic,
    userAnswer: answer,
    aiFeedback: state.feedback,
    reflection: {
      grammar: elements.grammarNote.value.trim(),
      logic: elements.logicNote.value.trim(),
      expression: elements.expressionNote.value.trim()
    },
    durationMinutes: 30
  };

  try {
    await api('/api/sessions', { method: 'POST', body: JSON.stringify(payload) });
    elements.feedbackState.textContent = 'Session saved';
    await loadHistory();
  } catch (error) {
    renderFeedbackError(error);
  }
}

async function loadHistory() {
  const data = await api('/api/sessions');
  const sessions = data.sessions || [];
  if (!sessions.length) {
    elements.historyList.innerHTML = '<p class="muted">No saved sessions yet.</p>';
    return;
  }
  elements.historyList.innerHTML = sessions.slice(0, 6).map(session => `
    <article class="history-item">
      <div><strong>${escapeHtml(session.date)}</strong><p>${escapeHtml(session.focus)}</p></div>
      <div><strong>${escapeHtml(session.topic || 'Untitled')}</strong><p>${escapeHtml(session.prompt || '').slice(0, 160)}</p></div>
    </article>
  `).join('');
}

document.querySelector('#requestFeedback').addEventListener('click', requestFeedback);
document.querySelector('#saveSession').addEventListener('click', saveSession);
document.querySelector('#refreshHistory').addEventListener('click', loadHistory);
document.querySelector('#clearAnswer').addEventListener('click', () => { elements.answerInput.value = ''; });
document.querySelector('#loadTopic').addEventListener('click', async () => renderTopic(await api('/api/today')));
document.querySelector('#startTimer').addEventListener('click', startTimer);
document.querySelector('#pauseTimer').addEventListener('click', pauseTimer);
document.querySelector('#resetTimer').addEventListener('click', resetTimer);

updateTimer();
loadInitialData().catch(error => {
  elements.feedbackState.textContent = 'App setup issue';
  renderFeedbackError(error);
});
