# PulseBoard

PulseBoard is a full-stack quiz and polling platform built for fast creation, frictionless sharing, and clean real-time-style analytics. It lets a signed-in creator build a quiz, choose whether responses should be anonymous or authenticated, share a slug-based link, collect one response per participant, and review the results in a polished analytics dashboard.

The project is organized as a small monorepo:

- `client/` contains the React + Vite frontend.
- `server/` contains the Bun + Express + MongoDB API.
- the repo root contains shared linting, formatting, and pre-commit tooling.

## What PulseBoard Does

PulseBoard covers the full lifecycle of a poll or quiz:

1. A creator signs in with Clerk.
2. The creator builds a quiz with one or more multiple-choice questions.
3. The quiz can be saved as `draft`, opened as `active`, or closed as `expired`.
4. The creator can allow either:
   - anonymous participation, or
   - authenticated participation only.
5. Participants open a shareable link using the quiz slug.
6. Responses are stored in MongoDB with duplicate-vote protection.
7. Analytics show total responses plus per-question option breakdowns.
8. When a quiz is published, the poll is effectively closed and its analytics become shareable.

## Core Product Features

- Clerk authentication for creators and for non-anonymous quiz participation.
- Quiz builder with dynamic questions and options.
- Optional required questions.
- Anonymous response mode for low-friction voting.
- Authenticated response mode for identity-backed participation.
- Slug-based sharing instead of opaque IDs in the URL.
- Quiz states: `draft`, `active`, and `expired`.
- Optional expiry date per quiz.
- Duplicate-response protection:
  - authenticated quizzes use the Clerk user identity;
  - anonymous quizzes use a browser-stored local voter key.
- Creator-only management controls for updating or deleting a quiz.
- Public or private analytics depending on publish state.
- QR code generation after quiz creation for fast mobile sharing.
- Clean analytics UI with counts, percentages, and leading options.

## User Experience Flow

### 1. Landing page

Visitors land on `/`, see the product pitch, and can sign in through Clerk. If a user is already signed in, they are redirected to `/home`.

### 2. Home dashboard

After sign-in, the frontend calls `GET /api/auth` to sync the Clerk user into MongoDB if needed. The dashboard then loads the creator's existing quizzes and offers two paths:

- create a new quiz;
- join an existing quiz by entering its slug/code.

### 3. Quiz creation

The `/create` page lets the creator:

- set a title;
- choose anonymous vs authenticated responses;
- set the status;
- optionally add an expiry date;
- add any number of questions;
- add at least two options per question;
- mark questions as required.

On success, the creator sees:

- the generated quiz link;
- a QR code for sharing;
- a shortcut into the analytics page for the new quiz.

### 4. Quiz participation

The `/quiz?id=<slug>` page loads the quiz by slug.

Access rules:

- anonymous unpublished quizzes can be opened without sign-in;
- non-anonymous unpublished quizzes require login;
- once a quiz is published, the quiz page redirects to analytics instead of accepting more answers.

Submission rules:

- only `active` quizzes accept responses;
- `draft` quizzes are visible but not answerable;
- `expired` quizzes are closed;
- published quizzes are closed and treated as public-results mode;
- required questions must be answered;
- each participant can submit only once.

### 5. Analytics

The `/analytics?id=<slug>` page displays:

- total response count;
- total question count;
- average answers per question;
- a per-question percentage breakdown for every option.

Visibility rules:

- if the quiz is unpublished, only the creator can view analytics;
- if the quiz is published, analytics can be shared publicly.

Creators additionally get a management panel to:

- change status;
- toggle anonymous mode;
- set or clear expiry;
- publish results;
- delete the quiz and all associated data.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- TanStack Router
- Clerk React SDK
- Tailwind CSS v4
- `qrcode.react`

### Backend

- Bun runtime
- Express 5
- TypeScript
- MongoDB
- Mongoose
- Clerk Express SDK
- Zod for request validation
- CORS

### Tooling

- ESLint
- Prettier
- Husky
- lint-staged

## Architecture Overview

PulseBoard follows a simple client-server architecture:

- the React frontend handles routing, auth-aware UI, quiz creation, quiz participation, and analytics rendering;
- the Express API handles authentication checks, validation, business rules, and persistence;
- MongoDB stores users, polls, questions, responses, and answers;
- Clerk provides identity and session management.

At a high level:

- Clerk authenticates the user;
- the frontend requests a token from Clerk;
- the token is sent to the API in the `Authorization` header when needed;
- the API uses Clerk middleware to resolve the current user;
- the backend persists or looks up that user in MongoDB;
- quiz and response data are then created, queried, updated, or deleted through Mongoose models.

## Data Model

The backend stores data across five core collections/models.

### `Auth`

Stores the application's local representation of a Clerk user:

- `userId`
- `email`
- `name`
- `image`

### `Poll`

Represents the parent quiz/poll:

- `title`
- `creatorId`
- `slug`
- `isAnonymousPoll`
- `isPublished`
- `status`
- `expiresAt`

### `Question`

Represents each multiple-choice question:

- `pollId`
- `question`
- `options`
- `isRequired`
- `order`

### `Response`

Represents one participant submission to a poll:

- `pollId`
- `voterId`

A unique index on `(pollId, voterId)` prevents duplicate submissions.

### `Answer`

Represents the selected option for a single question inside a response:

