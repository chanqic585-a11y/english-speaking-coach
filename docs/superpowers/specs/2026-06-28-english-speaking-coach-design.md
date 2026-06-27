# English Speaking Coach Design

Date: 2026-06-28
Status: Approved concept, awaiting written spec review
Project path: `D:\Codex-Workspace\english-speaking-coach`

## Goal

Build a personal local web app that guides the user through a daily 25-30 minute English speaking practice session. The app focuses on turning existing English knowledge into clearer spoken output, especially grammar accuracy, logical organization, natural expression, and repeatable upgraded answers.

The target is not a real IELTS exam workflow in v1. IELTS 7.5 is used as a speaking ability reference point: fluent, coherent, clear, natural, and grammatically controlled communication.

## User Context

The user is currently in Mexico. They have passed CET-6 in China, mostly through written English ability. They can understand English conversations when the speaker is not too fast and vocabulary stays within range. Their current pain point is spoken output: sentences feel grammatically weak, logically loose, and not natural enough.

The user has chances for English text conversations and spoken conversations, so the app should support daily preparation, answer improvement, and repeat practice rather than replacing real-world speaking.

## Product Scope

Version 1 is a local daily speaking coach:

- Shows one daily speaking topic and a focused training objective.
- Provides sentence frames and phrase support for organizing an answer.
- Gives a timer for a 25-30 minute training session.
- Lets the user type or paste the answer after speaking.
- Sends the answer to AI through a local backend proxy.
- Returns structured feedback on grammar, logic, natural expression, and a repeatable upgraded answer.
- Saves the session locally for review.

Version 1 does not include:

- Account system.
- Cloud sync.
- Full IELTS mock test mode.
- Voice recognition.
- Mobile app packaging.
- Spanish training modules.

These are possible later extensions, but excluding them keeps the first version focused and maintainable.

## Recommended Approach

Use a local web app with a local Node.js backend proxy.

Alternative approaches considered:

1. Pure frontend calling AI directly.
   - Complexity: low.
   - Benefit: fastest prototype.
   - Risk: exposes API key in the browser.
   - Verdict: acceptable for a throwaway demo, not for a daily tool.

2. Local frontend plus local backend proxy.
   - Complexity: moderate.
   - Benefit: keeps API key out of frontend code, supports local persistence, and allows later voice or export features.
   - Risk: requires running a local server.
   - Verdict: recommended for v1.

3. Full desktop app.
   - Complexity: high.
   - Benefit: polished app-like experience.
   - Risk: more packaging and maintenance before the learning loop is validated.
   - Verdict: defer until the training flow proves useful.

## Core Layout

The confirmed layout is Workspace Dashboard.

The page has three primary regions:

1. Left training rail
   - Shows today's training focus.
   - Shows the 25-30 minute step sequence.
   - Tracks current step and remaining time.

2. Center practice workspace
   - Shows topic, prompt, sentence frame, and phrase bank.
   - Provides a timer control.
   - Provides an answer editor where the user types or pastes the spoken answer.
   - Sends the answer for AI feedback.

3. Right feedback workspace
   - Shows AI feedback next to the original answer.
   - Provides grammar corrections, logic suggestions, natural rewritten answer, and repeat script.
   - Lets the user save the day's review.

This layout is preferred because the user can compare original output and improved output side by side, which directly supports grammar and logic improvement.

## Daily Session Flow

A typical 25-30 minute session:

1. Warm-up, 3 minutes
   - User reads the topic and sentence frame.
   - User prepares 2-3 key points.

2. Speak, 8 minutes
   - User answers the prompt aloud.
   - User then types or pastes a transcript-style version into the editor.

3. AI feedback, 6 minutes
   - App sends the answer to the local backend.
   - Backend calls AI and returns structured feedback.

4. Repeat better, 7 minutes
   - User reads the natural version and repeat script.
   - User speaks the upgraded answer aloud again.

5. Reflection, 4 minutes
   - User records one grammar point, one logic point, and one reusable expression.
   - Session is saved locally.

## AI Feedback Format

The backend should request AI feedback in a predictable structure:

- Quick diagnosis: one short summary of the main issue.
- Grammar fixes: 2-4 corrections with short explanations.
- Logic/coherence: suggestions for order, connectors, missing examples, or unclear cause-effect relations.
- Natural version: a fluent answer that stays close to the user's level and meaning.
- Repeat script: a shorter version designed to be spoken again.
- Reusable expressions: 3-5 phrases the user can reuse in future conversations.

The feedback should be direct and useful, not overly academic. It should avoid overwhelming the user with too many corrections in one session.

## Data Model

The first version can store data locally as JSON files or SQLite. JSON is acceptable for the earliest implementation because the data is simple and local-only. SQLite becomes preferable if history filtering, statistics, or search are added.

Suggested session fields:

- id
- date
- topic
- focus
- prompt
- sentenceFrame
- userAnswer
- aiFeedback
- reflection
- durationMinutes
- createdAt
- updatedAt

Suggested settings fields:

- aiProvider
- model
- apiKeyConfigured boolean
- dailyDurationMinutes
- preferredFeedbackLanguage

API keys should not be stored in frontend code. They should be read by the backend from a local environment file or local config that is excluded from version control.

## Technical Architecture

Frontend:

- Local web UI.
- Workspace Dashboard layout.
- Calls backend endpoints for topics, feedback, sessions, and settings.
- Stores no API key in browser code.

Backend:

- Local Node.js server.
- Serves the frontend during development or coordinates with a frontend dev server.
- Reads API key from local environment/config.
- Calls AI provider.
- Saves and reads local session records.

Endpoints to plan:

- `GET /api/today` returns today's prompt, focus, and sentence frame.
- `POST /api/feedback` accepts the user's answer and returns structured AI feedback.
- `GET /api/sessions` lists saved sessions.
- `POST /api/sessions` saves a completed session.
- `GET /api/settings` returns safe settings without secrets.

## Error Handling

The app should handle:

- Missing API key: show setup instructions and keep the training flow usable without AI feedback.
- AI request failure: preserve the user's answer and allow retry.
- Invalid or empty answer: ask the user to enter enough content before submitting.
- Local save failure: show an error and let the user export or copy the session content.

No user answer should be lost because of an AI or save failure.

## Verification Plan

Before considering v1 complete:

- Start the local app successfully from the project directory.
- Confirm API key is not present in frontend source or browser-visible config.
- Complete one full training session with a sample answer.
- Confirm AI feedback follows the required structure.
- Confirm the session saves locally and can be reopened.
- Confirm the UI works on desktop width and a narrow mobile-like viewport with stacked panels.

## Open Decisions Before Implementation

The design is ready for a v1 implementation plan after the user reviews this spec. The implementation plan should still choose exact libraries and storage format. The recommended default is a small Node backend and a simple modern frontend, with local JSON storage first unless the implementation context strongly favors SQLite.
