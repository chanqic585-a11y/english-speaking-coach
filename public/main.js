import { state, elements, escapeHtml } from './state.js';
import { api } from './api.js';
import { closeChat, clearChat, loadChatMessages, sendChatMessage, startChatVoiceInput } from './chat.js';
import { closeFeedbackModal, openFeedbackModal, renderFeedback, renderFeedbackError, renderFeedbackLoading, sendFeedbackFollowupAnswer, setFeedbackLoading, startFeedbackFollowupVoiceInput } from './feedback.js';
import { addMistakeFromForm, addVocabulary, loadMistakes, loadVocabulary, reviewMistake, reviewVocabulary, saveMistakeFromButton } from './review.js';
import { closeVoiceCaptureModal, endHoldToSpeak, finishVoiceCapture, handleRecordClick, retryVoiceCapture, setRecordingUi, startHoldToSpeak, startQuickTranscriptVoiceInput, stopRecording, syncModalOpenState, toggleShadowingRecording, useVoiceCaptureTranscript } from './recording.js';
import { clearFollowups, loadRandomTopic, requestFollowups, requestSceneFeedback, sendFollowupAnswer, startFollowupVoiceInput, startRoleOpeningVoiceInput } from './roleplay.js';

let deferredInstallPrompt = null;
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

function setTodayStep(step) {
  const nextStep = Math.max(1, Math.min(5, Number(step) || 1));
  state.todayStep = nextStep;
  document.body.dataset.todayStep = String(nextStep);
  elements.todayStepPanels.forEach(panel => {
    const isActive = Number(panel.dataset.todayStepPanel) === nextStep;
    panel.hidden = !isActive;
    panel.classList.toggle('active', isActive);
  });
  elements.todayStepDots.forEach(dot => {
    const dotStep = Number(dot.dataset.todayStepDot);
    dot.classList.toggle('active', dotStep === nextStep);
    dot.classList.toggle('complete', dotStep < nextStep);
  });
}

function updateTranscriptProgress() {
  const hasAnswer = elements.answerInput.value.trim().length >= 5 || Boolean(state.lastRecordingId);
  if (elements.continueToFeedback) {
    elements.continueToFeedback.disabled = !hasAnswer;
  }
  if (hasAnswer && state.todayStep === 2) {
    setTodayStep(3);
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
  setTodayStep(1);
  updateTranscriptProgress();
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
    setTodayStep(4);
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
  setTodayStep(5);
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
elements.quickTranscriptVoice?.addEventListener('click', startQuickTranscriptVoiceInput);
elements.copyPhoneUrl.addEventListener('click', copyPhoneUrl);
elements.installApp?.addEventListener('click', installApp);
elements.openFeedbackModal.addEventListener('click', openFeedbackModal);
elements.todayOpenFeedback?.addEventListener('click', openFeedbackModal);
elements.startTodayAnswer?.addEventListener('click', () => setTodayStep(2));
elements.continueToFeedback?.addEventListener('click', () => setTodayStep(3));
elements.backToRecord?.addEventListener('click', () => setTodayStep(2));
elements.continueToSave?.addEventListener('click', () => setTodayStep(5));
elements.finishTodayPractice?.addEventListener('click', () => setTodayStep(1));
elements.closeFeedbackModal.addEventListener('click', closeFeedbackModal);
elements.feedbackModalBackdrop.addEventListener('click', closeFeedbackModal);
elements.closeVoiceCapture.addEventListener('click', () => closeVoiceCaptureModal({ keepTranscript: false }));
elements.voiceCaptureBackdrop.addEventListener('click', () => closeVoiceCaptureModal({ keepTranscript: false }));
elements.stopVoiceCapture.addEventListener('click', finishVoiceCapture);
elements.retryVoiceCapture.addEventListener('click', retryVoiceCapture);
elements.useVoiceCapture.addEventListener('click', useVoiceCaptureTranscript);
elements.voiceCaptureTranscript.addEventListener('input', () => {
  state.voiceCaptureTranscript = elements.voiceCaptureTranscript.value.trim();
  elements.useVoiceCapture.disabled = !state.voiceCaptureTranscript;
});
elements.feedbackModalContent.addEventListener('click', event => {
  if (event.target?.id === 'toggleShadowingRecording') {
    toggleShadowingRecording();
  }
  if (event.target?.id === 'sendFeedbackFollowup') {
    sendFeedbackFollowupAnswer();
  }
  if (event.target?.id === 'feedbackFollowupVoice') {
    startFeedbackFollowupVoiceInput();
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
  if (event.key === 'Escape' && !elements.voiceCaptureModal.hidden) {
    closeVoiceCaptureModal({ keepTranscript: false });
    return;
  }
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
elements.answerInput.addEventListener('input', updateTranscriptProgress);
elements.chatInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    sendChatMessage();
  }
});
elements.requestFollowups.addEventListener('click', requestFollowups);
elements.roleOpeningVoice?.addEventListener('click', startRoleOpeningVoiceInput);
elements.followupVoice?.addEventListener('click', startFollowupVoiceInput);
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
  updateTranscriptProgress();
  setTodayStep(2);
  state.lastRecordingId = null;
  state.finalTranscript = '';
  elements.recordingPlayback.hidden = true;
  setRecordingUi(false, 'Tap to record, or press and hold while speaking. Review the transcript before feedback.');
  clearFollowups();
});
document.querySelector('#loadTopic').addEventListener('click', () => loadRandomTopic());
elements.loadRoleTopic?.addEventListener('click', () => loadRandomTopic());

setTodayStep(1);
registerServiceWorker();
setupInstallPrompt();

loadInitialData().catch(error => {
  elements.feedbackState.textContent = 'App setup issue';
  renderFeedbackError(error);
});


export {
  renderTopic,
  setTodayStep,
  showPage
};
