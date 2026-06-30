import { state, elements, escapeHtml } from './state.js';
import { api } from './api.js';
import { setVoiceStatus, startDictation, stopActiveDictation } from './recording.js';
import { showPage } from './main.js';
function chatOutputMode() {
  return elements.chatVoiceOutput?.checked ? 'voice' : 'text';
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
  stopActiveDictation();
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
    : 'Record or type one English message, check the transcript, then send it to AI.';
}

async function sendChatMessage() {
  const text = elements.chatInput.value.trim();
  if (!text) {
    setVoiceStatus(elements.chatVoiceStatus, 'Record your voice or type one English sentence first.', 'issue');
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
    setVoiceStatus(elements.chatVoiceStatus, 'AI replied. Answer the next question by recording or typing one sentence.', 'ready');
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
  startDictation({
    input: elements.chatInput,
    status: elements.chatVoiceStatus,
    button: elements.chatMic,
    idleText: 'Record voice',
    listeningText: 'Listening... speak one or two English sentences.',
    readyText: 'Transcript ready. Edit it if needed, then tap Send to AI.',
    title: 'Chat message',
    prompt: 'Speak your message to the AI coach. Use the transcript when it looks right, then send it.'
  });
}

function clearChat() {
  window.speechSynthesis?.cancel();
  stopActiveDictation();
  state.chatMessages = [];
  localStorage.removeItem('englishSpeakingCoachChat');
  loadChatMessages();
  elements.chatInput.value = '';
  setVoiceStatus(elements.chatVoiceStatus, 'Step 1: record your voice or type below.');
}

export {
  clearChat,
  closeChat,
  loadChatMessages,
  sendChatMessage,
  startChatVoiceInput
};
