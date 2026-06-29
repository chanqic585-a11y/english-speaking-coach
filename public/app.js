const state = {
  topic: null,
  feedback: null,
  mediaRecorder: null,
  audioChunks: [],
  speechRecognition: null,
  shadowMediaRecorder: null,
  shadowAudioChunks: [],
  shadowRecognition: null,
  shadowTranscript: '',
  shadowRecordingStartedAt: null,
  shadowRecordingId: null,
  shadowAudioUrl: '',
  shadowingFeedback: null,
  shadowingLoading: false,
  isShadowRecording: false,
  chatRecognition: null,
  chatMessages: [],
  feedbackAnswer: '',
  feedbackFollowupQuestion: '',
  feedbackFollowupTurns: [],
  feedbackFollowupComplete: false,
  feedbackFollowupLoading: false,
  feedbackFollowupClosing: '',
  scenarioTurns: [],
  currentAiLine: '',
  scenarioComplete: false,
  sceneFeedback: null,
  sceneFeedbackRequested: false,
  sceneFeedbackLoading: false,
  finalTranscript: '',
  recordingStartedAt: null,
  lastRecordingId: null,
  isRecording: false,
  holdRecording: false,
  suppressRecordClick: false,
  stopAfterRecordingStarts: false,
  holdTimer: null
};

const elements = {
  pageTitle: document.querySelector('#pageTitle'),
  pageSubtitle: document.querySelector('#pageSubtitle'),
  pageViews: document.querySelectorAll('.page-view'),
  pageButtons: document.querySelectorAll('[data-page]'),
  pageLinks: document.querySelectorAll('[data-page-link]'),
  apiStatus: document.querySelector('#apiStatus'),
  todayFocus: document.querySelector('#todayFocus'),
  todayTopic: document.querySelector('#todayTopic'),
  roleScenarioTitle: document.querySelector('#roleScenarioTitle'),
  roleScenarioTask: document.querySelector('#roleScenarioTask'),
  roleOpeningAnswer: document.querySelector('#roleOpeningAnswer'),
  loadRoleTopic: document.querySelector('#loadRoleTopic'),
  promptText: document.querySelector('#promptText'),
  sentenceFrame: document.querySelector('#sentenceFrame'),
  phraseBank: document.querySelector('#phraseBank'),
  levelFilter: document.querySelector('#levelFilter'),
  categoryFilter: document.querySelector('#categoryFilter'),
  answerInput: document.querySelector('#answerInput'),
  feedbackContent: document.querySelector('#feedbackContent'),
  feedbackState: document.querySelector('#feedbackState'),
  grammarNote: document.querySelector('#grammarNote'),
  logicNote: document.querySelector('#logicNote'),
  expressionNote: document.querySelector('#expressionNote'),
  historyList: document.querySelector('#historyList'),
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
  mistakeForm: document.querySelector('#mistakeForm'),
  mistakeOriginal: document.querySelector('#mistakeOriginal'),
  mistakeImproved: document.querySelector('#mistakeImproved'),
  mistakeType: document.querySelector('#mistakeType'),
  mistakeNote: document.querySelector('#mistakeNote'),
  mistakeCount: document.querySelector('#mistakeCount'),
  mistakeReviewList: document.querySelector('#mistakeReviewList'),
  mistakeBank: document.querySelector('#mistakeBank'),
  recordButton: document.querySelector('#recordButton'),
  recordingStatus: document.querySelector('#recordingStatus'),
  recordingPlayback: document.querySelector('#recordingPlayback'),
  feedbackModal: document.querySelector('#feedbackModal'),
  feedbackModalPanel: document.querySelector('#feedbackModal .modal-panel'),
  feedbackModalBackdrop: document.querySelector('#feedbackModalBackdrop'),
  feedbackModalTitle: document.querySelector('#feedbackModalTitle'),
  feedbackModalStatus: document.querySelector('#feedbackModalStatus'),
  feedbackModalSummary: document.querySelector('#feedbackModalSummary'),
  feedbackModalContent: document.querySelector('#feedbackModalContent'),
  openFeedbackModal: document.querySelector('#openFeedbackModal'),
  closeFeedbackModal: document.querySelector('#closeFeedbackModal'),
  installApp: document.querySelector('#installApp'),
  openChat: document.querySelector('#openChat'),
  chatModal: document.querySelector('#chatModal'),
  chatPanel: document.querySelector('#chatModal .chat-panel'),
  chatModalBackdrop: document.querySelector('#chatModalBackdrop'),
  closeChat: document.querySelector('#closeChat'),
  chatStatus: document.querySelector('#chatStatus'),
  chatMessages: document.querySelector('#chatMessages'),
  chatInput: document.querySelector('#chatInput'),
  chatMic: document.querySelector('#chatMic'),
  sendChat: document.querySelector('#sendChat'),
  clearChat: document.querySelector('#clearChat'),
  requestFollowups: document.querySelector('#requestFollowups'),
  followupStatus: document.querySelector('#followupStatus'),
  followupQuestions: document.querySelector('#followupQuestions'),
  followupResponse: document.querySelector('#followupResponse'),
  selectedFollowupQuestion: document.querySelector('#selectedFollowupQuestion'),
  followupAnswer: document.querySelector('#followupAnswer'),
  sendFollowupAnswer: document.querySelector('#sendFollowupAnswer'),
  requestSceneFeedback: document.querySelector('#requestSceneFeedback'),
  clearFollowups: document.querySelector('#clearFollowups'),
  followupCoaching: document.querySelector('#followupCoaching')
};

let deferredInstallPrompt = null;

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

function showPage(pageId) {
  const target = document.querySelector(`#${pageId}`);
  if (!target) return;

  elements.pageViews.forEach(page => {
    const isActive = page.id === pageId;
    page.hidden = !isActive;
    page.classList.toggle('active', isActive);
  });

  elements.pageButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.page === pageId);
  });

  elements.pageTitle.textContent = target.dataset.title || 'English Speaking Coach';
  elements.pageSubtitle.textContent = target.dataset.subtitle || '';

  if (elements.chatModal) {
    elements.chatModal.hidden = pageId !== 'aiChat';
  }

  if (pageId === 'aiChat') {
    loadChatMessages();
    window.requestAnimationFrame(() => elements.chatPanel?.focus());
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (elements.installApp) {
      elements.installApp.hidden = false;
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (elements.installApp) {
      elements.installApp.hidden = true;
    }
  });
}

async function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice.catch(() => null);
  deferredInstallPrompt = null;
  if (elements.installApp) {
    elements.installApp.hidden = true;
  }
}

