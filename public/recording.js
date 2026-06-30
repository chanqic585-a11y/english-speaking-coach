import { state, elements, escapeHtml } from './state.js';
import { api } from './api.js';
import { renderFeedbackError, renderFeedbackModalContent } from './feedback.js';
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
    ? 'Listening and recording. Read the repeat script aloud, then stop.'
    : state.shadowingLoading
      ? 'Saving your shadowing audio and asking Gemini to compare it...'
      : state.shadowingFeedback
        ? 'Shadowing feedback is ready.'
        : 'Step 1: record yourself reading the repeat script. Step 2: edit the transcript if needed. Step 3: get shadowing feedback automatically.';
  const statusClass = state.isShadowRecording
    ? 'listening'
    : state.shadowingFeedback
      ? 'ready'
      : '';
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
        <span class="voice-step-status ${statusClass}">${escapeHtml(status)}</span>
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

function startQuickTranscriptVoiceInput() {
  startDictation({
    input: elements.answerInput,
    status: elements.recordingStatus,
    button: elements.quickTranscriptVoice,
    idleText: 'Voice transcript',
    listeningText: 'Listening... speak your answer and watch the live transcript.',
    readyText: 'Transcript ready. Edit it if needed, then tap Get Feedback.',
    title: 'Practice transcript',
    prompt: 'Use this for quick voice-to-text. For audio-based feedback, use the large Record button instead.'
  });
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function setVoiceStatus(element, message, mode = '') {
  if (!element) return;
  element.textContent = message;
  element.classList.remove('listening', 'ready', 'issue');
  if (mode) element.classList.add(mode);
}

function setButtonRecording(button, isRecording, activeText = 'Stop', idleText = 'Record voice') {
  if (!button) return;
  button.textContent = isRecording ? activeText : idleText;
  button.classList.toggle('recording', isRecording);
}

function stopActiveDictation() {
  if (state.dictationRecognition) {
    state.dictationRecognition.stop();
    state.dictationRecognition = null;
  }
  if (state.activeDictationTarget?.button) {
    setButtonRecording(state.activeDictationTarget.button, false, 'Stop', state.activeDictationTarget.idleText);
  }
  state.activeDictationTarget = null;
}

function setVoiceCaptureStatus(message, mode = '') {
  setVoiceStatus(elements.voiceCaptureStatus, message, mode);
}

function syncModalOpenState() {
  const feedbackOpen = elements.feedbackModal && !elements.feedbackModal.hidden;
  const voiceOpen = elements.voiceCaptureModal && !elements.voiceCaptureModal.hidden;
  document.body.classList.toggle('modal-open', Boolean(feedbackOpen || voiceOpen));
}

function openVoiceCaptureModal({ title, prompt }) {
  elements.voiceCaptureTitle.textContent = title || 'Speak in English';
  elements.voiceCapturePrompt.textContent = prompt || 'Watch the live transcript, then use it when it looks right.';
  elements.voiceCaptureModal.hidden = false;
  syncModalOpenState();
  window.requestAnimationFrame(() => elements.voiceCapturePanel.focus());
}

function closeVoiceCaptureModal({ keepTranscript = false } = {}) {
  stopActiveDictation();
  if (!keepTranscript) {
    state.voiceCaptureTranscript = '';
    elements.voiceCaptureTranscript.value = '';
  }
  elements.voiceCaptureModal.hidden = true;
  syncModalOpenState();
}

function finishVoiceCapture() {
  if (state.dictationRecognition) {
    try { state.dictationRecognition.stop(); } catch {}
  }
}

function retryVoiceCapture() {
  const target = state.activeDictationTarget;
  if (!target) return;
  if (state.dictationRecognition) {
    stopActiveDictation();
  }
  startDictation(target);
}

function useVoiceCaptureTranscript() {
  const target = state.activeDictationTarget;
  const transcript = elements.voiceCaptureTranscript.value.trim();
  if (!target || !target.input || !transcript) {
    setVoiceCaptureStatus('No transcript yet. Speak again or type directly in the original box.', 'issue');
    return;
  }
  target.input.value = transcript;
    target.input.dispatchEvent(new Event('input', { bubbles: true }));
  setVoiceStatus(target.status, target.readyText || 'Transcript ready. Review it, then continue.', 'ready');
  target.input.focus();
  closeVoiceCaptureModal({ keepTranscript: false });
}

function startDictation({
  input,
  status,
  button,
  idleText = 'Record voice',
  listeningText,
  readyText,
  title = 'Speak in English',
  prompt = 'Watch the live transcript, then use it when it looks right.'
}) {
  if (!input) return;
  const Recognition = getSpeechRecognition();
  if (!Recognition) {
    setVoiceStatus(status, 'Voice typing is not supported in this browser. Please type instead.', 'issue');
    return;
  }
  if (state.dictationRecognition) {
    finishVoiceCapture();
    return;
  }

  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  state.voiceCaptureTranscript = '';
  state.activeDictationTarget = { input, status, button, idleText, listeningText, readyText, title, prompt };
  elements.voiceCaptureTranscript.value = '';
  elements.useVoiceCapture.disabled = true;
  elements.stopVoiceCapture.disabled = false;
  elements.retryVoiceCapture.disabled = true;
  openVoiceCaptureModal({ title, prompt });

  recognition.onresult = event => {
    let text = '';
    for (let index = 0; index < event.results.length; index += 1) {
      text += event.results[index][0]?.transcript || '';
    }
    state.voiceCaptureTranscript = text.trim();
    elements.voiceCaptureTranscript.value = state.voiceCaptureTranscript;
    elements.useVoiceCapture.disabled = !state.voiceCaptureTranscript;
    setVoiceCaptureStatus('Transcribing... keep speaking or wait for the final text.', 'listening');
    setVoiceStatus(status, 'Listening in the voice capture window...', 'listening');
  };
  recognition.onend = () => {
    state.dictationRecognition = null;
    setButtonRecording(button, false, 'Stop', idleText);
    elements.stopVoiceCapture.disabled = true;
    elements.retryVoiceCapture.disabled = false;
    elements.useVoiceCapture.disabled = !elements.voiceCaptureTranscript.value.trim();
    setVoiceCaptureStatus(
      elements.voiceCaptureTranscript.value.trim()
        ? 'Transcript ready. Edit it here if needed, then tap Use transcript.'
        : 'No transcript captured. Try again, speak closer to the mic, or type instead.',
      elements.voiceCaptureTranscript.value.trim() ? 'ready' : 'issue'
    );
    setVoiceStatus(
      status,
      elements.voiceCaptureTranscript.value.trim()
        ? 'Transcript ready in the popup. Use it when it looks right.'
        : 'No transcript captured. Try again or type instead.',
      elements.voiceCaptureTranscript.value.trim() ? 'ready' : 'issue'
    );
  };
  recognition.onerror = event => {
    setVoiceCaptureStatus(`Voice input issue: ${event.error || 'unavailable'}. Try again or type instead.`, 'issue');
    setVoiceStatus(status, `Voice input issue: ${event.error || 'unavailable'}. Try again or type instead.`, 'issue');
  };

  try {
    state.dictationRecognition = recognition;
    setButtonRecording(button, true, 'Stop', idleText);
    setVoiceCaptureStatus(listeningText, 'listening');
    setVoiceStatus(status, 'Listening in the voice capture window...', 'listening');
    recognition.start();
  } catch {
    state.dictationRecognition = null;
    setButtonRecording(button, false, 'Stop', idleText);
    elements.stopVoiceCapture.disabled = true;
    elements.retryVoiceCapture.disabled = false;
    elements.useVoiceCapture.disabled = true;
    setVoiceCaptureStatus('Voice input could not start in this browser. Please type instead.', 'issue');
    setVoiceStatus(status, 'Voice input could not start in this browser. Please type instead.', 'issue');
  }
}

function setRecordingUi(isRecording, message) {
  state.isRecording = isRecording;
  elements.recordButton.classList.toggle('recording', isRecording);
  elements.recordButton.querySelector('span').textContent = isRecording ? 'Tap to Stop' : 'Tap to Record';
  elements.recordButton.querySelector('small').textContent = isRecording ? 'Recording now' : 'Hold to Speak';
  setVoiceStatus(elements.recordingStatus, message, isRecording ? 'listening' : '');
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
    setVoiceStatus(elements.recordingStatus, 'Recording audio. Live transcript is not supported here, so type your transcript after stopping.', 'issue');
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
      elements.answerInput.dispatchEvent(new Event('input', { bubbles: true }));
    setVoiceStatus(elements.recordingStatus, 'Listening and transcribing... stop when you finish speaking.', 'listening');
  };
  recognition.onerror = event => {
    setVoiceStatus(elements.recordingStatus, `Recording audio. Speech recognition issue: ${event.error || 'unavailable'}. You can still edit or type the transcript after stopping.`, 'issue');
  };
  try {
    recognition.start();
    state.speechRecognition = recognition;
  } catch {
    setVoiceStatus(elements.recordingStatus, 'Recording audio. Speech recognition could not start here, so type your transcript after stopping.', 'issue');
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
  setVoiceStatus(
    elements.recordingStatus,
    transcript
      ? `Transcript ready. Review or edit it, then tap Get Feedback.`
      : `Recording saved. Type or edit the transcript, then tap Get Feedback.`,
    transcript ? 'ready' : 'issue'
  );
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

export {
  closeVoiceCaptureModal,
  endHoldToSpeak,
  finishVoiceCapture,
  handleRecordClick,
  renderShadowingPanel,
  resetShadowingState,
  retryVoiceCapture,
  setRecordingUi,
  setVoiceStatus,
  startDictation,
  startHoldToSpeak,
  startQuickTranscriptVoiceInput,
  stopActiveDictation,
  stopRecording,
  stopShadowingRecording,
  syncModalOpenState,
  toggleShadowingRecording,
  useVoiceCaptureTranscript
};