- `responseId`
- `questionId`
- `selectedOptionIndex`

## Backend API Summary

Base URL locally: `http://localhost:3000`

### Authentication

- `GET /api/auth`
  - requires a Clerk-authenticated request
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
  - anonymous quizzes accept anonymous voter IDs
  - non-anonymous quizzes require authentication

- `GET /api/quiz/:slug`
  - fetch quiz details for answering
  - access depends on anonymity and publish state

- `GET /api/quiz/:slug/analytics`
  - fetch aggregated analytics
  - unpublished analytics are creator-only
  - published analytics are shareable

- `PATCH /api/quiz/:slug`
  - update quiz metadata
  - creator-only

- `DELETE /api/quiz/:slug`
  - delete the quiz and all related questions, responses, and answers
  - creator-only

## Request Validation and Business Rules

The backend uses Zod to validate quiz payloads and submissions before any database writes happen.

Important business rules enforced by the API:

- quiz titles are required;
- every question needs at least two options;
- at least one question is required to create a quiz;
- required questions must be answered before submission;
- invalid question IDs or invalid option indexes are rejected;
- draft quizzes do not accept responses;
- expired quizzes do not accept responses;
- published quizzes no longer accept responses;
- only creators can update or delete their own quizzes.

## Project Structure

```text
pulseBoard/
├── client/                     # React frontend
│   ├── src/
│   │   ├── lib/api.ts          # frontend API client
│   │   ├── routes/             # file-based app routes
│   │   └── main.tsx            # app entry + Clerk provider
│   ├── .env.example
│   ├── package.json
│   └── vercel.json             # SPA rewrite config for Vercel
├── server/                     # Bun + Express API
│   ├── src/
│   │   ├── app/
│   │   │   ├── authentication/
│   │   │   └── quiz/
│   │   ├── db/
│   │   └── index.ts
│   └── package.json
├── .husky/
├── eslint.config.js
├── package.json
└── README.md
```

## Environment Variables

### Frontend

Create `client/.env` using `client/.env.example` as a base:

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
- `CLIENT_URL` is used by the backend CORS configuration.
- `PORT` defaults to `3000` if omitted.
- `CLERK_SECRET_KEY` is required by Clerk's backend middleware and SDK.

## Local Development Setup

### Prerequisites

Make sure you have:

- Bun installed
- a MongoDB instance or MongoDB Atlas connection string
- a Clerk application with frontend and backend keys configured

### 1. Install root tooling dependencies

```bash
bun install
```

### 2. Install server dependencies

```bash
( cd server && bun install )
```

### 3. Install client dependencies

```bash
( cd client && bun install )
```

### 4. Add environment files

- create `client/.env`
- create `server/.env`

### 5. Run the backend

From the repository root, in one terminal:

```bash
cd server && bun run dev
```

The API starts on `http://localhost:3000` by default.

### 6. Run the frontend

From the repository root, in another terminal:

```bash
cd client && bun run dev
```

The Vite app starts on `http://localhost:5173`.

## Available Scripts

### Root scripts

From the repository root:

```bash
bun run lint
bun run lint:fix
bun run format
bun run format:check
```

There is also a Husky pre-commit hook that runs:

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

### Frontend deployment

The frontend includes `client/vercel.json` with an SPA rewrite so that client-side routes continue to work correctly on Vercel.

That means routes like:

- `/`
- `/home`
- `/create`
- `/quiz?id=...`
- `/analytics?id=...`

can be refreshed without breaking the app shell.

### Backend deployment

The backend should be deployed on a host that supports Bun, as long as you provide:

- MongoDB connectivity
- Clerk backend credentials
- the correct `CLIENT_URL`

For production, make sure the frontend `VITE_API_URL` points to your deployed API base URL.

## Security and Access Model

PulseBoard already includes a few solid guardrails:

- creator actions are protected by Clerk auth;
- non-anonymous quizzes require login to answer;
- unpublished analytics are hidden from non-creators;
- duplicate voting is blocked at the database level;
- payloads are validated with Zod before writes occur.

## Current Limitations

This codebase is already functional, but a few areas are still lightweight and worth improving in the future:

- there is no automated test suite yet;
- there is no committed backend `.env.example`;
- analytics are fetched on refresh rather than via live push/websockets;
- quiz editing currently focuses on poll metadata, not full question editing after creation;
- the root workspace uses shared tooling, but the frontend and backend still manage dependencies separately.

## Why This Project Stands Out

PulseBoard is a strong hackathon-style full-stack project because it shows:

- a complete creator-to-participant product flow;
- real authentication and authorization;
- database design with normalized quiz/response entities;
- input validation and business-rule enforcement;
- creator-only management actions;
- shareable result pages with thoughtful UX;
- a clear separation between frontend, backend, and persistence layers.

## Quick Start

If you just want the shortest path to running the app:

```bash
# from repo root
bun install
```

In terminal 1:

```bash
( cd server && bun install )
cd server && bun run dev
```

In terminal 2:

```bash
( cd client && bun install )
cd client && bun run dev
```

Then open `http://localhost:5173`.

## Final Summary

PulseBoard is a modern full-stack polling platform that combines:

- polished frontend UX,
- Clerk-based authentication,
- MongoDB-backed persistence,
- strong validation,
- creator controls,
- and shareable analytics.

It is a clean showcase project for product thinking, full-stack implementation, and practical system design in a compact codebase.
