import { state, elements, card, escapeHtml } from './state.js';
import { api } from './api.js';
import { closeVoiceCaptureModal, renderShadowingPanel, resetShadowingState, setVoiceStatus, startDictation, stopShadowingRecording, syncModalOpenState, toggleShadowingRecording } from './recording.js';
import { saveMistakeFromButton } from './review.js';
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

  const naturalSave = feedback.naturalVersion
    ? `<button type="button" class="secondary-button compact-button save-mistake-button"
        data-original="${escapeHtml(state.feedbackAnswer || '')}"
        data-improved="${escapeHtml(feedback.naturalVersion || '')}"
        data-type="naturalness"
        data-note="Natural expression upgrade from AI feedback.">Save mistake</button>`
    : '';

  return [
    card('Quick diagnosis', escapeHtml(feedback.quickDiagnosis || 'No quick diagnosis returned.')),
    card('Pronunciation, fluency, pause, speed', speechScores),
    card('Hard words to repeat', hardWords),
    card('Possible pronunciation issues', pronunciationIssues),
    card('Grammar fixes', grammar),
    card('Logic and coherence', logic),
    card('Natural version', `<p>${escapeHtml(feedback.naturalVersion || '')}</p>${naturalSave}`),
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
        <p class="voice-step-status" id="feedbackFollowupVoiceStatus">Record or type your answer. The transcript will appear below.</p>
        <textarea id="feedbackFollowupAnswer" rows="3" placeholder="Answer this follow-up in English..."></textarea>
        <div class="practice-actions next-actions">
          <button type="button" class="secondary-button" id="feedbackFollowupVoice" ${state.feedbackFollowupLoading ? 'disabled' : ''}>Record voice</button>
          <button type="button" class="primary-button" id="sendFeedbackFollowup" ${state.feedbackFollowupLoading ? 'disabled' : ''}>Send follow-up answer</button>
        </div>
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

function startFeedbackFollowupVoiceInput() {
  startDictation({
    input: document.querySelector('#feedbackFollowupAnswer'),
    status: document.querySelector('#feedbackFollowupVoiceStatus'),
    button: document.querySelector('#feedbackFollowupVoice'),
    idleText: 'Record voice',
    listeningText: 'Listening... answer the follow-up question in English.',
    readyText: 'Transcript ready. Edit it if needed, then send your follow-up answer.',
    title: 'Answer the follow-up',
    prompt: 'Speak your answer. The live transcript appears below, then you can use it in the follow-up box.'
  });
}

function openFeedbackModal() {
  elements.feedbackModal.hidden = false;
  syncModalOpenState();
  window.requestAnimationFrame(() => elements.feedbackModalPanel.focus());
}

function closeFeedbackModal() {
  if (state.isShadowRecording) {
    stopShadowingRecording();
  }
  closeVoiceCaptureModal({ keepTranscript: false });
  elements.feedbackModal.hidden = true;
  syncModalOpenState();
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
  if (state.lastRecordingId) {
    setVoiceStatus(elements.recordingStatus, 'AI feedback received. Next: read the repeat script aloud in the feedback window.', 'ready');
  }

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



export {
  closeFeedbackModal,
  openFeedbackModal,
  renderFeedback,
  renderFeedbackError,
  renderFeedbackLoading,
  renderFeedbackModalContent,
  requestFeedbackFollowup,
  sendFeedbackFollowupAnswer,
  setFeedbackLoading,
  startFeedbackFollowupVoiceInput
};
