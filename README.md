# PulseBoard

PulseBoard is a full-stack quiz and polling platform for creating a poll fast, sharing it with a clean slug, collecting one response per participant, and reviewing polished analytics that stay in sync as data changes.

It is built as a small monorepo:

- `client/` contains the React frontend.
- `server/` contains the Bun + Express + MongoDB API.
- the repo root contains shared linting, formatting, and Git hook tooling.

## What Makes It Strong

- Full creator-to-participant product flow, not just CRUD screens.
- Clerk-authenticated creator experience.
- Anonymous or authenticated participation per quiz.
- Slug-based sharing and QR code handoff after creation.
- Duplicate-vote protection backed by the database.
- Creator-only analytics controls.
- Live analytics refresh using `socket.io` rooms plus silent refetch.

## Product Flow

PulseBoard covers the full lifecycle of a poll or quiz:

1. A creator signs in with Clerk.
2. The creator builds a quiz with one or more multiple-choice questions.
3. The quiz is saved as `draft`, opened as `active`, or closed as `expired`.
4. The creator decides whether responses are anonymous or sign-in-only.
5. Participants join through a readable slug-based link.
6. Responses are stored in MongoDB with duplicate-submission protection.
7. The analytics page shows totals, per-question option breakdowns, and creator controls.
8. When responses or poll settings change, connected analytics views refresh automatically.
9. When a quiz is published, results become shareable and the quiz stops accepting answers.

## Core Features

- Clerk authentication for creators and for non-anonymous quiz participation.
- Quiz builder with dynamic questions and options.
- Required-question support.
- Anonymous response mode for low-friction voting.
- Authenticated response mode for identity-backed participation.
- Slug generation from quiz titles.
- QR code generation in the create-success modal.
- Quiz states: `draft`, `active`, and `expired`.
- Optional expiry date per quiz.
- Public or private analytics depending on publish state.
- Creator-only controls for updating or deleting a quiz.
- Socket-powered analytics refresh when responses or poll settings change.

## User Experience Flow

### 1. Landing page

Visitors land on `/`, see the product overview, and can sign in through Clerk. Already signed-in users are redirected to `/home`.

### 2. Home dashboard

After sign-in, the frontend calls `GET /api/auth` to sync the Clerk user into MongoDB if needed. The dashboard then loads the creator's quizzes and offers two paths:

- create a new quiz;
- join an existing quiz by entering its slug.

### 3. Quiz creation

The `/create` page lets the creator:

- set a title;
- choose anonymous vs authenticated responses;
- choose the initial status;
- optionally add an expiry date;
- add one or more questions;
- add at least two options per question;
- mark questions as required.

After a successful create, the app shows a modal with:

- the generated quiz URL;
- a scannable QR code;
- a shortcut into that quiz's analytics screen.

### 4. Quiz participation

The `/quiz?id=<slug>` page loads the quiz by slug.

Access rules:

- anonymous unpublished quizzes can be opened without sign-in;
- non-anonymous unpublished quizzes require login before viewing or answering;
- published quizzes stop accepting answers and route viewers toward analytics instead.

Submission rules:

- only `active` quizzes accept responses;
- `draft` quizzes are visible but not answerable;
- `expired` quizzes are closed;
- published quizzes are closed and treated as public-results mode;
- required questions must be answered;
- each participant can submit only once.

### 5. Analytics

The `/analytics?id=<slug>` page displays:

- total responses;
- total questions;
- average answers per question;
- a per-question count and percentage breakdown for every option.

Visibility rules:

- if the quiz is unpublished, only the creator can view analytics;
- if the quiz is published, analytics become shareable.

Creator controls on the analytics screen include:

- changing quiz status;
- toggling anonymous responses;
- setting or clearing expiry;
- publishing results;
- deleting the quiz and all related data.

## Live Analytics With Sockets

The analytics page is no longer refresh-only. It now uses `socket.io` to keep open analytics views up to date.

Current flow:

1. The client fetches the latest analytics snapshot with `GET /api/quiz/:slug/analytics`.
2. The analytics page opens a socket connection to the API origin.
3. The client joins a room with `join-analytics-room`.
4. The server maps that to an internal room named `analytics:<slug>`.
5. The server emits `analytics:changed` when:
   - a response is submitted;
   - a poll is updated;
   - a poll is deleted.
