const state = {
  topic: null,
  feedback: null,
  remainingSeconds: 30 * 60,
  timerId: null,
  mediaRecorder: null,
  audioChunks: [],
  speechRecognition: null,
  finalTranscript: '',
  recordingStartedAt: null
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
  timer: document.querySelector('#timer'),
  phoneUrl: document.querySelector('#phoneUrl'),
  copyPhoneUrl: document.querySelector('#copyPhoneUrl'),
  vocabForm: document.querySelector('#vocabForm'),
  vocabTerm: document.querySelector('#vocabTerm'),
  vocabMeaning: document.querySelector('#vocabMeaning'),
  vocabExample: document.querySelector('#vocabExample'),
  vocabTag: document.querySelector('#vocabTag'),
  vocabCount: document.querySelector('#vocabCount'),
  reviewList: document.querySelector('#reviewList'),
  wordBank: document.querySelector('#wordBank'),
  startRecording: document.querySelector('#startRecording'),
  stopRecording: document.querySelector('#stopRecording'),
  recordingStatus: document.querySelector('#recordingStatus'),
  recordingPlayback: document.querySelector('#recordingPlayback')
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
  const provider = settings.provider || 'ai';
  elements.apiStatus.textContent = settings.apiKeyConfigured ? `API ready: ${provider} / ${settings.model}` : `${provider} key missing`;
  elements.apiStatus.classList.toggle('ready', settings.apiKeyConfigured);
  elements.apiStatus.classList.toggle('missing', !settings.apiKeyConfigured);
}

async function renderNetworkInfo() {
  try {
    const network = await api('/api/network');
    const phoneUrl = network.lanUrls?.[0];
    elements.phoneUrl.textContent = phoneUrl
      ? `${phoneUrl} - open this on your phone while using the same Wi-Fi.`
      : 'No same Wi-Fi address found yet. Keep using this computer, or check your Wi-Fi adapter.';
    elements.copyPhoneUrl.disabled = !phoneUrl;
    elements.copyPhoneUrl.dataset.url = phoneUrl || '';
  } catch {
    elements.phoneUrl.textContent = 'Phone link unavailable. The app still works on this computer.';
    elements.copyPhoneUrl.disabled = true;
  }
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
  const details = error.payload?.details ? `<pre>${escapeHtml(error.payload.details)}</pre>` : '<p>Copy .env.example to .env, add GEMINI_API_KEY, then restart the server.</p>';
  elements.feedbackContent.innerHTML = card('Setup or request issue', `<p>${escapeHtml(error.message)}</p>${details}`);
}

function buildFreeFeedbackPrompt(answer) {
  const topic = state.topic || {};
  return [
    'You are my English speaking coach.',
    'I am a Chinese learner living in Mexico. I can understand some English, but I need help with spoken grammar, logic, and natural expression.',
    '',
    'Please review my answer for speaking practice.',
    '',
    `Focus: ${topic.focus || 'Speaking clarity'}`,
    `Topic: ${topic.topic || 'Daily English speaking practice'}`,
    `Question: ${topic.prompt || 'Please review my answer.'}`,
    `Sentence frame: ${topic.sentenceFrame || 'No sentence frame provided.'}`,
    '',
    'My answer:',
    answer,
    '',
    'Please give feedback in this exact structure:',
    '1. Quick diagnosis: explain my main problem in Chinese.',
    '2. Grammar fixes: show 2-4 important corrections. For each one, show my original sentence, an improved sentence, and a short Chinese explanation.',
    '3. Logic and coherence: tell me how to organize my answer more clearly.',
    '4. Natural version: rewrite my answer in natural spoken English, but keep it close to my level and meaning.',
    '5. Repeat script: give me a shorter version that I can say aloud again.',
    '6. Reusable expressions: give me 3-5 phrases I can reuse in future conversations.'
  ].join('\n');
}

async function copyFreePrompt() {
  const answer = elements.answerInput.value.trim();
  if (answer.length < 20) {
    renderFeedbackError(new Error('Please enter a longer answer before copying a free feedback prompt.'));
    return;
  }

  const prompt = buildFreeFeedbackPrompt(answer);
  try {
    await navigator.clipboard.writeText(prompt);
    elements.feedbackState.textContent = 'Free prompt copied';
    elements.feedbackContent.innerHTML = card(
      'Free mode prompt copied',
      '<p>Now open ChatGPT, paste the prompt, and send it. After you get feedback, copy the useful grammar point, logic point, and expression into the reflection fields.</p>'
    );
  } catch {
    elements.feedbackState.textContent = 'Manual copy needed';
    elements.feedbackContent.innerHTML = card(
      'Copy this prompt manually',
      `<p>Your browser blocked automatic clipboard access. Select and copy the prompt below:</p><pre>${escapeHtml(prompt)}</pre>`
    );
  }
}

