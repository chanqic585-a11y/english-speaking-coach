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

## Files

- `server.js` - local Node backend and static file server.
- `public/` - frontend UI.
- `data/` - local saved sessions, excluded from git except `.gitkeep`.
- `docs/` - design and implementation planning documents.

## Privacy

The browser never receives the API key. The backend reads it from `.env`, which is ignored by git.
