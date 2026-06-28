# English Speaking Coach

A local daily English speaking coach for a 25-30 minute practice session. It uses a Workspace Dashboard layout: training steps on the left, practice in the center, and AI feedback on the right.

## Run

1. Copy `.env.example` to `.env`.
2. Add your OpenAI API key to `.env`.
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

The app still opens, shows topics, runs the timer, and saves sessions. AI feedback will show setup guidance until `OPENAI_API_KEY` is configured.

## Free mode

If you do not want to use an API key, write your answer and click `Copy free feedback prompt`.

Then:

1. Open ChatGPT in your browser.
2. Paste the copied prompt.
3. Send it to ChatGPT.
4. Copy the useful grammar point, logic point, and expression back into the reflection fields.
5. Click `Save today's review`.

This mode costs nothing in the app, but the feedback is manual instead of automatic.

## Built-in speaking practice

Use the `Speaking recorder` inside the practice panel:

1. Click `Record`.
2. Speak your answer.
3. Click `Stop, save, and get feedback`.

The app saves the audio locally under `data/recordings/`, places the transcript into the answer box when browser speech recognition is available, and then sends that transcript through the existing AI feedback flow.

Recording uses the browser MediaRecorder API. Live transcription uses browser SpeechRecognition when available, so support varies by browser. The public HTTPS tunnel generally works better for microphone and speech recognition permissions than plain local network links on some phones.

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
