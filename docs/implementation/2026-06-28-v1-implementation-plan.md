# V1 Implementation Plan

Date: 2026-06-28
Design spec: `docs/superpowers/specs/2026-06-28-english-speaking-coach-design.md`

## Skill Note

The brainstorming workflow requested `writing-plans`, but this local Codex setup does not have a `D:\Codex-Workspace\skills\writing-plans` skill installed. This document is the fallback implementation plan.

## Technical Choices

- Runtime: Node.js built-ins only, no npm dependency required for v1.
- Backend: `server.js`, serving static files and JSON APIs.
- Frontend: static HTML/CSS/JS in `public/`.
- Persistence: local JSON files under `data/`.
- Secrets: `.env` file excluded from git; `.env.example` committed.
- OpenAI integration: backend calls the Responses API using native `fetch`.

## Build Steps

1. Create project runtime files.
   - `package.json`
   - `.env.example`
   - `README.md`
   - `server.js`
   - `data/.gitkeep`

2. Implement backend APIs.
   - `GET /api/health`
   - `GET /api/settings`
   - `GET /api/today`
   - `POST /api/feedback`
   - `GET /api/sessions`
   - `POST /api/sessions`

3. Implement static frontend.
   - Workspace Dashboard layout.
   - Timer controls.
   - Topic and sentence-frame display.
   - Answer editor.
   - AI feedback panel.
   - Reflection fields.
   - Session save and history list.

4. Implement safe fallback behavior.
   - Missing API key produces setup guidance instead of crashing.
   - Failed AI request keeps the user's answer and allows retry.
   - Empty answers are rejected before submission.

5. Verify locally.
   - Start server.
   - Check health/settings endpoints.
   - Open app in browser.
   - Submit sample answer without API key and confirm graceful error.
   - Save a sample session and verify local JSON persistence.

## Out of Scope

- Voice recognition.
- Account system.
- Cloud sync.
- Full IELTS test simulator.
- Spanish module.
- External database.