function renderTopic(topic) {
  state.topic = topic;
  elements.todayFocus.textContent = topic.level && topic.category
    ? `${topic.level} - ${topic.category}`
    : topic.focus;
  elements.todayTopic.textContent = topic.role ? `${topic.role} - ${topic.topic}` : topic.topic;
  elements.promptText.textContent = topic.role ? `${topic.role}: ${topic.situation}` : topic.prompt;
  if (elements.roleScenarioTitle) {
    elements.roleScenarioTitle.textContent = topic.role ? `${topic.role} - ${topic.topic}` : topic.topic;
  }
  if (elements.roleScenarioTask) {
    elements.roleScenarioTask.textContent = topic.userTask
      ? `Your task: ${topic.userTask} Opening: ${topic.openingLine}`
      : topic.prompt;
  }
  elements.sentenceFrame.textContent = topic.userTask
    ? `Focus: ${topic.focus}. Your task: ${topic.userTask} Opening: ${topic.openingLine}`
    : topic.sentenceFrame;
  elements.phraseBank.innerHTML = '';
  for (const phrase of topic.phraseBank || []) {
    const item = document.createElement('span');
    item.textContent = phrase;
    elements.phraseBank.appendChild(item);
  }
  clearFollowups();
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
  if (isLoading) {
    elements.feedbackState.textContent = 'Getting feedback...';
  }
}

function scoreValue(value) {
  return value ?? 'Audio needed';
}

function speedLabel(speed) {
  if (!speed || typeof speed !== 'object') return 'Unknown';
  const level = speed.level || 'unknown';
  const wpm = speed.wpm == null ? '' : ` (${speed.wpm} WPM)`;
  return `${level}${wpm}`;
}

