# English Speaking Coach for Chinese Engineers

A local English speaking coach for Chinese engineers who need practical speaking practice for daily life, workplace communication, customer meetings, and mechanical engineering scenarios. The interface is organized around four learning pages: `Today Practice`, `Role Play`, `AI Chat`, and `Review`.

## Product structure

- `Today Practice` keeps the main daily loop: today's goal, recording or text input, AI feedback, repeat script shadowing, and saving useful mistakes or expressions.
- `Role Play` keeps scenario conversation practice separate from the daily answer workflow.
- `AI Chat` is for open-ended daily conversation with text or voice input and text or voice output.
- `Review` contains vocabulary, mistake book, and recent sessions.

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

For daily phone practice, use the permanent deployed URL from the `Deploy a permanent phone app URL` section below. After opening the URL on your phone, install it to the home screen:

- Android Chrome: tap `Install app` if it appears, or open the browser menu and choose `Add to Home screen`.
- iPhone Safari: tap Share, then choose `Add to Home Screen`.

The installed PWA keeps the same speaking recorder, AI feedback, role scenarios, shadowing practice, vocabulary book, and mistake book. AI features still need the deployed server to have `GEMINI_API_KEY` configured.

For local testing only, the phone and computer must be on the same Wi-Fi.

1. Double-click `English Speaking Coach.cmd` on the desktop.
2. Keep the computer awake while practicing.
3. On the computer page, copy the `Phone access` link.
4. Open that link in your phone browser.
5. Use `Tap to Record` or `Hold to Speak` for built-in recording.

If the phone cannot open the link, allow Node.js through Windows Firewall for private networks. Some hotel, school, company, or public Wi-Fi networks block phone-to-computer access.

## Deploy a permanent phone app URL

Temporary tunnel links are not reliable enough for daily practice. Deploy this project as a Node web service and use the HTTPS URL as your permanent phone entry.

### Render one-time setup

