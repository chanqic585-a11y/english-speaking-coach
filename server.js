const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const RECORDINGS_DIR = path.join(DATA_DIR, 'recordings');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const VOCABULARY_FILE = path.join(DATA_DIR, 'vocabulary.json');
const RECORDINGS_FILE = path.join(DATA_DIR, 'recordings.json');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8'
};

const scenarios = [
  {
    id: 'interviewer',
    focus: 'Interview confidence',
    topic: 'Job interview',
    role: 'Interviewer',
    situation: 'You are in a job interview for an international role. The interviewer wants clear examples and confident answers.',
    userTask: 'Introduce your experience, explain your strengths, and answer follow-up questions with specific examples.',
    openingLine: 'Thanks for coming in today. Could you start by telling me a little about yourself and why you are interested in this role?',
    prompt: 'The interviewer asks you to introduce yourself and explain why you are interested in the role.',
    sentenceFrame: 'I have experience in ..., and I am interested in this role because ...',
    successGoal: 'Give specific examples, sound confident, and ask one appropriate question before the scene ends.',
    phraseBank: ['I have experience in...', 'One strength I can bring is...', 'A specific example is...', 'I am interested in this role because...']
  },
  {
    id: 'hotel-front-desk',
    focus: 'Travel service conversation',
    topic: 'Hotel check-in',
    role: 'Hotel front desk',
    situation: 'You arrive at a hotel and need to check in, ask about breakfast, and solve a small room preference issue.',
    userTask: 'Check in politely, provide booking details, ask about services, and respond to staff questions.',
    openingLine: 'Good evening. Welcome to our hotel. Do you have a reservation with us?',
    prompt: 'The hotel front desk asks whether you have a reservation.',
    sentenceFrame: 'Yes, I have a reservation under the name ..., and I would like to ask about ...',
    successGoal: 'Complete check-in, ask one service question, and close the conversation politely.',
    phraseBank: ['I have a reservation under...', 'Could I ask about...', 'Would it be possible to...', 'Thank you for your help.']
  },
  {
    id: 'airport-staff',
    focus: 'Airport problem solving',
    topic: 'Airport check-in',
    role: 'Airport staff',
    situation: 'You are at the airport. You need to check in, ask about baggage, and handle a possible delay or gate change.',
    userTask: 'Explain your travel situation, ask practical questions, and confirm next steps.',
    openingLine: 'Good morning. May I see your passport and booking reference, please?',
    prompt: 'The airport staff asks for your passport and booking reference.',
    sentenceFrame: 'Sure, here is my passport. I would also like to ask about ...',
    successGoal: 'Confirm baggage, boarding time, and the next step before ending the scene.',
    phraseBank: ['May I ask about my baggage?', 'Is there any delay?', 'Which gate should I go to?', 'Could you confirm the boarding time?']
  },
  {
    id: 'foreign-coworker',
    focus: 'Workplace small talk and updates',
    topic: 'Talking with a foreign coworker',
    role: 'Foreign coworker',
    situation: 'You meet a foreign coworker and need to make small talk, explain your current work, and ask about their project.',
    userTask: 'Build rapport, give a short work update, and keep the conversation natural.',
    openingLine: 'Hey, good to see you. How is your week going so far?',
    prompt: 'Your foreign coworker asks how your week is going.',
    sentenceFrame: 'It has been ..., because I have been working on ...',
    successGoal: 'Make small talk, share one useful update, and ask a natural follow-up question.',
    phraseBank: ['It has been a busy week...', 'I am currently working on...', 'How about your project?', 'Let me know if I can help with...']
  },
  {
    id: 'client-meeting',
    focus: 'Client meeting clarity',
    topic: 'Client meeting',
    role: 'Client',
    situation: 'You are in a client meeting. The client wants to understand your plan, timeline, and how you will handle concerns.',
    userTask: 'Explain your proposal, clarify requirements, and respond to one concern professionally.',
    openingLine: 'Thanks for joining the meeting. Could you walk me through your plan and the main timeline?',
    prompt: 'The client asks you to explain your plan and timeline.',
    sentenceFrame: 'Our plan is to ..., and the timeline would be ...',
    successGoal: 'Explain the plan clearly, confirm one requirement, and close with next steps.',
    phraseBank: ['Our plan is to...', 'The main timeline is...', 'Could I confirm one requirement?', 'The next step would be...']
  },
  {
    id: 'gym-friend',
    focus: 'Casual conversation',
    topic: 'Gym conversation',
    role: 'Gym friend',
    situation: 'You meet a friendly person at the gym and talk about exercise habits, goals, and how you feel after training.',
    userTask: 'Have a relaxed conversation, describe your routine, and respond naturally to friendly questions.',
    openingLine: 'Hey, I think I have seen you here before. What kind of workout are you doing today?',
    prompt: 'A gym friend asks what kind of workout you are doing today.',
    sentenceFrame: 'Today I am focusing on ..., because I want to ...',
    successGoal: 'Keep the conversation friendly, explain your goal, and end naturally.',
    phraseBank: ['Today I am focusing on...', 'I am trying to improve...', 'How often do you train?', 'Nice talking with you. See you around.']
  }
];

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '[]\n', 'utf8');
  if (!fs.existsSync(VOCABULARY_FILE)) fs.writeFileSync(VOCABULARY_FILE, '[]\n', 'utf8');
  if (!fs.existsSync(RECORDINGS_FILE)) fs.writeFileSync(RECORDINGS_FILE, '[]\n', 'utf8');
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function getLanUrls() {
  const urls = [];
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      urls.push(`http://${entry.address}:${PORT}`);
    }
  }
  return urls;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 15_000_000) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function readSessions() {
  ensureData();
  try {
    const parsed = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8').replace(/^\uFEFF/, ''));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessions(sessions) {
  ensureData();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2) + '\n', 'utf8');
}

