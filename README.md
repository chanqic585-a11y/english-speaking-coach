# English Speaking Coach

A local English speaking coach for self-paced practice. It uses a Workspace Dashboard layout: training steps on the left, practice in the center, AI feedback on the right, and an AI daily chat window for open-ended conversation practice.

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

The app still opens, shows topics, records speaking practice, and saves sessions. AI feedback and AI daily chat will show setup guidance until `GEMINI_API_KEY` is configured.

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