1. Push the latest code to GitHub.
2. Open [Render](https://render.com/) and sign in.
3. Create a `New Web Service`.
4. Connect the GitHub repo `chanqic585-a11y/english-speaking-coach`.
5. Use these settings:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
```

6. Add environment variables:

```env
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your_gemini_key_here
```

7. Deploy and open the Render URL on your phone.
8. Add the site to your phone home screen.

The repo includes `render.yaml`, so Render can also detect the web service configuration from the repository.

Important data note: the free Render filesystem is not a database. Vocabulary, mistakes, sessions, and recordings may reset when the service restarts or redeploys. The first stable version prioritizes a permanent phone URL and app install experience. For long-term cloud data, add a hosted database or Render persistent disk later.

### Optional custom domain

After the Render service works, you can buy or use a domain and add it in Render under `Settings -> Custom Domains`. Render will show the DNS records to add at your domain provider.

## Temporary tunnel fallback

Run:

```powershell
D:\Codex-Workspace\english-speaking-coach\Start-English-Speaking-Coach-Internet.cmd
```

This starts a temporary Cloudflare Tunnel and opens a public `trycloudflare.com` link. Use this only as a fallback, because quick tunnel links can fail DNS checks, be blocked by network security tools, or change each time you restart them.

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

Use the `Speaking recorder` inside `Today Practice`:

1. Tap `Tap to Record`, or press and hold `Hold to Speak`.
2. Speak your answer.
3. Tap again or release to stop.
4. Review or edit the transcript in the answer box.
5. Click `Get Feedback`.

The app saves the audio locally under `data/recordings/` and places the transcript into the answer box when browser speech recognition is available. Feedback is not submitted automatically after recording, so you can correct the transcript before Gemini reviews it.

AI feedback opens in a dialog automatically. The dialog shows request progress first, then highlights pronunciation, fluency, speaking speed, and the repeat script before the detailed grammar and logic notes.

After the repeat script appears, use `Shadowing practice` in the same dialog:

1. Click `Record repeat script`.
2. Read the repeat script aloud.
3. Click `Stop shadowing`.
4. Review or edit the shadowing transcript if your browser captured one.
5. Gemini compares your shadowing audio with the target repeat script and returns a shadowing score, accuracy note, pronunciation note, fluency note, missed or changed words, and a next drill.

This makes the main loop: record your answer -> get AI feedback -> repeat the improved script -> record the repeat script -> get shadowing feedback.

After feedback is ready, the dialog automatically starts a short `Follow-up practice` loop. Gemini asks one follow-up question based on your answer and feedback, you answer in English, and Gemini gives a light correction plus the next question. The loop stops after 2-3 rounds with a short closing summary.

When Gemini feedback is enabled, recorded sessions also send the saved audio to Gemini so the feedback can include:

- pronunciation score
- fluency score
- pause problem
- speaking speed
- hard words to repeat
- possible words or sounds to practice

Without audio, the app still gives a text-only estimate for fluency, pause problem, speaking speed, and hard words to repeat. Pronunciation scoring still needs audio.

Recording uses the browser MediaRecorder API. Live transcription uses browser SpeechRecognition when available, so support varies by browser. The public HTTPS tunnel generally works better for microphone and speech recognition permissions than plain local network links on some phones.

## Scenario library

The scenario library is organized by CEFR level and communication category.

- Levels: `A2`, `B1`, `B2`, `C1`
- Categories: `Interview`, `Travel`, `Workplace`, `Mexico daily life`, `Mechanical engineer English`, `Customer communication`

Use the `Level` and `Category` filters in `Role Play`, then click `New scenario` to practice a specific difficulty or professional context. Mechanical engineering scenarios cover machine troubleshooting, drawing dimensions, tolerance discussions, root cause analysis, preventive maintenance, supplier quality, design reviews, and engineering change communication.

## Role scenario conversation

Use `Role Play` when you want a complete role-play scene.

1. Pick a role scenario with `New scenario`, such as interviewer, hotel front desk, airport staff, foreign coworker, client, or engineering manager.
2. Read the situation, task, useful phrases, and AI opening line.
3. Answer the opening in `Your opening reply`.
4. Click `Start scene`.
5. Reply to the AI role turn by turn until the scene closes naturally.

Every role and learner turn is kept in the scene transcript. During the scene, the app gives light coaching after each reply so the conversation keeps moving. When the AI closes the scene, the app automatically asks Gemini for full scene feedback across the whole transcript, including task completion, useful line-by-line fixes, an improved dialogue, reusable expressions, the next practice focus, and a repeat script.

You can also click `Get scene feedback` after at least one learner reply if you want an early review, but you do not need to click AI feedback after every single turn.

This is intentionally different from `AI Chat`: role scenario conversation stays inside a specific real-life scene and has a beginning, middle, and closing. AI Chat is open-ended daily conversation.

`Follow-up practice` is also different from role scenarios: it starts only after AI feedback and keeps asking about the same answer, similar to IELTS Part 3 questions.

## AI daily chat

Open `AI Chat` from the side navigation, bottom navigation, or top button to start a self-paced conversation page.

- Use `Text input` to type English.
- Use `Voice input` to speak and let the browser turn your speech into text.
- Use `Text output` to read the AI coach's reply.
- Use `Voice output` to have the browser read the AI reply aloud for listening and shadowing practice.

The AI coach chats naturally, gives light corrections, suggests a better way to say your sentence, and gives one short repeat line. Recent chat messages are saved in your browser local storage.

## Vocabulary practice

Use `Review -> Vocabulary` to save words and phrases from your speaking practice.

- Add the English word or phrase.
- Add the Chinese meaning.
- Add a speaking example sentence.
- Review due cards with `Again`, `Good`, or `Mastered`.

Vocabulary is saved locally in `data/vocabulary.json`. The review schedule is intentionally simple: difficult words come back soon, useful words return after a few days, and mastered words return later.

## Mistake Book

Use `Review -> Mistake Book` to save sentences you often say incorrectly.

- Save grammar fixes directly from AI feedback with `Save mistake`.
- Add your own original sentence and improved sentence manually.
- Label the error type, such as grammar, logic, natural expression, pronunciation, or fluency.
- Review due mistakes with `Again`, `Good`, or `Mastered`.

Mistakes are saved locally in `data/mistakes.json` with the original sentence, improved sentence, error type, note, review count, status, and next review date.

## Files

- `server.js` - local Node backend and static file server.
- `public/` - frontend UI.
- `data/` - local saved sessions, vocabulary, mistakes, and recordings, excluded from git except `.gitkeep`.
- `docs/` - design and implementation planning documents.

## Privacy

The browser never receives the API key. The backend reads it from `.env`, which is ignored by git.
