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

const topics = [
  {
    focus: 'Opinion + logic',
    topic: 'Living in Mexico',
    prompt: 'What is one thing you have learned from living in Mexico?',
    sentenceFrame: 'I used to think ..., but after ..., I realized ...',
    phraseBank: ['At first, I thought...', 'Over time, I noticed...', 'One example is...', 'That experience taught me...']
  },
  {
    focus: 'Explaining reasons',
    topic: 'Daily communication',
    prompt: 'Why is speaking practice harder than reading or listening practice?',
    sentenceFrame: 'There are two main reasons. The first is ..., and the second is ...',
    phraseBank: ['One reason is that...', 'Another factor is...', 'This makes it difficult to...', 'As a result...']
  },
  {
    focus: 'Story structure',
    topic: 'A small challenge',
    prompt: 'Describe a recent moment when you had to communicate in another language.',
    sentenceFrame: 'A few days ago ..., at first ..., later ..., in the end ...',
    phraseBank: ['A few days ago...', 'At first, I felt...', 'What helped me was...', 'In the end...']
  },
  {
    focus: 'Comparison',
    topic: 'English and Spanish',
    prompt: 'How does learning Spanish in Mexico affect your English learning?',
    sentenceFrame: 'Compared with ..., I find ... because ...',
    phraseBank: ['Compared with...', 'In contrast...', 'The biggest difference is...', 'This helps me because...']
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
  const words = String(answer || '').trim().split(/\s+/).filter(Boolean).length;
  const durationSeconds = Number(recording?.durationSeconds || 0);
  const wordsPerMinute = durationSeconds > 0 ? Math.round((words / durationSeconds) * 60) : null;
  return { words, durationSeconds, wordsPerMinute };
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
  return topics[day % topics.length];
}

function randomTopic(excludePrompt = '') {
  const candidates = topics.filter(topic => topic.prompt !== excludePrompt);
  const pool = candidates.length ? candidates : topics;
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
    ? `Audio is attached. Recording duration: ${metrics.durationSeconds} seconds. Transcript word count: ${metrics.words}. Estimated speed: ${metrics.wordsPerMinute || 'unknown'} WPM.`
    : 'No audio is attached. Set pronunciationScore and fluencyScore to null, and explain that audio is needed for pronunciation assessment.';

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

Scoring rules:
- pronunciationScore is 0-100 and should only be scored when audio is attached.
- fluencyScore is 0-100 and should consider speed, hesitation, pauses, and smoothness when audio is attached.
- speedPauseFeedback should mention pace and pauses; if audio is missing, use transcript-length only and say the limitation.
- possiblePronunciationIssues should identify words or sounds that may need practice from the audio. Be cautious and say "possible" when uncertain.

Use Chinese for explanations and English for improved sentences. Limit grammarFixes to 2-4 important corrections. Keep the natural version close to the user's meaning and level.`;
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
  const mode = selectedQuestion && followupAnswer ? 'respond' : 'questions';

  return `You are an English speaking examiner and friendly conversation coach.

The learner is a Chinese speaker living in Mexico. Keep the practice focused on the current speaking topic, not free chat.

Current topic:
Focus: ${context.focus || ''}
Topic: ${context.topic || ''}
Prompt: ${context.prompt || ''}
Sentence frame: ${context.sentenceFrame || ''}

Learner's first answer:
${firstAnswer || '[No answer provided]'}

${mode === 'respond' ? `Selected follow-up question:
${selectedQuestion}

Learner's follow-up answer:
${followupAnswer}` : ''}

Return valid JSON only.

If mode is "questions", return:
{
  "coachingNote": "one short Chinese sentence explaining what the follow-up practice should train",
  "questions": ["question 1", "question 2", "question 3"]
}

If mode is "respond", return:
{
  "coachingNote": "one short Chinese sentence with light correction or encouragement",
  "betterWay": "one improved English sentence based on the learner's follow-up answer",
  "repeatLine": "one short English sentence the learner can repeat aloud",
  "questions": ["next question 1", "next question 2"]
}

Rules:
- Questions must be natural spoken English.
- Questions must stay connected to the current topic and the learner's answer.
- Do not ask broad unrelated daily-chat questions.
- Make questions suitable for IELTS Speaking Part 3 or real conversation.
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
      const feedback = await requestAiFeedback(answer, context, recording);
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

  if (req.method === 'POST' && url.pathname === '/api/followups') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const answer = String(payload.answer || '').trim();
    const question = String(payload.question || '').trim();
    const followupAnswer = String(payload.followupAnswer || '').trim();
    if (answer.length < 10) {
      sendJson(res, 400, { error: 'Answer the current topic first, then ask for follow-up questions.' });
      return;
    }
    if ((question && !followupAnswer) || (!question && followupAnswer)) {
      sendJson(res, 400, { error: 'Send both the selected follow-up question and your follow-up answer.' });
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