function buildFeedbackDetails(feedback) {
  if (feedback.rawText || feedback.rawResponse) {
    return card('Raw feedback', escapeHtml(feedback.rawText || JSON.stringify(feedback.rawResponse, null, 2)));
  }

  const grammar = Array.isArray(feedback.grammarFixes) && feedback.grammarFixes.length
    ? `<ul>${feedback.grammarFixes.map(item => `
      <li>
        <strong>${escapeHtml(item.improved || '')}</strong><br>
        <span>${escapeHtml(item.explanation || item.original || '')}</span><br>
        <button type="button" class="secondary-button compact-button save-mistake-button"
          data-original="${escapeHtml(item.original || '')}"
          data-improved="${escapeHtml(item.improved || '')}"
          data-type="grammar"
          data-note="${escapeHtml(item.explanation || '')}">Save mistake</button>
      </li>
    `).join('')}</ul>`
    : '<p>No major grammar fixes.</p>';

  const logic = Array.isArray(feedback.logicCoherence) && feedback.logicCoherence.length
    ? `<ul>${feedback.logicCoherence.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p>Your structure is clear enough for this answer.</p>';

  const expressions = Array.isArray(feedback.reusableExpressions) && feedback.reusableExpressions.length
    ? `<ul>${feedback.reusableExpressions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p>No reusable expressions returned.</p>';

  const speed = feedback.speakingSpeed || {};
  const speechScores = [
    `<p><strong>Pronunciation:</strong> ${scoreValue(feedback.pronunciationScore)}</p>`,
    `<p><strong>Fluency:</strong> ${scoreValue(feedback.fluencyScore)}</p>`,
    `<p><strong>Pause problem:</strong> ${escapeHtml(feedback.pauseProblem || feedback.speedPauseFeedback || 'No pause feedback returned.')}</p>`,
    `<p><strong>Speaking speed:</strong> ${escapeHtml(speedLabel(speed))}</p>`,
    `<p>${escapeHtml(speed.comment || feedback.speedPauseFeedback || 'No speed comment returned.')}</p>`
  ].join('');

  const pronunciationIssues = Array.isArray(feedback.possiblePronunciationIssues) && feedback.possiblePronunciationIssues.length
    ? `<ul>${feedback.possiblePronunciationIssues.map(item => `<li><strong>${escapeHtml(item.word || '')}</strong><br><span>${escapeHtml(item.issue || '')}</span><br><span>${escapeHtml(item.suggestion || '')}</span></li>`).join('')}</ul>`
    : '<p>No specific pronunciation issues returned.</p>';

  const hardWords = Array.isArray(feedback.hardWordsToRepeat) && feedback.hardWordsToRepeat.length
    ? `<ul>${feedback.hardWordsToRepeat.map(item => `<li><strong>${escapeHtml(item.word || '')}</strong><br><span>${escapeHtml(item.reason || '')}</span><br><span>${escapeHtml(item.repeatDrill || '')}</span></li>`).join('')}</ul>`
    : '<p>No hard words returned yet.</p>';

  return [
    card('Quick diagnosis', escapeHtml(feedback.quickDiagnosis || 'No quick diagnosis returned.')),
    card('Pronunciation, fluency, pause, speed', speechScores),
    card('Hard words to repeat', hardWords),
    card('Possible pronunciation issues', pronunciationIssues),
    card('Grammar fixes', grammar),
    card('Logic and coherence', logic),
    card('Natural version', `<p>${escapeHtml(feedback.naturalVersion || '')}</p>`),
    card('Repeat script', `<p>${escapeHtml(feedback.repeatScript || '')}</p>`),
    card('Reusable expressions', expressions)
  ].join('');
}

function renderFeedbackSummary(feedback) {
  if (feedback.rawText || feedback.rawResponse) {
    return '<div class="summary-card wide"><strong>Raw feedback received</strong><p>Gemini returned text that could not be parsed into the usual sections. Review the full response below.</p></div>';
  }

  return [
    `<div class="score-card"><span>Pronunciation</span><strong>${scoreValue(feedback.pronunciationScore)}</strong></div>`,
    `<div class="score-card"><span>Fluency</span><strong>${scoreValue(feedback.fluencyScore)}</strong></div>`,
    `<div class="score-card speed-card"><span>Speed</span><strong>${escapeHtml(speedLabel(feedback.speakingSpeed))}</strong></div>`,
    `<div class="summary-card wide"><strong>Repeat script</strong><p>${escapeHtml(feedback.repeatScript || feedback.naturalVersion || 'No repeat script returned yet.')}</p></div>`
  ].join('');
}

function renderFeedbackPreview(feedback) {
  if (feedback.rawText || feedback.rawResponse) {
    return '<div class="empty-state"><h2>Feedback received</h2><p>Gemini returned text that needs the full feedback view.</p></div>';
  }

  return `
    <div class="feedback-preview-grid">
      <article class="preview-score-card">
        <span>Pronunciation score</span>
        <strong>${scoreValue(feedback.pronunciationScore)}</strong>
      </article>
      <article class="preview-score-card">
        <span>Fluency score</span>
        <strong>${scoreValue(feedback.fluencyScore)}</strong>
      </article>
    </div>
    <article class="preview-text-card">
      <span>Natural version</span>
      <p>${escapeHtml(feedback.naturalVersion || 'No natural version returned yet.')}</p>
    </article>
    <article class="preview-text-card">
      <span>Repeat script</span>
      <p>${escapeHtml(feedback.repeatScript || feedback.naturalVersion || 'No repeat script returned yet.')}</p>
    </article>
  `;
}

function renderFeedbackFollowupPanel() {
  if (!state.feedback) return '';
  const turns = state.feedbackFollowupTurns.map((turn, index) => `
    <div class="feedback-followup-turn">
      <span>Round ${index + 1}</span>
      <p><strong>Follow-up question:</strong> ${escapeHtml(turn.question)}</p>
      <p><strong>Your answer:</strong> ${escapeHtml(turn.answer)}</p>
      ${turn.coachingNote ? `<p><strong>Coach:</strong> ${escapeHtml(turn.coachingNote)}</p>` : ''}
      ${turn.betterWay ? `<p><strong>Better way:</strong> ${escapeHtml(turn.betterWay)}</p>` : ''}
      ${turn.repeatLine ? `<p><strong>Repeat:</strong> ${escapeHtml(turn.repeatLine)}</p>` : ''}
    </div>
  `).join('');

  const currentQuestion = state.feedbackFollowupQuestion && !state.feedbackFollowupComplete
    ? `
      <div class="feedback-followup-current">
        <p><strong>Follow-up question:</strong> ${escapeHtml(state.feedbackFollowupQuestion)}</p>
        <textarea id="feedbackFollowupAnswer" rows="3" placeholder="Answer this follow-up in English..."></textarea>
        <button type="button" class="primary-button" id="sendFeedbackFollowup" ${state.feedbackFollowupLoading ? 'disabled' : ''}>Send follow-up answer</button>
      </div>
    `
    : '';

  const loading = state.feedbackFollowupLoading
    ? '<p class="muted">Preparing the next follow-up...</p>'
    : '';
  const closing = state.feedbackFollowupComplete
    ? `<p class="feedback-followup-closing">${escapeHtml(state.feedbackFollowupClosing || 'Follow-up practice complete.')}</p>`
    : '';

  return `
    <section class="feedback-followup-box" aria-label="Feedback follow-up practice">
      <div>
        <span class="label">Follow-up practice</span>
        <h3>Answer 2-3 quick follow-up questions</h3>
        <p class="muted">This turns feedback into a short speaking loop, like IELTS Part 3 practice.</p>
      </div>
      <div class="feedback-followup-list">${turns || '<p class="muted">Your first follow-up question will appear here automatically.</p>'}</div>
      ${loading}
      ${currentQuestion}
      ${closing}
    </section>
  `;
}

function resetShadowingState() {
  if (state.shadowRecognition) {
    try { state.shadowRecognition.stop(); } catch {}
  }
  if (state.shadowMediaRecorder && state.shadowMediaRecorder.state !== 'inactive') {
    try { state.shadowMediaRecorder.stop(); } catch {}
  }
  if (state.shadowAudioUrl) {
    URL.revokeObjectURL(state.shadowAudioUrl);
  }
  state.shadowMediaRecorder = null;
  state.shadowAudioChunks = [];
  state.shadowRecognition = null;
  state.shadowTranscript = '';
  state.shadowRecordingStartedAt = null;
  state.shadowRecordingId = null;
  state.shadowAudioUrl = '';
  state.shadowingFeedback = null;
  state.shadowingLoading = false;
  state.isShadowRecording = false;
}

function renderShadowingPanel() {
  if (!state.feedback) return '';
  const repeatScript = state.feedback.repeatScript || state.feedback.naturalVersion || '';
  if (!repeatScript) return '';
  const buttonText = state.isShadowRecording ? 'Stop shadowing' : 'Record repeat script';
  const status = state.isShadowRecording
    ? 'Recording your repeat script now...'
    : state.shadowingLoading
      ? 'Saving your shadowing audio and asking Gemini to compare it...'
      : state.shadowingFeedback
        ? 'Shadowing feedback is ready.'
        : 'Read the repeat script aloud. Gemini will compare your recording with the target script.';
  const transcriptValue = escapeHtml(state.shadowTranscript);
  const audio = state.shadowAudioUrl
    ? `<audio controls src="${escapeHtml(state.shadowAudioUrl)}"></audio>`
    : '';
  const feedback = state.shadowingFeedback
    ? renderShadowingFeedback(state.shadowingFeedback)
    : '';

  return `
    <section class="shadowing-box" aria-label="Shadowing practice">
      <div>
        <span class="label">Shadowing practice</span>
        <h3>Record yourself reading the repeat script</h3>
        <p class="shadowing-script">${escapeHtml(repeatScript)}</p>
      </div>
      <div class="shadowing-actions">
        <button type="button" class="primary-button" id="toggleShadowingRecording" ${state.shadowingLoading ? 'disabled' : ''}>${buttonText}</button>
        <span class="muted">${escapeHtml(status)}</span>
      </div>
      ${audio}
      <label class="field-label" for="shadowingTranscript">Shadowing transcript</label>
      <textarea id="shadowingTranscript" rows="3" placeholder="Auto transcript appears here when supported. You can edit it before Gemini compares.">${transcriptValue}</textarea>
      ${feedback}
    </section>
  `;
}

function renderShadowingFeedback(feedback) {
  if (feedback.rawText || feedback.rawResponse) {
    return `<div class="shadowing-result"><strong>Raw shadowing feedback</strong><pre>${escapeHtml(feedback.rawText || JSON.stringify(feedback.rawResponse, null, 2))}</pre></div>`;
  }
  const missed = Array.isArray(feedback.missedOrChangedWords) && feedback.missedOrChangedWords.length
    ? `<ul>${feedback.missedOrChangedWords.map(item => `<li><strong>${escapeHtml(item.target || '')}</strong>${item.heardOrTyped ? ` -> ${escapeHtml(item.heardOrTyped)}` : ''}<br><span>${escapeHtml(item.note || '')}</span></li>`).join('')}</ul>`
    : '<p>No major missed or changed words returned.</p>';

  return `
    <div class="shadowing-result">
      <div class="score-card"><span>Shadowing</span><strong>${escapeHtml(feedback.shadowingScore ?? 'Audio checked')}</strong></div>
      <p><strong>Accuracy:</strong> ${escapeHtml(feedback.accuracyNote || '')}</p>
      <p><strong>Pronunciation:</strong> ${escapeHtml(feedback.pronunciationNote || '')}</p>
      <p><strong>Fluency:</strong> ${escapeHtml(feedback.fluencyNote || '')}</p>
      <div><strong>Missed or changed words</strong>${missed}</div>
      <p><strong>Repeat again:</strong> ${escapeHtml(feedback.repeatAgainScript || '')}</p>
      <p><strong>Next drill:</strong> ${escapeHtml(feedback.nextDrill || '')}</p>
    </div>
  `;
}

function renderFeedbackModalContent() {
  if (!state.feedback) return;
  const details = buildFeedbackDetails(state.feedback);
  elements.feedbackModalContent.innerHTML = `${details}${renderShadowingPanel()}${renderFeedbackFollowupPanel()}`;
}

async function requestFeedbackFollowup() {
  if (!state.feedback || state.feedbackFollowupLoading || state.feedbackFollowupComplete) return;
  state.feedbackFollowupLoading = true;
  renderFeedbackModalContent();
  try {
    const data = await api('/api/feedback-followups', {
      method: 'POST',
      body: JSON.stringify({
        context: state.topic,
        answer: state.feedbackAnswer,
        feedback: state.feedback,
        turns: state.feedbackFollowupTurns.map(turn => ({
          question: turn.question,
          answer: turn.answer
        }))
      })
    });
    const followup = data.followup || {};
    if (state.feedbackFollowupTurns.length && (followup.coachingNote || followup.betterWay || followup.repeatLine)) {
      const latest = state.feedbackFollowupTurns[state.feedbackFollowupTurns.length - 1];
      latest.coachingNote = followup.coachingNote || '';
      latest.betterWay = followup.betterWay || '';
      latest.repeatLine = followup.repeatLine || '';
    }
    state.feedbackFollowupComplete = Boolean(followup.isComplete) || state.feedbackFollowupTurns.length >= 3;
    state.feedbackFollowupClosing = followup.closingSummary || '';
    state.feedbackFollowupQuestion = state.feedbackFollowupComplete ? '' : String(followup.question || '').trim();
    if (!state.feedbackFollowupQuestion && !state.feedbackFollowupComplete) {
      state.feedbackFollowupQuestion = 'Can you explain your idea with one specific example?';
    }
  } catch (error) {
    state.feedbackFollowupQuestion = '';
    state.feedbackFollowupClosing = `Follow-up unavailable: ${error.message}`;
    state.feedbackFollowupComplete = true;
  } finally {
    state.feedbackFollowupLoading = false;
    renderFeedbackModalContent();
  }
}

async function sendFeedbackFollowupAnswer() {
  const input = document.querySelector('#feedbackFollowupAnswer');
  const answer = input?.value.trim() || '';
  if (!state.feedbackFollowupQuestion) return;
  if (answer.length < 5) {
    if (input) input.placeholder = 'Write a little more before sending...';
    return;
  }
  state.feedbackFollowupTurns.push({
    question: state.feedbackFollowupQuestion,
    answer,
    coachingNote: '',
    betterWay: '',
    repeatLine: ''
  });
  state.feedbackFollowupQuestion = '';
  await requestFeedbackFollowup();
}

function openFeedbackModal() {
  elements.feedbackModal.hidden = false;
  document.body.classList.add('modal-open');
  window.requestAnimationFrame(() => elements.feedbackModalPanel.focus());
}

function closeFeedbackModal() {
  if (state.isShadowRecording) {
    stopShadowingRecording();
  }
  elements.feedbackModal.hidden = true;
  document.body.classList.remove('modal-open');
}

function renderFeedbackLoading() {
  elements.feedbackModalTitle.textContent = 'Getting feedback';
  elements.feedbackModalStatus.textContent = state.lastRecordingId
    ? 'Recording saved. Gemini is listening to the audio and preparing feedback.'
    : 'Sending your answer to Gemini and preparing feedback.';
  elements.feedbackModalSummary.innerHTML = `
    <div class="progress-card active"><span>1</span><strong>Saving practice</strong></div>
    <div class="progress-card active"><span>2</span><strong>Asking Gemini</strong></div>
    <div class="progress-card"><span>3</span><strong>Preparing repeat script</strong></div>
  `;
  elements.feedbackModalContent.innerHTML = '<div class="empty-state"><h2>Please wait</h2><p>Your feedback will appear here automatically. Keep this page open while the request finishes.</p></div>';
  openFeedbackModal();
}

function renderFeedback(feedback) {
  state.feedback = feedback;
  resetShadowingState();
  state.feedbackFollowupQuestion = '';
  state.feedbackFollowupTurns = [];
  state.feedbackFollowupComplete = false;
  state.feedbackFollowupLoading = false;
  state.feedbackFollowupClosing = '';
  elements.feedbackState.textContent = 'Feedback received';
  elements.openFeedbackModal.disabled = false;
  elements.recordingStatus.textContent = state.lastRecordingId
    ? 'AI feedback received for the saved recording.'
    : elements.recordingStatus.textContent;

  elements.feedbackContent.innerHTML = renderFeedbackPreview(feedback);
  elements.feedbackModalTitle.textContent = 'Feedback is ready';
  elements.feedbackModalStatus.textContent = 'Start with the scores, record the repeat script, then answer the follow-up question.';
  elements.feedbackModalSummary.innerHTML = renderFeedbackSummary(feedback);
  renderFeedbackModalContent();
  openFeedbackModal();
  requestFeedbackFollowup();
}

function renderFeedbackError(error) {
  elements.feedbackState.textContent = 'Feedback unavailable';
  elements.openFeedbackModal.disabled = false;
  elements.recordingStatus.textContent = state.lastRecordingId
    ? `Recording saved, but feedback failed: ${error.message}`
    : elements.recordingStatus.textContent;
  const details = error.payload?.details ? `<pre>${escapeHtml(error.payload.details)}</pre>` : '<p>Copy .env.example to .env, add GEMINI_API_KEY, then restart the server.</p>';
  const content = card('Setup or request issue', `<p>${escapeHtml(error.message)}</p>${details}`);
  elements.feedbackContent.innerHTML = content;
  elements.feedbackModalTitle.textContent = 'Feedback issue';
  elements.feedbackModalStatus.textContent = 'The practice was not analyzed. Check the message below and try again.';
  elements.feedbackModalSummary.innerHTML = `<div class="summary-card wide"><strong>What happened</strong><p>${escapeHtml(error.message)}</p></div>`;
  elements.feedbackModalContent.innerHTML = content;
  openFeedbackModal();
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

function renderMistakes(items, reviewItems) {
  elements.mistakeCount.textContent = `${items.length} saved`;

  if (!reviewItems.length) {
    elements.mistakeReviewList.innerHTML = '<p class="muted">No mistake sentences due today. Save one from AI feedback or add one manually.</p>';
  } else {
    elements.mistakeReviewList.innerHTML = reviewItems.map(item => `
      <article class="review-card mistake-review-card">
        <div>
          <strong>${escapeHtml(item.originalSentence)}</strong>
          <p>${escapeHtml(item.improvedSentence)}</p>
          <small>${escapeHtml(item.errorType || 'grammar')} - next: ${escapeHtml(item.nextReviewAt || 'today')}</small>
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
        <span class="label">Improved</span>
        <p>${escapeHtml(item.improvedSentence)}</p>
      </div>
      <div class="mistake-meta">
        <span class="word-status">${statusLabel(item.status)}</span>
        <small>${escapeHtml(item.errorType || 'grammar')} - next: ${escapeHtml(item.nextReviewAt || 'today')}</small>
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
    improvedSentence: elements.mistakeImproved.value.trim(),
    errorType: elements.mistakeType.value.trim(),
    note: elements.mistakeNote.value.trim(),
    source: 'manual'
  };
  if (!payload.originalSentence || !payload.improvedSentence) {
    elements.mistakeCount.textContent = 'Original and improved required';
    return;
  }
  await addMistake(payload);
  elements.mistakeForm.reset();
}

async function saveMistakeFromButton(button) {
  const payload = {
    originalSentence: button.dataset.original || '',
    improvedSentence: button.dataset.improved || '',
    errorType: button.dataset.type || 'grammar',
    note: button.dataset.note || '',
    source: 'AI feedback'
  };
  if (!payload.originalSentence || !payload.improvedSentence) return;
  button.disabled = true;
  button.textContent = 'Saved';
  await addMistake(payload);
}

async function reviewMistake(event) {
  const button = event.target.closest('[data-mistake-review]');
  if (!button) return;
  await api(`/api/mistakes/${button.dataset.mistakeReview}/review`, {
    method: 'POST',
    body: JSON.stringify({ result: button.dataset.result })
  });
  await loadMistakes();
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function setRecordingUi(isRecording, message) {
  state.isRecording = isRecording;
  elements.recordButton.classList.toggle('recording', isRecording);
  elements.recordButton.querySelector('span').textContent = isRecording ? 'Tap to Stop' : 'Tap to Record';
  elements.recordButton.querySelector('small').textContent = isRecording ? 'Recording now' : 'Hold to Speak';
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
    elements.recordingStatus.textContent = `Recording audio. Speech recognition issue: ${event.error || 'unavailable'}. You can still edit or type the transcript after stopping.`;
  };
  try {
    recognition.start();
    state.speechRecognition = recognition;
  } catch {
    elements.recordingStatus.textContent = 'Recording audio. Speech recognition could not start in this browser.';
  }
}

async function startRecording() {
  if (state.isRecording) return;
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
      saveRecordingDraft().catch(renderFeedbackError);
    };
    state.mediaRecorder = recorder;
    recorder.start();
    startSpeechRecognition();
    setRecordingUi(true, 'Recording. Speak naturally; live transcript will appear here when supported.');
    if (state.stopAfterRecordingStarts) {
      state.stopAfterRecordingStarts = false;
      window.setTimeout(stopRecording, 150);
    }
  } catch (error) {
    state.stopAfterRecordingStarts = false;
    renderFeedbackError(new Error(`Microphone permission issue: ${error.message || 'access denied'}`));
  }
}

function stopRecording() {
  if (!state.isRecording && state.mediaRecorder?.state !== 'recording') {
    state.stopAfterRecordingStarts = true;
    return;
  }
  if (state.speechRecognition) {
    try { state.speechRecognition.stop(); } catch {}
    state.speechRecognition = null;
  }
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.stop();
  }
  setRecordingUi(false, 'Saving recording and transcript...');
}

async function saveRecordingDraft() {
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

  state.lastRecordingId = saved.recording.id;
  elements.recordingStatus.textContent = transcript
    ? `Recording saved: ${saved.recording.fileName}. Review or edit the transcript, then submit feedback.`
    : `Recording saved: ${saved.recording.fileName}. Type or edit the transcript if needed, then submit feedback.`;
}

function startShadowingRecognition() {
  const Recognition = getSpeechRecognition();
  if (!Recognition) return;

  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = event => {
    let finalText = state.shadowTranscript;
    let interim = '';
    for (let index = event.resultIndex; index < event.results.length; index++) {
      const transcript = event.results[index][0]?.transcript || '';
      if (event.results[index].isFinal) {
        finalText = `${finalText} ${transcript}`.trim();
      } else {
        interim = `${interim} ${transcript}`.trim();
      }
    }
    state.shadowTranscript = finalText;
    const input = document.querySelector('#shadowingTranscript');
    if (input) input.value = [finalText, interim].filter(Boolean).join(' ');
  };
  recognition.onerror = () => {};
  try {
    recognition.start();
    state.shadowRecognition = recognition;
  } catch {
    state.shadowRecognition = null;
  }
}

async function startShadowingRecording() {
  if (!state.feedback || state.isShadowRecording) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.shadowAudioChunks = [];
    state.shadowTranscript = '';
    state.shadowRecordingStartedAt = Date.now();
    state.shadowRecordingId = null;
    state.shadowingFeedback = null;
    if (state.shadowAudioUrl) {
      URL.revokeObjectURL(state.shadowAudioUrl);
      state.shadowAudioUrl = '';
    }
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = event => {
      if (event.data.size > 0) state.shadowAudioChunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      saveShadowingRecordingAndRequestFeedback().catch(error => {
        state.shadowingLoading = false;
        state.shadowingFeedback = { rawText: `Shadowing feedback unavailable: ${error.message}` };
        renderFeedbackModalContent();
      });
    };
    state.shadowMediaRecorder = recorder;
    recorder.start();
    state.isShadowRecording = true;
    startShadowingRecognition();
    renderFeedbackModalContent();
  } catch (error) {
    state.shadowingFeedback = { rawText: `Microphone permission issue: ${error.message || 'access denied'}` };
    renderFeedbackModalContent();
  }
}

function stopShadowingRecording() {
  if (state.shadowRecognition) {
    try { state.shadowRecognition.stop(); } catch {}
    state.shadowRecognition = null;
  }
  if (state.shadowMediaRecorder && state.shadowMediaRecorder.state !== 'inactive') {
    state.shadowMediaRecorder.stop();
  }
  state.isShadowRecording = false;
  state.shadowingLoading = true;
  renderFeedbackModalContent();
}

async function saveShadowingRecordingAndRequestFeedback() {
  const blob = new Blob(state.shadowAudioChunks, { type: state.shadowMediaRecorder?.mimeType || 'audio/webm' });
  if (blob.size < 100) {
    throw new Error('The shadowing recording was too short. Try again and read the repeat script aloud.');
  }
  state.shadowAudioUrl = URL.createObjectURL(blob);
  const transcriptInput = document.querySelector('#shadowingTranscript');
  const transcript = (transcriptInput?.value || state.shadowTranscript || '').trim();
  state.shadowTranscript = transcript;
  const audioBase64 = await blobToBase64(blob);
  const durationSeconds = state.shadowRecordingStartedAt ? Math.round((Date.now() - state.shadowRecordingStartedAt) / 1000) : 0;
  const saved = await api('/api/recordings', {
    method: 'POST',
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || 'audio/webm',
      transcript,
      topic: state.topic?.topic || '',
      focus: 'shadowing repeat script',
      prompt: state.feedback?.repeatScript || state.feedback?.naturalVersion || '',
      durationSeconds
    })
  });
  state.shadowRecordingId = saved.recording.id;
  const data = await api('/api/shadowing-feedback', {
    method: 'POST',
    body: JSON.stringify({
      repeatScript: state.feedback?.repeatScript || state.feedback?.naturalVersion || '',
      shadowingTranscript: transcript,
      originalAnswer: state.feedbackAnswer,
      originalFeedback: state.feedback,
      recordingId: state.shadowRecordingId
    })
  });
  state.shadowingFeedback = data.feedback;
  state.shadowingLoading = false;
  renderFeedbackModalContent();
}

function toggleShadowingRecording() {
  if (state.isShadowRecording) {
    stopShadowingRecording();
  } else {
    startShadowingRecording();
  }
}

function toggleRecording() {
  if (state.isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startHoldToSpeak(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (state.isRecording) return;
  window.clearTimeout(state.holdTimer);
  state.holdTimer = window.setTimeout(() => {
    state.holdRecording = true;
    state.suppressRecordClick = true;
    startRecording();
  }, 420);
}

function endHoldToSpeak() {
  window.clearTimeout(state.holdTimer);
  state.holdTimer = null;
  if (state.holdRecording) {
    state.holdRecording = false;
    stopRecording();
  }
}

function handleRecordClick() {
  if (state.suppressRecordClick) {
    state.suppressRecordClick = false;
    return;
  }
  toggleRecording();
}

function card(title, body) {
  return `<article class="feedback-card"><h3>${title}</h3>${body.startsWith('<') ? body : `<p>${body}</p>`}</article>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

async function loadInitialData() {
  const [settings, topic] = await Promise.all([api('/api/settings'), api('/api/today')]);
  renderSettings(settings);
  renderTopic(topic);
  await renderNetworkInfo();
  await loadVocabulary();
  await loadMistakes();
  await loadHistory();
}

async function requestFeedback() {
  const answer = elements.answerInput.value.trim();
  if (answer.length < 20 && !state.lastRecordingId) {
    renderFeedbackError(new Error('Please enter a longer transcript or record audio before submitting feedback.'));
    return;
  }

  setFeedbackLoading(true);
  renderFeedbackLoading();
  state.feedbackAnswer = answer;
  try {
    const data = await api('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ answer, context: state.topic, recordingId: state.lastRecordingId })
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
    durationMinutes: null
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

function setFollowupLoading(isLoading) {
  elements.requestFollowups.disabled = isLoading;
  elements.sendFollowupAnswer.disabled = isLoading;
  if (elements.requestSceneFeedback) {
    elements.requestSceneFeedback.disabled = isLoading || state.sceneFeedbackLoading || !canRequestSceneFeedback();
  }
  if (isLoading) {
    elements.followupStatus.textContent = 'AI role is preparing the next scene turn...';
  }
}

function canRequestSceneFeedback() {
  return state.scenarioTurns.some(turn => turn.speaker === 'Learner' && String(turn.text || '').trim());
}

function setSceneFeedbackLoading(isLoading) {
  state.sceneFeedbackLoading = isLoading;
  if (elements.requestSceneFeedback) {
    elements.requestSceneFeedback.disabled = isLoading || !canRequestSceneFeedback();
    elements.requestSceneFeedback.textContent = isLoading ? 'Getting scene feedback...' : 'Get scene feedback';
  }
}

function renderSceneFeedback(feedback) {
  state.sceneFeedback = feedback;
  if (feedback.rawText || feedback.rawResponse) {
    return card('Full scene feedback', escapeHtml(feedback.rawText || JSON.stringify(feedback.rawResponse, null, 2)));
  }

  const turnFeedback = Array.isArray(feedback.turnByTurnFeedback) && feedback.turnByTurnFeedback.length
    ? `<ul>${feedback.turnByTurnFeedback.map(item => `
      <li>
        <strong>${escapeHtml(item.learnerLine || '')}</strong><br>
        <span>${escapeHtml(item.issue || '')}</span><br>
        <span>${escapeHtml(item.betterWay || '')}</span>
      </li>
    `).join('')}</ul>`
    : '<p>No sentence-level notes returned.</p>';

  const improvedDialogue = Array.isArray(feedback.improvedDialogue) && feedback.improvedDialogue.length
    ? `<ul>${feedback.improvedDialogue.map(item => `<li><strong>${escapeHtml(item.speaker || '')}:</strong> ${escapeHtml(item.line || '')}</li>`).join('')}</ul>`
    : '<p>No improved dialogue returned.</p>';

  const expressions = Array.isArray(feedback.reusableExpressions) && feedback.reusableExpressions.length
    ? `<ul>${feedback.reusableExpressions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p>No reusable expressions returned.</p>';

  return [
    card('Full scene feedback', `
      <p><strong>Overall:</strong> ${escapeHtml(feedback.overallPerformance || 'No overall review returned.')}</p>
      <p><strong>Task completion:</strong> ${escapeHtml(feedback.taskCompletion || 'No task completion review returned.')}</p>
    `),
    card('Turn-by-turn fixes', turnFeedback),
    card('Improved dialogue', improvedDialogue),
    card('Reusable expressions', expressions),
    card('Next practice focus', `<p>${escapeHtml(feedback.nextPracticeFocus || '')}</p>`),
    card('Scene repeat script', `<p>${escapeHtml(feedback.repeatScript || '')}</p>`)
  ].join('');
}

function renderScenarioCoaching(followups) {
  const coaching = followups.coachingNote
    ? `<p>${escapeHtml(followups.coachingNote)}</p>`
    : '<p>Reply naturally to the AI role and keep the scene moving.</p>';
  const betterWay = followups.betterWay ? `<p><strong>Better way:</strong> ${escapeHtml(followups.betterWay)}</p>` : '';
  const repeatLine = followups.repeatLine ? `<p><strong>Repeat:</strong> ${escapeHtml(followups.repeatLine)}</p>` : '';
  const closing = followups.closingSummary ? `<p><strong>Scene summary:</strong> ${escapeHtml(followups.closingSummary)}</p>` : '';
  const sceneFeedback = state.sceneFeedback ? renderSceneFeedback(state.sceneFeedback) : '';

  elements.followupCoaching.innerHTML = [
    card('Scene coaching', `${coaching}${betterWay}${repeatLine}${closing}`),
    sceneFeedback
  ].filter(Boolean).join('');
}

async function requestSceneFeedback({ automatic = false } = {}) {
  if (!canRequestSceneFeedback()) {
    elements.followupStatus.textContent = 'Complete at least one learner reply before requesting scene feedback.';
    return;
  }
  if (state.sceneFeedbackLoading) return;
  if (automatic && state.sceneFeedbackRequested) return;
  if (!automatic && state.sceneFeedback) {
    elements.followupStatus.textContent = 'Full scene feedback is already ready below.';
    return;
  }

  state.sceneFeedbackRequested = true;
  setSceneFeedbackLoading(true);
  elements.followupStatus.textContent = automatic
    ? 'Scene complete. Getting full scene feedback automatically...'
    : 'Getting full scene feedback for the whole role-play...';
  try {
    const data = await api('/api/scene-feedback', {
      method: 'POST',
      body: JSON.stringify({ context: state.topic, turns: state.scenarioTurns })
    });
    const rendered = renderSceneFeedback(data.feedback || {});
    const existing = elements.followupCoaching.innerHTML;
    elements.followupCoaching.innerHTML = `${existing}${rendered}`;
    elements.followupStatus.textContent = 'Full scene feedback is ready.';
  } catch (error) {
    state.sceneFeedbackRequested = false;
    elements.followupStatus.textContent = `Scene feedback unavailable: ${error.message}`;
  } finally {
    setSceneFeedbackLoading(false);
  }
}

function renderFollowupResult(followups) {
  if (followups.rawText || followups.rawResponse) {
    elements.followupCoaching.innerHTML = card('Raw scenario response', escapeHtml(followups.rawText || JSON.stringify(followups.rawResponse, null, 2)));
    return;
  }

  const aiLine = followups.aiLine || (Array.isArray(followups.questions) ? followups.questions[0] : '');
  if (aiLine) {
    state.currentAiLine = aiLine;
    state.scenarioTurns.push({ speaker: state.topic?.role || 'AI role', text: aiLine });
  }
  state.scenarioComplete = Boolean(followups.isComplete);

  elements.followupQuestions.innerHTML = state.scenarioTurns.map(turn => `
    <div class="scenario-turn ${turn.speaker === 'Learner' ? 'user' : 'assistant'}">
      <span>${escapeHtml(turn.speaker)}</span>
      <p>${escapeHtml(turn.text)}</p>
    </div>
  `).join('');

  renderScenarioCoaching(followups);
  elements.followupResponse.hidden = state.scenarioComplete || !state.currentAiLine;
  elements.selectedFollowupQuestion.textContent = state.scenarioComplete
    ? 'Scene complete.'
    : state.currentAiLine;
  if (elements.requestSceneFeedback) {
    elements.requestSceneFeedback.disabled = state.sceneFeedbackLoading || !canRequestSceneFeedback();
  }
  if (state.scenarioComplete && canRequestSceneFeedback()) {
    requestSceneFeedback({ automatic: true });
  }
}

async function requestFollowups() {
  const answer = elements.roleOpeningAnswer?.value.trim() || elements.answerInput.value.trim();
  if (answer.length < 10) {
    elements.followupStatus.textContent = 'Answer the scenario opening first, then start the role-play scene.';
    return;
  }

  state.scenarioTurns = [
    { speaker: state.topic?.role || 'AI role', text: state.topic?.openingLine || state.topic?.prompt || '' },
    { speaker: 'Learner', text: answer }
  ].filter(turn => turn.text);
  state.currentAiLine = state.topic?.openingLine || state.topic?.prompt || '';
  state.scenarioComplete = false;
  state.sceneFeedback = null;
  state.sceneFeedbackRequested = false;
  elements.followupResponse.hidden = true;
  elements.followupCoaching.innerHTML = '';
  setFollowupLoading(true);
  try {
    const data = await api('/api/followups', {
      method: 'POST',
      body: JSON.stringify({ answer, context: state.topic, turns: state.scenarioTurns })
    });
    renderFollowupResult(data.followups || {});
    elements.followupStatus.textContent = 'Reply to the AI role to continue the scene.';
  } catch (error) {
    elements.followupStatus.textContent = `Scenario unavailable: ${error.message}`;
  } finally {
    setFollowupLoading(false);
  }
}

async function sendFollowupAnswer() {
  const answer = elements.roleOpeningAnswer?.value.trim() || elements.answerInput.value.trim();
  const followupAnswer = elements.followupAnswer.value.trim();
  if (!state.currentAiLine) {
    elements.followupStatus.textContent = 'Start the scene first.';
    return;
  }
  if (followupAnswer.length < 5) {
    elements.followupStatus.textContent = 'Write or say a short reply to the AI role first.';
    return;
  }

  state.sceneFeedback = null;
  state.sceneFeedbackRequested = false;
  state.scenarioTurns.push({ speaker: 'Learner', text: followupAnswer });
  setFollowupLoading(true);
  try {
    const data = await api('/api/followups', {
      method: 'POST',
      body: JSON.stringify({
        answer,
        context: state.topic,
        question: state.currentAiLine,
        followupAnswer,
        turns: state.scenarioTurns
      })
    });
    renderFollowupResult(data.followups || {});
    elements.followupAnswer.value = '';
    elements.followupStatus.textContent = state.scenarioComplete
      ? 'Scene complete. Review the summary or start a new scene.'
      : 'Good. Reply to the next role line to continue.';
  } catch (error) {
    elements.followupStatus.textContent = `Scenario unavailable: ${error.message}`;
  } finally {
    setFollowupLoading(false);
  }
}

function clearFollowups() {
  state.scenarioTurns = [];
  state.currentAiLine = '';
  state.scenarioComplete = false;
  state.sceneFeedback = null;
  state.sceneFeedbackRequested = false;
  state.sceneFeedbackLoading = false;
  elements.followupQuestions.innerHTML = '';
  elements.followupCoaching.innerHTML = '';
  if (elements.roleOpeningAnswer) {
    elements.roleOpeningAnswer.value = '';
  }
  elements.followupAnswer.value = '';
  elements.followupResponse.hidden = true;
  if (elements.requestSceneFeedback) {
    elements.requestSceneFeedback.disabled = true;
    elements.requestSceneFeedback.textContent = 'Get scene feedback';
  }
  elements.followupStatus.textContent = 'Start a role-play scene, answer naturally, and let AI close the conversation.';
}

async function loadRandomTopic() {
  const exclude = encodeURIComponent(state.topic?.prompt || '');
  const level = encodeURIComponent(elements.levelFilter.value || '');
  const category = encodeURIComponent(elements.categoryFilter.value || '');
  renderTopic(await api(`/api/today?random=1&exclude=${exclude}&level=${level}&category=${category}`));
}

function chatInputMode() {
  return document.querySelector('input[name="chatInputMode"]:checked')?.value || 'text';
}

function chatOutputMode() {
  return document.querySelector('input[name="chatOutputMode"]:checked')?.value || 'text';
}

function saveChatMessages() {
  localStorage.setItem('englishSpeakingCoachChat', JSON.stringify(state.chatMessages.slice(-30)));
}

function loadChatMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem('englishSpeakingCoachChat') || '[]');
    state.chatMessages = Array.isArray(saved) ? saved.slice(-30) : [];
  } catch {
    state.chatMessages = [];
  }
  if (!state.chatMessages.length) {
    state.chatMessages = [{
      role: 'assistant',
      content: 'Hi, I am your daily English coach. Tell me one simple thing about your day, and I will help you say it more naturally.'
    }];
  }
  renderChatMessages();
}

function renderChatMessages() {
  elements.chatMessages.innerHTML = state.chatMessages.map(message => (
    `<div class="chat-message ${message.role}">${escapeHtml(message.content)}</div>`
  )).join('');
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function openChat() {
  showPage('aiChat');
}

function closeChat() {
  showPage('todayPractice');
  window.speechSynthesis?.cancel();
  if (state.chatRecognition) {
    state.chatRecognition.stop();
    state.chatRecognition = null;
  }
}

function speakChatReply(text) {
  if (chatOutputMode() !== 'voice' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function setChatLoading(isLoading) {
  elements.sendChat.disabled = isLoading;
  elements.chatMic.disabled = isLoading;
  elements.chatStatus.textContent = isLoading
    ? 'AI coach is thinking...'
    : 'Chat with your coach. Use text or voice input, then listen or read the reply.';
}

async function sendChatMessage() {
  const text = elements.chatInput.value.trim();
  if (!text) {
    elements.chatStatus.textContent = 'Type or speak one English sentence first.';
    return;
  }

  state.chatMessages.push({ role: 'user', content: text });
  elements.chatInput.value = '';
  renderChatMessages();
  saveChatMessages();
  setChatLoading(true);

  try {
    const data = await api('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: state.chatMessages.filter(message => message.role !== 'system') })
    });
    const reply = String(data.reply || '').trim();
    state.chatMessages.push({ role: 'assistant', content: reply });
    renderChatMessages();
    saveChatMessages();
    speakChatReply(reply);
  } catch (error) {
    state.chatMessages.push({ role: 'system', content: `Chat failed: ${error.message}` });
    renderChatMessages();
    saveChatMessages();
  } finally {
    setChatLoading(false);
  }
}

function startChatVoiceInput() {
  if (chatInputMode() !== 'voice') {
    elements.chatStatus.textContent = 'Switch to Voice input first.';
    return;
  }
  const Recognition = getSpeechRecognition();
  if (!Recognition) {
    elements.chatStatus.textContent = 'Voice input is not supported in this browser. Use text input instead.';
    return;
  }
  if (state.chatRecognition) {
    state.chatRecognition.stop();
    state.chatRecognition = null;
    elements.chatMic.textContent = 'Speak';
    return;
  }

  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onresult = event => {
    let text = '';
    for (let index = 0; index < event.results.length; index += 1) {
      text += event.results[index][0].transcript;
    }
    elements.chatInput.value = text.trim();
  };
  recognition.onend = () => {
    state.chatRecognition = null;
    elements.chatMic.textContent = 'Speak';
    elements.chatStatus.textContent = elements.chatInput.value.trim()
      ? 'Voice captured. Send it when you are ready.'
      : 'No voice text captured. Try again or use text input.';
  };
  recognition.onerror = event => {
    elements.chatStatus.textContent = `Voice input issue: ${event.error || 'unavailable'}.`;
  };
  state.chatRecognition = recognition;
  elements.chatMic.textContent = 'Stop';
  elements.chatStatus.textContent = 'Listening... speak one or two English sentences.';
  recognition.start();
}

function clearChat() {
  window.speechSynthesis?.cancel();
  state.chatMessages = [];
  localStorage.removeItem('englishSpeakingCoachChat');
  loadChatMessages();
}

document.querySelector('#requestFeedback').addEventListener('click', requestFeedback);
elements.copyPhoneUrl.addEventListener('click', copyPhoneUrl);
elements.installApp?.addEventListener('click', installApp);
elements.openFeedbackModal.addEventListener('click', openFeedbackModal);
elements.closeFeedbackModal.addEventListener('click', closeFeedbackModal);
elements.feedbackModalBackdrop.addEventListener('click', closeFeedbackModal);
elements.feedbackModalContent.addEventListener('click', event => {
  if (event.target?.id === 'toggleShadowingRecording') {
    toggleShadowingRecording();
  }
  if (event.target?.id === 'sendFeedbackFollowup') {
    sendFeedbackFollowupAnswer();
  }
  const saveButton = event.target?.closest?.('.save-mistake-button');
  if (saveButton) {
    saveMistakeFromButton(saveButton).catch(renderFeedbackError);
  }
});
elements.feedbackModalContent.addEventListener('input', event => {
  if (event.target?.id === 'shadowingTranscript') {
    state.shadowTranscript = event.target.value;
  }
});
elements.feedbackContent.addEventListener('click', event => {
  const saveButton = event.target?.closest?.('.save-mistake-button');
  if (saveButton) {
    saveMistakeFromButton(saveButton).catch(renderFeedbackError);
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !elements.feedbackModal.hidden) {
    closeFeedbackModal();
  }
  if (event.key === 'Escape' && !elements.chatModal.hidden) {
    closeChat();
  }
});
elements.pageButtons.forEach(button => {
  button.addEventListener('click', () => showPage(button.dataset.page));
});
elements.pageLinks.forEach(button => {
  button.addEventListener('click', () => showPage(button.dataset.pageLink));
});
elements.openChat?.addEventListener('click', openChat);
elements.closeChat.addEventListener('click', closeChat);
elements.chatModalBackdrop?.addEventListener('click', closeChat);
elements.sendChat.addEventListener('click', sendChatMessage);
elements.chatMic.addEventListener('click', startChatVoiceInput);
elements.clearChat.addEventListener('click', clearChat);
elements.chatInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    sendChatMessage();
  }
});
elements.requestFollowups.addEventListener('click', requestFollowups);
elements.sendFollowupAnswer.addEventListener('click', sendFollowupAnswer);
elements.requestSceneFeedback.addEventListener('click', () => requestSceneFeedback());
elements.clearFollowups.addEventListener('click', clearFollowups);
document.querySelector('#saveSession').addEventListener('click', saveSession);
document.querySelector('#refreshHistory').addEventListener('click', loadHistory);
document.querySelector('#refreshVocabulary').addEventListener('click', loadVocabulary);
elements.vocabForm.addEventListener('submit', addVocabulary);
elements.reviewList.addEventListener('click', reviewVocabulary);
document.querySelector('#refreshMistakes').addEventListener('click', loadMistakes);
elements.mistakeForm.addEventListener('submit', addMistakeFromForm);
elements.mistakeReviewList.addEventListener('click', reviewMistake);
elements.recordButton.addEventListener('pointerdown', startHoldToSpeak);
elements.recordButton.addEventListener('pointerup', endHoldToSpeak);
elements.recordButton.addEventListener('pointercancel', endHoldToSpeak);
elements.recordButton.addEventListener('pointerleave', endHoldToSpeak);
elements.recordButton.addEventListener('click', handleRecordClick);
document.querySelector('#clearAnswer').addEventListener('click', () => {
  if (state.isRecording) {
    stopRecording();
  }
  elements.answerInput.value = '';
  state.lastRecordingId = null;
  state.finalTranscript = '';
  elements.recordingPlayback.hidden = true;
  setRecordingUi(false, 'Tap to record, or press and hold while speaking. Review the transcript before feedback.');
  clearFollowups();
});
document.querySelector('#loadTopic').addEventListener('click', () => loadRandomTopic());
elements.loadRoleTopic?.addEventListener('click', () => loadRandomTopic());

registerServiceWorker();
setupInstallPrompt();

loadInitialData().catch(error => {
  elements.feedbackState.textContent = 'App setup issue';
  renderFeedbackError(error);
});
