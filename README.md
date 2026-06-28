# English Speaking Coach

A local English speaking coach for self-paced practice. It uses a Workspace Dashboard layout: scenario role practice in the center, AI feedback on the right, and an AI daily chat window for open-ended conversation practice.

## Run

1. Copy `.env.example` to `.env`.
2. Add your Gemini API key to `.env`.
3. Start the app:

```powershell
npm start
```

Then open:

```text
http://localhost:4173
```

## Use it on your phone

The phone and computer must be on the same Wi-Fi.

1. Double-click `English Speaking Coach.cmd` on the desktop.
2. Keep the computer awake while practicing.
3. On the computer page, copy the `Phone access` link.
4. Open that link in your phone browser.
5. Tap the answer box, tap the microphone on your phone keyboard, and speak your English answer.

If the phone cannot open the link, allow Node.js through Windows Firewall for private networks. Some hotel, school, company, or public Wi-Fi networks block phone-to-computer access.

## Use it away from the same Wi-Fi

Run:

```powershell
D:\Codex-Workspace\english-speaking-coach\Start-English-Speaking-Coach-Internet.cmd
```

This starts a temporary Cloudflare Tunnel and opens a public `trycloudflare.com` link. The link is also copied to your clipboard, so you can send it to your phone and open it on mobile data or another Wi-Fi.

Keep this computer awake while using the public link. The quick tunnel is temporary and can change each time you restart it.

## Without an API key

The app still opens, shows role scenarios, records speaking practice, and saves sessions. AI feedback, scenario conversation, and AI daily chat will show setup guidance until `GEMINI_API_KEY` is configured.

## AI feedback provider

Gemini is the default provider:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

OpenAI is still available as a fallback:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

## Built-in speaking practice

Use the `Speaking recorder` inside the practice panel:

1. Click `Record`.
2. Speak your answer.
3. Click `Stop, save, and get feedback`.

The app saves the audio locally under `data/recordings/`, places the transcript into the answer box when browser speech recognition is available, and then sends that transcript through the existing AI feedback flow.

AI feedback opens in a dialog automatically. The dialog shows request progress first, then highlights pronunciation score, fluency score, and the repeat script before the detailed grammar and logic notes.

When Gemini feedback is enabled, recorded sessions also send the saved audio to Gemini so the feedback can include:

- pronunciation score
- fluency score
- speed and pause feedback
- possible words or sounds to practice

Recording uses the browser MediaRecorder API. Live transcription uses browser SpeechRecognition when available, so support varies by browser. The public HTTPS tunnel generally works better for microphone and speech recognition permissions than plain local network links on some phones.

## Role scenario conversation

Use `Scenario conversation` inside the practice panel when you want a complete role-play scene.

1. Pick a role scenario with `New topic`, such as interviewer, hotel front desk, airport staff, foreign coworker, client, or gym friend.
2. Read the situation, task, useful phrases, and AI opening line.
3. Answer the opening in the main answer box.
4. Click `Start scene`.
5. Reply to the AI role turn by turn until the scene closes naturally.

Every role and learner turn is kept in the scene transcript. During the scene, the app gives light coaching after each reply so the conversation keeps moving. When the AI closes the scene, the app automatically asks Gemini for full scene feedback across the whole transcript, including task completion, useful line-by-line fixes, an improved dialogue, reusable expressions, the next practice focus, and a repeat script.

You can also click `Get scene feedback` after at least one learner reply if you want an early review, but you do not need to click AI feedback after every single turn.

This is intentionally different from `AI Daily Chat`: role scenario conversation stays inside a specific real-life scene and has a beginning, middle, and closing. AI Daily Chat is open-ended daily conversation.

## AI daily chat

Click `AI Daily Chat` to open a self-paced conversation window.

- Use `Text input` to type English.
- Use `Voice input` to speak and let the browser turn your speech into text.
- Use `Text output` to read the AI coach's reply.
- Use `Voice output` to have the browser read the AI reply aloud for listening and shadowing practice.

The AI coach chats naturally, gives light corrections, suggests a better way to say your sentence, and gives one short repeat line. Recent chat messages are saved in your browser local storage.

## Vocabulary practice

Use the `Vocabulary` section to save words and phrases from your speaking practice.

- Add the English word or phrase.
- Add the Chinese meaning.
- Add a speaking example sentence.
- Review due cards with `Again`, `Good`, or `Mastered`.

Vocabulary is saved locally in `data/vocabulary.json`. The review schedule is intentionally simple: difficult words come back soon, useful words return after a few days, and mastered words return later.

## Files

- `server.js` - local Node backend and static file server.
- `public/` - frontend UI.
- `data/` - local saved sessions, excluded from git except `.gitkeep`.
- `docs/` - design and implementation planning documents.

## Privacy

The browser never receives the API key. The backend reads it from `.env`, which is ignored by git.