async function copyPhoneUrl() {
  const url = elements.copyPhoneUrl.dataset.url;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    elements.copyPhoneUrl.textContent = 'Copied';
    window.setTimeout(() => { elements.copyPhoneUrl.textContent = 'Copy'; }, 1500);
  } catch {
    elements.phoneUrl.textContent = `${url} - select and copy this link manually.`;
  }
}

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

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function setRecordingUi(isRecording, message) {
  elements.startRecording.disabled = isRecording;
  elements.stopRecording.disabled = !isRecording;
  elements.recordingStatus.textContent = message;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function startSpeechRecognition() {
  const Recognition = getSpeechRecognition();
  if (!Recognition) {
    elements.recordingStatus.textContent = 'Recording audio. Speech recognition is not supported in this browser.';
    return;
  }

  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = event => {
    let interim = '';
    for (let index = event.resultIndex; index < event.results.length; index++) {
      const transcript = event.results[index][0]?.transcript || '';
      if (event.results[index].isFinal) {
        state.finalTranscript = `${state.finalTranscript} ${transcript}`.trim();
      } else {
        interim = `${interim} ${transcript}`.trim();
      }
    }
    elements.answerInput.value = [state.finalTranscript, interim].filter(Boolean).join(' ');
  };
  recognition.onerror = event => {
    elements.recordingStatus.textContent = `Recording audio. Speech recognition issue: ${event.error || 'unavailable'}.`;
  };
  try {
    recognition.start();
    state.speechRecognition = recognition;
  } catch {
    elements.recordingStatus.textContent = 'Recording audio. Speech recognition could not start in this browser.';
  }
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    renderFeedbackError(new Error('This browser does not support built-in recording. Try Chrome or the public HTTPS link on your phone.'));
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.audioChunks = [];
    state.finalTranscript = '';
    state.recordingStartedAt = Date.now();
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = event => {
      if (event.data.size > 0) state.audioChunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      saveRecordingAndRequestFeedback().catch(renderFeedbackError);
    };
    state.mediaRecorder = recorder;
    recorder.start();
    startSpeechRecognition();
    setRecordingUi(true, 'Recording. Speak your answer clearly, then stop to save audio and request feedback.');
  } catch (error) {
    renderFeedbackError(new Error(`Microphone permission issue: ${error.message || 'access denied'}`));
  }
}

function stopRecording() {
  if (state.speechRecognition) {
    try { state.speechRecognition.stop(); } catch {}
    state.speechRecognition = null;
  }
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.stop();
  }
  setRecordingUi(false, 'Saving recording and preparing feedback...');
}

async function saveRecordingAndRequestFeedback() {
  const blob = new Blob(state.audioChunks, { type: state.mediaRecorder?.mimeType || 'audio/webm' });
  const transcript = elements.answerInput.value.trim();
  elements.recordingPlayback.src = URL.createObjectURL(blob);
  elements.recordingPlayback.hidden = false;

  const audioBase64 = await blobToBase64(blob);
  const durationSeconds = state.recordingStartedAt ? Math.round((Date.now() - state.recordingStartedAt) / 1000) : 0;
  const saved = await api('/api/recordings', {
    method: 'POST',
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || 'audio/webm',
      transcript,
      topic: state.topic?.topic || '',
      focus: state.topic?.focus || '',
      prompt: state.topic?.prompt || '',
      durationSeconds
    })
  });

  elements.recordingStatus.textContent = `Recording saved: ${saved.recording.fileName}`;
  if (transcript.length >= 20) {
    await requestFeedback();
  } else {
    renderFeedbackError(new Error('Recording saved, but the transcript is too short for AI feedback. Add or edit the transcript, then send for feedback.'));
  }
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
  await renderNetworkInfo();
  await loadVocabulary();
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
document.querySelector('#copyFreePrompt').addEventListener('click', copyFreePrompt);
elements.copyPhoneUrl.addEventListener('click', copyPhoneUrl);
document.querySelector('#saveSession').addEventListener('click', saveSession);
document.querySelector('#refreshHistory').addEventListener('click', loadHistory);
document.querySelector('#refreshVocabulary').addEventListener('click', loadVocabulary);
elements.vocabForm.addEventListener('submit', addVocabulary);
elements.reviewList.addEventListener('click', reviewVocabulary);
elements.startRecording.addEventListener('click', startRecording);
elements.stopRecording.addEventListener('click', stopRecording);
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