function readVocabulary() {
  ensureData();
  try {
    const parsed = JSON.parse(fs.readFileSync(VOCABULARY_FILE, 'utf8').replace(/^\uFEFF/, ''));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeVocabulary(items) {
  ensureData();
  fs.writeFileSync(VOCABULARY_FILE, JSON.stringify(items, null, 2) + '\n', 'utf8');
}

function readRecordings() {
  ensureData();
  try {
    const parsed = JSON.parse(fs.readFileSync(RECORDINGS_FILE, 'utf8').replace(/^\uFEFF/, ''));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecordings(recordings) {
  ensureData();
  fs.writeFileSync(RECORDINGS_FILE, JSON.stringify(recordings, null, 2) + '\n', 'utf8');
}

function audioExtension(mimeType) {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

function findRecording(id) {
  if (!id) return null;
  return readRecordings().find(recording => recording.id === id) || null;
}

function recordingFilePath(recording) {
  if (!recording?.fileName) return null;
  const filePath = path.normalize(path.join(RECORDINGS_DIR, recording.fileName));
  return filePath.startsWith(RECORDINGS_DIR) ? filePath : null;
}

function speechMetrics(answer, recording) {
  const text = String(answer || '').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const fillerMatches = text.match(/\b(um+|uh+|erm+|ah+|like|you know)\b/gi) || [];
  const sentenceCount = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const durationSeconds = Number(recording?.durationSeconds || 0);
  const wordsPerMinute = durationSeconds > 0 ? Math.round((words / durationSeconds) * 60) : null;
  const averageWordsPerSentence = Math.round(words / sentenceCount);
  return { words, durationSeconds, wordsPerMinute, fillerCount: fillerMatches.length, averageWordsPerSentence };
}

function localDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function normalizeVocabularyPayload(payload) {
  return {
    term: String(payload.term || '').trim(),
    meaning: String(payload.meaning || '').trim(),
    example: String(payload.example || '').trim(),
    tag: String(payload.tag || '').trim() || 'speaking',
    status: ['new', 'learning', 'familiar', 'mastered'].includes(payload.status) ? payload.status : 'new'
  };
}

function applyVocabularyReview(item, result) {
  const reviewCount = Number(item.reviewCount || 0) + 1;
  const schedule = {
    again: { status: 'learning', days: 1 },
    good: { status: reviewCount >= 2 ? 'familiar' : 'learning', days: reviewCount >= 2 ? 4 : 2 },
    mastered: { status: 'mastered', days: 14 }
  }[result] || { status: 'learning', days: 1 };

  return {
    ...item,
    status: schedule.status,
    reviewCount,
    lastReviewedAt: new Date().toISOString(),
    nextReviewAt: localDateOffset(schedule.days),
    updatedAt: new Date().toISOString()
  };
}

function todayTopic() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now - start) / 86400000);
  return scenarios[day % scenarios.length];
}

function randomTopic(excludePrompt = '') {
  const candidates = scenarios.filter(topic => topic.prompt !== excludePrompt);
  const pool = candidates.length ? candidates : scenarios;
  return pool[Math.floor(Math.random() * pool.length)];
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function getSettings() {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const openAiKey = process.env.OPENAI_API_KEY || '';
  const model = provider === 'openai'
    ? process.env.OPENAI_MODEL || 'gpt-4.1-mini'
    : process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return {
    apiKeyConfigured: provider === 'openai' ? Boolean(openAiKey) : Boolean(geminiKey),
    provider,
    model,
    dailyDurationMinutes: null,
    preferredFeedbackLanguage: 'Chinese explanations with English examples'
  };
}

function buildFeedbackPrompt(answer, context, recording = null) {
  const metrics = speechMetrics(answer, recording);
  const transcript = String(answer || '').trim() || '[No transcript was captured. Please listen to the attached audio and infer the spoken answer as accurately as possible.]';
  const audioNote = recording
    ? `Audio is attached. Recording duration: ${metrics.durationSeconds} seconds. Transcript word count: ${metrics.words}. Estimated speed: ${metrics.wordsPerMinute || 'unknown'} WPM. Filler count from transcript: ${metrics.fillerCount}.`
    : `No audio is attached. Use text-only estimation for fluency, speakingSpeed, pauseProblem, and hardWordsToRepeat. Set pronunciationScore to null and clearly mark pronunciation as "audio needed". Transcript word count: ${metrics.words}. Average sentence length: ${metrics.averageWordsPerSentence}. Filler count: ${metrics.fillerCount}.`;

  return `You are an English speaking coach for a Chinese learner living in Mexico. The learner can understand intermediate English but needs better spoken grammar, logic, pronunciation, fluency, and natural phrasing.

Practice context:
Focus: ${context.focus}
Topic: ${context.topic}
Prompt: ${context.prompt}
Sentence frame: ${context.sentenceFrame}

User transcript:
${transcript}

Audio context:
${audioNote}

Return concise feedback as valid JSON with these keys:
quickDiagnosis: string
grammarFixes: array of {original:string, improved:string, explanation:string}
logicCoherence: array of strings
naturalVersion: string
repeatScript: string
reusableExpressions: array of strings
pronunciationScore: number|null
fluencyScore: number|null
speedPauseFeedback: string
possiblePronunciationIssues: array of {word:string, issue:string, suggestion:string}
pauseProblem: string
speakingSpeed: {wpm:number|null, level:string, comment:string}
hardWordsToRepeat: array of {word:string, reason:string, repeatDrill:string}

Scoring rules:
- pronunciationScore is 0-100 and should only be scored when audio is attached.
- fluencyScore is 0-100. If audio is attached, consider speed, hesitation, pauses, and smoothness. If audio is missing, estimate from transcript length, filler words, sentence length, and organization, and say it is a text estimate.
- speedPauseFeedback should mention pace and pauses; keep it compatible with old clients.
- pauseProblem should be one clear Chinese sentence about pauses or hesitation. If audio is missing, infer only from transcript markers such as fillers, broken sentences, very short answers, or very long sentences.
- speakingSpeed.wpm should use the provided WPM when audio duration exists. Without audio, set wpm to null and set level to "text estimate only".
- speakingSpeed.level should be one of: "too slow", "natural", "too fast", "text estimate only", "unknown".
- hardWordsToRepeat should include 3-6 English words or short phrases from the learner's answer or naturalVersion that are useful or likely hard to say. Each repeatDrill should be a short English drill, such as "international communication - international communication - international communication".
- possiblePronunciationIssues should identify words or sounds that may need practice from the audio. If audio is missing, keep this empty or mark items as text-based possibilities. Be cautious and say "possible" when uncertain.

Use Chinese for explanations and English for improved sentences. Limit grammarFixes to 2-4 important corrections. Keep the natural version close to the user's meaning and level.`;
}

function speedLevel(wordsPerMinute) {
  if (!wordsPerMinute) return 'text estimate only';
  if (wordsPerMinute < 90) return 'too slow';
  if (wordsPerMinute > 170) return 'too fast';
  return 'natural';
}

function estimateFluencyScore(metrics, hasAudio) {
  let score = hasAudio ? 70 : 62;
  if (metrics.words >= 45) score += 8;
  if (metrics.words < 20) score -= 14;
  if (metrics.fillerCount > 0) score -= Math.min(16, metrics.fillerCount * 4);
  if (metrics.averageWordsPerSentence > 28) score -= 8;
  if (metrics.wordsPerMinute) {
    if (metrics.wordsPerMinute >= 100 && metrics.wordsPerMinute <= 160) score += 8;
    if (metrics.wordsPerMinute < 80 || metrics.wordsPerMinute > 185) score -= 10;
  }
  return Math.max(0, Math.min(100, score));
}

function fallbackHardWords(answer, feedback) {
  const source = `${answer || ''} ${feedback.naturalVersion || ''}`;
  const words = source.match(/\b[A-Za-z][A-Za-z'-]{5,}\b/g) || [];
  const unique = [];
  for (const word of words) {
    const clean = word.replace(/^['-]+|['-]+$/g, '');
    if (!clean || unique.some(item => item.toLowerCase() === clean.toLowerCase())) continue;
    unique.push(clean);
    if (unique.length >= 5) break;
  }
  return unique.map(word => ({
    word,
    reason: '这个词较长或在口语里需要说清楚，适合单独重复。',
    repeatDrill: `${word} - ${word} - ${word}`
  }));
}

function enrichFeedbackResult(feedback, answer, recording = null) {
  if (!feedback || typeof feedback !== 'object' || feedback.rawText || feedback.rawResponse) return feedback;
  const metrics = speechMetrics(answer, recording);
  const hasAudio = Boolean(recording);

  if (feedback.fluencyScore == null) {
    feedback.fluencyScore = estimateFluencyScore(metrics, hasAudio);
  }
  if (!feedback.pauseProblem) {
    feedback.pauseProblem = hasAudio
      ? '请结合录音检查是否有明显停顿；本次没有返回更具体的停顿问题。'
      : metrics.fillerCount > 0
        ? '文本里出现了一些 filler words，可能说明表达时有停顿或犹豫。'
        : 'Text estimate only：没有录音时，只能根据文本长度和句子结构粗略判断停顿。';
  }
  if (!feedback.speakingSpeed || typeof feedback.speakingSpeed !== 'object') {
    feedback.speakingSpeed = {
      wpm: metrics.wordsPerMinute,
      level: hasAudio ? speedLevel(metrics.wordsPerMinute) : 'text estimate only',
      comment: hasAudio
        ? `Estimated speed is ${metrics.wordsPerMinute || 'unknown'} WPM based on the saved recording.`
        : 'Text estimate only：没有录音时无法计算真实 WPM，可以先用回答长度和流畅度做粗略判断。'
    };
  }
  if (!Array.isArray(feedback.hardWordsToRepeat) || !feedback.hardWordsToRepeat.length) {
    feedback.hardWordsToRepeat = fallbackHardWords(answer, feedback);
  }
  if (!feedback.speedPauseFeedback) {
    feedback.speedPauseFeedback = `${feedback.pauseProblem} ${feedback.speakingSpeed?.comment || ''}`.trim();
  }
  if (!Array.isArray(feedback.possiblePronunciationIssues)) {
    feedback.possiblePronunciationIssues = [];
  }
  return feedback;
}

async function requestAiFeedback(answer, context, recording = null) {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  if (provider === 'openai') return requestOpenAiFeedback(answer, context, recording);
  return requestGeminiFeedback(answer, context, recording);
}

function normalizeChatMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: String(message.content || '').trim().slice(0, 1200)
    }))
    .filter(message => message.content)
    .slice(-12);
}

function buildChatPrompt(messages) {
  const transcript = messages.map(message => `${message.role === 'assistant' ? 'Coach' : 'Learner'}: ${message.content}`).join('\n');
  return `You are an English daily conversation coach for a Chinese learner living in Mexico.

Your job:
- Chat naturally in English.
- Keep the learner speaking with friendly follow-up questions.
- Lightly correct unnatural English without stopping the conversation.
- When the learner's sentence is awkward, show a better version.
- Give one short repeat line the learner can say aloud.
- Use simple, clear English. Use brief Chinese only when explaining a correction.

Format every reply like this:
Coach: <natural conversational reply>
Better way: <one improved sentence if useful, otherwise "No correction needed.">
Repeat: <one short sentence for the learner to repeat>
Next question: <one easy follow-up question>

Conversation so far:
${transcript}`;
}

function normalizeFeedbackFollowupTurns(turns) {
  return (Array.isArray(turns) ? turns : [])
    .map(turn => ({
      question: String(turn.question || '').trim().slice(0, 600),
      answer: String(turn.answer || '').trim().slice(0, 1400)
    }))
    .filter(turn => turn.question && turn.answer)
    .slice(-3);
}

function buildFeedbackFollowupPrompt(payload) {
  const context = payload.context || todayTopic();
  const answer = String(payload.answer || '').trim();
  const feedback = payload.feedback || {};
  const turns = normalizeFeedbackFollowupTurns(payload.turns);
  const transcript = turns.length
    ? turns.map((turn, index) => `${index + 1}. Coach: ${turn.question}\nLearner: ${turn.answer}`).join('\n')
    : '[No follow-up turns yet]';
  const maxRoundsReached = turns.length >= 3;

  return `You are an English speaking coach running a short follow-up speaking loop after feedback.

Learner profile:
- Chinese learner living in Mexico
- Wants IELTS 7.5-level speaking: clear logic, natural grammar, and fluent answers

Practice context:
Focus: ${context.focus || ''}
Topic: ${context.topic || ''}
Prompt: ${context.prompt || context.situation || ''}

Original learner answer:
${answer || '[No original answer provided]'}

AI feedback summary:
Quick diagnosis: ${feedback.quickDiagnosis || ''}
Natural version: ${feedback.naturalVersion || ''}
Repeat script: ${feedback.repeatScript || ''}
Reusable expressions: ${(feedback.reusableExpressions || []).join(', ')}
Logic notes: ${(feedback.logicCoherence || []).join(' | ')}

Follow-up turns so far:
${transcript}

Return valid JSON only with:
question: string
coachingNote: string
betterWay: string
repeatLine: string
isComplete: boolean
closingSummary: string

Rules:
- If there are no follow-up turns yet, ask one natural follow-up question based on the original answer and feedback. Example style: "Why do you think so?"
- If there is a learner follow-up answer, give one short Chinese coaching note, one improved English sentence, and one short repeat line.
- Ask only one next question at a time.
- Run 2-3 follow-up rounds total. If the learner has answered fewer than 2 follow-up questions, do not end the loop yet.
- ${maxRoundsReached ? 'The learner has already answered 3 follow-up rounds. Set isComplete true, leave question empty, and give a short Chinese closingSummary.' : 'If the learner has answered enough for a useful loop, set isComplete true; otherwise ask the next question.'}
- Keep questions in simple natural English.
- Keep Chinese explanations short.`;
}

function enforceFeedbackFollowupRounds(followup, turns) {
  const result = followup && typeof followup === 'object' ? followup : {};
  if (turns.length < 2) {
    result.isComplete = false;
    if (!String(result.question || '').trim()) {
      result.question = turns.length === 0
        ? 'Why do you think so?'
        : 'Can you give one specific example?';
    }
    result.closingSummary = '';
  }
  if (turns.length >= 3) {
    result.isComplete = true;
    result.question = '';
    if (!String(result.closingSummary || '').trim()) {
      result.closingSummary = '这轮追问已经完成。下一步可以把你的答案整理成更自然、更有逻辑的一段口语回答。';
    }
  }
  return result;
}

async function requestGeminiFeedbackFollowups(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured. Copy .env.example to .env and add your key.');
    error.code = 'missing_api_key';
    throw error;
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildFeedbackFollowupPrompt(payload) }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.45
      }
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Gemini request failed with status ${response.status}.`);
    error.details = raw;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { rawText: raw };
  }

  const text = extractGeminiText(data);
  if (!text) return { rawResponse: data };

  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    return { rawText: text };
  }
}

async function requestGeminiChat(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured. Copy .env.example to .env and add your key.');
    error.code = 'missing_api_key';
    throw error;
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildChatPrompt(messages) }]
        }
      ],
      generationConfig: {
        temperature: 0.7
      }
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Gemini request failed with status ${response.status}.`);
    error.details = raw;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return raw.trim();
  }
  return extractGeminiText(data) || 'I am here. Tell me about your day in one or two sentences.';
}