6. The client debounces those events and silently refetches analytics so the UI stays current without a disruptive full reload.

This means the app uses live invalidation plus refetch, which is simpler and safer than pushing partial analytics state from the server.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- TanStack Router
- Clerk React SDK
- Tailwind CSS v4
- `qrcode.react`
- `socket.io-client`

### Backend

- Bun runtime
- Express 5
- TypeScript
- MongoDB
- Mongoose
- Clerk Express SDK
- Zod for validation
- CORS
- `socket.io`

### Tooling

- ESLint
- Prettier
- Husky
- lint-staged

## Architecture Overview

PulseBoard uses a simple client-server architecture:

- the React frontend handles routing, auth-aware UI, quiz creation, quiz participation, and analytics rendering;
- the Express API handles validation, auth checks, business rules, and persistence;
- MongoDB stores users, polls, questions, responses, and answers;
- Clerk provides identity and session management;
- Socket.IO keeps analytics pages synchronized when quiz data changes.

At a high level:

1. Clerk authenticates the user.
2. The frontend requests a token from Clerk when it needs an authenticated API call.
3. The token is sent in the `Authorization` header.
4. The API uses Clerk middleware to resolve the current user.
5. The backend persists or looks up that user in MongoDB.
6. Quiz and response data are created, queried, updated, or deleted through Mongoose models.
7. The analytics route joins a socket room for the current slug.
8. Mutations emit an `analytics:changed` event so connected clients silently refetch fresh analytics.

## Data Model

The backend stores data across five core collections/models.

### `Auth`

The app's local representation of a Clerk user:

- `userId`
- `email`
- `name`
- `image`

### `Poll`

The parent quiz record:

- `title`
- `creatorId`
- `slug`
- `isAnonymousPoll`
- `isPublished`
- `status`
- `expiresAt`

Notes:

- `slug` is unique and indexed.
- `status` is one of `draft`, `active`, or `expired`.
- if a poll is published, the backend also forces its status to `expired`.

### `Question`

Each multiple-choice question:

- `pollId`
- `question`
- `options`
- `isRequired`
- `order`

### `Response`

One participant submission to a poll:

- `pollId`
- `voterId`

A unique index on `(pollId, voterId)` prevents duplicate submissions.

### `Answer`

One selected option inside a response:

- `responseId`
- `questionId`
- `selectedOptionIndex`

## API Summary

Local API base URL: `http://localhost:3000`

### Health

- `GET /`
  - simple JSON response for a quick server check

### Authentication

- `GET /api/auth`
  - requires Clerk authentication
  - returns the existing MongoDB user or creates one from Clerk data

### Quiz routes

- `POST /api/quiz`
  - create a new quiz
  - requires authentication

- `GET /api/quiz`
  - fetch quizzes created by the signed-in user
  - requires authentication

- `POST /api/quiz/submit`
  - submit answers for a quiz
  - anonymous quizzes accept an anonymous voter ID
  - non-anonymous quizzes require authentication
  - returns `409` on duplicate or closed submissions

- `GET /api/quiz/:slug`
  - fetch quiz details for answering
  - access depends on anonymity and publish state

- `GET /api/quiz/:slug/analytics`
  - fetch aggregated analytics
  - unpublished analytics are creator-only
  - published analytics are publicly shareable

- `PATCH /api/quiz/:slug`
  - update quiz metadata
  - creator-only

- `DELETE /api/quiz/:slug`
  - delete the quiz and all related questions, responses, and answers
  - creator-only

### Socket events

Client -> server:

- `join-analytics-room` with the quiz slug
- `leave-analytics-room` with the quiz slug

Server -> client:

- `analytics:changed`
  - payload:
    - `slug`
    - `reason`: `response_submitted` | `poll_updated` | `poll_deleted`
    - `updatedAt`

## Request Validation and Business Rules

The backend uses Zod to validate quiz payloads and submissions before any database writes happen.

Important rules enforced by the API:

- quiz titles are required;
- at least one question is required to create a quiz;
- every question needs at least two options;
- required questions must be answered before submission;
- invalid question IDs or invalid option indexes are rejected;
- `draft` quizzes do not accept responses;
- `expired` quizzes do not accept responses;
- published quizzes no longer accept responses;
- only creators can update or delete their own quizzes.

