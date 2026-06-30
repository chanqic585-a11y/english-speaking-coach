import { state, elements, card, escapeHtml } from './state.js';
import { api } from './api.js';
import { setVoiceStatus, startDictation } from './recording.js';
import { renderTopic } from './main.js';
function setFollowupLoading(isLoading) {
  elements.requestFollowups.disabled = isLoading;
  elements.sendFollowupAnswer.disabled = isLoading;
  if (elements.roleOpeningVoice) elements.roleOpeningVoice.disabled = isLoading;
  if (elements.followupVoice) elements.followupVoice.disabled = isLoading;
  if (elements.requestSceneFeedback) {
    elements.requestSceneFeedback.disabled = isLoading || state.sceneFeedbackLoading || !canRequestSceneFeedback();
  }
  if (isLoading) {
    elements.followupStatus.textContent = 'AI role is preparing the next scene turn...';
  }
}

function startRoleOpeningVoiceInput() {
  startDictation({
    input: elements.roleOpeningAnswer,
    status: elements.roleOpeningVoiceStatus,
    button: elements.roleOpeningVoice,
    idleText: 'Record voice',
    listeningText: 'Listening... answer the role opening in English.',
    readyText: 'Transcript ready. Edit it if needed, then tap Start scene.',
    title: 'Role opening reply',
    prompt: 'Answer the role in English. Use the transcript when it sounds right, then start the scene.'
  });
}

function startFollowupVoiceInput() {
  startDictation({
    input: elements.followupAnswer,
    status: elements.followupVoiceStatus,
    button: elements.followupVoice,
    idleText: 'Record voice',
    listeningText: 'Listening... reply to the AI role in one or two sentences.',
    readyText: 'Transcript ready. Edit it if needed, then tap Send scene reply.',
    title: 'Scene reply',
    prompt: 'Reply to the AI role. Use the transcript when it looks right, then send the scene reply.'
  });
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
    setVoiceStatus(elements.followupVoiceStatus, 'Step 2: record or type your reply to the AI role.');
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
    setVoiceStatus(elements.followupVoiceStatus, 'Next turn ready. Record or type your next reply.');
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
  setVoiceStatus(elements.roleOpeningVoiceStatus, 'Type your reply, or record your voice and edit the transcript before starting.');
  setVoiceStatus(elements.followupVoiceStatus, 'Answer by typing or recording. Your transcript will appear below.');
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
  renderTopic(await api('/api/today?random=1&exclude=' + exclude + '&level=' + level + '&category=' + category));
}

export {
  clearFollowups,
  loadRandomTopic,
  requestFollowups,
  requestSceneFeedback,
  sendFollowupAnswer,
  startFollowupVoiceInput,
  startRoleOpeningVoiceInput
};