function buildFollowupPrompt(payload) {
  const context = payload.context || todayTopic();
  const firstAnswer = String(payload.answer || '').trim();
  const selectedQuestion = String(payload.question || '').trim();
  const followupAnswer = String(payload.followupAnswer || '').trim();
  const previousTurns = Array.isArray(payload.turns) ? payload.turns.slice(-8) : [];
  const mode = selectedQuestion && followupAnswer ? 'continue' : 'start';
  const turnLog = previousTurns.map(turn => `${turn.speaker || 'Learner'}: ${turn.text || ''}`).join('\n');

  return `You are role-playing a realistic English speaking scene.

The learner is a Chinese speaker living in Mexico. You must stay in role and keep the scene realistic. Do not become a generic tutor during the dialogue.

Scenario:
Focus: ${context.focus || ''}
Topic: ${context.topic || ''}
AI role: ${context.role || 'Conversation partner'}
Situation: ${context.situation || context.prompt || ''}
Learner task: ${context.userTask || ''}
Success goal: ${context.successGoal || ''}
Opening line: ${context.openingLine || context.prompt || ''}
Useful phrases: ${(context.phraseBank || []).join(', ')}

Learner's first answer:
${firstAnswer || '[No answer provided]'}

Previous scene turns:
${turnLog || '[No previous turns]'}

${mode === 'continue' ? `Your previous line or question:
${selectedQuestion}

Learner's latest answer:
${followupAnswer}` : ''}

Return valid JSON only.

If mode is "start", return:
{
  "stage": "opening",
  "aiLine": "one natural in-role line that starts or continues the scene",
  "coachingNote": "one short Chinese sentence explaining the conversation goal",
  "betterWay": "",
  "repeatLine": "",
  "isComplete": false,
  "closingSummary": ""
}

If mode is "continue", return:
{
  "stage": "middle|closing",
  "aiLine": "one natural in-role line that reacts to the learner and asks the next necessary question, or closes the scene",
  "coachingNote": "one short Chinese sentence with light correction or encouragement",
  "betterWay": "one improved English sentence based on the learner's follow-up answer",
  "repeatLine": "one short English sentence the learner can repeat aloud",
  "isComplete": true or false,
  "closingSummary": "if isComplete is true, summarize in Chinese what the learner accomplished and one thing to improve; otherwise empty string"
}

Rules:
- Speak as the AI role, not as an app.
- Move the scene forward one turn at a time.
- Do not list multiple questions.
- If the learner has achieved the success goal or the scene has enough information, close naturally.
- Closing should feel like the real role ending the interaction.
- Keep aiLine concise: 1-3 sentences.
- Use Chinese only in coachingNote.`;
}