## Project Structure

```text
pulseBoard/
├── client/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts                 # frontend API client
│   │   │   └── analyticsSocket.ts     # socket.io client connection helper
│   │   ├── routes/                    # landing, home, create, quiz, analytics
│   │   └── main.tsx                   # app entry + Clerk provider
│   ├── .env.example
│   ├── package.json
│   └── vercel.json
├── server/
│   ├── src/
│   │   ├── app/
│   │   │   ├── authentication/
│   │   │   ├── quiz/
│   │   │   └── realtime/
│   │   │       └── analyticsRealtime.ts
│   │   ├── db/
│   │   └── index.ts                   # HTTP + socket server bootstrap
│   └── package.json
├── .husky/
├── eslint.config.js
├── package.json
└── README.md
```

## Environment Variables

### Frontend

Create `client/.env` using `client/.env.example`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_URL=http://localhost:3000
```

### Backend

Create `server/.env` with:

```bash
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
PORT=3000
CLERK_SECRET_KEY=your_clerk_secret_key
```

Notes:

- `MONGODB_URI` is required for the database connection.
- `CLIENT_URL` is used by both Express CORS and Socket.IO CORS.
- `PORT` defaults to `3000` if omitted.
- `CLERK_SECRET_KEY` is required by Clerk's backend middleware and SDK.
- the socket client connects through `VITE_API_URL`, so there is no separate socket URL to configure.

## Local Development

### Prerequisites

Make sure you have:

- Bun installed
- a MongoDB instance or MongoDB Atlas connection string
- a Clerk application with frontend and backend keys configured

### 1. Install dependencies

From the repo root:

```bash
bun install
```

Then install package-specific dependencies:

```bash
cd server && bun install
cd ../client && bun install
```

### 2. Add environment files

- create `client/.env`
- create `server/.env`

### 3. Run the backend

In one terminal:

```bash
cd server && bun run dev
```

The API and Socket.IO server both run on `http://localhost:3000`.

### 4. Run the frontend

In another terminal:

```bash
cd client && bun run dev
```

The Vite app runs on `http://localhost:5173`.

## Available Scripts

### Root scripts

From the repo root:

```bash
bun run lint
bun run lint:fix
bun run format
bun run format:check
```

The Husky pre-commit hook runs:

- `lint-staged`
- full repo linting
- Prettier format checking

### Server scripts

From `server/`:

```bash
bun run dev
bun run typecheck
bun run build
bun run start
```

### Client scripts

From `client/`:

```bash
bun run dev
bun run build
bun run preview
```

## Deployment Notes

### Frontend

The frontend includes `client/vercel.json` with an SPA rewrite so client-side routes continue to work correctly on refresh.

Routes such as:

- `/`
- `/home`
- `/create`
- `/quiz?id=...`
- `/analytics?id=...`

can be refreshed without breaking the app shell.

### Backend

Deploy the backend on a host that supports Bun and long-lived HTTP connections for Socket.IO, with:

- MongoDB connectivity
- Clerk backend credentials
- the correct `CLIENT_URL`

For production, make sure `VITE_API_URL` points to the deployed API origin used by both REST calls and sockets.

## Security and Access Model

PulseBoard includes a few strong guardrails:

- creator actions are protected by Clerk auth;
- non-anonymous unpublished quizzes require login to access, and non-anonymous quizzes require login to submit;
- unpublished analytics are hidden from non-creators;
- duplicate voting is blocked at the database level;
- payloads are validated with Zod before writes occur.

## Current Limitations

This codebase is already functional, but a few areas are still intentionally lightweight:

- there is no automated test suite yet;
- there is no committed backend `.env.example`;
- analytics live updates use event-driven refetch instead of server-pushed partial analytics state;
- quiz editing currently focuses on poll metadata, not full question editing after creation;
- the frontend and backend still manage dependencies separately inside the monorepo.

## Quick Start

If you want the shortest path to running the app:

```bash
bun install
cd server && bun install
cd ../client && bun install
```

Then run:

Terminal 1:

```bash
cd server && bun run dev
```

Terminal 2:

```bash
cd client && bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Summary

PulseBoard is a compact but complete full-stack project that combines product thinking, auth, database modeling, validation, live analytics updates, and polished sharing flows in one repo.