async function requestGeminiFollowups(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured. Copy .env.example to .env and add your key.');
    error.code = 'missing_api_key';
    throw error;
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildFollowupPrompt(payload) }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.65
      }
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Gemini request failed with status ${response.status}.`);
    error.details = raw;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { rawText: raw };
  }

  const text = extractGeminiText(data);
  if (!text) return { rawResponse: data };

  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    return { rawText: text };
  }
}

function normalizeScenarioTurns(turns) {
  return (Array.isArray(turns) ? turns : [])
    .map(turn => ({
      speaker: String(turn.speaker || '').trim().slice(0, 80),
      text: String(turn.text || '').trim().slice(0, 1600)
    }))
    .filter(turn => turn.speaker && turn.text)
    .slice(-20);
}

function buildSceneFeedbackPrompt(payload) {
  const context = payload.context || todayTopic();
  const turns = normalizeScenarioTurns(payload.turns);
  const transcript = turns.map((turn, index) => `${index + 1}. ${turn.speaker}: ${turn.text}`).join('\n');

  return `You are an English speaking coach reviewing a completed role-play scene.

Learner profile:
- Chinese learner living in Mexico
- Wants practical spoken English, natural expression, and better scenario performance

Scenario:
Role: ${context.role || 'AI role'}
Topic: ${context.topic || ''}
Situation: ${context.situation || context.prompt || ''}
Learner task: ${context.userTask || ''}
Success goal: ${context.successGoal || ''}
Useful phrases: ${(context.phraseBank || []).join(', ')}

Full scene transcript:
${transcript}

Return valid JSON only with:
overallPerformance: string
taskCompletion: string
turnByTurnFeedback: array of {learnerLine:string, issue:string, betterWay:string}
improvedDialogue: array of {speaker:string, line:string}
reusableExpressions: array of strings
nextPracticeFocus: string
repeatScript: string

Rules:
- Review the whole scene, not only one sentence.
- Focus on the learner's lines only for corrections.
- Mention whether the learner completed the scenario task.
- Keep explanations in Chinese, but improved lines and expressions in English.
- Keep turnByTurnFeedback to the 3-5 most useful learner lines.`;
}

async function requestGeminiSceneFeedback(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured. Copy .env.example to .env and add your key.');
    error.code = 'missing_api_key';
    throw error;
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildSceneFeedbackPrompt(payload) }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.35
      }
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Gemini request failed with status ${response.status}.`);
    error.details = raw;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { rawText: raw };
  }

  const text = extractGeminiText(data);
  if (!text) return { rawResponse: data };

  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    return { rawText: text };
  }
}

async function requestGeminiFeedback(answer, context, recording = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured. Copy .env.example to .env and add your key.');
    error.code = 'missing_api_key';
    throw error;
  }

  const parts = [{ text: buildFeedbackPrompt(answer, context, recording) }];
  const filePath = recordingFilePath(recording);
  if (filePath && fs.existsSync(filePath)) {
    parts.push({
      inlineData: {
        mimeType: recording.mimeType || 'audio/webm',
        data: fs.readFileSync(filePath).toString('base64')
      }
    });
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4
      }
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Gemini request failed with status ${response.status}.`);
    error.details = raw;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { rawText: raw };
  }

  const text = extractGeminiText(data);
  if (!text) return { rawResponse: data };

  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    return { rawText: text };
  }
}

async function requestOpenAiFeedback(answer, context, recording = null) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not configured. Copy .env.example to .env and add your key.');
    error.code = 'missing_api_key';
    throw error;
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: buildFeedbackPrompt(answer, context, recording)
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`OpenAI request failed with status ${response.status}.`);
    error.details = raw;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { rawText: raw };
  }

  const text = data.output_text || extractOutputText(data);
  if (!text) return { rawResponse: data };

  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    return { rawText: text };
  }
}

function extractGeminiText(data) {
  if (!Array.isArray(data.candidates)) return '';
  return data.candidates.flatMap(candidate => candidate.content?.parts || [])
    .map(part => part.text || '')
    .filter(Boolean)
    .join('\n');
}

function extractOutputText(data) {
  if (!Array.isArray(data.output)) return '';
  return data.output.flatMap(item => Array.isArray(item.content) ? item.content : [])
    .map(part => part.text || '')
    .filter(Boolean)
    .join('\n');
}

function stripCodeFence(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const safePath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(content);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, app: 'English Speaking Coach' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/settings') {
    sendJson(res, 200, getSettings());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/network') {
    sendJson(res, 200, {
      localUrl: `http://localhost:${PORT}`,
      lanUrls: getLanUrls(),
      host: HOST,
      port: PORT
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/today') {
    const topic = url.searchParams.get('random') === '1'
      ? randomTopic(url.searchParams.get('exclude') || '')
      : todayTopic();
    sendJson(res, 200, topic);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/vocabulary') {
    const items = readVocabulary().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    sendJson(res, 200, { items });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/vocabulary/review') {
    const today = localDateOffset(0);
    const items = readVocabulary()
      .filter(item => item.status !== 'mastered' || String(item.nextReviewAt || '') <= today)
      .filter(item => !item.nextReviewAt || String(item.nextReviewAt) <= today)
      .sort((a, b) => String(a.nextReviewAt || '').localeCompare(String(b.nextReviewAt || '')))
      .slice(0, 12);
    sendJson(res, 200, { items });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/recordings') {
    const recordings = readRecordings().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    sendJson(res, 200, { recordings: recordings.slice(0, 20) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/recordings') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const audioBase64 = String(payload.audioBase64 || '');
    const mimeType = String(payload.mimeType || 'audio/webm');
    if (!audioBase64 || audioBase64.length < 100) {
      sendJson(res, 400, { error: 'Audio data is required.' });
      return;
    }
    const id = crypto.randomUUID();
    const fileName = `${id}.${audioExtension(mimeType)}`;
    const filePath = path.join(RECORDINGS_DIR, fileName);
    fs.writeFileSync(filePath, Buffer.from(audioBase64, 'base64'));

    const now = new Date().toISOString();
    const recordings = readRecordings();
    const recording = {
      id,
      date: localDateString(),
      fileName,
      mimeType,
      transcript: String(payload.transcript || '').trim(),
      topic: String(payload.topic || ''),
      focus: String(payload.focus || ''),
      prompt: String(payload.prompt || ''),
      durationSeconds: Number(payload.durationSeconds || 0),
      createdAt: now
    };
    recordings.unshift(recording);
    writeRecordings(recordings.slice(0, 200));
    sendJson(res, 201, { recording });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/vocabulary') {
    const payload = normalizeVocabularyPayload(JSON.parse(await readBody(req) || '{}'));
    if (!payload.term || !payload.meaning) {
      sendJson(res, 400, { error: 'Term and meaning are required.' });
      return;
    }
    const now = new Date().toISOString();
    const items = readVocabulary();
    const item = {
      id: crypto.randomUUID(),
      ...payload,
      reviewCount: 0,
      nextReviewAt: localDateOffset(0),
      createdAt: now,
      updatedAt: now
    };
    items.unshift(item);
    writeVocabulary(items.slice(0, 500));
    sendJson(res, 201, { item });
    return;
  }

  const reviewMatch = url.pathname.match(/^\/api\/vocabulary\/([^/]+)\/review$/);
  if (req.method === 'POST' && reviewMatch) {
    const id = reviewMatch[1];
    const payload = JSON.parse(await readBody(req) || '{}');
    const items = readVocabulary();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) {
      sendJson(res, 404, { error: 'Vocabulary item not found.' });
      return;
    }
    items[index] = applyVocabularyReview(items[index], payload.result);
    writeVocabulary(items);
    sendJson(res, 200, { item: items[index] });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/sessions') {
    const sessions = readSessions().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    sendJson(res, 200, { sessions });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/sessions') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const now = new Date().toISOString();
    const sessions = readSessions();
    const session = {
      id: payload.id || crypto.randomUUID(),
      date: payload.date || localDateString(),
      topic: payload.topic || '',
      focus: payload.focus || '',
      prompt: payload.prompt || '',
      sentenceFrame: payload.sentenceFrame || '',
      userAnswer: payload.userAnswer || '',
      aiFeedback: payload.aiFeedback || null,
      reflection: payload.reflection || {},
      durationMinutes: payload.durationMinutes == null || payload.durationMinutes === ''
        ? null
        : Number(payload.durationMinutes),
      createdAt: payload.createdAt || now,
      updatedAt: now
    };
    sessions.unshift(session);
    writeSessions(sessions.slice(0, 200));
    sendJson(res, 201, { session });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/feedback') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const answer = String(payload.answer || '').trim();
    const context = payload.context || todayTopic();
    const recording = findRecording(String(payload.recordingId || ''));
    if (answer.length < 20 && !recording) {
      sendJson(res, 400, { error: 'Please enter a longer answer or record audio before requesting feedback.' });
      return;
    }
    try {
      const feedback = enrichFeedbackResult(await requestAiFeedback(answer, context, recording), answer, recording);
      sendJson(res, 200, { feedback });
    } catch (error) {
      sendJson(res, error.code === 'missing_api_key' ? 400 : 502, {
        error: error.message,
        details: error.details || null
      });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const messages = normalizeChatMessages(payload.messages);
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      sendJson(res, 400, { error: 'Send a learner message before asking the AI coach to reply.' });
      return;
    }
    try {
      const reply = await requestGeminiChat(messages);
      sendJson(res, 200, { reply });
    } catch (error) {
      sendJson(res, error.code === 'missing_api_key' ? 400 : 502, {
        error: error.message,
        details: error.details || null
      });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/feedback-followups') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const answer = String(payload.answer || '').trim();
    const turns = normalizeFeedbackFollowupTurns(payload.turns);
    if (answer.length < 10) {
      sendJson(res, 400, { error: 'Submit feedback for an answer before starting follow-up practice.' });
      return;
    }
    try {
      const followup = await requestGeminiFeedbackFollowups({
        context: payload.context || todayTopic(),
        answer,
        feedback: payload.feedback || {},
        turns
      });
      sendJson(res, 200, { followup: enforceFeedbackFollowupRounds(followup, turns) });
    } catch (error) {
      sendJson(res, error.code === 'missing_api_key' ? 400 : 502, {
        error: error.message,
        details: error.details || null
      });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/followups') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const answer = String(payload.answer || '').trim();
    const question = String(payload.question || '').trim();
    const followupAnswer = String(payload.followupAnswer || '').trim();
    if (answer.length < 10) {
      sendJson(res, 400, { error: 'Answer the current topic first, then ask for follow-up questions.' });
      return;
    }
    if (followupAnswer && !question) {
      sendJson(res, 400, { error: 'Send the AI role line you are answering.' });
      return;
    }
    try {
      const followups = await requestGeminiFollowups({
        context: payload.context || todayTopic(),
        answer,
        question,
        followupAnswer
      });
      sendJson(res, 200, { followups });
    } catch (error) {
      sendJson(res, error.code === 'missing_api_key' ? 400 : 502, {
        error: error.message,
        details: error.details || null
      });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/scene-feedback') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const turns = normalizeScenarioTurns(payload.turns);
    if (!turns.some(turn => turn.speaker === 'Learner')) {
      sendJson(res, 400, { error: 'Complete at least one learner turn before requesting scene feedback.' });
      return;
    }
    try {
      const feedback = await requestGeminiSceneFeedback({
        context: payload.context || todayTopic(),
        turns
      });
      sendJson(res, 200, { feedback });
    } catch (error) {
      sendJson(res, error.code === 'missing_api_key' ? 400 : 502, {
        error: error.message,
        details: error.details || null
      });
    }
    return;
  }

  sendJson(res, 404, { error: 'API route not found.' });
}

async function handleRequest(req, res) {
  try {
    if (req.url.startsWith('/api/')) {
      await handleApi(req, res);
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Internal server error.' });
  }
}

loadEnv();
ensureData();

if (process.argv.includes('--check')) {
  console.log(JSON.stringify({ ok: true, settings: getSettings(), dataDir: DATA_DIR }, null, 2));
  process.exit(0);
}

http.createServer(handleRequest).listen(PORT, HOST, () => {
  console.log(`English Speaking Coach running at http://localhost:${PORT}`);
  for (const url of getLanUrls()) console.log(`Phone on same Wi-Fi: ${url}`);
});



